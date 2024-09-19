import {
	omit,
	printable,
	throwParseError,
	unset,
	type keySetOf
} from "@ark/util"
import type { Morph } from "../roots/morph.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { BaseMeta, declareNode } from "../shared/declare.ts"
import { ArkErrors } from "../shared/errors.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { registeredReference } from "../shared/registry.ts"
import { BaseProp, intersectProps, type Prop } from "./prop.ts"

export declare namespace Optional {
	export interface Schema extends Prop.Schema {
		default?: unknown
	}

	export interface Inner extends Prop.Inner {
		default?: unknown
	}

	export type Declaration = declareNode<
		Prop.Declaration<"optional"> & {
			schema: Schema
			normalizedSchema: Schema
			inner: Inner
		}
	>

	export type Node = OptionalNode
}

const implementation: nodeImplementationOf<Optional.Declaration> =
	implementNode<Optional.Declaration>({
		kind: "optional",
		hasAssociatedError: false,
		intersectionIsOpen: true,
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.$.parseSchema(schema)
			},
			default: {
				preserveUndefined: true
			}
		},
		// safe to spread here as a node will never be passed to normalize
		normalize: ({ ...schema }, $) => {
			const value = $.parseSchema(schema.value)
			schema.value = value
			if (value.defaultMeta !== unset) schema.default ??= value.defaultMeta
			return schema
		},
		defaults: {
			description: node => `${node.compiledKey}?: ${node.value.description}`
		},
		intersections: {
			optional: intersectProps
		}
	})

export class OptionalNode extends BaseProp<"optional"> {
	constructor(...args: ConstructorParameters<typeof BaseProp>) {
		super(...args)
		if ("default" in this.inner) {
			assertDefaultValueAssignability(
				this.value,
				this.inner.default,
				this.serializedKey
			)
		}
	}

	get outProp(): Prop.Node {
		if (!this.hasDefault()) return this
		const { default: defaultValue, ...requiredInner } = this.inner

		requiredInner.value = requiredInner.value.withMeta(meta =>
			omit(meta, optionalValueMetaKeys)
		)

		return this.cacheGetter(
			"outProp",
			this.$.node("required", requiredInner, { prereduced: true }) as never
		)
	}

	expression: string = `${this.compiledKey}?: ${this.value.expression}${this.hasDefault() ? ` = ${printable(this.inner.default)}` : ""}`

	premorphedDefaultValue: unknown =
		this.hasDefault() ?
			this.value.includesMorph ?
				this.value.assert(this.default)
			:	this.default
		:	undefined

	defaultValueMorphs: Morph<object>[] = [
		(data: any): object => {
			data[this.key] = this.premorphedDefaultValue
			return data
		}
	]

	defaultValueMorphsReference = registeredReference(this.defaultValueMorphs)
}

export const Optional = {
	implementation,
	Node: OptionalNode
}

const optionalValueMetaKeys: keySetOf<BaseMeta> = {
	default: 1,
	optional: 1
}

export const assertDefaultValueAssignability = (
	node: BaseRoot,
	value: unknown,
	key = ""
): unknown => {
	const out = node.in(value)
	if (out instanceof ArkErrors)
		throwParseError(writeUnassignableDefaultValueMessage(out.message, key))
	return value
}

export const writeUnassignableDefaultValueMessage = (
	message: string,
	key = ""
): string => `Default value${key && ` for key ${key}`} ${message}`

export type writeUnassignableDefaultValueMessage<
	baseDef extends string,
	defaultValue extends string
> = `Default value ${defaultValue} is not assignable to ${baseDef}`
