import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../index.js"
import { unresolvableMessage } from "../../str/operand/index.js"
import { extraneousKeysError, missingKeyError } from "../record.js"

describe("map", () => {
    describe("empty", () => {
        const empty = type({})
        test("type", () => {
            assert(empty.infer).typed as {}
        })
        test("validation", () => {
            assert(empty.check({}).errors).is(undefined)
            assert(empty.check([]).errors?.summary).snap(
                `[] is not assignable to {}.`
            )
        })
        test("generation", () => {
            assert(empty.create()).equals({})
        })
    })
    describe("shallow", () => {
        const shallow = () =>
            type({
                a: "string",
                b: "number",
                c: "67"
            })
        test("type", () => {
            assert(shallow().infer).typed as {
                a: string
                b: number
                // TODO: ts-morph 4.8
                c: number
            }
        })
        describe("validation", () => {
            test("standard", () => {
                assert(shallow().check({ a: "ok", b: 4.321, c: 67 }).errors).is(
                    undefined
                )
            })
            test("ignore extraneous keys", () => {
                assert(
                    shallow().check(
                        {
                            a: "ok",
                            b: 4.321,
                            c: 67,
                            d: "extraneous",
                            e: "x-ray-knee-us"
                        },
                        { ignoreExtraneousKeys: true }
                    ).errors
                ).is(undefined)
                // Still errors on missing keys
                assert(
                    shallow().check(
                        {
                            a: "ok",
                            c: 67,
                            d: "extraneous"
                        },

                        { ignoreExtraneousKeys: true }
                    ).errors?.summary
                ).snap(`At path b, missing required value of type number.`)
            })
            describe("errors", () => {
                test("bad value", () => {
                    assert(
                        shallow().check({ a: "ko", b: 123.4, c: 76 }).errors
                            ?.summary
                    ).snap(`At path c, 76 is not assignable to 67.`)
                })
                test("missing keys", () => {
                    assert(
                        shallow().check({ a: "ok" })
                            .errors as any as missingKeyError[]
                    ).snap([
                        {
                            code: `MissingKey`,
                            path: [`b`],
                            definition: `number`,
                            tree: `number`,
                            data: undefined,
                            message: `Missing required value of type number.`,
                            key: `b`
                        },
                        {
                            code: `MissingKey`,
                            path: [`c`],
                            definition: `67`,
                            tree: `67`,
                            data: undefined,
                            message: `Missing required value of type 67.`,
                            key: `c`
                        }
                    ])
                })
                test("extraneous keys", () => {
                    assert(
                        shallow().check({
                            a: "ok",
                            b: 4.321,
                            c: 67,
                            d: "extraneous",
                            e: "x-ray-knee-us"
                        }).errors as any as extraneousKeysError[]
                    ).snap([
                        {
                            code: `ExtraneousKeys`,
                            path: [],
                            definition: `{
    a: string,
    b: number,
    c: 67
}`,
                            tree: { a: `string`, b: `number`, c: `67` },
                            data: {
                                a: `ok`,
                                b: 4.321,
                                c: 67,
                                d: `extraneous`,
                                e: `x-ray-knee-us`
                            },
                            keys: [`d`, `e`],
                            message: `Keys 'd', 'e' were unexpected.`
                        }
                    ])
                })
                test("missing and extraneous keys", () => {
                    assert(
                        shallow().check({
                            a: "ok",
                            d: "extraneous",
                            e: "x-ray-knee-us"
                        }).errors?.summary
                    ).snap(`Encountered errors at the following paths:
  b: Missing required value of type number.
  c: Missing required value of type 67.
  /: Keys 'd', 'e' were unexpected.
`)
                })
            })
        })
        test("generation", () => {
            assert(shallow().create()).equals({ a: "", b: 0, c: 67 })
        })
    })
    describe("nested", () => {
        const nested = () =>
            type({
                nested: {
                    russian: "'doll'"
                }
            })
        describe("type", () => {
            test("standard", () => {
                assert(nested().infer).typed as {
                    nested: {
                        russian: "doll"
                    }
                }
            })
            describe("errors", () => {
                test("invalid prop def", () => {
                    assert(() =>
                        // @ts-expect-error
                        type({ a: { b: "whoops" } })
                    ).throwsAndHasTypeError(unresolvableMessage("whoops"))
                })
            })
        })
        describe("validation", () => {
            test("standard", () => {
                assert(
                    nested().check({ nested: { russian: "doll" } }).errors
                ).is(undefined)
            })
            describe("errors", () => {
                test("bad prop value", () => {
                    assert(
                        nested().check({ nested: { russian: "tortoise" } })
                            .errors?.summary
                    ).snap(
                        `At path nested/russian, "tortoise" is not assignable to 'doll'.`
                    )
                })
                test("multiple", () => {
                    assert(
                        type({
                            a: { b: "string" },
                            c: { d: "number" },
                            e: { f: "object" }
                        }).check({
                            a: {},
                            c: { d: 20, y: "why?" },
                            e: { f: 0n }
                        }).errors?.summary
                    ).snap(`Encountered errors at the following paths:
  a/b: Missing required value of type string.
  c: Keys 'y' were unexpected.
  e/f: 0n is not assignable to object.
`)
                })
            })
        })
        test("generation", () => {
            assert(nested().create()).equals({ nested: { russian: "doll" } })
        })
    })
})
