import { attest } from "@arktype/attest"
import { schema } from "@arktype/schema"
import type { IntersectionNode } from "../types/intersection.js"

describe("parse", () => {
	it("single constraint", () => {
		const t = schema({ basis: "string", pattern: ".*" })
		attest<IntersectionNode<string>>(t)
		attest(t.json).snap({ basis: "string", pattern: [".*"] })
	})
	it("multiple constraints", () => {
		const l = schema({
			basis: "number",
			divisor: 3,
			min: 5
		})
		const r = schema({
			basis: "number",
			divisor: 5
		})
		const result = l.and(r)
		attest<IntersectionNode<number>>(result)
		attest(result.json).snap({
			basis: "number",
			divisor: 15,
			min: 5
		})
	})

	// it("errors on all unknown keys", () => {
	// 	attest(() => schema({ foo: "bar", bar: "baz" }))
	// })
	// it("errors on unknown intersection key", () => {
	// 	// @ts-expect-error
	// 	attest(() => schema({ foo: "bar", description:  "baz" }))
	// 		.throws.snap("Error: Key foo is not valid on intersection schema")
	// 		.type.errors.snap("Type 'string' is not assignable to type 'never'.")
	// })
	// TODO: Error here
	// it("errors on unknown morph key", () => {
	// 	// @ts-expect-error
	// 	attest(() => schema({ morph: () => true, foo: "string" }))
	// 		.throws.snap()
	// 		.type.errors.snap()
	// })
})