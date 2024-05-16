import {
	append,
	cached,
	flatMorph,
	registeredReference,
	type array,
	type Key,
	type RegisteredReference
} from "@arktype/util"
import {
	BaseConstraint,
	constraintKeyParser,
	flattenConstraints,
	intersectConstraints
} from "../constraint.js"
import type { MutableInner } from "../kinds.js"
import type { BaseRoot } from "../roots/root.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf,
	type StructuralKind
} from "../shared/implement.js"
import type {
	TraversalContext,
	TraversalKind,
	TraverseAllows,
	TraverseApply
} from "../shared/traversal.js"
import { makeRootAndArrayPropertiesMutable } from "../shared/utils.js"
import type { IndexNode, IndexSchema } from "./index.js"
import type { OptionalNode, OptionalSchema } from "./optional.js"
import type { PropNode } from "./prop.js"
import type { RequiredNode, RequiredSchema } from "./required.js"
import type { SequenceNode, SequenceSchema } from "./sequence.js"
import { arrayIndexMatcher, arrayIndexMatcherReference } from "./shared.js"

export type UndeclaredKeyBehavior = "ignore" | UndeclaredKeyHandling

export type UndeclaredKeyHandling = "reject" | "delete"

export interface StructureSchema extends BaseMeta {
	readonly optional?: readonly OptionalSchema[]
	readonly required?: readonly RequiredSchema[]
	readonly index?: readonly IndexSchema[]
	readonly sequence?: SequenceSchema
	readonly undeclared?: UndeclaredKeyBehavior
}

export interface StructureInner extends BaseMeta {
	readonly optional?: readonly OptionalNode[]
	readonly required?: readonly RequiredNode[]
	readonly index?: readonly IndexNode[]
	readonly sequence?: SequenceNode
	readonly undeclared?: UndeclaredKeyHandling
}

export interface StructureDeclaration
	extends declareNode<{
		kind: "structure"
		schema: StructureSchema
		normalizedSchema: StructureSchema
		inner: StructureInner
		prerequisite: object
		childKind: StructuralKind
	}> {}

export class StructureNode extends BaseConstraint<StructureDeclaration> {
	impliedBasis: BaseRoot = this.$.keywords.object.raw
	impliedSiblings = this.children.flatMap(
		n => (n.impliedSiblings as BaseConstraint[]) ?? []
	)

	props: array<PropNode> =
		this.required ?
			this.optional ?
				[...this.required, ...this.optional]
			:	this.required
		:	this.optional ?? []

	propsByKey: Record<Key, PropNode | undefined> = flatMorph(
		this.props,
		(i, node) => [node.key, node] as const
	)

	propsByKeyReference: RegisteredReference = registeredReference(
		this.propsByKey
	)

	expression: string = structuralExpression(this)

	requiredLiteralKeys: Key[] = this.required?.map(node => node.key) ?? []

	optionalLiteralKeys: Key[] = this.optional?.map(node => node.key) ?? []

	literalKeys: Key[] = [
		...this.requiredLiteralKeys,
		...this.optionalLiteralKeys
	]

	@cached
	keyof(): BaseRoot {
		let branches = this.$.units(this.literalKeys).branches
		this.index?.forEach(({ index }) => {
			branches = branches.concat(index.branches)
		})
		return this.$.node("union", branches)
	}

	readonly exhaustive: boolean =
		this.undeclared !== undefined || this.index !== undefined

	omit(...keys: array<BaseRoot | Key>): StructureNode {
		return this.$.node("structure", omitFromInner(this.inner, keys))
	}

	merge(r: StructureNode): StructureNode {
		const inner = makeRootAndArrayPropertiesMutable(
			omitFromInner(this.inner, [r.keyof()])
		)
		if (r.required) inner.required = append(inner.required, r.required)
		if (r.optional) inner.optional = append(inner.optional, r.optional)
		if (r.index) inner.index = append(inner.index, r.index)
		if (r.sequence) inner.sequence = r.sequence
		if (r.undeclared) inner.undeclared = r.undeclared
		else delete inner.undeclared
		return this.$.node("structure", inner)
	}

	traverseAllows: TraverseAllows<object> = (data, ctx) =>
		this._traverse("Allows", data, ctx)

	traverseApply: TraverseApply<object> = (data, ctx) =>
		this._traverse("Apply", data, ctx)

	protected _traverse = (
		traversalKind: TraversalKind,
		data: object,
		ctx: TraversalContext
	): boolean => {
		const errorCount = ctx?.currentErrorCount ?? 0
		for (let i = 0; i < this.props.length; i++) {
			if (traversalKind === "Allows") {
				if (!this.props[i].traverseAllows(data, ctx)) return false
			} else {
				this.props[i].traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.currentErrorCount > errorCount) return false
			}
		}

		if (this.sequence) {
			if (traversalKind === "Allows") {
				if (!this.sequence.traverseAllows(data as never, ctx)) return false
			} else {
				this.sequence.traverseApply(data as never, ctx)
				if (ctx.failFast && ctx.currentErrorCount > errorCount) return false
			}
		}

		if (!this.exhaustive) return true

		const keys: Key[] = Object.keys(data)
		keys.push(...Object.getOwnPropertySymbols(data))

