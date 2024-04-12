import { DynamicBase, type isAnyOrNever } from "@arktype/util"
import type { arkKind } from "./main.js"
import type { Schema } from "./schemas/schema.js"

export type PreparsedNodeResolution = { [arkKind]: "generic" | "module" }

type exportSchemaScope<$> = {
	[k in keyof $]: $[k] extends PreparsedNodeResolution ?
		isAnyOrNever<$[k]> extends true ?
			Schema<$[k], $>
		:	$[k]
	:	Schema<$[k], $>
}

export class SchemaModule<$ = any> extends DynamicBase<exportSchemaScope<$>> {
	declare readonly [arkKind]: "module"
}
