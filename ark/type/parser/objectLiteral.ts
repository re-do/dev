import {
	printable,
	stringAndSymbolicEntriesOf,
	throwParseError,
	type Dict,
	type ErrorMessage,
	type Key,
	type evaluate,
	type merge
} from "@arktype/util"
import type { TypeNode } from "../base.js"
import { keywords, schema } from "../builtins/ark.js"
import type { Inner } from "../kinds.js"
import type { ParseContext } from "../scope.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import type { astToString } from "./semantic/utils.js"
import type { validateString } from "./semantic/validate.js"
import { Scanner } from "./string/shift/scanner.js"

export const parseObjectLiteral = (def: Dict, ctx: ParseContext): TypeNode => {
	const required: Inner<"required">[] = []
	const optional: Inner<"optional">[] = []

	// We only allow a spread operator to be used as the first key in an object
	// because to match JS behavior any keys before the spread are overwritten
	// by the values in the target object, so there'd be no useful purpose in having it
	// anywhere except for the beginning.

	const parsedEntries = stringAndSymbolicEntriesOf(def).map(parseEntry)
	if (parsedEntries[0]?.kind === "spread") {
		// remove the spread entry so we can iterate over the remaining entries
		// expecting non-spread entries
		const spreadEntry = parsedEntries.shift()!
		const spreadNode = ctx.$.parse(spreadEntry.value, ctx)

		if (
			spreadNode.kind !== "intersection" ||
			!spreadNode.extends(keywords.object)
		) {
			return throwParseError(
				writeInvalidSpreadTypeMessage(printable(spreadEntry.value))
			)
		}

		// TODO: move to props group merge in schema
		// For each key on spreadNode, add it to our object.
		// We filter out keys from the spreadNode that will be defined later on this same object
		// because the currently parsed definition will overwrite them.
		spreadNode.required?.forEach(
			(spreadRequired) =>
				!parsedEntries.some(
					({ inner: innerKey }) => innerKey === spreadRequired.key
				) && required.push(spreadRequired)
		)

		spreadNode.optional?.forEach(
			(spreadOptional) =>
				!parsedEntries.some(
					({ inner: innerKey }) => innerKey === spreadOptional.key
				) && optional.push(spreadOptional)
		)
	}
	for (const entry of parsedEntries) {
		if (entry.kind === "spread") {
			return throwParseError(nonLeadingSpreadError)
		}

		ctx.path.push(
			`${
				typeof entry.inner === "symbol"
					? `[${printable(entry.inner)}]`
					: entry.inner
			}`
		)
		const value = ctx.$.parse(entry.value, ctx)
		const inner: Inner<"required" | "optional"> = {
			key: entry.inner,
			value
		}
		if (entry.kind === "optional") {
			optional.push(inner)
		} else {
			required.push(inner)
		}
		ctx.path.pop()
	}

	return schema({
		domain: "object",
		required,
		optional
	})
}

export const nonLeadingSpreadError =
	"Spread operator may only be used as the first key in an object"

/**
 * Infers the contents of an object literal, ignoring a spread definition
 * You probably want to use {@link inferObjectLiteral} instead.
 */
type inferObjectLiteralInner<def extends object, $, args> = {
	// since def is a const parameter, we remove the readonly modifier here
	// support for builtin readonly tracked here:
	// https://github.com/arktypeio/arktype/issues/808
	-readonly [k in keyof def as nonOptionalKeyFrom<k, $, args>]: inferDefinition<
		def[k],
		$,
		args
	>
} & {
	-readonly [k in keyof def as optionalKeyFrom<k>]?: inferDefinition<
		def[k],
		$,
		args
	>
}

export type inferObjectLiteral<def extends object, $, args> = evaluate<
	"..." extends keyof def
		? merge<
				inferDefinition<def["..."], $, args>,
				inferObjectLiteralInner<def, $, args>
		  >
		: inferObjectLiteralInner<def, $, args>
>

