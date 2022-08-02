// TODO: Remove this
/* eslint-disable max-lines */
import { Base } from "./base/index.js"
import {
    Bounds,
    IntersectionNode,
    List,
    OptionalNode,
    UnionNode
} from "./nonTerminal/index.js"
import {
    AliasNode,
    BigintLiteralNode,
    Keyword,
    NumberLiteralNode,
    RegexNode,
    StringLiteralNode
} from "./terminal/index.js"

const expressionTerminating = {
    ")": 1,
    "?": 1,
    END: 1
}

const branchStarting = {
    "|": 1,
    "&": 1
}

const transformStarting = {
    "[": 1
}

const literalEnclosing = {
    "'": 1,
    '"': 1,
    "/": 1
}

type LiteralEnclosing = keyof typeof literalEnclosing

const comparatorStarting = {
    "<": 1,
    ">": 1,
    "=": 1
}

const branchTerminating = {
    ...expressionTerminating,
    ...branchStarting
}

const baseTerminating = {
    ...transformStarting,
    ...comparatorStarting,
    ...branchTerminating,
    " ": 1
}

type BranchState = {
    union?: UnionNode
    intersection?: IntersectionNode
    ctx: any
}

export class Parser {
    groups: BranchState[]
    branches: BranchState
    expression?: Base.Node
    chars: string[]
    scan: number

    constructor(def: string, private ctx: Base.Parsing.Context) {
        this.groups = []
        this.branches = { ctx: {} }
        this.chars = [...def, "END"]
        this.scan = 0
    }

    get lookahead() {
        return this.chars[this.scan]
    }

    get nextLookahead() {
        return this.chars[this.scan + 1]
    }

    shiftBranches() {
        do {
            this.shiftBranch()
        } while (this.shouldContinueBranching())
        this.finalizeExpression()
    }

    finalizeExpression() {
        this.mergeUnion()
        if (this.lookahead === "?") {
            this.shiftOptional()
        } else if (this.lookahead === ")") {
            this.popGroup()
        }
    }

    shiftOptional() {
        if (this.nextLookahead !== "END") {
            throw new Error(
                `Modifier '?' is only valid at the end of a definition.`
            )
        }
        this.expression = new OptionalNode(this.expression!, this.ctx)
    }

    shouldContinueBranching() {
        if (this.lookahead in expressionTerminating) {
            return false
        } else if (this.lookahead === "|") {
            this.shiftUnion()
        } else {
            this.shiftIntersection()
        }
        return true
    }

    shiftUnion() {
        this.mergeIntersection()
        if (!this.branches.union) {
            this.branches.union = new UnionNode([this.expression!], this.ctx)
        } else {
            this.branches.union.addMember(this.expression!)
        }
        this.expression = undefined
        this.scan++
    }

    mergeUnion() {
        if (this.branches.union) {
            this.mergeIntersection()
            this.branches.union.addMember(this.expression!)
            this.expression = this.branches.union
            this.branches.union = undefined
        }
    }

    shiftIntersection() {
        if (!this.branches.intersection) {
            this.branches.intersection = new IntersectionNode(
                [this.expression!],
                this.ctx
            )
        } else {
            this.branches.intersection.addMember(this.expression!)
        }
        this.expression = undefined
        this.scan++
    }

    mergeIntersection() {
        if (this.branches.intersection) {
            this.branches.intersection.addMember(this.expression!)
            this.expression = this.branches.intersection
            this.branches.intersection = undefined
        }
    }

    shiftBranch() {
        this.shiftBase()
        this.shiftTransforms()
    }

    shiftBase() {
        if (this.lookahead === "(") {
            this.shiftGroup()
        } else if (this.lookahead in literalEnclosing) {
            this.shiftEnclosed()
        } else if (this.lookahead === " ") {
            this.scan++
            this.shiftBase()
        } else {
            this.shiftNonLiteral()
        }
    }

    shiftGroup() {
        this.groups.push(this.branches)
        this.branches = { ctx: {} }
        this.scan++
        this.shiftBranches()
    }

    popGroup() {
        const previousBranches = this.groups.pop()
        if (previousBranches === undefined) {
            throw new Error(`Unexpected ).`)
        }
        this.branches = previousBranches
        this.scan++
    }

