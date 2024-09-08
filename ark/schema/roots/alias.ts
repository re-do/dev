import {
	append,
	domainDescriptions,
	throwParseError,
	type PartialRecord
} from "@ark/util"
import { nodesById, type NodeId } from "../parse.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseNormalizedSchema, declareNode } from "../shared/declare.ts"
import { Disjoint } from "../shared/disjoint.ts"
import {
	implementNode,
	rootKinds,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { intersectNodes } from "../shared/intersections.ts"
import {
	writeCyclicJsonSchemaMessage,
	type JsonSchema
} from "../shared/jsonSchema.ts"
import { $ark } from "../shared/registry.ts"
import type { TraverseAllows, TraverseApply } from "../shared/traversal.ts"
import { BaseRoot } from "./root.ts"
import { defineRightwardIntersections } from "./utils.ts"

export declare namespace Alias {
	export type Schema<alias extends string = string> =
		| `$${alias}`
		| NormalizedSchema<alias>

	export interface NormalizedSchema<alias extends string = string>
		extends BaseNormalizedSchema {
		readonly resolutionName: alias
		readonly resolve?: () => BaseRoot
	}

	export interface Inner<alias extends string = string> {
		readonly resolutionName: alias
		readonly resolve?: () => BaseRoot
	}

	export interface Declaration
		extends declareNode<{
			kind: "alias"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
		}> {}

	export type Node = AliasNode
}

export const normalizeAliasSchema = (schema: Alias.Schema): Alias.Inner =>
	typeof schema === "string" ? { resolutionName: schema } : schema

const neverIfDisjoint = (result: BaseRoot | Disjoint): BaseRoot =>
	result instanceof Disjoint ? $ark.intrinsic.never.internal : result

const implementation: nodeImplementationOf<Alias.Declaration> =
	implementNode<Alias.Declaration>({
		kind: "alias",
		hasAssociatedError: false,
		collapsibleKey: "resolutionName",
		keys: {
			resolutionName: {},
			resolve: {}
		},
		normalize: normalizeAliasSchema,
		defaults: {
			description: node => node.resolutionName
		},
		intersections: {
			alias: (l, r, ctx) =>
				ctx.$.lazilyResolve(
					() =>
						neverIfDisjoint(intersectNodes(l.resolution, r.resolution, ctx)),
					`${l.alias}${ctx.pipe ? "=>" : "&"}${r.alias}`
				),
			...defineRightwardIntersections("alias", (l, r, ctx) =>
				ctx.$.lazilyResolve(
					() => neverIfDisjoint(intersectNodes(l.resolution, r, ctx)),
					`${l.alias}${ctx.pipe ? "=>" : "&"}${r.alias}`
				)
			)
		}
	})

export class AliasNode extends BaseRoot<Alias.Declaration> {
	readonly expression: string = this.resolutionName
	readonly structure = undefined

	get resolution(): BaseRoot {
		if (this.resolve) {
			return this.cacheGetter(
				"resolution",
				this.resolve?.() ?? this.$.resolveRoot(this.resolutionName)
			)
		}

		if (this.resolutionName[0] === "$")
			return this.$.resolveRoot(this.resolutionName.slice(1))

		const id = this.resolutionName as NodeId

		let resolution = nodesById[id]
		const seen: PartialRecord<NodeId> = {}
		while (typeof resolution === "string") {
			if (seen[resolution])
				return throwParseError(`Unable to resolve cyclic id ${resolution}`)

			seen[resolution] = true
			resolution = nodesById[resolution]
		}
		return this.cacheGetter(
			"resolution",
			resolution.assertHasKindIn(...rootKinds)
		)
	}

	get shortDescription(): string {
		return domainDescriptions.object
	}

	protected innerToJsonSchema(): JsonSchema {
		return throwParseError(writeCyclicJsonSchemaMessage(this.expression))
	}

	traverseAllows: TraverseAllows = (data, ctx) => {
		const seen = ctx.seen[this.resolutionName]
		if (seen?.includes(data)) return true
		ctx.seen[this.resolutionName] = append(seen, data)
		return this.resolution.traverseAllows(data, ctx)
	}

	traverseApply: TraverseApply = (data, ctx) => {
		const seen = ctx.seen[this.resolutionName]
		if (seen?.includes(data)) return
		ctx.seen[this.resolutionName] = append(seen, data)
		this.resolution.traverseApply(data, ctx)
	}

	compile(js: NodeCompiler): void {
		js.if(`ctx.seen.${this.resolutionName}?.includes(data)`, () =>
			js.return(true)
		)
		js.line(`ctx.seen.${this.resolutionName} ??= []`).line(
			`ctx.seen.${this.resolutionName}.push(data)`
		)
		js.return(js.invoke(this.resolution))
	}
}

export const Alias = {
	implementation,
	Node: AliasNode
}
