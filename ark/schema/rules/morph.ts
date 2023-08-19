import type { BaseDefinition } from "../node.js"
import { RuleNode } from "./rule.js"

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export interface MorphDefinition extends BaseDefinition {
	readonly value: string
}

export class MorphNode extends RuleNode<MorphDefinition> {
	readonly kind = "divisor"

	writeDefaultDescription() {
		return this.value
	}

	protected reduceRules(other: MorphNode) {
		return null
	}
}
