import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import { deepFreeze } from "../utils/freeze.js"
import type { narrow } from "../utils/generics.js"
import { isKeyOf } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import { intersection } from "./intersection.js"
import type { Node } from "./node.js"

const defineKeywords = <definitions extends { [keyword in Keyword]: Node }>(
    definitions: narrow<definitions>
) => deepFreeze(definitions)

const always: Record<TypeName, true> = {
    bigint: true,
    boolean: true,
    null: true,
    number: true,
    object: true,
    string: true,
    symbol: true,
    undefined: true
}

export const keywords = defineKeywords({
    // TS keywords
    any: always,
    bigint: { bigint: true },
    boolean: { boolean: true },
    false: { boolean: { literal: false } },
    never: {},
    null: { null: true },
    number: { number: true },
    object: { object: true },
    string: { string: true },
    symbol: { symbol: true },
    true: { boolean: { literal: true } },
    undefined: { undefined: true },
    unknown: always,
    void: { undefined: true },
    // JS Object types
    Function: { object: { subtype: "function" } },
    // Regex
    email: { string: { regex: "^(.+)@(.+)\\.(.+)$" } },
    alphanumeric: { string: { regex: "^[dA-Za-z]+$" } },
    alphaonly: { string: { regex: "^[A-Za-z]+$" } },
    lowercase: { string: { regex: "^[a-z]*$" } },
    uppercase: { string: { regex: "^[A-Z]*$" } },
    // Numeric
    integer: { number: { divisor: 1 } }
})

export type Keyword = keyof Keywords

export type Keywords = {
    // TS keywords
    any: any
    bigint: bigint
    boolean: boolean
    false: false
    never: never
    null: null
    number: number
    object: object
    string: string
    symbol: symbol
    true: true
    undefined: undefined
    unknown: unknown
    void: void
    // JS Object types
    Function: Function
    // Regex
    email: string
    alphanumeric: string
    alphaonly: string
    lowercase: string
    uppercase: string
    // Numeric
    integer: number
}

export const nameIntersection = (
    name: string,
    node: Node,
    scope: ScopeRoot
): Node => {
    const l = resolveName(name, scope)
    const r = typeof node === "string" ? resolveName(node, scope) : node
    const result = intersection(l, r, scope)
    // If the intersection included a name and its result is identical to the
    // original resolution of that name, return the name instead of its expanded
    // form as the result
    return deepEquals(l, result)
        ? l
        : typeof node === "string" && deepEquals(r, result)
        ? node
        : result
}

export const resolveIfName = (node: Node, scope: ScopeRoot) =>
    typeof node === "string" ? resolveName(node, scope) : node

export const resolveName = (name: string, scope: ScopeRoot) =>
    isKeyOf(name, keywords) ? keywords[name] : scope.resolve(name)
