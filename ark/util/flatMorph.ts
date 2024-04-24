import type { array, listable } from "./arrays.js"
import type { show } from "./generics.js"
import type { Entry, Key, entryOf, fromEntries } from "./records.js"
import type { intersectUnion } from "./unionToTuple.js"

type objectFromListableEntries<transformed extends readonly Entry[]> = show<
	intersectUnion<fromEntries<transformed>>
>

type arrayFromListableEntries<transformed extends Entry> =
	Entry<number, never> extends transformed ? transformed[1][]
	:	$arrayFromListableEntries<transformed, []>

type $arrayFromListableEntries<
	transformed extends Entry,
	result extends unknown[]
> =
	[transformed] extends [never] ? result
	: Extract<transformed, Entry<result["length"]>> extends (
		infer next extends Entry
	) ?
		Exclude<transformed, next> extends infer remaining extends Entry ?
			[transformed] extends [remaining] ?
				[...result, ...transformed[1][]]
			:	$arrayFromListableEntries<remaining, [...result, next[1]]>
		:	never
	:	[...result, ...transformed[1][]]

type extractEntrySets<e extends listable<Entry>> =
	e extends readonly Entry[] ? e : [e]

type extractEntries<e extends listable<Entry>> =
	e extends readonly Entry[] ? e[number] : e

type entryArgsWithIndex<o> = {
	[k in keyof o]: [k: k, v: o[k], i: number]
}[keyof o]

type numericArrayEntry<a extends array> =
	number extends a["length"] ? [number, a[number]]
	:	{
			[i in keyof a]: i extends `${infer n extends number}` ? [n, a[i]] : never
		}[number]

export type MappedEntry = listable<Entry<Key> | Entry<number>>

export type fromMappedEntries<transformed extends MappedEntry> =
	[transformed] extends [listable<Entry<number>>] ?
		arrayFromListableEntries<extractEntries<transformed>>
	:	objectFromListableEntries<extractEntrySets<transformed>>

export function flatMorph<
	const o extends array,
	transformed extends MappedEntry
>(
	o: o,
	flatMapEntry: (...args: numericArrayEntry<o>) => transformed
): fromMappedEntries<transformed>
export function flatMorph<
	const o extends object,
	transformed extends MappedEntry
>(
	o: o,
	flatMapEntry: (...args: entryOf<o>) => transformed
): fromMappedEntries<transformed>
export function flatMorph<
	const o extends object,
	transformed extends MappedEntry
>(
	o: o,
	flatMapEntry: (...args: entryArgsWithIndex<o>) => transformed
): fromMappedEntries<transformed>
// eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions
export function flatMorph(
	o: object,
	flatMapEntry: (...args: any[]) => listable<Entry>
): any {
	const inputIsArray = Array.isArray(o)
	const entries: Entry[] = Object.entries(o).flatMap((entry, i) => {
		const result =
			inputIsArray ? flatMapEntry(i, entry[1]) : flatMapEntry(...entry, i)
		const entrySet =
			Array.isArray(result[0]) || result.length === 0 ?
				// if we have an empty array (for filtering) or an array with
				// another array as its first element, treat it as a list of
				(result as Entry[])
				// otherwise, it should be a single entry, so nest it in a tuple
				// so it doesn't get spread when the result is flattened
			:	[result as Entry]
		return entrySet
	})
	const objectResult = Object.fromEntries(entries)
	return typeof entries[0]?.[0] === "number" ?
			Object.values(objectResult)
		:	objectResult
}
