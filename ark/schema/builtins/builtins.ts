import { ScopeNode } from "../scope.js"
import type { TypeKind } from "../shared/implement.js"
import type { inferred } from "../shared/inference.js"
import { JsObjects } from "./jsObjects.js"
import { TsKeywords } from "./tsKeywords.js"
import { Validation } from "./validation.js"

export const builtins: ScopeNode<ArkResolutions> = ScopeNode.from(
	{
		...TsKeywords.resolutions,
		...JsObjects.resolutions,
		...Validation.resolutions
	},
	{ prereducedAliases: true }
) as never

export const nodes = builtins.resolutions

export const schema = builtins.schema

export namespace schema {
	export type cast<to, kind extends TypeKind = TypeKind> = {
		[inferred]?: to
		kind?: kind
	}
}

export type isSchemaCast<def> = typeof inferred | "kind" extends keyof def
	? true
	: false

// this type is redundant with the inferred definition of ark but allow types
// derived from the default scope to be calulated more efficiently
export interface ArkResolutions
	extends TsKeywords.resolutions,
		JsObjects.resolutions,
		Validation.resolutions {}