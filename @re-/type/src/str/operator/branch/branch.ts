import { left, state } from "../../parser/index.js"
import { Intersection, IntersectionNode } from "./intersection.js"
import { Union, UnionNode } from "./union.js"

export namespace Branches {
    export const tokens = {
        "|": 1,
        "&": 1
    }

    export type Token = keyof typeof tokens

    export type OpenBranch = [unknown, Token]

    export type TypeState = {
        union?: OpenBranch
        intersection?: OpenBranch
    }

    export type ValueState = {
        union?: UnionNode
        intersection?: IntersectionNode
    }

    export type MergeAll<B extends Branches.TypeState, Root> = MergeExpression<
        B["union"],
        MergeExpression<B["intersection"], Root>
    >

    export const mergeAll = (s: state<left.withRoot>) => {
        if (Intersection.isMergeable(s)) {
            Intersection.merge(s)
        }
        if (Union.isMergeable(s)) {
            Union.merge(s)
        }
        return s
    }

    export type MergeExpression<
        B extends OpenBranch | undefined,
        Expression
    > = B extends OpenBranch ? [...B, Expression] : Expression
}
