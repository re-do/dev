import {
    Narrow,
    Merge,
    Unlisted,
    transform,
    Entry,
    Evaluate,
    ElementOf
} from "@re-do/utils"
import { ParseTypeSet, ValidatedObjectDef } from ".."

type EntryIteration<Current extends Entry, Remaining extends Entry[]> = [
    Current,
    ...Remaining
]

type FromEntries<
    Entries extends Entry[],
    Result extends object = {}
> = Entries extends EntryIteration<infer Current, infer Remaining>
    ? FromEntries<Remaining, Merge<Result, { [K in Current[0]]: Current[1] }>>
    : Result

type ParseDefinitionEntries<Definitions extends Entry[]> = Evaluate<
    ParseTypeSet<FromEntries<Definitions>>
>

const createDefineFunctionMap = <DeclaredTypeNames extends string[]>(
    typeNames: DeclaredTypeNames
) =>
    transform(typeNames, ([index, typeName]) => [
        typeName as string,
        createDefineFunction(typeName as string)
    ]) as {
        [DefinedTypeName in ElementOf<DeclaredTypeNames>]: DefineFunction<
            ElementOf<DeclaredTypeNames>,
            DefinedTypeName
        >
    }

type DefineFunction<
    DeclaredTypeName extends string,
    DefinedTypeName extends DeclaredTypeName
> = <Definition extends ValidatedObjectDef<DeclaredTypeName, Definition>>(
    definition: Narrow<Definition>
) => Entry<DefinedTypeName, Definition>

const createDefineFunction =
    <DeclaredTypeName extends string, DefinedTypeName extends DeclaredTypeName>(
        definedTypeName: DefinedTypeName
    ): DefineFunction<DeclaredTypeName, DefinedTypeName> =>
    (definition: any) =>
        [definedTypeName, definition]

export const declareTypes = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names)
})

export const createTypes = <Definitions extends Entry[]>(
    ...definitions: Definitions
) => Object.fromEntries(definitions) as ParseDefinitionEntries<Definitions>
