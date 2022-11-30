import type { ScopeRoot } from "../../scope.js"
import type {
    defined,
    propwiseUnion,
    stringKeyOf
} from "../../utils/generics.js"
import { hasKeys } from "../../utils/generics.js"
import type { dict } from "../../utils/typeOf.js"
import type { AttributesIntersection } from "../intersection.js"
import type { LiteralChecker } from "./literals.js"
import { literalableIntersection } from "./literals.js"

export type IntersectionContext<attributes> = {
    leftRoot: attributes
    rightRoot: attributes
    scope: ScopeRoot
}

type ContextualIntersection<t, context> = (
    l: t,
    r: t,
    context: context
) => t | "never"

export type KeyIntersection<
    attributes extends dict,
    k extends stringKeyOf<attributes>
> = ContextualIntersection<
    defined<propwiseUnion<attributes>[k]>,
    IntersectionContext<attributes>
>

export type KeyIntersections<attributes extends dict> = {
    [k in stringKeyOf<attributes>]-?: k extends "literal"
        ? LiteralChecker<attributes>
        : KeyIntersection<attributes, k>
}

export const composeIntersection =
    <attributes extends dict>(
        reducers: KeyIntersections<attributes>
    ): AttributesIntersection<attributes> =>
    (l, r, scope): attributes | "never" => {
        if (reducers.literal) {
            const result = literalableIntersection(
                l,
                r,
                reducers.literal as any
            )
            if (result) {
                return result
            }
        }
        const result = { ...l, ...r }
        const context: IntersectionContext<attributes> = {
            leftRoot: l,
            rightRoot: r,
            scope
        }
        for (const k in result) {
            if (l[k] && r[k]) {
                const keyResult = reducers[k](l[k] as any, r[k] as any, context)
                if (keyResult === "never") {
                    return "never"
                }
                result[k] = keyResult as any
            }
        }
        return result
    }

export const nullifyEmpty = <t>(result: t): t | null =>
    hasKeys(result) ? result : null
