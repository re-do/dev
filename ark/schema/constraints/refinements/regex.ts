import type { BaseMeta, declareNode } from "../../shared/declare.js"
import {
	type NodeAttachments,
	type PrimitiveAttachments,
	derivePrimitiveAttachments,
	implementNode
} from "../../shared/implement.js"
import type { RawConstraint } from "../constraint.js"
import type { ConstraintAttachments } from "../util.js"

export interface RegexInner extends BaseMeta {
	readonly rule: string
	readonly flags?: string
}

export type NormalizedRegexDef = RegexInner

export type RegexDef = NormalizedRegexDef | string | RegExp

export type RegexDeclaration = declareNode<{
	kind: "regex"
	def: RegexDef
	normalizedDef: NormalizedRegexDef
	inner: RegexInner
	intersectionIsOpen: true
	prerequisite: string
	errorContext: RegexInner
	attachments: RegexAttachments
}>

export interface RegexAttachments
	extends NodeAttachments<RegexDeclaration>,
		PrimitiveAttachments<RegexDeclaration>,
		ConstraintAttachments {
	instance: RegExp
}

export const regexImplementation = implementNode<RegexDeclaration>({
	kind: "regex",
	collapsibleKey: "rule",
	keys: {
		rule: {},
		flags: {}
	},
	normalize: (def) =>
		typeof def === "string" ? { rule: def }
		: def instanceof RegExp ?
			def.flags ?
				{ rule: def.source, flags: def.flags }
			:	{ rule: def.source }
		:	def,
	hasAssociatedError: true,
	intersectionIsOpen: true,
	intersections: {
		// for now, non-equal regex are naively intersected
		regex: () => null
	},
	defaults: {
		description: (node) => `matched by ${node.rule}`
	},
	construct: (self) => {
		const instance = new RegExp(self.rule, self.flags)
		const expression = `${instance}`
		const compiledCondition = expression
		return derivePrimitiveAttachments<RegexDeclaration>({
			instance,
			expression,
			traverseAllows: instance.test.bind(instance),
			compiledCondition: `${expression}.test(data)`,
			compiledNegation: `!${compiledCondition}`,
			impliedBasis: self.$.keywords.string
		})
	}
})

export type RegexNode = RawConstraint<RegexDeclaration>