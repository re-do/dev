import { declare } from ".."
import { expectType, expectError } from "tsd"

describe("declare", () => {
    test("single", () => {
        const { define, compile } = declare("GottaDefineThis")
        const GottaDefineThis = define.GottaDefineThis("boolean")
        // @ts-expect-error
        expect(() => define.SomethingUndeclared("string")).toThrowError()
        const { types, parse } = compile(GottaDefineThis)
        expectType<boolean>(types.GottaDefineThis)
        const result = parse({ a: "GottaDefineThis" })
        expectType<{ a: boolean }>(result)
    })
    test("errors on compile with declared type undefined", () => {
        const { define, compile } = declare(
            "GottaDefineThis",
            "GottaDefineThisToo"
        )
        const GottaDefineThis = define.GottaDefineThis("boolean")
        // @ts-expect-error
        compile(GottaDefineThis)
    })
    test("errors on compile with undeclared type defined", () => {
        const { define, compile } = declare("GottaDefineThis")
        const GottaDefineThis = define.GottaDefineThis("boolean")
        // @ts-expect-error
        compile(GottaDefineThis, { CantDefineThis: "boolean" })
    })
})
