import { assert } from "@re-/assert"
import { narrow } from "@re-/tools"
import { describe, test } from "mocha"
import { space } from "../api.js"

describe("space validation", () => {
    test("simple space", () => {
        const groceries = space({
            banana: {
                length: "number",
                description: "string"
            },
            apple: { circumference: "number", type: "string" },
            fruit: "banana|apple"
        }).$.type({ fruits: "fruit[]" })
        assert(
            groceries.check({
                fruits: [
                    { length: 10, description: "ripe" },
                    { circumference: 4.832321, type: "Granny Smith" },
                    { length: 15, description: "nice" }
                ]
            }).errors
        ).equals(undefined)
        assert(
            groceries.check({
                fruits: [
                    {
                        length: 5000,
                        type: "slippery"
                    },
                    { circumference: 3.14159, description: "Fuji" }
                ]
            }).errors?.summary
        ).snap()
    })
    test("cyclic space", () => {
        const bicycle = space({
            a: { a: "a?", b: "b?", isA: "true" },
            b: { a: "a?", b: "b?", isA: "false" },
            either: "a|b"
        }).$.type({ a: "a", b: "b", c: "either[]" })
        assert(
            bicycle.check({
                a: {
                    isA: true,
                    a: { isA: true },
                    b: { isA: false, a: { isA: true } }
                },
                b: { isA: false },
                c: [
                    { isA: false, a: { isA: true } },
                    { isA: true, b: { isA: false } }
                ]
            }).errors
        ).equals(undefined)
        assert(
            bicycle.check({
                a: {
                    isA: true,
                    a: {
                        isA: true,
                        a: {
                            isA: true,
                            a: {
                                isA: true,
                                a: {
                                    isA: true,
                                    a: { isA: true, a: { isA: false } }
                                }
                            }
                        }
                    }
                },
                b: {
                    isA: false,
                    b: {
                        isA: false,
                        b: {
                            isA: false,
                            b: {
                                isA: false,
                                b: {
                                    isA: false,
                                    b: { isA: false, b: { isA: true } }
                                }
                            }
                        }
                    }
                },
                c: [
                    { isA: true },
                    { isA: false },
                    { isA: true },
                    { isA: false },
                    { isA: true },
                    { isA: false },
                    { isA: true },
                    { isA: false },
                    { isA: "the duck goes quack" }
                ]
            }).errors?.summary
        ).snap()
    })
    const recursiveDict = narrow({ dejaVu: { dejaVu: "dejaVu?" } })
    test("validates recursive objects", () => {
        const recursive = space(recursiveDict)
        type DejaVu = typeof recursive.$.infer.dejaVu
        const dejaVu: DejaVu = {}
        dejaVu.dejaVu = dejaVu
        assert(recursive.dejaVu.check(dejaVu).errors).equals(undefined)
    })
    test("validates deep objects", () => {
        const recursive = space(recursiveDict)
        const dejaVu: typeof recursive.$.infer.dejaVu = {}
        let i = 0
        let current = dejaVu
        while (i < 50) {
            current.dejaVu = { dejaVu: {} }
            current = current.dejaVu
            i++
        }
        assert(recursive.dejaVu.check(dejaVu).errors).equals(undefined)
        current.dejaVu = "whoops" as any
        assert(recursive.dejaVu.check(dejaVu).errors?.summary).snap()
    })
})
