import type { Schema } from "../../schema.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import {
	type NodeAttachments,
	type PrimitiveAttachments,
	derivePrimitiveAttachments,
	implementNode
} from "../../shared/implement.js"
import type { RawConstraint } from "../constraint.js"
import {
	type ConstraintAttachments,
	writeInvalidOperandMessage
} from "../util.js"

export interface DivisorInner extends BaseMeta {
	readonly rule: number
}

export type DivisorDef = DivisorInner | number

export type DivisorDeclaration = declareNode<{
	kind: "divisor"
	def: DivisorDef
	normalizedDef: DivisorInner
	inner: DivisorInner
	prerequisite: number
	errorContext: DivisorInner
	attachments: DivisorAttachments
}>

export interface DivisorAttachments
	extends NodeAttachments<DivisorDeclaration>,
		PrimitiveAttachments<DivisorDeclaration>,
		ConstraintAttachments {}

export const divisorImplementation = implementNode<DivisorDeclaration>({
	kind: "divisor",
	collapsibleKey: "rule",
	keys: {
		rule: {}
	},
	normalize: (def) => (typeof def === "number" ? { rule: def } : def),
	intersections: {
		divisor: (l, r, ctx) =>
			ctx.$.node("divisor", {
				rule: Math.abs(
					(l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule)
				)
			})
	},
	hasAssociatedError: true,
	defaults: {
		description: (node) =>
			node.rule === 1 ? "an integer" : `a multiple of ${node.rule}`
	},
	construct: (self) => {
		return derivePrimitiveAttachments<DivisorDeclaration>({
			compiledCondition: `data % ${self.rule} === 0`,
			compiledNegation: `data % ${self.rule} !== 0`,
			impliedBasis: self.$.keywords.number,
			expression: `% ${self.rule}`,
			traverseAllows: (data) => data % self.rule === 0
		})
	}
})

export type DivisorNode = RawConstraint<DivisorDeclaration>

export const writeIndivisibleMessage = <node extends Schema>(
	t: node
): writeIndivisibleMessage<node> =>
	writeInvalidOperandMessage("divisor", t.$.raw.keywords.number, t)

export type writeIndivisibleMessage<node extends Schema> =
	writeInvalidOperandMessage<"divisor", node>

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisor = (l: number, r: number) => {
	let previous: number
	let greatestCommonDivisor = l
	let current = r
	while (current !== 0) {
		previous = current
		current = greatestCommonDivisor % current
		greatestCommonDivisor = previous
	}
	return greatestCommonDivisor
}