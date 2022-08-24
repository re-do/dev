import { TypeOfResult } from "@re-/tools"
import { Node, Operator, Parser, Utils } from "../common.js"
import { BranchState, MergeExpression } from "./branch.js"
import { hasMergeableIntersection, mergeIntersection } from "./intersection.js"

type PreferredDefaults = ({ value: any } | { typeOf: TypeOfResult })[]

const preferredDefaults: PreferredDefaults = [
    { value: undefined },
    { value: null },
    { value: false },
    { value: true },
    { typeOf: "number" },
    { typeOf: "string" },
    { typeOf: "bigint" },
    { typeOf: "object" },
    { typeOf: "symbol" },
    { typeOf: "function" }
]

type PushRoot<B extends BranchState, Root> = {
    union: [
        MergeExpression<B["union"], MergeExpression<B["intersection"], Root>>,
        "|"
    ]
}

export const reduceUnion = (s: Operator.state, ctx: Node.context) => {
    if (hasMergeableIntersection(s)) {
        mergeIntersection(s)
    }
    if (!s.l.branches.union) {
        s.l.branches.union = new union([s.l.root], ctx)
    } else {
        s.l.branches.union.addMember(s.l.root)
    }
    s.l.root = undefined as any
    return s
}

export type Union<Left = unknown, Right = unknown> = [Left, "|", Right]

export type ReduceUnion<L extends Parser.Left> = Parser.Left.From<{
    leftBound: L["leftBound"]
    groups: L["groups"]
    branches: PushRoot<L["branches"], L["root"]>
    root: undefined
}>

export type StateWithMergeableUnion = Parser.state<{
    root: Node.base
    branches: { union: union }
}>

export const hasMergeableUnion = (
    s: Parser.state
): s is StateWithMergeableUnion =>
    s.l.root !== undefined && s.l.branches.union !== undefined

export const mergeUnion = (s: StateWithMergeableUnion) => {
    s.l.branches.union.addMember(s.l.root)
    s.l.root = s.l.branches.union
    s.l.branches.union = undefined as any
    return s
}

export class union extends Node.NonTerminal<Node.base[]> {
    addMember(node: Node.base) {
        this.children.push(node)
    }

    toString() {
        return this.children.map((_) => _.toString()).join("|")
    }

    allows(args: Node.Allows.Args) {
        const unionErrors = args.errors.split(args.ctx.path)
        for (const branch of this.children) {
            const branchErrors = unionErrors.branch(branch.toString())
            if (branch.allows({ ...args, errors: branchErrors })) {
                // If any branch of a Union does not have errors,
                // we can return right away since the whole definition is valid
                return true
            }
        }
        // If we haven't returned, all branches are invalid, so add an error
        const summaryErrorMessage = `${Utils.stringifyValue(
            args.value
        )} is not assignable to any of ${this.toString()}.`
        if (args.cfg.verbose) {
            unionErrors.mergeAll(summaryErrorMessage)
        } else {
            args.errors.add(args.ctx.path, summaryErrorMessage)
        }
        return false
    }

    create(args: Node.Create.Args) {
        // These results are *literally* from the next generation...
        const nextGenResults = this.generateChildren(args)
        if (!nextGenResults.values.length) {
            this.throwAllMembersUngeneratableError(nextGenResults.errors, args)
        }
        for (const constraint of preferredDefaults) {
            const matches = nextGenResults.values.filter((value) =>
                "value" in constraint
                    ? constraint.value === value
                    : constraint.typeOf === typeof value
            )
            if (matches.length) {
                return matches[0]
            }
        }
        throw new Error(
            `Unable to generate a value for unexpected union def ${this.toString()}.`
        )
    }

    private generateChildren(args: Node.Create.Args) {
        const results = {
            values: [] as unknown[],
            errors: [] as string[]
        }
        for (const node of this.children) {
            try {
                results.values.push(node.create(args))
            } catch (error) {
                if (error instanceof Node.Create.UngeneratableError) {
                    results.errors.push(error.message)
                } else {
                    throw error
                }
            }
        }
        return results
    }

    private throwAllMembersUngeneratableError(
        errors: string[],
        args: Node.Create.Args
    ) {
        throw new Node.Create.UngeneratableError(
            this.toString(),
            "None of the definitions can be generated" +
                (args.cfg.verbose ? `:\n${errors.join("\n")}` : ".")
        )
    }
}
