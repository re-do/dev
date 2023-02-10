import type { TypeNode } from "../nodes/node.ts"
import type { Type } from "../scopes/type.ts"
import { isType } from "../scopes/type.ts"
import type { Primitive } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type {
    Dict,
    evaluateObject,
    isAny,
    isUnknown,
    List
} from "../utils/generics.ts"
import { objectKindOf } from "../utils/objectKinds.ts"
import type { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type { inferRecord } from "./record.ts"
import { parseRecord } from "./record.ts"
import type { inferString, validateString } from "./string/string.ts"
import { parseString } from "./string/string.ts"
import type {
    inferTuple,
    TupleExpression,
    validateTupleExpression
} from "./tuple/tuple.ts"
import { parseTuple } from "./tuple/tuple.ts"

export type ParseContext = {
    type: Type
    path: Path
}

export const parseDefinition = (def: unknown, ctx: ParseContext): TypeNode => {
    const domain = domainOf(def)
    if (domain === "string") {
        return parseString(def as string, ctx)
    }
    if (domain !== "object") {
        return throwParseError(writeBadDefinitionTypeMessage(domain))
    }
    const objectKind = objectKindOf(def)
    switch (objectKind) {
        case "Object":
            return parseRecord(def as Dict, ctx)
        case "Array":
            return parseTuple(def as List, ctx)
        case "RegExp":
            return { string: { regex: (def as RegExp).source } }
        case "Function":
            if (isType(def)) {
                return def.node
            }
            if (isThunk(def)) {
                const returned = def()
                if (isType(returned)) {
                    return returned.node
                }
            }
            return throwParseError(writeBadDefinitionTypeMessage("Function"))
        default:
            return throwParseError(
                writeBadDefinitionTypeMessage(objectKind ?? stringify(def))
            )
    }
}

export type inferDefinition<def, $> = isAny<def> extends true
    ? never
    : def extends inferred<infer t> | Thunk<inferred<infer t>>
    ? t
    : def extends string
    ? inferString<def, $>
    : def extends List
    ? inferTuple<def, $>
    : def extends RegExp
    ? string
    : def extends Dict
    ? inferRecord<def, $>
    : never

export type validateDefinition<def, $> = def extends Terminal
    ? def
    : def extends string
    ? validateString<def, $>
    : def extends TupleExpression
    ? validateTupleExpression<def, $>
    : def extends BadDefinitionType
    ? writeBadDefinitionTypeMessage<
          objectKindOf<def> extends string ? objectKindOf<def> : domainOf<def>
      >
    : isUnknown<def> extends true
    ? unknownDefinitionMessage
    : evaluateObject<{
          [k in keyof def]: validateDefinition<def[k], $>
      }>

export const as = Symbol("as")

export type inferred<t> = {
    [as]?: t
}

export const unknownDefinitionMessage =
    "Cannot statically parse a definition inferred as unknown. Consider using 'as inferred<...>' to cast it."

export type unknownDefinitionMessage = typeof unknownDefinitionMessage

const isThunk = (def: unknown): def is Thunk =>
    typeof def === "function" && def.length === 0

// using any as the return type here allows us to validate without a circular reference error
type Thunk<returnType = any> = () => returnType

type Terminal = RegExp | inferred<unknown> | Thunk

type BadDefinitionType = Exclude<Primitive, string> | Function

export const writeBadDefinitionTypeMessage = <actual extends string>(
    actual: actual
): writeBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

type writeBadDefinitionTypeMessage<actual extends string> =
    `Type definitions must be strings or objects (was ${actual})`
