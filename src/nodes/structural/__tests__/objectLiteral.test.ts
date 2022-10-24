import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../api.js"

describe("object", () => {
    describe("infer", () => {
        test("base", () => {
            attest(
                type({
                    a: "0"
                }).infer
            ).typed as { a: 0 }
        })
        test("with optional key", () => {
            attest(
                type({
                    required: "boolean",
                    optional: "boolean?"
                }).infer
            ).typed as {
                required: boolean
                optional?: boolean | undefined
            }
        })
        test("empty", () => {
            attest(type({}).infer).typed as {}
        })
    })
    describe("check", () => {
        const shallowInputDef = {
            a: "string",
            b: "number",
            c: "67"
        } as const
        const shallow = type.lazy(shallowInputDef)
        const nested = type.lazy({ nest: { ed: "string" } })
        test("standard", () => {
            attest(shallow.check({ a: "ok", b: 4.321, c: 67 }).problems).is(
                undefined
            )
        })
        test("nested", () => {
            attest(nested.check({ nest: { ed: "!" } }).problems).is(undefined)
        })
        describe("errors", () => {
            test("bad value", () => {
                attest(
                    shallow.check({ a: "ko", b: 123.4, c: 76 }).problems
                        ?.summary
                ).snap(`c must be 67 (was 76)`)
            })
            test("bad nested value", () => {
                attest(
                    nested.check({ nest: { ed: null } }).problems?.summary
                ).snap(`nest/ed must be a string (was null)`)
            })
            test("missing keys", () => {
                attest(shallow.check({ a: "ok" }).problems?.summary)
                    .snap(`b: b is required
c: c is required`)
            })
            // TODO: Reenable
            // test("extraneous keys", () => {
            //     attest(
            //         type(shallowInputDef, {
            //             // errors: {
            //             //     extraneousKeys: { enabled: true }
            //             // }
            //         }).check({
            //             // errors: {
            //             //     extraneousKeys: { enabled: true }
            //             // }
            //         }).errors?.summary
            //     ).snap()
            // })
            // test("single extraneous", () => {
            //     attest(
            //         type(shallowInputDef, {
            //             // errors: {
            //             //     extraneousKeys: { enabled: true }
            //             // }
            //         }).check({
            //             a: "",
            //             b: 1,
            //             c: 67,
            //             extraneous: true
            //         }).errors?.summary
            //     ).snap("<undefined>")
            // })
        })
    })
})
