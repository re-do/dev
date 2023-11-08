import { attest } from "@arktype/attest"
import { scope, type } from "arktype"

import { writeBadDefinitionTypeMessage } from "../parser/definition.js"
import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.js"

describe("thunk", () => {
	it("thunk", () => {
		const t = type(() => type("boolean"))
		attest<boolean>(t.infer)
		attest(() => {
			// @ts-expect-error
			type(() => type("moolean"))
		}).throwsAndHasTypeError(writeUnresolvableMessage("moolean"))
	})
	it("thunks in scope", () => {
		const $ = scope({
			a: () => $.type({ b: "b" }),
			b: () => $.type({ a: "string" })
		})
		attest<{
			a: {
				b: {
					a: string
				}
			}
			b: {
				a: string
			}
		}>($.infer)

		const types = $.export()
		attest<{
			b: {
				a: string
			}
		}>(types.a.infer)

		// attest(types.a.node).snap({ object: { props: { b: "b" } } })
		attest<{ a: string }>(types.b.infer)

		// attest(types.b.node).snap({
		//     object: { props: { a: { object: { props: { a: "string" } } } } }
		// })
	})
	it("expression from thunk", () => {
		const $ = scope({
			a: () => $.type({ a: "string" }),
			b: { b: "boolean" },
			aAndB: () => $.type("a&b")
		})
		const types = $.export()
		attest<{ a: string; b: boolean }>(types.aAndB.infer)
		// attest(types.aAndB.node).snap({
		//     object: { props: { a: "string", b: "boolean" } }
		// })
	})
	it("shallow thunk in type", () => {
		const t = type(() => type("string"))
		attest(t.condition).equals(type("string").condition)
		attest<string>(t.infer)
	})
	it("deep thunk in type", () => {
		const t = type({ a: () => type("string") })
		attest(t.condition).equals(type({ a: "string" }).condition)
		attest<{ a: string }>(t.infer)
	})
	it("non-type thunk in scope", () => {
		const $ = scope({
			a: () => 42
		})
		attest(() => $.export()).throws(writeBadDefinitionTypeMessage("number"))
	})
	it("parse error in thunk in scope", () => {
		const $ = scope({
			// @ts-expect-error
			a: () => $.type("bad")
		})
		attest(() => $.export()).throws(writeUnresolvableMessage("bad"))
	})
})
