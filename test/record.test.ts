import { describe, it } from "mocha"
import { attest } from "../dev/attest/api.ts"
import { type } from "../api.ts"

describe("record", () => {
    it("required", () => {
        const o = type({ a: "string", b: "boolean[]" })
        attest(o.infer).typed as { a: string; b: boolean[] }
        attest(o.root).snap({
            object: {
                props: {
                    a: "string",
                    b: { object: { subdomain: ["Array", "boolean"] } }
                }
            }
        })
    })
    it("optional keys", () => {
        const o = type({ "a?": "string", b: "boolean[]" })
        attest(o.infer).typed as { a?: string; b: boolean[] }
        attest(o.root).snap({
            object: {
                props: {
                    a: ["?", "string"],
                    b: { object: { subdomain: ["Array", "boolean"] } }
                }
            }
        })
    })
    it("escaped optional token", () => {
        const t = type({ "a\\?": "string" })
        attest(t.infer).typed as { "a?": string }
        attest(t.root).equals({
            object: {
                props: { "a?": "string" }
            }
        })
    })
})
