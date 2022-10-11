import type { Branching } from "./branching/branching.js"
import { Bound } from "./infix/bound.js"
import type { Divisibility } from "./infix/divisibility.js"
import type { Infix } from "./infix/infix.js"
import type { Unary } from "./unary/unary.js"

export namespace Expression {
    export const tokens: Record<Token, 1> = {
        "?": 1,
        "[]": 1,
        "|": 1,
        "&": 1,
        "%": 1,
        ...Bound.tokens
    }

    export type Token = Unary.Token | BinaryToken

    export type BinaryToken = Infix.Token | Branching.Token

    export type ConstraintToken = Bound.Token | Divisibility.Token
}
