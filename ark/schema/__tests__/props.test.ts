import { attest } from "@arktype/attest"
import { schema } from "@arktype/schema"

describe("props", () => {
	it("normalizes prop order", () => {
		const l = schema({
			domain: "object",
			prop: [
				{ key: "a", value: "string" },
				{ key: "b", value: "number" }
			]
		})
		const r = schema({
			domain: "object",
			prop: [
				{ key: "b", value: "number" },
				{ key: "a", value: "string" }
			]
		})
		attest(l.innerId).equals(r.innerId)
	})
})
