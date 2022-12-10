import type { ScopeRoot } from "../scope.js"
import type { ConstraintContext } from "./intersection.js"
import type { BaseAttributes, Resolution } from "./node.js"

export type AttributeChecker<data, k extends keyof BaseAttributes> = (
    data: data,
    attribute: BaseAttributes[k]
) => boolean

export const checkAttributes = (
    data: unknown,
    attributes: BaseAttributes,
    context: ConstraintContext
) => {
    return true
}

export const checkNode = (
    data: unknown,
    node: Resolution,
    scope: ScopeRoot
) => {
    return true
}
