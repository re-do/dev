import type { conform, ErrorMessage, exactMessageOnError } from "@arktype/util"
import type {
	Basis,
	BasisInput,
	BasisKind,
	validateBasisInput
} from "../constraints/basis.js"
import type { ConstraintNode } from "../constraints/constraint.js"
import type { DomainInput, DomainNode } from "../constraints/domain.js"
import type { ProtoInput, ProtoNode } from "../constraints/proto.js"
import type {
	Refinement,
	RefinementIntersectionInput,
	RefinementKind
} from "../constraints/refinement.js"
import type { UnitNode, UnitSchema } from "../constraints/unit.js"
import type { BaseAttributes, inputOf } from "../node.js"
import type { MorphInput } from "./morph.js"
import { type IntersectionNode } from "./type.js"

export type IntersectionSchema = BaseAttributes & {
	constraints: readonly ConstraintNode[]
}

export type parseBasis<input extends BasisInput> = input extends DomainInput<
	infer domain
>
	? DomainNode<domain>
	: input extends ProtoInput<infer proto>
	? ProtoNode<proto>
	: input extends UnitSchema<infer unit>
	? UnitNode<unit>
	: never

type basisOf<k extends RefinementKind> =
	Refinement<k>["applicableTo"] extends ((
		_: Basis | undefined
	) => _ is infer basis extends Basis | undefined)
		? basis
		: never

type refinementKindOf<basis> = {
	[k in RefinementKind]: basis extends basisOf<k> ? k : never
}[RefinementKind]

export type refinementsOf<basis> = {
	[k in refinementKindOf<basis>]?: Refinement<k>
}

type refinementInputsOf<basis> = {
	[k in refinementKindOf<basis>]?: RefinementIntersectionInput<k>
}

type IntersectionBasisInput<basis extends BasisInput = BasisInput> =
	| {
			domain: conform<basis, DomainInput>
			proto?: never
			unit?: never
	  }
	| {
			domain?: never
			proto: conform<basis, ProtoInput>
			unit?: never
	  }
	| {
			domain?: never
			proto?: never
			unit: conform<basis, UnitSchema>
	  }

export type BasisedBranchInput<basis extends BasisInput = BasisInput> =
	IntersectionBasisInput<basis> &
		refinementInputsOf<parseBasis<basis>> &
		BaseAttributes

export type NarrowedBranchInput = {
	narrow?: inputOf<"narrow">
} & BaseAttributes

export type IntersectionInput<basis extends BasisInput = BasisInput> =
	| basis
	| NarrowedBranchInput
	| BasisedBranchInput<basis>

export type parseIntersection<input> = IntersectionNode<
	input extends BasisInput
		? BasisInput extends input
			? unknown
			: parseBasis<input>["infer"]
		: unknown
>

type exactBasisMessageOnError<branch extends BasisedBranchInput, expected> = {
	[k in keyof branch]: k extends keyof expected
		? conform<branch[k], expected[k]>
		: ErrorMessage<`'${k & string}' is not allowed by ${branch[keyof branch &
				BasisKind] extends string
				? `basis '${branch[keyof branch & BasisKind]}'`
				: `this schema's basis`}`>
}

export type validateIntersectionInput<input> =
	input extends validateBasisInput<input>
		? input
		: input extends IntersectionBasisInput<infer basis>
		? exactBasisMessageOnError<input, BasisedBranchInput<basis>>
		: input extends NarrowedBranchInput
		? exactMessageOnError<input, NarrowedBranchInput>
		: IntersectionInput | MorphInput

// export class ArrayPredicate extends composePredicate(
// 	Narrowable<"object">,
// 	Instantiatable<typeof Array>,
// 	Boundable
// ) {
// 	// TODO: add minLength prop that would result from collapsing types like [...number[], number]
// 	// to a single variadic number prop with minLength 1
// 	// Figure out best design for integrating with named props.

// 	readonly prefix?: readonly TypeRoot[]
// 	readonly variadic?: TypeRoot
// 	readonly postfix?: readonly TypeRoot[]
// }

// export class DatePredicate extends composePredicate(
// 	Narrowable<"object">,
// 	Instantiatable<typeof Date>,
// 	Boundable
// ) {}

// // TODO: naming
// export const constraintsByPrecedence: Record<
// 	BasisKind | RefinementKind,
// 	number
// > = {
// 	// basis
// 	domain: 0,
// 	class: 0,
// 	unit: 0,
// 	// shallow
// 	bound: 1,
// 	divisor: 1,
// 	regex: 1,
// 	// deep
// 	props: 2,
// 	// narrow
// 	narrow: 3
// }