		for (let i = 0; i < keys.length; i++) {
			const k = keys[i]

			let matched = false

			if (this.index) {
				for (const node of this.index) {
					if (node.index.traverseAllows(k, ctx)) {
						ctx?.path.push(k)
						if (traversalKind === "Allows") {
							const result = node.value.traverseAllows(data[k as never], ctx)
							ctx?.path.pop()
							if (!result) return false
						} else {
							node.value.traverseApply(data[k as never], ctx)
							if (ctx.failFast && ctx.currentErrorCount > errorCount) {
								ctx.path.pop()
								return false
							}
						}

						matched = true
					}
				}
			}

			if (this.undeclared) {
				matched ||= k in this.propsByKey
				matched ||=
					this.sequence !== undefined &&
					typeof k === "string" &&
					arrayIndexMatcher.test(k)
				if (!matched) {
					if (traversalKind === "Allows") return false
					ctx.path.push(k)
					ctx.error({ expected: "removed", actual: null })
					ctx.path.pop()
					if (ctx.failFast) return false
				}
			}

			ctx?.path.pop()
		}

		return true
	}

	compile(js: NodeCompiler): void {
		if (js.traversalKind === "Apply") js.initializeErrorCount()

		this.props.forEach(prop => {
			js.check(prop)
			if (js.traversalKind === "Apply") js.returnIfFailFast()
		})

		if (this.sequence) {
			js.check(this.sequence)
			if (js.traversalKind === "Apply") js.returnIfFailFast()
		}

		if (this.exhaustive) {
			js.const("keys", "Object.keys(data)")
			js.line("keys.push(...Object.getOwnPropertySymbols(data))")
			js.for("i < keys.length", () => this.compileExhaustiveEntry(js))
		}

		if (js.traversalKind === "Allows") js.return(true)
	}

	protected compileExhaustiveEntry(js: NodeCompiler): NodeCompiler {
		js.const("k", "keys[i]")

		if (this.undeclared) js.let("matched", false)

		this.index?.forEach(node => {
			js.if(`${js.invoke(node.index, { arg: "k", kind: "Allows" })}`, () => {
				js.checkReferenceKey("k", node.value)
				if (this.undeclared) js.set("matched", true)
				return js
			})
		})

		if (this.undeclared) {
			if (this.props?.length !== 0)
				js.line(`matched ||= k in ${this.propsByKeyReference}`)

			if (this.sequence) {
				js.line(
					`matched ||= typeof k === "string" && ${arrayIndexMatcherReference}.test(k)`
				)
			}

			js.if("!matched", () => {
				if (js.traversalKind === "Allows") return js.return(false)
				return js
					.line("ctx.path.push(k)")
					.line(`ctx.error({ expected: "removed", actual: null })`)
					.line("ctx.path.pop()")
					.if("ctx.failFast", () => js.return())
			})
		}

		return js
	}
}

const omitFromInner = (
	inner: StructureInner,
	keys: array<BaseRoot | Key>
): StructureInner => {
	const result = { ...inner }
	keys.forEach(k => {
		if (result.required) {
			result.required = result.required.filter(b =>
				typeof k === "function" ? !k.allows(b.key) : k !== b.key
			)
		}
		if (result.optional) {
			result.optional = result.optional.filter(b =>
				typeof k === "function" ? !k.allows(b.key) : k !== b.key
			)
		}
		if (result.index && typeof k === "function") {
			// we only have to filter index nodes if the input was a node, as
			// literal keys should never subsume an index
			result.index = result.index.filter(n => !n.index.extends(k))
		}
	})
	return result
}

const createStructuralWriter =
	(childStringProp: "expression" | "description") => (node: StructureNode) => {
		if (node.props.length || node.index) {
			const parts = node.index?.map(String) ?? []
			node.props.forEach(node => parts.push(node[childStringProp]))
			const objectLiteralDescription = `${
				node.undeclared ? "exact " : ""
			}{ ${parts.join(", ")} }`
			return node.sequence ?
					`${objectLiteralDescription} & ${node.sequence.description}`
				:	objectLiteralDescription
		}
		return node.sequence?.description ?? "{}"
	}

const structuralDescription = createStructuralWriter("description")
const structuralExpression = createStructuralWriter("expression")

export const structureImplementation: nodeImplementationOf<StructureDeclaration> =
	implementNode<StructureDeclaration>({
		kind: "structure",
		hasAssociatedError: false,
		normalize: schema => schema,
		keys: {
			required: {
				child: true,
				parse: constraintKeyParser("required")
			},
			optional: {
				child: true,
				parse: constraintKeyParser("optional")
			},
			index: {
				child: true,
				parse: constraintKeyParser("index")
			},
			sequence: {
				child: true,
				parse: constraintKeyParser("sequence")
			},
			undeclared: {
				parse: behavior => (behavior === "ignore" ? undefined : behavior)
			}
		},
		defaults: {
			description: structuralDescription
		},
		intersections: {
			structure: (l, r, ctx) => {
				if (l.undeclared) {
					const lKey = l.keyof()
					const disjointRKeys = r.requiredLiteralKeys.filter(
						k => !lKey.allows(k)
					)
					if (disjointRKeys.length) {
						return Disjoint.from("presence", true, false).withPrefixKey(
							disjointRKeys[0]
						)
					}
				}
				if (r.undeclared) {
					const rKey = r.keyof()
					const disjointLKeys = l.requiredLiteralKeys.filter(
						k => !rKey.allows(k)
					)
					if (disjointLKeys.length) {
						return Disjoint.from("presence", true, false).withPrefixKey(
							disjointLKeys[0]
						)
					}
				}

				const baseInner: MutableInner<"structure"> = {}

				if (l.undeclared || r.undeclared) {
					baseInner.undeclared =
						l.undeclared === "reject" || r.undeclared === "reject" ?
							"reject"
						:	"delete"
				}

				return intersectConstraints({
					kind: "structure",
					baseInner,
					l: flattenConstraints(l.inner),
					r: flattenConstraints(r.inner),
					roots: [],
					ctx
				})
			}
		}
	})
