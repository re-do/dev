import { TypeKeyword } from "../../../nodes/terminal/keyword/keyword.js"
import { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import type { InternalSpace } from "../../../scopes/space.js"
import type { ParseError, ParserContext } from "../../common.js"
import type { Left } from "../state/left.js"
import type { Scanner } from "../state/scanner.js"
import { scanner } from "../state/scanner.js"
import type { ParserState, parserState } from "../state/state.js"
import { UnenclosedBigint, UnenclosedNumber } from "./numeric.js"

export namespace Unenclosed {
    export const parse = (s: parserState, space: InternalSpace) => {
        const token = s.r.shiftUntilNextTerminator()
        s.l.root = unenclosedToNode(s, token, space)
        return s
    }

    export type Parse<
        S extends ParserState,
        Ctx extends ParserContext
    > = Scanner.ShiftUntilNextTerminator<S["R"]> extends Scanner.Shifted<
        infer Scanned,
        infer NextUnscanned
    >
        ? ParserState.From<{
              L: Reduce<S["L"], Resolve<Scanned, NextUnscanned, Ctx>>
              R: NextUnscanned
          }>
        : never

    export const maybeParseIdentifier = (token: string, ctx: parserContext) =>
        TypeKeyword.matches(token)
            ? TypeKeyword.getNode(token)
            : ctx.space?.aliases?.[token]
            ? new Alias(token)
            : undefined

    export const maybeParseLiteral = (token: string) => {
        const maybeLiteralValue =
            UnenclosedNumber.maybeParse(token) ??
            (token === "true"
                ? true
                : token === "false"
                ? false
                : UnenclosedBigint.maybeParse(token))
        return maybeLiteralValue
            ? new PrimitiveLiteral.Node(
                  token as
                      | PrimitiveLiteral.Number
                      | PrimitiveLiteral.Bigint
                      | PrimitiveLiteral.Boolean,
                  maybeLiteralValue
              )
            : undefined
    }
    const unenclosedToNode = (
        s: parserState,
        token: string,
        space: InternalSpace
    ) =>
        maybeParseIdentifier(token, space) ??
        maybeParseLiteral(token) ??
        s.error(
            token === ""
                ? scanner.expressionExpectedMessage(s.r.unscanned)
                : unresolvableMessage(token)
        )

    type Reduce<
        L extends Left,
        Resolved extends string | number
    > = Resolved extends ParseError<infer Message>
        ? Left.Error<Message>
        : Left.SetRoot<L, Resolved>

    // TODO: Change to scope?
    type UnresolvableMessage<Token extends string> =
        `'${Token}' is not a builtin type and does not exist in your space`

    export const unresolvableMessage = <Token extends string>(
        token: Token
    ): UnresolvableMessage<Token> =>
        `'${token}' is not a builtin type and does not exist in your space`

    export type IsResolvableIdentifier<
        Token,
        Ctx extends ParserContext
    > = Token extends TypeKeyword.Definition
        ? true
        : Token extends keyof Ctx["aliases"]
        ? true
        : false

    type Resolve<
        Token extends string,
        Unscanned extends string,
        Ctx extends ParserContext
    > = IsResolvableIdentifier<Token, Ctx> extends true
        ? Token
        : Token extends PrimitiveLiteral.Number<infer Value>
        ? UnenclosedNumber.AssertWellFormed<Token, Value, "number">
        : Token extends PrimitiveLiteral.Boolean
        ? Token
        : Token extends PrimitiveLiteral.Bigint<infer Value>
        ? UnenclosedBigint.AssertWellFormed<Token, Value>
        : ParseError<
              Token extends ""
                  ? Scanner.ExpressionExpectedMessage<Unscanned>
                  : UnresolvableMessage<Token>
          >
}
