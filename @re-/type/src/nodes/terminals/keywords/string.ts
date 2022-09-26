import type {
    BoundableNode,
    BoundConstraint
} from "../../constraints/bounds.js"
import type { Constraint } from "../../constraints/constraint.js"
import { ConstraintGenerationError } from "../../constraints/constraint.js"
import type { Check } from "../../traverse/exports.js"
import type { TerminalConstructorArgs } from "../terminal.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class StringNode
    extends TerminalNode<StringTypedDefinition>
    implements BoundableNode
{
    bounds: BoundConstraint | null = null
    regex?: RegexConstraint

    constructor(...args: TerminalConstructorArgs<StringTypedDefinition>) {
        super(...args)
        if (this.def === "string") {
            return
        }
        if (this.definitionIsKeyOf(stringSubtypes)) {
            this.regex = stringSubtypes[this.def]
        } else {
            this.regex = new RegexConstraint(
                new RegExp(this.def.slice(1, -1)),
                this.def,
                `Must match expression ${this.def}`
            )
        }
    }

    check(state: Check.CheckState) {
        if (!state.dataIsOfType("string")) {
            if (this.def === "string") {
                addTypeKeywordDiagnostic(state, "string", "Must be a string")
            } else {
                addTypeKeywordDiagnostic(
                    state,
                    this.def,
                    "Must be a string",
                    "string"
                )
            }
            return
        }
        this.regex?.check(state)
        this.bounds?.check(state)
    }

    generate() {
        if (this.regex || this.bounds) {
            throw new ConstraintGenerationError(this.toString())
        }
        return ""
    }
}

export class RegexConstraint implements Constraint {
    constructor(
        public expression: RegExp,
        private definition: StringSubtypeDefinition,
        private description: string
    ) {}

    check(state: Check.CheckState<string>) {
        if (!this.expression.test(state.data)) {
            state.errors.add(
                "regex",
                { reason: this.description, state: state },
                {
                    definition: this.definition,
                    data: state.data,
                    actual: `"${state.data}"`,
                    expression: this.expression
                }
            )
        }
    }
}

export type RegexDiagnostic = Check.DiagnosticConfig<{
    definition: StringSubtypeDefinition
    data: string
    expression: RegExp
    actual: `"${string}"`
}>

export const stringSubtypes: Record<
    Exclude<StringTypedKeyword, "string">,
    RegexConstraint
> = {
    email: new RegexConstraint(
        /^(.+)@(.+)\.(.+)$/,
        "email",
        "Must be a valid email"
    ),
    alpha: new RegexConstraint(
        /^[A-Za-z]+$/,
        "alpha",
        "Must include only letters"
    ),
    alphanumeric: new RegexConstraint(
        /^[\dA-Za-z]+$/,
        "alphanumeric",
        "Must include only letters and digits"
    ),
    lowercase: new RegexConstraint(
        /^[a-z]*$/,
        "lowercase",
        "Must include only lowercase letters"
    ),
    uppercase: new RegexConstraint(
        /^[A-Z]*$/,
        "uppercase",
        "Must include only uppercase letters"
    )
}

export const stringTypedKeywords = {
    string: StringNode,
    email: StringNode,
    alpha: StringNode,
    alphanumeric: StringNode,
    lowercase: StringNode,
    uppercase: StringNode
}

export type StringTypedKeyword = keyof typeof stringTypedKeywords

export type StringSubtypeKeyword = keyof typeof stringSubtypes

export type StringSubtypeDefinition =
    | StringSubtypeKeyword
    | RegexLiteralDefinition

export type RegexLiteralDefinition = `/${string}/`

export type StringTypedDefinition = StringTypedKeyword | RegexLiteralDefinition
