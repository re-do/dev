import { Unlisted } from "@re-do/utils"
import { typeDefProxy } from "../../common.js"
import { createNode, createParser, NodeInput } from "../parser.js"
import { ParseTypeRecurseOptions } from "./common.js"
import {
    ParseSplittable,
    ParseSplittableResult,
    ValidateSplittable
} from "./common.js"
import { Fragment } from "./index.js"

export namespace Or {
    export type Definition<
        Before extends string = string,
        After extends string = string
    > = `${Before}|${After}`

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseTypeRecurseOptions,
        Result extends ParseSplittableResult = ParseSplittable<
            "|",
            Def,
            TypeSet,
            Options
        >
    > = Result["Errors"] extends ""
        ? Unlisted<Result["Components"]>
        : Result["Errors"]

    export type Validate<
        Def extends Definition,
        Root extends string,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = ValidateSplittable<
        "|",
        Def,
        Root,
        DeclaredTypeName,
        ExtractTypesReferenced
    >

    export const type = typeDefProxy as Definition

    export const node = createNode({
        type,
        parent: Fragment.node,
        matches: ({ definition }) => definition.includes("|")
    })

    export const parser = createParser(node)
}
