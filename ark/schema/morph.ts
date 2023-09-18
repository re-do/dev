import type { conform } from "@arktype/util"
import { Hkt } from "@arktype/util"
import type { BasisInput } from "./constraints/basis.js"
import { compileSerializedValue } from "./io/compile.js"
import type { TraversalState } from "./io/traverse.js"
import type {
	parsePredicate,
	PredicateInput,
	PredicateNode
} from "./predicate.js"
import type { BaseAttributes, Node } from "./type.js"
import { TypeNode } from "./type.js"

export type MorphSchema = BaseAttributes & {
	in: PredicateNode
	out: PredicateNode
	morphs: readonly Morph[]
}

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export type MorphInput = BaseAttributes & {
	in?: PredicateInput
	out?: PredicateInput
	morphs: readonly Morph[]
}

export class MorphNode<t = unknown> extends TypeNode<MorphSchema> {
	readonly kind = "predicate"

	protected constructor(schema: MorphSchema) {
		super(schema)
	}

	inId = this.in.inId
	outId = this.out.outId
	typeId = JSON.stringify({
		in: this.in.typeId,
		out: this.out.typeId,
		// TODO: serialized
		morphs: this.morphs.map((morph) => compileSerializedValue(morph))
	})
	metaId = this.writeMetaId()

	private writeMetaId() {
		const base: Record<string, string> = {
			type: this.typeId
		}
		if (this.schema.description) {
			base.description = this.schema.description
		}
		if (this.schema.alias) {
			base.alias = this.schema.alias
		}
		return JSON.stringify(base)
	}

	writeDefaultDescription() {
		return ""
	}
}
