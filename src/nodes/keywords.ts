import { deepFreeze } from "../utils/freeze.js"
import type { narrow } from "../utils/generics.js"
import type { Node } from "./node.js"

const defineKeywords = <definitions extends { [keyword in Keyword]: Node }>(
    definitions: narrow<definitions>
) => deepFreeze(definitions)

export const keywords = defineKeywords({
    // TS keywords
    any: "any",
    bigint: "bigint",
    boolean: "boolean",
    false: { boolean: { literal: false } },
    never: "never",
    null: "null",
    number: "number",
    object: "object",
    string: "string",
    symbol: "symbol",
    true: { boolean: { literal: true } },
    undefined: "undefined",
    unknown: "unknown",
    void: "undefined",
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
