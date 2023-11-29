import { caller } from "@arktype/fs"
import { printable, snapshot } from "@arktype/util"
import * as assert from "node:assert/strict"
import { isDeepStrictEqual } from "node:util"
import {
	getSnapshotByName,
	queueSnapshotUpdate,
	type SnapshotArgs
} from "../snapshot/snapshot.js"
import { updateExternalSnapshot } from "../snapshot/writeSnapshot.js"
import type { Completions } from "../tsserver/analyzeAssertCall.js"
import { chainableNoOpProxy } from "../utils.js"
import { assertEquals } from "./assertEquals.js"
import type { AssertionContext } from "./attest.js"
import {
	assertEqualOrMatching,
	callAssertedFunction,
	getThrownMessage
} from "./utils.js"

export type ChainableAssertionOptions = {
	allowRegex?: boolean
	defaultExpected?: unknown
}

type AssertionRecord = Record<keyof rootAssertions<any, AssertionKind>, unknown>

export class ChainableAssertions implements AssertionRecord {
	constructor(private ctx: AssertionContext) {}

	private serialize(value: unknown) {
		return snapshot(value)
	}

	private get actual() {
		return this.ctx.actual
	}

	private get serializedActual() {
		return this.serialize(this.actual)
	}

	private snapRequiresUpdate(expectedSerialized: unknown) {
		return (
			!isDeepStrictEqual(this.serializedActual, expectedSerialized) ||
			// If actual is undefined, we still need to write the "undefined" literal
			// to the snap even though it will serialize to the same value as the (nonexistent) first arg
			this.actual === undefined
		)
	}

	get unknown() {
		return this
	}

	is(expected: unknown) {
		assert.equal(this.actual, expected)
		return this
	}
	equals(expected: unknown) {
		assertEquals(expected, this.actual, this.ctx)
		return this
	}

	get snap(): snapProperty<unknown, AssertionKind> {
		// Use variadic args to distinguish undefined being passed explicitly from no args
		const inline = (...args: unknown[]) => {
			const snapName = (args.at(1) ?? "snap") as string
			const expectedSerialized = this.serialize(args[0])
			if (!args.length || this.ctx.cfg.updateSnapshots) {
				if (this.snapRequiresUpdate(expectedSerialized)) {
					const snapshotArgs: SnapshotArgs = {
						position: caller(),
						serializedValue: this.serializedActual,
						snapFunctionName: snapName
					}
					queueSnapshotUpdate(snapshotArgs)
				}
			} else {
				// compare as strings, but if match fails, compare again as objects
				// to give a clearer error message. This avoid problems with objects
				// like subtypes of array that do not pass node's deep equality test
				// but serialize to the same value.
				if (printable(args[0]) !== printable(this.actual)) {
					assertEquals(expectedSerialized, this.serializedActual, this.ctx)
				}
			}
			return this
		}
		const toFile = (id: string, opts?: ExternalSnapshotOptions) => {
			const expectedSnapshot = getSnapshotByName(
				this.ctx.position.file,
				id,
				opts?.path
			)
			if (!expectedSnapshot || this.ctx.cfg.updateSnapshots) {
				if (this.snapRequiresUpdate(expectedSnapshot)) {
					updateExternalSnapshot({
						serializedValue: this.serializedActual,
						position: caller(),
						name: id,
						customPath: opts?.path
					})
				}
			} else {
				assertEquals(expectedSnapshot, this.serializedActual, this.ctx)
			}
			return this
		}
		return Object.assign(inline, { toFile })
	}

	private immediateOrChained() {
		const immediateAssertion = (...args: [expected: unknown]) => {
			let expected
			if (args.length) {
				expected = args[0]
			} else {
				if ("defaultExpected" in this.ctx) {
					expected = this.ctx.defaultExpected
				} else {
					throw new Error(
						`Assertion call requires an arg representing the expected value.`
					)
				}
			}
			if (this.ctx.allowRegex) {
				assertEqualOrMatching(expected, this.actual, this.ctx)
			} else {
				assertEquals(expected, this.actual, this.ctx)
			}
			return this
		}
		return new Proxy(immediateAssertion, {
			get: (target, prop) => (this as any)[prop]
		})
	}

