import { rootNode } from "@ark/schema"
import type { Submodule } from "../../module.ts"
import type { Branded, constrain, Out } from "../ast.ts"
import { submodule } from "../utils.ts"

declare namespace string {
	export type url = constrain<string, Branded<"url">>
}

const isParsableUrl = (s: string) => {
	if (URL.canParse as unknown) return URL.canParse(s)
	// Can be removed once Node 18 is EOL
	try {
		new URL(s)
		return true
	} catch {
		return false
	}
}

const $root = rootNode({
	domain: "string",
	predicate: {
		meta: "a URL string",
		predicate: isParsableUrl
	}
})

export const url = submodule({
	$root,
	parse: rootNode({
		in: $root as never,
		morphs: (s: string): URL => new URL(s)
	})
})

export type url = Submodule<{
	$root: string.url
	parse: (In: string.url) => Out<URL>
}>
