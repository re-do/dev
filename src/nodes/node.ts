import type { ScopeRoot } from "../scope.js"
import type { xor } from "../utils/generics.js"
import type { DegenerateNode } from "./types/degenerate.js"
import type {
    BigintAttributes,
    BooleanAttributes
} from "./types/literalOnly.js"
import type { NumberAttributes } from "./types/number.js"
import type { ObjectAttributes } from "./types/object.js"
import type { StringAttributes } from "./types/string.js"

export type Node = xor<TypeNode, DegenerateNode>

export type TypeNode = NonTrivialTypes & TrivialTypes

export type NonTrivialTypes = {
    readonly object?: true | ObjectAttributes | readonly ObjectAttributes[]
    readonly string?: true | StringAttributes | readonly StringAttributes[]
    readonly number?: true | NumberAttributes | readonly NumberAttributes[]
    readonly bigint?: true | BigintAttributes | readonly BigintAttributes[]
    readonly boolean?: true | BooleanAttributes
}

export type NonTrivialTypeName = keyof NonTrivialTypes

export type TrivialTypes = {
    readonly symbol?: true
    readonly null?: true
    readonly undefined?: true
}

export type Comparison<t> = [
    leftExclusive: t | null,
    intersection: t | null,
    rightExclusive: t | null
]

export type Compare<t> = (l: t, r: t) => Comparison<t>

export type ScopedCompare<t> = (l: t, r: t, scope: ScopeRoot) => Comparison<t>
