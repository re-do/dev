import type { ParserContext, parserContext } from "../../common.js"
import type { Scanner } from "../state/scanner.js"
import type {
    ExpressionExpectedMessage,
    ParserState,
    parserState
} from "../state/state.js"
import type { EnclosedBaseStartChar, ParseEnclosedBase } from "./enclosed.js"
import { enclosedBaseStartChars, parseEnclosedBase } from "./enclosed.js"
import type { ReduceGroupOpen } from "./groupOpen.js"
import { reduceGroupOpen } from "./groupOpen.js"
import type { ParseUnenclosedBase } from "./unenclosed.js"
import { parseUnenclosedBase } from "./unenclosed.js"

export namespace Operand {
    export const parse = (
        s: parserState,
        context: parserContext
    ): parserState =>
        s.r.lookahead === "("
            ? reduceGroupOpen(s.shifted())
            : s.r.lookaheadIsIn(enclosedBaseStartChars)
            ? parseEnclosedBase(s, s.r.shift(), context)
            : s.r.lookahead === " "
            ? parse(s.shifted(), context)
            : parseUnenclosedBase(s, context)

    export type Parse<
        S extends ParserState,
        Ctx extends ParserContext
    > = S["R"] extends Scanner.Shift<infer Lookahead, infer Unscanned>
        ? Lookahead extends "("
            ? ParserState.From<{
                  L: ReduceGroupOpen<S["L"]>
                  R: Unscanned
              }>
            : Lookahead extends EnclosedBaseStartChar
            ? ParseEnclosedBase<S, Lookahead, Unscanned>
            : Lookahead extends " "
            ? Parse<{ L: S["L"]; R: Unscanned }, Ctx>
            : ParseUnenclosedBase<S, Ctx>
        : ParserState.Error<ExpressionExpectedMessage<"">>
}
