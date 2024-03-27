import type { writeIndivisibleMessage } from "@arktype/schema"
import type { ErrorMessage } from "@arktype/util"
import type { Type } from "../../type.js"
import type { inferAstIn } from "./infer.js"
import type { validateAst } from "./validate.js"

export type validateDivisor<l, $, args> = inferAstIn<
	l,
	$,
	args
> extends infer data
	? [data] extends [number]
		? validateAst<l, $, args>
		: ErrorMessage<writeIndivisibleMessage<Type<data>>>
	: never
