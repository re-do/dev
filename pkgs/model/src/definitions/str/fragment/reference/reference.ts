import { createParser, TypeOfContext, typeDefProxy } from "./internal.js"
import { Fragment } from "../fragment.js"
import { Keyword } from "./keyword/keyword.js"
import { Literal } from "./literal/literal.js"
import { Alias } from "./alias.js"

export namespace Reference {
    export type Definition<Space> =
        | Keyword.Definition
        | Literal.Definition
        | Alias.Definition<Space>

    export type Matches<
        Def extends string,
        Space
    > = Literal.Matches<Def> extends true
        ? true
        : Def extends Keyword.Definition | Alias.Definition<Space>
        ? true
        : false

    export type Node = string

    export type TypeOf<
        N extends Node,
        Space,
        Options extends TypeOfContext
    > = N extends Keyword.Definition
        ? Keyword.TypeOf<N>
        : N extends Literal.Definition
        ? Literal.TypeOf<N>
        : N extends Alias.Definition<Space>
        ? Alias.TypeOf<N, Space, Options>
        : unknown

    export const type = typeDefProxy as string

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            children: () => [Keyword.delegate, Literal.delegate, Alias.delegate]
        },
        { references: ({ def }) => [def] }
    )

    export const delegate = parse as any as string
}
