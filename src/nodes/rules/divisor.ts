import type { TraversalCheck, TraversalState } from "../../traverse/check.ts"
import { Problem } from "../../traverse/problems.ts"
import { composeIntersection, equality } from "../compose.ts"

export const divisorIntersection = composeIntersection<number>(
    (l: number, r: number) =>
        l === r ? equality() : Math.abs((l * r) / greatestCommonDivisor(l, r))
)

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisor = (l: number, r: number) => {
    let previous
    let greatestCommonDivisor = l
    let current = r
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return greatestCommonDivisor
}

export const checkDivisor = ((data, divisor, state) => {
    if (data % divisor !== 0) {
        state.problems.add(new DivisibilityProblem(divisor, state, data))
    }
}) satisfies TraversalCheck<"divisor">

export class DivisibilityProblem extends Problem<"divisibility", number> {
    constructor(public divisor: number, state: TraversalState, data: number) {
        super("divisibility", state, data)
    }

    // TODO: better to pass to Problem constructor?
    get description() {
        return this.divisor === 1
            ? `an integer`
            : `divisible by ${this.divisor}`
    }
}
