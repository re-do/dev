import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { buildUnterminatedEnclosedMessage } from "../src/parse/string/shift/operand/enclosed.ts"

describe("parse enclosed", () => {
    it("with spaces", () => {
        attest(type("'this has spaces'").infer).typed as "this has spaces"
    })
    it("with neighbors", () => {
        attest(type("'foo'|/.*/[]").infer).typed as "foo" | string[]
    })
    describe("errors", () => {
        describe("unterminated", () => {
            it("regex", () => {
                // @ts-expect-error
                attest(() => type("/.*")).throwsAndHasTypeError(
                    buildUnterminatedEnclosedMessage(".*", "/")
                )
            })
            it("single-quote", () => {
                // @ts-expect-error
                attest(() => type("'.*")).throwsAndHasTypeError(
                    buildUnterminatedEnclosedMessage(".*", "'")
                )
            })
            it("double-quote", () => {
                // @ts-expect-error
                attest(() => type('".*')).throwsAndHasTypeError(
                    buildUnterminatedEnclosedMessage(".*", '"')
                )
            })
        })
    })
    it("single-quoted", () => {
        attest(type("'hello'").infer).typed as "hello"
    })
    it("double-quoted", () => {
        attest(type('"goodbye"').infer).typed as "goodbye"
    })
    it("regex literal", () => {
        attest(type("/.*/").infer).typed as string
    })
    it("invalid regex", () => {
        attest(() => type("/[/")).throws.snap(
            `SyntaxError: Invalid regular expression: /[/: Unterminated character class`
        )
    })
    it("mixed quote types", () => {
        attest(type(`"'single-quoted'"`).infer).typed as "'single-quoted'"

        attest(type(`'"double-quoted"'`).infer).typed as '"double-quoted"'
    })
    it("ignores enclosed tokens", () => {
        attest(type("'yes|no|maybe'").infer).typed as "yes|no|maybe"
    })
    it("mix of enclosed and unenclosed tokens", () => {
        attest(type("'yes|no'|'true|false'").infer).typed as
            | "yes|no"
            | "true|false"
    })
    it("escaped enclosing", () => {
        const t = type("'don\\'t'")
        attest(t.infer).typed as "don't"
        attest(type("'don\\'t'").root).equals({
            string: { value: "don't" }
        })
    })
})
