import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import type { Out, string, To } from "arktype/internal/keywords/ast.ts"

contextualize(() => {
	it("json", () => {
		const parseJson = type("string.json.parse")
		attest(parseJson('{"a": "hello"}')).snap({ a: "hello" })
		attest(parseJson(123).toString()).snap("must be a string (was number)")
		attest(parseJson("foo").toString()).snap(
			'must be a valid JSON string (was "foo")'
		)
	})

	it("number", () => {
		const parseNum = type("string.numeric.parse")
		attest(parseNum("5")).equals(5)
		attest(parseNum("5.5")).equals(5.5)
		attest(parseNum("five").toString()).equals(
			'must be a well-formed numeric string (was "five")'
		)
	})

	it("integer", () => {
		const parseInt = type("string.integer.parse")
		attest(parseInt("5")).equals(5)
		attest(parseInt("5.5").toString()).equals(
			'must be a well-formed integer string (was "5.5")'
		)
		attest(parseInt("five").toString()).equals(
			'must be a well-formed integer string (was "five")'
		)
		attest(parseInt(5).toString()).snap("must be a string (was number)")
		attest(parseInt("9007199254740992").toString()).equals(
			'must be an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER (was "9007199254740992")'
		)
	})

	it("date", () => {
		const parseDate = type("parse.date")
		attest(parseDate("5/21/1993").toString()).snap(
			"Fri May 21 1993 00:00:00 GMT-0400 (Eastern Daylight Time)"
		)
		attest(parseDate("foo").toString()).equals(
			'must be a valid date (was "foo")'
		)
		attest(parseDate(5).toString()).snap("must be a string (was number)")
	})

	it("formData", () => {
		const user = type({
			email: "string.email",
			file: "object.File",
			tags: "liftArray<string>"
		})

		const parseUserForm = type("object.FormData.parse").pipe(user)

		attest(parseUserForm).type.toString.snap()

		// support Node18
		if (!globalThis.File) return

		const data = new FormData()
		const file = new File([], "")

		data.append("email", "david@arktype.io")
		data.append("file", file)
		data.append("tags", "typescript")
		data.append("tags", "arktype")

		const out = parseUserForm(data)
		attest(out).equals({
			email: "david@arktype.io",
			file,
			tags: ["typescript", "arktype"]
		})

		data.set("email", "david")
		data.set("file", null)
		data.append("tags", file)

		attest(parseUserForm(data).toString())
			.snap(`email must be an email address (was "david")
file must be an instance of File (was string)
tags[2] must be a string (was object)`)
	})
})
