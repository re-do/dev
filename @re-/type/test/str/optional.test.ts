import { assert } from "@re-/assert"
import { type } from "../../src/index.js"

describe("optional", () => {
    describe("type", () => {
        it("adds undefined to standalone type", () => {
            assert(type("string?").infer).typed as string | undefined
        })
        it("adds undefined to in-object type and makes it optional", () => {
            assert(
                type({
                    required: "boolean",
                    optional: "boolean?"
                }).infer
            ).typed as {
                required: boolean
                optional?: boolean | undefined
            }
        })

        describe("errors", () => {
            it("bad inner type", () => {
                // @ts-expect-error
                assert(() => type("nonexistent?")).throwsAndHasTypeError(
                    "Unable to determine the type of 'nonexistent'."
                )
            })
            it("multiple consecutive", () => {
                // @ts-expect-error
                assert(() => type("boolean??")).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
            it("multiple non-consecutive", () => {
                assert(() =>
                    type({
                        a: "string",
                        // @ts-expect-error
                        b: "number?|string?"
                    })
                ).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
            it("within expression", () => {
                assert(() =>
                    // @ts-expect-error
                    type("boolean?|string|number")
                ).throwsAndHasTypeError(
                    "Modifier '?' is only valid at the end of a type definition."
                )
            })
        })
    })

    describe("validation", () => {
        it("preserves original type", () => {
            assert(type("false?").validate(false).error).is(undefined)
        })
        it("allows undefined", () => {
            assert(type("false?").validate(undefined).error).is(undefined)
        })
        it("allows omission of key", () => {
            assert(
                type({
                    required: "string",
                    optional: "string?"
                }).validate({ required: "" }).error
            ).is(undefined)
        })
        describe("errors", () => {
            it("bad inner type", () => {
                assert(type("true?").validate(false).error?.message).snap(
                    `false is not assignable to true.`
                )
            })
        })
    })
    describe("generation", () => {
        it("standalone is undefined by default", () => {
            assert(type("null?").create()).is(undefined)
        })
        it("optional key is omitted by default", () => {
            assert(
                type({ required: "string", optional: "string?" }).create()
            ).equals({ required: "" })
        })
    })
})