export type validateObjectLiteral<def, $, args> = {
	[k in keyof def]: k extends IndexKey<infer indexDef>
		? validateString<indexDef, $, args> extends ErrorMessage<infer message>
			? // add a nominal type here to avoid allowing the error message as input
			  indexParseError<message>
			: inferDefinition<indexDef, $, args> extends PropertyKey
			? // if the indexDef is syntactically and semantically valid,
			  // move on to the validating the value definition
			  validateDefinition<def[k], $, args>
			: indexParseError<writeInvalidPropertyKeyMessage<indexDef>>
		: k extends "..."
		? inferDefinition<def[k], $, args> extends object
			? validateDefinition<def[k], $, args>
			: indexParseError<writeInvalidSpreadTypeMessage<astToString<def[k]>>>
		: validateDefinition<def[k], $, args>
}

type nonOptionalKeyFrom<k, $, args> = parseKey<k> extends PreparsedKey<
	"required",
	infer inner
>
	? inner
	: parseKey<k> extends PreparsedKey<"index", infer inner>
	? inferDefinition<inner, $, args> & Key
	: // spread key is handled at the type root so is handled neither here nor in optionalKeyFrom
	  never

type optionalKeyFrom<k> = parseKey<k> extends PreparsedKey<
	"optional",
	infer inner
>
	? inner
	: never

type PreparsedKey<
	kind extends ParsedKeyKind = ParsedKeyKind,
	inner extends Key = Key
> = {
	kind: kind
	inner: inner
}

namespace PreparsedKey {
	export type from<t extends PreparsedKey> = t
}

type ParsedKeyKind = "required" | "optional" | "index" | "spread"

export type IndexKey<def extends string = string> = `[${def}]`

type PreparsedEntry = PreparsedKey & { value: unknown }

export const parseEntry = (entry: readonly [Key, unknown]): PreparsedEntry =>
	Object.assign(parseKey(entry[0]), { value: entry[1] })

const parseKey = (key: Key): PreparsedKey =>
	typeof key === "string" && key.at(-1) === "?"
		? key.at(-2) === Scanner.escapeToken
			? { inner: `${key.slice(0, -2)}?`, kind: "required" }
			: {
					inner: key.slice(0, -1),
					kind: "optional"
			  }
		: key === "..."
		? { inner: "...", kind: "spread" }
		: { inner: key === "\\..." ? "..." : key, kind: "required" }

type parseKey<k> = k extends `${infer inner}?`
	? inner extends `${infer baseName}${Scanner.EscapeToken}`
		? PreparsedKey.from<{
				kind: "required"
				inner: `${baseName}?`
		  }>
		: PreparsedKey.from<{
				kind: "optional"
				inner: inner
		  }>
	: k extends "..."
	? PreparsedKey.from<{ kind: "spread"; inner: "..." }>
	: k extends `${Scanner.EscapeToken}...`
	? PreparsedKey.from<{ kind: "required"; inner: "..." }>
	: k extends IndexKey<infer def>
	? PreparsedKey.from<{
			kind: "index"
			inner: def
	  }>
	: PreparsedKey.from<{
			kind: "required"
			inner: k extends `${Scanner.EscapeToken}${infer escapedIndexKey extends
				IndexKey}`
				? escapedIndexKey
				: k extends Key
				? k
				: `${k & number}`
	  }>

declare const indexParseSymbol: unique symbol

export type indexParseError<message extends string = string> = {
	[indexParseSymbol]: message
}

export const writeInvalidPropertyKeyMessage = <indexDef extends string>(
	indexDef: indexDef
): writeInvalidPropertyKeyMessage<indexDef> =>
	`Indexed key definition '${indexDef}' must be a string, number or symbol`

type writeInvalidPropertyKeyMessage<indexDef extends string> =
	`Indexed key definition '${indexDef}' must be a string, number or symbol`

export const writeInvalidSpreadTypeMessage = <def extends string>(
	def: def
): writeInvalidSpreadTypeMessage<def> =>
	`Spread operand must resolve to an object literal type (was ${def})`

type writeInvalidSpreadTypeMessage<def extends string> =
	`Spread operand must resolve to an object literal type (was ${def})`
