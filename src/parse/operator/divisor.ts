import type { NumberLiteral } from "../../utils/numericLiterals.js"
import { parseWellFormedInteger } from "../../utils/numericLiterals.js"
import { add } from "../state/intersection.js"
import type { Scanner } from "../state/scanner.js"
import { State } from "../state/state.js"

export namespace Divisor {
    export const parse = (s: State.DynamicWithRoot) => {
        const divisorToken = s.scanner.shiftUntilNextTerminator()
        return setRootOrCatch(
            s,
            parseWellFormedInteger(
                divisorToken,
                buildInvalidDivisorMessage(divisorToken)
            )
        )
    }

    export type parse<
        s extends State.StaticWithRoot,
        unscanned extends string
    > = Scanner.shiftUntil<
        unscanned,
        Scanner.TerminatingChar
    > extends Scanner.ShiftResult<infer scanned, infer nextUnscanned>
        ? setRootOrCatch<
              s,
              parseWellFormedInteger<
                  scanned,
                  buildInvalidDivisorMessage<scanned>
              >,
              nextUnscanned
          >
        : never

    const setRootOrCatch = (s: State.DynamicWithRoot, parseResult: number) => {
        if (parseResult === 0) {
            return State.error(buildInvalidDivisorMessage(0))
        }
        s.root = add(s.root, "divisor", `${parseResult}`)
        return s
    }

    type setRootOrCatch<
        s extends State.StaticWithRoot,
        divisorOrError extends string | number,
        unscanned extends string
    > = divisorOrError extends number
        ? divisorOrError extends 0
            ? State.error<buildInvalidDivisorMessage<0>>
            : State.scanTo<s, unscanned>
        : State.error<`${divisorOrError}`>

    export const buildInvalidDivisorMessage = <divisor extends string | number>(
        divisor: divisor
    ): buildInvalidDivisorMessage<divisor> =>
        `% operator must be followed by a non-zero integer literal (was ${divisor})`

    type buildInvalidDivisorMessage<divisor extends string | number> =
        `% operator must be followed by a non-zero integer literal (was ${divisor})`

    export const intersect = (a: NumberLiteral, b: NumberLiteral) =>
        leastCommonMultiple(
            parseWellFormedInteger(a, true),
            parseWellFormedInteger(b, true)
        )

    // Calculate the GCD, then divide the product by that to determine the LCM:
    // https://en.wikipedia.org/wiki/Euclidean_algorithm
    const leastCommonMultiple = (a: number, b: number) => {
        let previous
        let greatestCommonDivisor = a
        let current = b
        while (current !== 0) {
            previous = current
            current = greatestCommonDivisor % current
            greatestCommonDivisor = previous
        }
        return Math.abs((a * b) / greatestCommonDivisor)
    }
}
