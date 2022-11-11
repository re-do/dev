import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { scope } from "../../scope.js"
import { ArkType } from "../../type.js"
import type { dictionary } from "../../utils/dynamicTypes.js"
import { buildUnresolvableMessage } from "../operand/unenclosed.js"

describe("dynamic", () => {
    test("uninferred types", () => {
        const dynamicStringArray = ArkType.dynamic("str" + "ing[" + "]")
        attest(dynamicStringArray.infer).typed as unknown
        attest(dynamicStringArray.attributes).equals({
            type: "array",
            props: {
                "*": { type: "string" }
            }
        })
    })
    test("uninferred aliases", () => {
        const s = scope.dynamic({
            a: "str" + "ing[" + "]",
            "b?": "a"
        })
        // Types are inferred as unknown
        attest(s.a.infer).typed as unknown
        // Doesn't allow bad references
        attest(() => {
            // @ts-expect-error
            ArkType({ a: "st" }, { scope: s })
        }).throwsAndHasTypeError(buildUnresolvableMessage("st"))
    })
    test("uninferred scope", () => {
        const unknownScope = scope.dynamic({ a: "string" } as dictionary)
        attest(unknownScope.a.infer).typed as unknown
        // Allows any references but will throw at runtime
        attest(() => unknownScope.b.infer).throws.snap(
            `TypeError: Cannot read properties of undefined (reading 'infer')`
        )
        attest(() => ArkType("b", { scope: unknownScope })).throws(
            buildUnresolvableMessage("b")
        )
    })
})
