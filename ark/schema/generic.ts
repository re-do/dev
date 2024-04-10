import { Callable, type conform, flatMorph, type repeat } from "@arktype/util"
import type { inferSchema } from "./api/inference.js"
import type { SchemaDef } from "./base.js"
import { keywordNodes } from "./keywords/keywords.js"
import type { BaseSchema, Schema } from "./schemas/schema.js"
import type { RawScope } from "./scope.js"
import { arkKind } from "./shared/utils.js"

export type GenericNodeInstantiation<
	params extends string[] = string[],
	def = unknown,
	$ = any
> = <args>(
	...args: conform<args, repeat<[SchemaDef], params["length"]>>
) => Schema<inferSchema<def, $ & bindGenericNodeInstantiation<params, $, args>>>

// TODO: ????
export type bindGenericNodeInstantiation<params extends string[], $, args> = {
	[i in keyof params & `${number}` as params[i]]: inferSchema<
		args[i & keyof args],
		$
	>
}

export const validateUninstantiatedGenericNode = (
	g: GenericSchema
): GenericSchema => {
	g.$.schema(g.def as never, {
		args: flatMorph(g.params, (_, name) => [name, keywordNodes.unknown])
	})
	return g
}

const s: WeakSet<object> = new Set()

// Comparing to Generic directly doesn't work well, so we compare to only its props
export interface GenericProps<
	params extends string[] = string[],
	def = any,
	$ = any
> {
	[arkKind]: "generic"
	params: params
	def: def
	$: RawScope<$>
}

export class GenericSchema<
		params extends string[] = string[],
		def = any,
		$ = any
	>
	extends Callable<GenericNodeInstantiation<params, def, $>>
	implements GenericProps
{
	readonly [arkKind] = "generic"

	constructor(
		public params: params,
		public def: def,
		public $: RawScope<$>
	) {
		super((...args: SchemaDef[]) => {
			const argNodes: Record<string, BaseSchema> = flatMorph(
				params,
				(i, param) => [param, $.schema(args[i])]
			) as never
			return $.schema(def as never, { args: argNodes }) as never
		})
	}
}
