import type { extend } from "@arktype/util"
import type { Disjoint } from "./disjoint.js"
import type { ConstraintsByKind } from "./traits/constraint.js"
import type { TypeRootsByKind } from "./types/type.js"

export type NodesByKind = extend<TypeRootsByKind, ConstraintsByKind>

export type NodeClass<kind extends NodeKind = NodeKind> = NodesByKind[kind]

export type NodeKind = keyof NodesByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]

export abstract class Kinded {
	abstract kind: NodeKind

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}
}

export abstract class Fingerprinted {
	id = this.hash()

	abstract hash(): string

	equals(other: Fingerprinted) {
		return this.id === other.id
	}
}

export abstract class Intersectable extends Fingerprinted {
	abstract intersect(other: this): this | Disjoint
}
