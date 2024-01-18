import type { declareNode, withBaseMeta } from "../shared/declare.js"
import { BaseRefinement } from "./refinement.js"

export type PatternInner = withBaseMeta<{
	readonly source: string
	readonly flags?: string
}>

export type NormalizedPatternSchema = PatternInner

export type PatternSchema = NormalizedPatternSchema | string | RegExp

export type PatternDeclaration = declareNode<{
	kind: "pattern"
	schema: PatternSchema
	normalizedSchema: NormalizedPatternSchema
	inner: PatternInner
	intersections: {
		pattern: "pattern" | null
	}
	prerequisite: string
}>

export class PatternNode extends BaseRefinement<
	PatternDeclaration,
	typeof PatternNode
> {
	static implementation = this.implement({
		collapseKey: "source",
		keys: {
			source: {},
			flags: {}
		},
		normalize: (schema) =>
			typeof schema === "string"
				? { source: schema }
				: schema instanceof RegExp
				? schema.flags
					? { source: schema.source, flags: schema.flags }
					: { source: schema.source }
				: schema,
		intersections: {
			// For now, non-equal regex are naively intersected
			pattern: () => null
		},
		hasAssociatedError: true,
		defaults: {
			description(inner) {
				return `matched by ${inner.source}`
			}
		}
	})

	readonly hasOpenIntersection = true
	regex = new RegExp(this.source, this.flags)
	traverseAllows = this.regex.test
	compiledCondition = `/${this.source}/${this.flags ?? ""}.test(${
		this.$.dataArg
	})`
	compiledNegation = `!${this.compiledCondition}`

	getCheckedDefinitions() {
		return ["string"] as const
	}
}