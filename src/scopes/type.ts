import type { TraversalNode, TypeNode } from "../nodes/node.ts"
import type { ParsedMorph } from "../parse/ast/morph.ts"
import type {
    inferTupleExpression,
    TupleExpression,
    TuplePostfixOperator,
    UnparsedTupleExpressionInput,
    UnparsedTupleOperator,
    validateTupleExpression
} from "../parse/ast/tuple.ts"
import type {
    as,
    inferDefinition,
    validateDefinition
} from "../parse/definition.ts"
import type { Problems, ProblemsConfig } from "../traverse/problems.ts"
import { TraversalState, traverse } from "../traverse/traverse.ts"
import { chainableNoOpProxy } from "../utils/chainableNoOpProxy.ts"
import type { conform, defer, evaluate, xor } from "../utils/generics.ts"
import { hasKeys } from "../utils/generics.ts"
import type { BuiltinClass } from "../utils/objectKinds.ts"
import type { Scope } from "./scope.ts"
import type { PrecompiledDefaults } from "./standard.ts"

// TODO: add config entries when resolving a type
export type TypeParser<$> = {
    <def>(def: validateDefinition<def, $>): parseType<def, $>

    <def>(def: validateDefinition<def, $>, opts: TypeOptions): parseType<def, $>
}

export type BinaryExpressionParser<$, operator extends "&" | "|"> = {
    <l, r>(
        l: validateDefinition<l, $>,
        r: validateDefinition<r, $>
    ): parseTupleExpression<[l, operator, r], $>

    <l, r>(
        l: validateDefinition<l, $>,
        r: validateDefinition<r, $>,
        opts: TypeOptions
    ): parseTupleExpression<[l, operator, r], $>
}

export type UnaryExpressionParser<$, operator extends "keyof" | "[]"> = {
    <def>(def: validateDefinition<def, $>): parseTupleExpression<
        unaryToTupleExpression<def, operator>,
        $
    >

    <def>(
        def: validateDefinition<def, $>,
        opts: TypeOptions
    ): parseTupleExpression<unaryToTupleExpression<def, operator>, $>
}

export type UnvalidatedExpressionParser<
    $,
    operator extends UnparsedTupleOperator
> = {
    <def>(
        def: conform<def, UnparsedTupleExpressionInput<$>[operator]>
    ): parseTupleExpression<[operator, def], $>

    <def>(
        def: conform<def, UnparsedTupleExpressionInput<$>[operator]>,
        opts: TypeOptions
    ): parseTupleExpression<[operator, def], $>
}

// export type TupleExpressionParser<$> = {
//     <args extends readonly unknown[]>(
//         ...args: validateTupleExpression<args, $>
//     ): args ///parseTupleExpression<args, $>
// }

// const expression = {} as TupleExpressionParser<PrecompiledDefaults>

// const t = expression("string", "[]")

type unaryToTupleExpression<
    def,
    operator extends "keyof" | "[]"
> = operator extends TuplePostfixOperator ? [def, "[]"] : [operator, def]

type parseTupleExpression<
    expression extends TupleExpression,
    $
> = inferTupleExpression<expression, $> extends infer result
    ? [result] extends [never]
        ? never
        : Type<result>
    : never

export type parseType<def, $> = [def] extends [validateDefinition<def, $>]
    ? Type<inferDefinition<def, $>>
    : never

type TypeRoot<t = unknown> = {
    [as]: t
    infer: asOut<t>
    node: TypeNode
    flat: TraversalNode
    meta: TypeMeta
}

export type TypeOptions = evaluate<
    {
        name?: string
    } & ProblemsConfig
>

export type TypeConfig = ProblemsConfig

type TypeMeta = {
    name: string
    id: QualifiedTypeName
    definition: unknown
    scope: Scope
    config: TypeConfig | undefined
    includesMorph: boolean
}

const compileTypeConfig = (
    opts: TypeOptions | undefined
): TypeConfig | undefined => {
    if (opts === undefined) {
        return
    }
    const { name, ...config } = opts
    if (hasKeys(config)) {
        return config
    }
}

export const initializeType = (
    definition: unknown,
    opts: TypeOptions | undefined,
    scope: Scope
) => {
    const name = opts?.name ?? "type"
    const config = compileTypeConfig(opts)
    const meta: TypeMeta = {
        name,
        id: `${scope.name}.${
            opts?.name ? name : `type${scope.createAnonymousTypeSuffix()}`
        }`,
        definition,
        scope,
        config,
        includesMorph: false
    }

    const root = {
        // temporarily initialize node/flat to aliases that will be included in
        // the final type in case of cyclic resolutions
        node: name,
        flat: [["alias", name]],
        meta,
        infer: chainableNoOpProxy
        // the "as" symbol from inferred is not used at runtime, so we check
        // that the rest of the type is correct then cast it
    } satisfies Omit<TypeRoot, typeof as> as TypeRoot

    // dynamically assign a name to the primary traversal function
    const namedTraverse: Checker<unknown> = {
        [name]: (data: unknown) => {
            const state = new TraversalState(data, type)
            return (
                traverse(type.flat, state)
                    ? { data: state.data }
                    : { problems: state.problems }
            ) as CheckResult<unknown>
        }
    }[name]

    // we need to assign this to a variable before returning so we can reference
    // it in namedTraverse
    const type: Type = Object.assign(namedTraverse, root)
    return type
}

export const isType = (value: unknown): value is Type =>
    (value as Type)?.infer === chainableNoOpProxy

export type CheckResult<t> = xor<{ data: asOut<t> }, { problems: Problems }>

type Checker<t> = (data: unknown) => CheckResult<t>

export type Type<t = unknown> = defer<Checker<t> & TypeRoot<t>>

export type QualifiedTypeName = `${string}.${string}`

export type asIn<t> = asIo<t, "in">

export type asOut<t> = asIo<t, "out">

type asIo<t, io extends "in" | "out"> = t extends ParsedMorph<infer i, infer o>
    ? io extends "in"
        ? i
        : o
    : t extends object
    ? t extends Function | BuiltinClass
        ? t
        : { [k in keyof t]: asIo<t[k], io> }
    : t
