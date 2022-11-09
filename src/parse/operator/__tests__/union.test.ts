import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { Operand } from "../../operand/operand.js"
import { Unenclosed } from "../../operand/unenclosed.js"
import type { Attributes } from "../../state/attributes.js"
import { compileUnion } from "../union/compile.js"

const testBranches: Attributes[] = [
    {
        type: "dictionary",
        props: {
            kind: {
                value: "1"
            },
            size: {
                type: "number"
            }
        }
    },
    {
        type: "array",
        props: {
            kind: {
                value: "1"
            },
            size: {
                type: "number"
            }
        }
    },
    {
        type: "dictionary",
        props: {
            kind: {
                value: "2"
            },
            size: {
                type: "number"
            }
        }
    },
    {
        type: "array",
        props: {
            kind: {
                value: "2"
            },
            size: {
                type: "number"
            }
        }
    }
]

describe("union", () => {
    test("discriminate", () => {
        attest(compileUnion(testBranches)).snap({
            props: { size: { type: "number" } },
            switch: {
                path: "",
                key: "type",
                cases: {
                    dictionary: {
                        switch: {
                            path: "kind",
                            key: "value",
                            cases: { "1": {}, "2": {} }
                        }
                    },
                    array: {
                        switch: {
                            path: "kind",
                            key: "value",
                            cases: { "1": {}, "2": {} }
                        }
                    }
                }
            }
        })
    })
    describe("infer", () => {
        test("two types", () => {
            attest(type("number|string").infer).typed as number | string
        })
        test("several types", () => {
            attest(type("false|null|undefined|0|''").infer).typed as
                | false
                | ""
                | 0
                | null
                | undefined
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                attest(() => type("number|strng")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("strng")
                )
            })
            test("consecutive tokens", () => {
                // @ts-expect-error
                attest(() => type("boolean||null")).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("|", "|null")
                )
            })
            test("ends with |", () => {
                // @ts-expect-error
                attest(() => type("boolean|")).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("|", "")
                )
            })
            test("long missing union member", () => {
                attest(() =>
                    // @ts-expect-error
                    type("boolean[]|(string|number|)|object")
                ).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("|", ")|object")
                )
            })
        })
    })
})
