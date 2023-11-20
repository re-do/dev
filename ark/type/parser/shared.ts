import type { extend } from "@arktype/util"
import type { validateDefinition } from "./definition.js"
import { Scanner } from "./string/shift/scanner.js"

type parsedKey<result extends KeyParseResult> = result

type OptionalTuple<value> = readonly [value, "?"]

type KeyParseResult<kind extends ParsedKeyKind = ParsedKeyKind> = {
	kind: kind
	innerKey: string | symbol
}

type ValueParseResult<kind extends ParsedValueKind = ParsedValueKind> = {
	kind: kind
	innerValue: unknown
}

export type EntryParseResult<kind extends ParsedKeyKind = ParsedKeyKind> =
	extend<
		KeyParseResult<kind>,
		{
			innerValue: unknown
		}
	>

type ParsedValueKind = "required" | "optional"

type ParsedKeyKind = "required" | "optional" | "indexed"

type parsedEntry<result extends EntryParseResult> = result

export type OptionalValue<value> =
	| OptionalStringDefinition<value & string>
	| OptionalTuple<value>

export type OptionalStringDefinition<name extends string = string> = `${name}?`

export type IndexedKey<def extends string = string> = `[${def}]`

export type validateObjectValue<def, $, args> = def extends OptionalTuple<
	infer value
>
	? readonly [validateObjectValueString<value, $, args>, "?"]
	: validateObjectValueString<def, $, args>

type validateObjectValueString<def, $, args> =
	def extends OptionalStringDefinition<infer innerValue>
		? `${validateDefinition<innerValue, $, args>}?`
		: validateDefinition<def, $, args>

type DefinitionEntry = readonly [string | symbol, unknown]

const getInnerValue = (value: unknown): ValueParseResult => {
	if (typeof value === "string") {
		if (value[value.length - 1] === "?") {
			return {
				kind: "optional",
				innerValue: value.slice(0, -1)
			}
		}
	} else if (Array.isArray(value)) {
		if (value.length === 2 && value[1] === "?") {
			return {
				kind: "optional",
				innerValue: getInnerValue(value[0]).innerValue
			}
		}
	}
	return {
		kind: "required",
		innerValue: value
	}
}

export const parseEntry = ([key, value]: DefinitionEntry): EntryParseResult => {
	const keyParseResult: KeyParseResult =
		typeof key === "string" && key.at(-1) === "?"
			? key.at(-2) === Scanner.escapeToken
				? { innerKey: `${key.slice(0, -2)}?`, kind: "required" }
				: { innerKey: key.slice(0, -1), kind: "optional" }
			: { innerKey: key, kind: "required" }
	const valueParseResult = getInnerValue(value)
	return {
		innerKey: keyParseResult.innerKey,
		innerValue: valueParseResult.innerValue,
		kind:
			keyParseResult.kind === "indexed"
				? "indexed"
				: valueParseResult.kind === "optional"
				  ? "optional"
				  : keyParseResult.kind
	}
}

export type parseEntry<
	keyDef extends PropertyKey,
	valueDef
> = parseKey<keyDef> extends infer keyParseResult extends KeyParseResult
	? valueDef extends OptionalValue<infer innerValue>
		? parsedEntry<{
				kind: "optional"
				innerKey: keyParseResult["innerKey"]
				innerValue: innerValue extends OptionalStringDefinition<
					infer innerStringValue
				>
					? innerStringValue
					: innerValue
		  }>
		: parsedEntry<{
				kind: keyParseResult["kind"]
				innerKey: keyParseResult["innerKey"]
				innerValue: valueDef
		  }>
	: never

type parseKey<k> = k extends OptionalStringDefinition<infer inner>
	? inner extends `${infer baseName}${Scanner.EscapeToken}`
		? parsedKey<{
				kind: "required"
				innerKey: OptionalStringDefinition<baseName>
		  }>
		: parsedKey<{
				kind: "optional"
				innerKey: inner
		  }>
	: k extends IndexedKey<infer def>
	  ? parsedKey<{
				kind: "indexed"
				innerKey: def
	    }>
	  : k extends `${Scanner.EscapeToken}${infer escapedIndexKey extends
					IndexedKey}`
	    ? parsedKey<{
					kind: "required"
					innerKey: escapedIndexKey
	      }>
	    : parsedKey<{
					kind: "required"
					innerKey: k & (string | symbol)
	      }>