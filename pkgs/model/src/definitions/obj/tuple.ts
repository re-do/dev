import { Evaluate } from "@re-/tools"
import {
    typeDefProxy,
    TypeOfContext,
    createParser,
    tupleLengthError,
    validationError,
    ValidationErrors,
    ParseTypeContext,
    Defer,
    DeepNode
} from "./internal.js"
import { Root } from "../root.js"
import { Obj } from "./obj.js"
import { typeOf } from "../../utils.js"

export namespace Tuple {
    export type Definition = any[]

    export type Kind = "tuple"

    export type Node = DeepNode<Kind, any[]>

    export type Parse<Def, Resolutions, Context> = Def extends any[]
        ? DeepNode<
              Kind,
              {
                  [Index in keyof Def]: Root.Parse<
                      Def[Index],
                      Resolutions,
                      Context
                  >
              }
          >
        : Defer

    export type TypeOf<
        N extends Node,
        Resolutions,
        Options,
        T = N["children"]
    > = Evaluate<{
        [Index in keyof T]: Root.TypeOf<T[Index], Resolutions, Options>
    }>

    export type Validate<N extends Node, Resolutions, T = N["children"]> = {
        [Index in keyof T]: Root.Validate<T[Index], Resolutions>
    }

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => Obj.parser,
            components: (def, ctx) =>
                def.map((itemDef, index) =>
                    Root.parser.parse(itemDef, {
                        ...ctx,
                        path: [...ctx.path, `${index}`],
                        shallowSeen: []
                    })
                )
        },
        {
            matches: (def) => Array.isArray(def),
            validate: ({ def, ctx, components }, value, opts) => {
                const valueType = typeOf(value)
                if (!Array.isArray(valueType)) {
                    // Defined is a tuple, extracted is an object with string keys (will never be assignable)
                    return validationError({
                        def,
                        valueType,
                        path: ctx.path
                    })
                }
                if (def.length !== valueType.length) {
                    return validationError({
                        path: ctx.path,
                        message: tupleLengthError({
                            def,
                            valueType
                        })
                    })
                }
                return components.reduce(
                    (errors, component, index) => ({
                        ...errors,
                        ...component.validate((value as any)[index], opts)
                    }),
                    {} as ValidationErrors
                )
            },
            generate: ({ components }, opts) =>
                components.map((item) => item.generate(opts)),
            references: ({ components }, opts) =>
                components.map((item) => item.references(opts))
        }
    )

    export const delegate = parser as any as Definition
}