	get throws() {
		const result = callAssertedFunction(this.actual as Function)
		this.ctx.actual = getThrownMessage(result, this.ctx)
		this.ctx.allowRegex = true
		this.ctx.defaultExpected = ""
		return this.immediateOrChained()
	}

	throwsAndHasTypeError(matchValue: string | RegExp) {
		assertEqualOrMatching(
			matchValue,
			getThrownMessage(callAssertedFunction(this.actual as Function), this.ctx),
			this.ctx
		)
		if (!this.ctx.cfg.skipTypes) {
			assertEqualOrMatching(
				matchValue,
				this.ctx.assertionData?.errors.join("\n"),
				this.ctx
			)
		}
	}

	get completions() {
		if (this.ctx.cfg.skipTypes) {
			return chainableNoOpProxy
		}
		const completions = this.ctx.assertionData?.completions
		checkCompletionsForErrors(completions)
		this.ctx.actual = completions
		return this.immediateOrChained()
	}

	get type() {
		if (this.ctx.cfg.skipTypes) {
			return chainableNoOpProxy
		}
		// We need to bind this to return an object with getters
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this
		return {
			get toString() {
				self.ctx.actual = self.ctx.assertionData?.args[0].type
				return self.immediateOrChained()
			},
			get errors() {
				self.ctx.actual = self.ctx.assertionData?.errors.join("\n")
				self.ctx.allowRegex = true
				return self.immediateOrChained()
			},
			get completions() {
				const completions = self.ctx.assertionData?.completions
				checkCompletionsForErrors(completions)
				self.ctx.actual = completions
				return self.immediateOrChained()
			}
		}
	}
}
const checkCompletionsForErrors = (completions?: Completions) => {
	if (typeof completions === "string") {
		throw new Error(completions)
	}
}

export type AssertionKind = "value" | "type"

export type rootAssertions<t, kind extends AssertionKind> = valueAssertions<
	t,
	kind
> &
	TypeAssertionsRoot

export type valueAssertions<
	t,
	kind extends AssertionKind
> = comparableValueAssertion<t, kind> &
	(t extends () => unknown ? functionAssertions<kind> : {})

export type nextAssertions<kind extends AssertionKind> = "type" extends kind
	? TypeAssertionsRoot
	: {}

export type inferredAssertions<
	argsType extends [value: any, ...rest: any[]],
	kind extends AssertionKind,
	chained = argsType[0]
> = rootAssertions<chained, kind> &
	(<Args extends argsType | [] = []>(...args: Args) => nextAssertions<kind>)

export type ChainContext = {
	allowRegex?: boolean
	defaultExpected?: unknown
}

export type functionAssertions<kind extends AssertionKind> = {
	throws: inferredAssertions<[message: string | RegExp], kind, string>
	completions: inferredAssertions<[Completions], kind, Completions>
} & ("type" extends kind
	? {
			throwsAndHasTypeError: (message: string | RegExp) => undefined
	  }
	: {})

export type valueFromTypeAssertion<
	expected,
	chained = expected
> = inferredAssertions<[expected: expected], "value", chained>

type snapProperty<expected, kind extends AssertionKind> = {
	(expected?: snapshot<expected>): nextAssertions<kind>
	toFile: (
		id: string,
		options?: ExternalSnapshotOptions
	) => nextAssertions<kind>
}

export type comparableValueAssertion<expected, kind extends AssertionKind> = {
	snap: snapProperty<expected, kind>
	equals: (value: expected) => nextAssertions<kind>
	is: (value: expected) => nextAssertions<kind>
	completions: (value: expected) => nextAssertions<kind>
	// This can be used to assert values without type constraints
	unknown: Omit<comparableValueAssertion<unknown, kind>, "unknown">
}

export type TypeAssertionsRoot = {
	type: TypeAssertionProps
}

export type TypeAssertionProps = {
	toString: valueFromTypeAssertion<string>
	errors: valueFromTypeAssertion<string | RegExp, string>
	completions: valueFromTypeAssertion<Completions>
}

export type ExternalSnapshotOptions = {
	path?: string
}
