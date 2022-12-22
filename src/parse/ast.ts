import type { Keyword, Keywords } from "../nodes/keywords.js"
import type {
    Dict,
    Downcastable,
    error,
    evaluate,
    isAny,
    RegexLiteral
} from "../utils/generics.js"
import type { inferDefinition } from "./definition.js"
import type { StringLiteral } from "./shift/operand/enclosed.js"
import type { Scanner } from "./shift/scanner.js"

export type inferAst<
    ast,
    scope extends Dict,
    aliases,
    input extends boolean
> = ast extends readonly unknown[]
    ? ast[1] extends "[]"
        ? inferAst<ast[0], scope, aliases, input>[]
        : ast[1] extends "|"
        ?
              | inferAst<ast[0], scope, aliases, input>
              | inferAst<ast[2], scope, aliases, input>
        : ast[1] extends "&"
        ? evaluate<
              inferAst<ast[0], scope, aliases, input> &
                  inferAst<ast[2], scope, aliases, input>
          >
        : ast[1] extends Scanner.Comparator
        ? ast[0] extends number
            ? inferAst<ast[2], scope, aliases, input>
            : inferAst<ast[0], scope, aliases, input>
        : ast[1] extends "%"
        ? inferAst<ast[0], scope, aliases, input>
        : never
    : inferTerminal<ast, scope, aliases, input>

export type validateAstSemantics<
    ast,
    scope extends Dict,
    input extends boolean
> = ast extends string
    ? undefined
    : ast extends [infer child, unknown]
    ? validateAstSemantics<child, scope, input>
    : ast extends [infer left, infer token, infer right]
    ? token extends Scanner.BranchToken
        ? validateAstSemantics<left, scope, input> extends error<
              infer leftMessage
          >
            ? leftMessage
            : validateAstSemantics<right, scope, input> extends error<
                  infer rightMessage
              >
            ? rightMessage
            : undefined
        : token extends Scanner.Comparator
        ? left extends number
            ? validateAstSemantics<right, scope, input>
            : isBoundable<inferAst<left, scope, {}, input>> extends true
            ? validateAstSemantics<left, scope, input>
            : error<buildUnboundableMessage<astToString<ast[0]>>>
        : token extends "%"
        ? isDivisible<inferAst<left, scope, {}, input>> extends true
            ? validateAstSemantics<left, scope, input>
            : error<buildIndivisibleMessage<astToString<ast[0]>>>
        : validateAstSemantics<left, scope, input>
    : undefined

type isNonLiteralNumber<t> = t extends number
    ? number extends t
        ? true
        : false
    : false

type isNonLiteralString<t> = t extends string
    ? string extends t
        ? true
        : false
    : false

type isDivisible<inferred> = isAny<inferred> extends true
    ? true
    : isNonLiteralNumber<inferred>

type isBoundable<inferred> = isAny<inferred> extends true
    ? true
    : isNonLiteralNumber<inferred> extends true
    ? true
    : isNonLiteralString<inferred> extends true
    ? true
    : inferred extends readonly unknown[]
    ? true
    : false

type inferTerminal<
    token,
    scope extends Dict,
    aliases,
    input extends boolean
> = token extends Keyword
    ? Keywords[token]
    : token extends keyof scope
    ? scope[token]
    : token extends keyof aliases
    ? inferDefinition<aliases[token], scope, aliases, input>
    : token extends StringLiteral<infer Text>
    ? Text
    : token extends RegexLiteral
    ? string
    : token extends number | bigint
    ? token
    : never

export type astToString<ast, result extends string = ""> = ast extends [
    infer head,
    ...infer tail
]
    ? astToString<tail, `${result}${astToString<head>}`>
    : ast extends Downcastable
    ? `${result}${ast extends bigint ? `${ast}n` : ast}`
    : "..."

export const buildIndivisibleMessage = <root extends string>(
    root: root
): buildIndivisibleMessage<root> =>
    `Divisibility operand ${root} must be a non-literal number`

type buildIndivisibleMessage<root extends string> =
    `Divisibility operand ${root} must be a non-literal number`

export const buildUnboundableMessage = <root extends string>(
    root: root
): buildUnboundableMessage<root> =>
    `Bounded expression ${root} must be a non-literal number, string or array`

type buildUnboundableMessage<root extends string> =
    `Bounded expression ${root} must be a non-literal number, string or array`
