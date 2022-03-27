import {
    TypeOfContext,
    createParser,
    typeDefProxy,
    UnknownTypeError
} from "./internal.js"
import { Fragment } from "../fragment/fragment.js"
import { Optional } from "./optional.js"
import { ParseTypeContext } from "../internal.js"
import { Str } from "../str.js"

export namespace Modification {
    export type Definition = Optional.Definition

    export type Parse<
        Def extends Definition,
        Space,
        Context extends ParseTypeContext
    > = Def extends Optional.Definition
        ? Optional.Parse<Def, Space, Context>
        : UnknownTypeError<Def>

    export type Node = Optional.Node

    export type TypeOf<
        N extends Node,
        Space,
        Options extends TypeOfContext
    > = N extends Optional.Node ? Optional.TypeOf<N, Space, Options> : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Str.parse,
        children: () => [Optional.delegate]
    })

    export const delegate = parse as any as Definition
}
