import {
	ReadonlyArray,
	hasDefinedKey,
	type evaluate,
	type optionalizeKeys,
	type propwiseXor
} from "@arktype/util"
import type { Prerequisite, errorContext } from "../kinds.js"
import type { NodeKind } from "./implement.js"
import type { TraversalContext, TraversalPath } from "./traversal.js"

export class ArkError extends TypeError {
	toString(): string {
		return this.message
	}

	throw(): never {
		throw this
	}
}

export type ArkTypeError<code extends ArkErrorCode = ArkErrorCode> = ArkError &
	ArkErrorContext<code>

export const ArkTypeError: new <code extends ArkErrorCode = ArkErrorCode>(
	context: ArkErrorContext<code>
) => ArkTypeError<code> = class extends ArkError {
	constructor(context: ArkErrorContext) {
		super(context.message)
		Object.assign(this, context)
	}
} as never

export class ArkErrors extends ReadonlyArray<ArkTypeError> {
	constructor(protected ctx: TraversalContext) {
		super()
	}

	byPath: Record<string, ArkTypeError> = {}
	count = 0
	private mutable: ArkTypeError[] = this as never

	add<input extends ArkErrorInput>(
		input: input
	): ArkTypeError<
		input extends { code: ArkErrorCode } ? input["code"] : "predicate"
	>
	add(input: ArkErrorInput): ArkTypeError {
		const error = this.create(input)
		const pathKey = error.path.join(".")
		const existing = this.byPath[pathKey]
		if (existing) {
			const errorIntersection = this.create({
				code: "intersection",
				errors:
					existing.code === "intersection"
						? [...existing.errors, error]
						: [existing, error]
			})
			const existingIndex = this.indexOf(existing)
			// If existing is found (which it always should be unless this was externally mutated),
			// replace it with the new problem intersection. In case it isn't for whatever reason,
			// just append the intersection.
			this.mutable[existingIndex === -1 ? this.length : existingIndex] =
				errorIntersection
			this.byPath[pathKey] = errorIntersection
		} else {
			this.byPath[pathKey] = error
			this.mutable.push(error)
		}
		this.count++
		return error
	}

	protected create(input: ArkErrorInput): ArkTypeError {
		let ctx: ArkErrorContext
		const data = this.ctx.data
		const nodeConfig = this.ctx.config.predicate
		if (typeof input === "string") {
			ctx = {
				code: "predicate",
				path: [...this.ctx.path],
				data,
				actual: nodeConfig.actual(data),
				expected: input
			} satisfies ProblemContext as any
			ctx.problem = nodeConfig.problem(ctx as never)
			ctx.message = nodeConfig.message(ctx as never)
		} else {
			const code = input.code ?? "predicate"
			const nodeConfig = this.ctx.config[code]
			const expected = input.expected ?? nodeConfig.expected?.(input as never)
			ctx = {
				...input,
				// prioritize these over the raw user provided values so we can
				// check for keys with values like undefined
				code,
				path: input.path ?? [...this.ctx.path],
				data: "data" in input ? input.data : data,
				actual:
					input.actual !== undefined
						? input.actual
						: nodeConfig.actual?.(data as never),
				expected
			} satisfies ProblemContext as any
			ctx.problem = hasDefinedKey(input, "problem")
				? input.problem
				: nodeConfig.problem(ctx as never)
			ctx.message = hasDefinedKey(input, "message")
				? input.message
				: nodeConfig.message(ctx as never)
		}
		return new ArkTypeError(ctx)
	}

	get summary(): string {
		return this.toString()
	}

	toString(): string {
		return this.join("\n")
	}

	throw(): never {
		throw new ArkError(`${this}`, { cause: this })
	}
}

export interface DerivableErrorContext<data = unknown> {
	expected: string
	actual: string | null
	problem: string
	message: string
	data: data
	path: TraversalPath
}

export type ArkErrorCode = {
	[kind in NodeKind]: errorContext<kind> extends null ? never : kind
}[NodeKind]

export type ArkErrorContext<code extends ArkErrorCode = ArkErrorCode> =
	errorContext<code> & DerivableErrorContext<Prerequisite<code>>

export type MessageContext<code extends ArkErrorCode = ArkErrorCode> = Omit<
	ArkErrorContext<code>,
	"message"
>

export type ProblemContext<code extends ArkErrorCode = ArkErrorCode> = Omit<
	MessageContext<code>,
	"problem"
>

type ErrorInputByCode = {
	[code in ArkErrorCode]: optionalizeKeys<
		ArkErrorContext<code>,
		keyof DerivableErrorContext
	>
}

export type CustomErrorInput = evaluate<
	// ensure a custom error can be discriminated on the lack of a code
	{ code?: undefined } & Partial<DerivableErrorContext>
>

export type ArkErrorInput =
	| string
	| ErrorInputByCode[ArkErrorCode]
	| CustomErrorInput

export type ProblemWriter<code extends ArkErrorCode = ArkErrorCode> = (
	context: ProblemContext<code>
) => string

export type MessageWriter<code extends ArkErrorCode = ArkErrorCode> = (
	context: MessageContext<code>
) => string

export type getAssociatedDataForError<code extends ArkErrorCode> =
	code extends NodeKind ? Prerequisite<code> : unknown

export type ExpectedWriter<code extends ArkErrorCode = ArkErrorCode> = (
	source: errorContext<code>
) => string

export type ActualWriter<code extends ArkErrorCode = ArkErrorCode> = (
	data: getAssociatedDataForError<code>
) => string | null

export type ArkResult<out = unknown> = propwiseXor<
	{ out: out },
	{ errors: ArkErrors }
>