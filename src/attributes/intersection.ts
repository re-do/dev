import { hasDynamicType, isKeyOf } from "../internal.js"
import type { DynamicParserContext } from "../parser/common.js"
import { intersectBounds } from "./bounds.js"
import { intersectDivisors } from "./divisor.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes,
    AttributeTypes,
    ContradictableKey,
    TypeAttributeName,
    TypeAttributeNameUnion
} from "./shared.js"

// TODO: Remove
// eslint-disable-next-line max-lines-per-function
export const assignIntersection = (
    base: Attributes,
    assign: Attributes,
    context: DynamicParserContext
) => {
    let k: AttributeKey
    for (k in alwaysIntersectedKeys) {
        if (k in base && !(k in assign)) {
            assign[k] = undefined
        }
    }
    for (k in assign) {
        // TODO: Value undefined?
        if (base[k] === assign[k]) {
            continue
        }
        if (k in base) {
            const intersection = dynamicReducers[k](base[k], assign[k], context)
            if (isEmpty(intersection)) {
                base.contradictions ??= {}
                intersectors.contradictions(
                    base.contradictions,
                    {
                        [k]: intersection
                    },
                    context
                )
            } else {
                base[k] = intersection
            }
        } else {
            base[k] = assign[k] as any
        }
        if (isKeyOf(k, implicationMap)) {
            assignIntersection(base, implicationMap[k](), context)
        }
    }
    return base
}

type IntersectorsByKey = {
    [k in AttributeKey]: Intersector<k>
}

const intersectors: IntersectorsByKey = {
    value: (base, assign) => [base, assign],
    type: (base, assign) => {
        if (hasDynamicType(base, "dictionary")) {
            if (hasDynamicType(assign, "dictionary")) {
                const intersectingTypeNames: TypeAttributeNameUnion = {}
                let typeName: TypeAttributeName
                for (typeName in base) {
                    if (assign[typeName]) {
                        intersectingTypeNames[typeName] = true
                    }
                }
                const intersectingKeys = Object.keys(
                    intersectingTypeNames
                ) as TypeAttributeName[]
                return intersectingKeys.length === 0
                    ? [base, assign]
                    : intersectingKeys.length === 1
                    ? intersectingKeys[0]
                    : intersectingTypeNames
            }
            return assign in base ? assign : [base, assign]
        }
        if (hasDynamicType(assign, "dictionary")) {
            return base in assign ? base : [base, assign]
        }
        return [base, assign]
    },
    divisor: (base, assign) => intersectDivisors(base, assign),
    regex: (base, assign) => `${base}${assign}`,
    bounds: intersectBounds,
    // TODO: Figure out where this gets merged. Should require both if
    // finalized, but otherwise not.
    optional: (base, assign) => base && assign,
    alias: (base, assign) => `${base}&${assign}`,
    baseProp: (base, assign, context) =>
        assignIntersection(base, assign, context),
    props: (base, assign, context) => {
        const intersectedProps = { ...base, ...assign }
        for (const k in intersectedProps) {
            if (k in base && k in assign) {
                intersectedProps[k] = assignIntersection(
                    base[k],
                    assign[k],
                    context
                )
            }
        }
        return intersectedProps
    },
    branches: (base, assign) => {
        const intersectedBranches: AttributeBranches =
            base[0] === "&" ? base : ["&", base]
        if (assign[0] === "&") {
            for (let i = 1; i < assign.length; i++) {
                intersectedBranches.push(assign[i])
            }
        } else {
            intersectedBranches.push(assign)
        }
        return intersectedBranches
    },
    contradictions: (base, assign) => {
        let k: ContradictableKey
        for (k in assign) {
            base[k] ??= []
            base[k]!.push(assign[k] as any)
        }
        return base
    }
}

const dynamicReducers = intersectors as {
    [k in AttributeKey]: (
        base: unknown,
        assign: unknown,
        context: DynamicParserContext
    ) => any
}

type KeyWithImplications = "divisor" | "regex" | "bounds"

type ImplicationsThunk = () => Attributes

const implicationMap: {
    [k in KeyWithImplications]: ImplicationsThunk
} = {
    divisor: () => ({ type: "number" }),
    bounds: () => ({
        type: {
            number: true,
            string: true,
            array: true
        }
    }),
    regex: () => ({ type: "string" })
}

const alwaysIntersectedKeys = {
    optional: true
}

const isEmpty = (
    intersection: unknown
): intersection is EmptyIntersectionResult => Array.isArray(intersection)

export type EmptyIntersectionResult<
    k extends ContradictableKey = ContradictableKey
> = [baseConflicting: AttributeTypes[k], assignConflicting: AttributeTypes[k]]

export type Intersector<k extends AttributeKey> = (
    base: AttributeTypes[k],
    value: AttributeTypes[k],
    context: DynamicParserContext
) =>
    | AttributeTypes[k]
    | (k extends ContradictableKey ? EmptyIntersectionResult<k> : never)
