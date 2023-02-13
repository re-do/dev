import { describe, it } from "mocha"
import { literal, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("===", () => {
    it("base", () => {
        const s = Symbol("test")
        const t = type(["===", s])
        attest(t.infer).typed as symbol
        attest(t.node).equals({ symbol: { value: s } })
        attest(t(s).data).equals(s)
        attest(t("test").problems?.summary).snap(
            "Must be (symbol test) (was 'test')"
        )
    })
    it("helper", () => {
        const myRef = { a: "bc" as const }
        const myObj = literal(myRef)
        attest(myObj.infer).typed as { a: "bc" }
        attest(myObj(myRef).data).equals(myRef)
        attest(myObj({ a: "bc" }).problems?.summary).snap(
            // Message should be improved for cases like this:
            // https://github.com/arktypeio/arktype/issues/622
            'Must be {"a":"bc"} (was {"a":"bc"})'
        )
    })
})
