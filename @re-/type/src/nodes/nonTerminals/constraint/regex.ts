import type { StringSubtypeDefinition } from "../../terminals/keywords/string.js"
import type { Check } from "../../traverse/exports.js"
import type { BaseCondition } from "./constraint.js"

export namespace Regex {
    export class Condition implements BaseCondition {
        constructor(
            private expression: RegExp,
            private definition: StringSubtypeDefinition,
            private description: string
        ) {}

        check(state: Check.CheckState<string>) {
            if (!this.expression.test(state.data)) {
                state.errors.add(
                    "regex",
                    { reason: this.description, state },
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

    export type Diagnostic = Check.DiagnosticConfig<{
        definition: StringSubtypeDefinition
        data: string
        expression: RegExp
        actual: `"${string}"`
    }>

    export const keywords = {
        email: new Regex.Condition(
            /^(.+)@(.+)\.(.+)$/,
            "email",
            "Must be a valid email"
        ),
        alpha: new Regex.Condition(
            /^[A-Za-z]+$/,
            "alpha",
            "Must include only letters"
        ),
        alphanumeric: new Regex.Condition(
            /^[\dA-Za-z]+$/,
            "alphanumeric",
            "Must include only letters and digits"
        ),
        lowercase: new Regex.Condition(
            /^[a-z]*$/,
            "lowercase",
            "Must include only lowercase letters"
        ),
        uppercase: new Regex.Condition(
            /^[A-Z]*$/,
            "uppercase",
            "Must include only uppercase letters"
        )
    }
}
