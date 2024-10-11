import type {
	After,
	Anonymous,
	AtOrAfter,
	AtOrBefore,
	AttributeInferenceBehavior,
	AttributeKind,
	Attributes,
	Before,
	brand,
	createAttributeRaw,
	Default,
	Nominal,
	normalizeLimit,
	of,
	Optional
} from "../../attributes.ts"

export declare namespace Date {
	export type atOrAfter<rule> = of<Date, AtOrAfter<rule>>

	export type after<rule> = of<Date, After<rule>>

	export type atOrBefore<rule> = of<Date, AtOrBefore<rule>>

	export type before<rule> = of<Date, Before<rule>>

	export type anonymous = of<Date, Anonymous>

	export type nominal<rule> = of<Date, Nominal<rule>>

	export type optional = of<Date, Optional>

	export type defaultsTo<rule> = of<Date, Default<rule>>

	export type is<attributes> = of<Date, attributes>

	export type afterSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? After<normalizeLimit<rule>>
		:	AtOrAfter<normalizeLimit<rule>>

	export type beforeSchemaToConstraint<schema, rule> =
		schema extends { exclusive: true } ? Before<normalizeLimit<rule>>
		:	AtOrBefore<normalizeLimit<rule>>

	export type apply<attribute> =
		"brand" extends keyof attribute ? branded.apply<attribute>
		:	applyUnbranded<attribute>

	type applyUnbranded<attribute> =
		attribute extends After<infer rule> ? after<rule>
		: attribute extends Before<infer rule> ? before<rule>
		: attribute extends AtOrAfter<infer rule> ? atOrAfter<rule>
		: attribute extends AtOrBefore<infer rule> ? atOrBefore<rule>
		: attribute extends Optional ? optional
		: attribute extends Default<infer rule> ? defaultsTo<rule>
		: attribute extends Nominal<infer rule> ? nominal<rule>
		: never

	export type AttributableKind = AttributeKind.defineAttributable<
		"after" | "atOrAfter" | "before" | "atOrBefore"
	>

	export type attach<
		base extends Date,
		kind extends AttributableKind,
		value extends Attributes[kind],
		behavior extends AttributeInferenceBehavior,
		existingAttributes = unknown
	> =
		behavior extends "brand" ? branded.attach<base, kind, value>
		:	attachUnbranded<base, kind, value, existingAttributes>

	type attachUnbranded<
		base extends Date,
		kind extends AttributableKind,
		value extends Attributes[kind],
		existingAttributes = unknown
	> =
		string extends base ?
			unknown extends existingAttributes ?
				kind extends "nominal" ? nominal<value>
				: kind extends "after" ? after<value>
				: kind extends "atOrAfter" ? atOrAfter<value>
				: kind extends "before" ? before<value>
				: kind extends "atOrBefore" ? atOrBefore<value>
				: kind extends "optional" ? optional
				: kind extends "defaultsTo" ? defaultsTo<value>
				: never
			:	is<existingAttributes & createAttributeRaw<kind, value>>
		:	of<base, existingAttributes & createAttributeRaw<kind, value>>

	export type branded<rule> = brand<Date, Nominal<rule>>

	export namespace branded {
		export type atOrAfter<rule> = brand<Date, AtOrAfter<rule>>

		export type after<rule> = brand<Date, After<rule>>

		export type atOrBefore<rule> = brand<Date, AtOrBefore<rule>>

		export type before<rule> = brand<Date, Before<rule>>

		export type anonymous = brand<Date, Anonymous>

		export type is<attributes> = brand<Date, attributes>

		export type apply<attribute> =
			attribute extends After<infer rule> ? after<rule>
			: attribute extends Before<infer rule> ? before<rule>
			: attribute extends AtOrAfter<infer rule> ? atOrAfter<rule>
			: attribute extends AtOrBefore<infer rule> ? atOrBefore<rule>
			: attribute extends Nominal<infer rule> ? nominal<rule>
			: never

		export type attach<
			base extends Date,
			kind extends AttributableKind,
			value extends Attributes[kind],
			existingAttributes = unknown
		> =
			Date extends base ?
				unknown extends existingAttributes ?
					kind extends "nominal" ? nominal<value>
					: kind extends "after" ? after<value>
					: kind extends "atOrAfter" ? atOrAfter<value>
					: kind extends "before" ? before<value>
					: kind extends "atOrBefore" ? atOrBefore<value>
					: never
				:	is<existingAttributes & createAttributeRaw<kind, value>>
			:	of<base, existingAttributes & createAttributeRaw<kind, value>>
	}
}
