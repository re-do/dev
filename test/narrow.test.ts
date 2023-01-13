import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import type { Type } from "../src/type.ts"
import type { assertEqual } from "../src/utils/generics.ts"

describe("narrow", () => {
    it("functional", () => {
        const isOdd = (n: number) => n % 2 === 1
        const t = type(["number", ":", isOdd])
        attest(t.infer).typed as number
        attest(t.node).equals({ number: { narrow: isOdd as any } })
    })
    it("functional narrowing", () => {
        const t = type(["number", ":", (n): n is 1 => n === 1])
        attest(t).typed as Type<1>
    })
    it("functional parameter inference", () => {
        type Expected = number | boolean[]
        const validateNumberOrBooleanList = <t>(t: assertEqual<t, Expected>) =>
            true
        attest(
            type([
                "number|boolean[]",
                ":",
                (data) => validateNumberOrBooleanList(data)
            ]).infer
        ).typed as number | boolean[]
        attest(() => {
            type([
                "number|boolean[]",
                ":",
                // @ts-expect-error
                (data: number | string[]) => !!data
            ])
        }).type.errors("Type 'boolean' is not assignable to type 'string'.")
    })
    it("distributed", () => {
        const distributedBlacklist = {
            string: (s: string) => s !== "drop tables",
            number: (n: number) => !Number.isNaN(n)
        }
        const t = type(["string|number", ":", distributedBlacklist])
        attest(t.infer).typed as string | number
        attest(t.node).snap({
            string: { narrow: distributedBlacklist.string },
            number: { narrow: distributedBlacklist.number }
        })
    })
    it("distributed narrowing", () => {
        const t = type([
            "string|number",
            ":",
            {
                string: (s): s is "zero" => s === "zero",
                number: (n): n is 0 => n === 0
            }
        ])
        attest(t).typed as Type<"zero" | 0>
    })
    it("distributed parameter inference", () => {
        const validateInferredAsZero = (input: 0) => !input
        attest(() => {
            type([
                "0|boolean[]",
                ":",
                {
                    number: (n) => validateInferredAsZero(n),
                    // @ts-expect-error bad parameter type
                    object: (data: string[]) => !!data,
                    // @ts-expect-error domain not in original type
                    string: (data) => data === ""
                }
            ])
        }).type.errors("Type 'boolean[]' is not assignable to type 'string[]'.")
    })
    it("functional inference in tuple", () => {
        // https://github.com/arktypeio/arktype/issues/565
        // Nesting a tuple expression requiring functional inference in a tuple
        // like this currently breaks validation. This is likely a convoluted TS
        // bug, as the equivalent form in an object literal is correctly inferred.
        // @ts-expect-error
        type([["boolean", ":", (b) => b === true]]).infer
    })
    it("functional inference in scope", () => {
        // There is a problem inferring tuple expressions that
        // reference an object in a scope. Based on some investigation, it has
        // to do with aliases being passed to validateDefinition and an object
        // type being parsed as the input definition. This explains why
        // following two cases don't fail.

        const bad = scope({
            a: [{ a: "1" }, "=>", (data) => `${data}`]
        })
        // @ts-expect-error inferred as never
        attest(bad.a.infer).typed as { a: 1 }

        // works fine if input def is not an object or an alias resolving to an
        // object
        const ok = scope({
            a: ["number", "=>", (data) => `${data}`]
        })
        attest(ok.a.infer).typed as { a: 1 }

        // original form works fine for types
        const okType = type({
            a: [{ a: "1" }, "=>", (data) => `${data}`]
        })
        attest(okType.infer).typed as { a: 1 }
    })
})
