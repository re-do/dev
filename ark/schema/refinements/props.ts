import { DynamicBase, conflatenateAll, reference, remap } from "@arktype/util"
import type { Node } from "../base.js"
import type { NodeCompiler } from "../shared/compile.js"
import type { StructuralRefinementKind } from "../shared/implement.js"
import type { TraverseAllows, TraverseApply } from "../traversal/context.js"
import type { IndexNode } from "./index.js"
import type { OptionalNode } from "./optional.js"
import type { RequiredNode } from "./required.js"
import type { SequenceNode } from "./sequence.js"
import { arrayIndexMatcherReference } from "./shared.js"

export type ExtraneousKeyBehavior = "ignore" | ExtraneousKeyRestriction

export type ExtraneousKeyRestriction = "throw" | "prune"

export interface PropsGroupInner {
	readonly onExtraneousKey: ExtraneousKeyBehavior
	readonly required?: readonly RequiredNode[]
	readonly optional?: readonly OptionalNode[]
	readonly index?: readonly IndexNode[]
	readonly sequence?: SequenceNode
}

export class PropsGroup extends DynamicBase<PropsGroupInner> {
	readonly exhaustive =
		this.onExtraneousKey !== "ignore" || this.index !== undefined
	readonly named: readonly Node<"required" | "optional">[] = this.required
		? this.optional
			? [...this.required, ...this.optional]
			: this.required
		: this.optional ?? []
	readonly all = conflatenateAll<Node<StructuralRefinementKind>>(
		this.named,
		this.index,
		this.sequence
	)
	readonly nameSet = remap(this.named, (i, node) => [node.key, 1] as const)
	readonly nameSetReference = reference(this.nameSet)

	traverseAllows: TraverseAllows<object> = () => true

	traverseApply: TraverseApply<object> = () => {}

	compile(js: NodeCompiler) {
		if (this.exhaustive) {
			this.compileExhaustive(js)
		} else {
			this.compileEnumerable(js)
		}
	}

	protected compileEnumerable(js: NodeCompiler) {
		if (js.traversalKind === "Allows") {
			this.all.forEach((node) =>
				js.if(`!${js.invoke(node)}`, () => js.return(false))
			)
			js.return(true)
		} else {
			this.all.forEach((node) => js.line(js.invoke(node)))
		}
	}

	protected compileExhaustive(js: NodeCompiler) {
		this.named.forEach((prop) => prop.compile(js))
		this.sequence?.compile(js)
		js.forIn(js.data, () => {
			if (this.onExtraneousKey) {
				js.let("matched", false)
			}
			this.index?.forEach((node) => {
				js.if(`${js.invoke(node.key, { arg: "k", kind: "Allows" })}`, () => {
					if (js.traversalKind === "Allows") {
						js.if(`!${js.invoke(node.value, { arg: `${js.data}[k]` })}`, () =>
							js.return(false)
						)
					} else {
						js.line(js.invoke(node.value, { arg: `${js.data}[k]` }))
					}
					if (this.onExtraneousKey) {
						js.set("matched", true)
					}
					return js
				})
			})
			if (this.onExtraneousKey) {
				if (this.named.length !== 0) {
					js.line(`matched ||= k in ${this.nameSetReference}`)
				}
				if (this.sequence) {
					js.line(`matched ||= ${arrayIndexMatcherReference}.test(k)`)
				}
				// TODO: replace error
				js.if("!matched", () => js.line(`throw new Error("strict")`))
			}
			return js
		})
		if (js.traversalKind === "Allows") {
			js.return(true)
		}
	}
}
