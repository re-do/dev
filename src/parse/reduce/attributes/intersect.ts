import type { RegexLiteral } from "../../../utils/generics.js"
import type { Attribute, AttributeKey, Attributes } from "./attributes.js"
import { composedAttributeKeys } from "./attributes.js"
import { intersectBounds } from "./bounds.js"
import { intersectBranches } from "./branches.js"
import { Contradiction } from "./contradiction.js"
import { intersectDivisors } from "./divisor.js"
import { intersectKeySets, intersectKeysOrSets } from "./keySets.js"
import { intersectProps } from "./props.js"
import { pruneBranches } from "./union/prune.js"

export const intersect = (a: Attributes, b: Attributes) => {
    let k: AttributeKey
    for (k in b) {
        if (a[k] === undefined) {
            a[k] = b[k] as any
            intersectImplications(a, k)
        }
        const result = (intersectors[k] as DynamicIntersector)(a[k], b[k])
        if (result instanceof Contradiction) {
            intersect(a, {
                contradiction: result.message
            })
        } else {
            a[k] = result
        }
    }
    // TODO: Figure out prop never propagation
    if (a.branches) {
        const branchDerivedAttributes = pruneBranches(a.branches, b)
        intersect(a, branchDerivedAttributes)
    }
    return a
}

export type AttributeIntersector<k extends AttributeKey> = (
    a: Attribute<k>,
    b: Attribute<k>
) => Attribute<k> | Contradiction

const intersectImplications = (a: Attributes, k: AttributeKey) =>
    k === "bounds"
        ? intersect(a, {
              branches: ["?", "type", { number: {}, string: {}, array: {} }]
          })
        : k === "divisor"
        ? intersect(a, { type: "number" })
        : a

const intersectTypes: AttributeIntersector<"type"> = (a, b) =>
    a === b
        ? a
        : new Contradiction(`types ${a} and ${b} are mutually exclusive`)

const intersectValues: AttributeIntersector<"value"> = (a, b) =>
    a === b
        ? a
        : new Contradiction(`values ${a} and ${b} are mutually exclusive`)

type DynamicIntersector = AttributeIntersector<any>

export const intersectors: {
    [k in AttributeKey]: AttributeIntersector<k>
} = {
    type: intersectTypes,
    value: intersectValues,
    alias: intersectKeysOrSets,
    contradiction: intersectKeysOrSets,
    requiredKeys: intersectKeySets,
    regex: intersectKeysOrSets<RegexLiteral>,
    divisor: intersectDivisors,
    bounds: intersectBounds,
    props: intersectProps,
    branches: intersectBranches
}
