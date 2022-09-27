import { isKeyOf } from "@re-/tools"
import type { LiteralNode } from "../../../../../nodes/terminals/literal.js"
import type { Left, left } from "../../../state/left.js"
import type { parserState } from "../../../state/state.js"
import type {
    Comparator,
    DoubleBoundComparator,
    InvalidDoubleBoundMessage,
    InvertedComparators
} from "./common.js"
import {
    doubleBoundComparators,
    invalidDoubleBoundMessage,
    invertedComparators
} from "./common.js"

const applyLeftBound = (
    s: parserState<left.withRoot<LiteralNode<number>>>,
    token: DoubleBoundComparator
) => {
    s.l.lowerBound = [invertedComparators[token], s.l.root.value]
    s.l.root = undefined as any
    return s
}

export const reduceLeft = (
    s: parserState<left.withRoot<LiteralNode<number>>>,
    token: Comparator
) =>
    isKeyOf(token, doubleBoundComparators)
        ? applyLeftBound(s, token)
        : s.error(invalidDoubleBoundMessage(token))

export type ReduceLeft<
    L extends Left,
    Value extends number,
    Token extends Comparator
> = Token extends DoubleBoundComparator
    ? Left.From<{
          groups: L["groups"]
          branches: L["branches"]
          root: undefined
          lowerBound: [InvertedComparators[Token], Value]
      }>
    : Left.Error<InvalidDoubleBoundMessage<Token>>
