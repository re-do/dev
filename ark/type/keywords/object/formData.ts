import { rootNode } from "@ark/schema"
import type { Module, Submodule } from "../../module.ts"
import type { Out } from "../ast.ts"
import { submodule } from "../utils.ts"

export type FormDataValue = string | File

export type ParsedFormData = Record<string, FormDataValue | FormDataValue[]>

// support Node18
const File = globalThis.File ?? Blob

export const formData: Module<formData> = submodule({
	$root: ["instanceof", FormData],
	parse: rootNode({
		in: FormData,
		morphs: (data: formData): ParsedFormData => {
			const result: ParsedFormData = {}

			// no cast is actually required here, but with
			// typescript.tsserver.experimental.enableProjectDiagnostics: true
			// this file periodically displays as having an error, likely due to the
			// lack of a `File` type.
			type FormDataEntries = [string, FormDataValue][]
			for (const [k, v] of data as {} as FormDataEntries) {
				if (k in result) {
					const existing = result[k]
					if (typeof existing === "string" || existing instanceof File)
						result[k] = [existing, v]
					else existing.push(v)
				} else result[k] = v
			}
			return result
		}
	})
})

export type formData = Submodule<{
	$root: FormData
	parse: (In: FormData) => Out<ParsedFormData>
}>
