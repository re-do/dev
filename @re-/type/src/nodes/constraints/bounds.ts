import type { Evaluate } from "@re-/tools"
// TODO: Fix parser imports
import type {
    DoubleBoundComparator,
    NormalizedLowerBoundComparator
} from "../../parser/str/operator/bound/common.js"
import {
    comparatorToString,
    invertedComparators
} from "../../parser/str/operator/bound/common.js"
import type { Scanner } from "../../parser/str/state/scanner.js"
import type { StrAst, strNode } from "../common.js"
import type { NumberKeyword } from "../terminals/keywords/number.js"
import type { StringTypedKeyword } from "../terminals/keywords/string.js"
import type { CheckState } from "../traverse/check/check.js"
import type { Check } from "../traverse/exports.js"
import type { ConstrainedAst, Constraint } from "./constraint.js"

export namespace Bounds {
    export type Ast = Single | Double

    export type Bound = [Scanner.Comparator, number]

    export type Lower = [NormalizedLowerBoundComparator, number]

    export type Upper = [DoubleBoundComparator, number]

    export type Single = [Bound]

    export type Double = [Lower, Upper]

    export type Apply<Child, Bounds extends Ast> = ConstrainedAst<Child, Bounds>
}

export type BoundableAst = NumberKeyword | StringTypedKeyword | [unknown, "[]"]

export type BoundableNode = strNode & {
    bounds: null | BoundConstraint
}

export type BoundableData = number | string | unknown[]

export const isBoundable = (node: strNode): node is BoundableNode =>
    "bounds" in node

export type BoundUnits = "characters" | "items"

export type BoundKind = "string" | "number" | "array"

export const applyBound = (node: BoundableNode, bounds: BoundConstraint) => {
    node.bounds = bounds
    applyBoundsToAst(node, bounds.ast)
    applyBoundsToDefinition(node, bounds.ast)
}

const applyBoundsToAst = (node: BoundableNode, ast: Bounds.Ast) => {
    node.ast = isConstrained(node.ast)
        ? [node.ast[0], [...node.ast[1], ...ast]]
        : [node.ast, ast]
}

const applyBoundsToDefinition = (node: BoundableNode, ast: Bounds.Ast) => {
    const rightBoundToString =
        ast.length === 1 ? ast[0].join("") : ast[1].join("")
    node.definition += rightBoundToString
    if (ast.length === 2) {
        const leftBoundToString = `${ast[0][1]}${
            invertedComparators[ast[0][0]]
        }`
        node.definition = leftBoundToString + node.definition
    }
}

export class BoundConstraint implements Constraint {
    constructor(public ast: Bounds.Ast) {}

    check(state: Check.CheckState<BoundableData>) {
        const actual =
            typeof state.data === "number" ? state.data : state.data.length
        for (const [comparator, limit] of this.ast) {
            if (!isWithinBound(comparator, limit, actual)) {
                this.addBoundError(state, comparator, limit, actual)
                return
            }
        }
    }

    private addBoundError(
        state: CheckState<BoundableData>,
        comparator: Scanner.Comparator,
        limit: number,
        actual: number
    ) {
        const kind: BoundKind =
            typeof state.data === "string"
                ? "string"
                : typeof state.data === "number"
                ? "number"
                : "array"
        state.errors.add(
            "bound",
            {
                reason: boundToString(comparator, limit, kind),
                state: state
            },
            {
                comparator,
                limit,
                kind,
                actual,
                data: state.data
            }
        )
        return
    }
}

export type BoundDiagnostic = Check.DiagnosticConfig<{
    comparator: Scanner.Comparator
    data: BoundableData
    limit: number
    actual: number
    kind: BoundKind
}>

export const boundToString = (
    comparator: Scanner.Comparator,
    limit: number,
    kind: BoundKind
) =>
    `Must be ${comparatorToString[comparator]} ${limit}${
        kind === "string" ? " characters" : kind === "array" ? " items" : ""
    }`

const isConstrained = (ast: StrAst): ast is [StrAst, StrAst[]] =>
    Array.isArray(ast) && Array.isArray(ast[1])

const isWithinBound = (
    comparator: Scanner.Comparator,
    limit: number,
    size: number
) => {
    switch (comparator) {
        case "<=":
            return size <= limit
        case ">=":
            return size >= limit
        case "<":
            return size < limit
        case ">":
            return size > limit
        case "==":
            return size === limit
        default:
            // TODO: Does this work?
            // c8 ignore next
            throw new Error(`Unexpected comparator ${comparator}.`)
    }
}
