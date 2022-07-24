import { print } from "@re-/tools"
import { SpaceDictionary } from "../../space.js"
import { Keyword } from "./keyword/keyword.js"
import { BigintLiteral, NumberLiteral } from "./literal.js"
import { Str } from "./str.js"

type ExpressionTree = string | ExpressionTree[]

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

type CurrentBranch = [] | [ExpressionTree, string]

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

export class Parser {
    groups: Str.State.GroupState[]
    branch: CurrentBranch
    expression: ExpressionTree
    branchContext: Str.State.Context
    chars: string[]
    location: number

    constructor(def: string, private dict: SpaceDictionary) {
        this.groups = []
        this.branch = []
        this.expression = ""
        this.chars = [...def, "END"]
        this.location = 0
        this.branchContext = {}
    }

    mergeBranches() {
        if (this.branch.length === 2) {
            this.expression = [this.branch[0], this.branch[1], this.expression]
        }
    }

    shiftBranches() {
        do {
            this.shiftBranch()
        } while (this.shouldContinueBranching())
        this.finalizeExpression()
    }

    finalizeExpression() {
        this.mergeBranches()
        if (this.chars[this.location] === "?") {
            this.shiftOptional()
        }
    }

    shiftOptional() {
        if (this.chars[this.location + 1] !== "END") {
            throw new Error(
                `Modifier '?' is only valid at the end of a definition.`
            )
        }
        this.expression = [this.expression, "?"]
    }

    shouldContinueBranching() {
        if (this.chars[this.location] in expressionTerminating) {
            return false
        }
        this.shiftBranchToken()
        return true
    }

    shiftBranchToken() {
        if (this.branch.length === 0) {
            this.branch = [this.expression, this.chars[this.location]]
        } else {
            this.branch = [
                [this.branch[0], this.branch[1], this.expression],
                this.chars[this.location]
            ]
        }
        this.location++
    }

    shiftBranch() {
        this.shiftBase()
        this.shiftTransforms()
    }

    shiftBase() {
        if (this.chars[this.location] in literalEnclosing) {
            this.shiftEnclosed()
        } else {
            this.shiftNonLiteral()
        }
    }

    shiftNonLiteral() {
        let fragment = ""
        let scanLocation = this.location
        while (!(this.chars[scanLocation] in baseTerminating)) {
            fragment += this.chars[scanLocation]
            scanLocation++
        }
        this.location = scanLocation
        this.reduceNonLiteral(fragment)
    }

    reduceNonLiteral(fragment: string) {
        if (Keyword.matches(fragment)) {
            this.expression = fragment
        } else if (fragment in this.dict) {
            this.expression = fragment
        } else if (NumberLiteral.matches(fragment)) {
            this.expression = fragment
        } else if (BigintLiteral.matches(fragment)) {
            this.expression = fragment
        } else if (fragment === "") {
            throw new Error("Expected an expression.")
        } else {
            throw new Error(`'${fragment}' does not exist in your space.`)
        }
    }

    shiftEnclosed() {
        const enclosing = this.chars[this.location]
        let content = ""
        let scanLocation = this.location + 1
        while (this.chars[scanLocation] !== enclosing) {
            content += this.chars[scanLocation]
            scanLocation++
        }
        this.expression = `${enclosing}${content}${enclosing}`
        this.location = scanLocation + 1
    }

    shiftTransforms() {
        while (!(this.chars[this.location] in branchTerminating)) {
            if (this.chars[this.location] === "[") {
                this.shiftListToken()
            } else if (this.chars[this.location] in comparatorStarting) {
            } else {
                throw new Error(
                    `Invalid operator ${this.chars[this.location]}.`
                )
            }
        }
    }

    shiftListToken() {
        if (this.chars[this.location + 1] === "]") {
            this.expression = [this.expression, "[]"]
            this.location += 2
        } else {
            throw new Error(`Missing expected ].`)
        }
    }
}

const s = new Parser("'string'[]|number|number[]", {})
s.shiftBranches()
console.log(s.expression)
