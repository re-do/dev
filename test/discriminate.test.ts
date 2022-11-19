import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import type { Attributes } from "../exports.js"
import { compileUnion } from "../src/parse/reduce/attributes/union/compile.js"

const getTestBranches = (): Attributes[] => [
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

describe("union/discriminate", () => {
    test("discriminate", () => {
        attest(compileUnion(getTestBranches())).snap({
            props: { size: { type: "number" } },
            branches: [
                "?",
                "type",
                {
                    dictionary: {
                        branches: ["?", "kind.value", { "1": {}, "2": {} }]
                    },
                    array: {
                        branches: ["?", "kind.value", { "1": {}, "2": {} }]
                    }
                }
            ]
        })
    })
    test("prune", () => {
        attest(compileUnion([...getTestBranches(), { type: "array" }])).snap({
            branches: [
                "?",
                "type",
                {
                    dictionary: {
                        props: { size: { type: "number" } },
                        branches: ["?", "kind.value", { "1": {}, "2": {} }]
                    },
                    array: {}
                }
            ]
        })
    })
})