    shiftNonLiteral() {
        let fragment = ""
        let scanAhead = this.scan
        while (!(this.chars[scanAhead] in baseTerminating)) {
            fragment += this.chars[scanAhead]
            scanAhead++
        }
        this.scan = scanAhead
        this.reduceNonLiteral(fragment)
    }

    reduceNonLiteral(fragment: string) {
        if (Keyword.matches(fragment)) {
            this.expression = Keyword.parse(fragment)
        } else if (AliasNode.matches(fragment, this.ctx)) {
            this.expression = new AliasNode(fragment, this.ctx)
        } else if (NumberLiteralNode.matches(fragment)) {
            this.expression = new NumberLiteralNode(fragment)
        } else if (BigintLiteralNode.matches(fragment)) {
            this.expression = new BigintLiteralNode(fragment)
        } else if (fragment === "") {
            throw new Error("Expected an expression.")
        } else {
            throw new Error(`'${fragment}' does not exist in your space.`)
        }
    }

    shiftEnclosed() {
        const enclosedBy = this.lookahead as LiteralEnclosing
        let text = ""
        let scanAhead = this.scan + 1
        while (this.chars[scanAhead] !== enclosedBy) {
            if (this.chars[scanAhead] === "END") {
                throw new Error(
                    `'${enclosedBy}${text} requires a closing ${enclosedBy}.`
                )
            }
            text += this.chars[scanAhead]
            scanAhead++
        }
        if (enclosedBy === "/") {
            this.expression = new RegexNode(new RegExp(text))
        } else {
            this.expression = new StringLiteralNode(text, enclosedBy)
        }
        this.scan = scanAhead + 1
    }

    shiftTransforms() {
        while (!(this.lookahead in branchTerminating)) {
            if (this.lookahead === "[") {
                this.shiftListToken()
            } else if (this.lookahead in comparatorStarting) {
                throw new Error(`Bounds are not yet implemented.`)
            } else if (this.lookahead === " ") {
                this.scan++
            } else {
                throw new Error(`Invalid operator ${this.lookahead}.`)
            }
        }
    }

    shiftListToken() {
        if (this.nextLookahead === "]") {
            this.expression = new List.ListNode(this.expression!, this.ctx)
            this.scan += 2
        } else {
            throw new Error(`Missing expected ].`)
        }
    }

    shiftComparatorToken() {
        if (this.nextLookahead === "=") {
            this.scan += 2
            this.reduceBound(
                `${this.lookahead}${this.nextLookahead}` as ComparatorToken
            )
        } else if (this.lookahead === "=") {
            throw new Error(`= is not a valid comparator. Use == instead.`)
        } else {
            this.scan++
            this.reduceBound(this.lookahead as ComparatorToken)
        }
    }

    reduceBound(token: ComparatorToken) {
        if (Bounds.isBoundable(this.expression!)) {
            this.reduceRightBound(this.expression!, token)
        } else if (this.expression instanceof NumberLiteralNode) {
            this.reduceLeftBound(this.expression.value, token)
        } else {
            throw new Error(
                `Left side of comparator ${token} must be a number literal or boundable definition (got ${this.expression!.toString()}).`
            )
        }
    }

    reduceRightBound(expression: Bounds.Boundable, token: ComparatorToken) {
        if (this.branches.ctx.rightBounded) {
            throw new Error(
                `Right side of comparator ${token} cannot be bounded more than once.`
            )
        }
        this.branches.ctx.rightBounded = true
        const bounded = this.expression
        this.shiftBranch()
        if (this.expression instanceof NumberLiteralNode) {
            this.expression = bounded
            // Apply bound
        } else {
            throw new Error(
                `Right side of comparator ${token} must be a number literal.`
            )
        }
    }

    reduceLeftBound(value: number, token: ComparatorToken) {
        if (this.branches.ctx.leftBounded) {
            throw new Error(
                `Left side of comparator ${token} cannot be bounded more than once.`
            )
        }
        this.branches.ctx.leftBounded = true
        this.shiftBranch()
        if (Bounds.isBoundable(this.expression!)) {
            // Apply bound
        } else {
            throw new Error(
                `Right side of comparator ${token} must be a numbed-or-string-typed keyword or a list-typed expression.`
            )
        }
    }
}

type ComparatorToken = "<=" | ">=" | "<" | ">" | "=="
