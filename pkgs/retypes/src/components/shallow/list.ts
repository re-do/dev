import { ParseTypeRecurseOptions, UnvalidatedTypeSet } from "../common.js"
import { createParser, ValidationErrors } from "../parser.js"
import { unassignableError, validationError } from "../errors.js"
import { Fragment } from "./fragment.js"
import { typeDefProxy } from "../../common.js"
import { Tuple } from "../recursible/tuple.js"
import { isEmpty } from "@re-do/utils"

export namespace List {
    export type Definition<Item extends string = string> = `${Item}[]`

    export const type = typeDefProxy as Definition

    const parts = (definition: Definition) => ({
        item: definition.slice(0, -2)
    })

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            matches: (def, ctx) => def.endsWith("[]"),
            fragments: (def, ctx) => ({
                item: Fragment.parse(def.slice(0, -2), ctx)
            })
        },
        {
            allows: ({ def, fragments: { item }, ctx }, valueType, opts) => {
                if (Array.isArray(valueType)) {
                    return Tuple.parse(
                        [...Array(valueType.length)].map(() => item),
                        ctx
                    ).allows(valueType, opts)
                }
                return validationError({
                    def,
                    valueType,
                    path: ctx.path
                })
            },
            generate: () => [],
            references: ({ fragments: { item } }, opts) => item.references(opts)
        }
    )

    export const delegate = parse as any as Definition
}
