import { Entry, NonRecursible } from "@re-do/utils"

export type BuiltInTypeMap = {
    string: string
    boolean: boolean
    number: number
    null: null
    undefined: undefined
    unknown: unknown
    any: any
}

export type BuiltInType = keyof BuiltInTypeMap

export type ListType<ListItem extends string = string> = `${ListItem}[]`

export type OrType<
    First extends string = string,
    Second extends string = string
> = `${First}|${Second}`

export type GroupedType<Group extends string = string> = `(${Group})`

export type OptionalType<OptionalType extends string = string> =
    `${OptionalType}?`

export type Iteration<T, Current extends T, Remaining extends T[]> = [
    Current,
    ...Remaining
]

export type FromEntries<
    Entries extends Entry[],
    Result extends object = {}
> = Entries extends Iteration<Entry, infer Current, infer Remaining>
    ? FromEntries<Remaining, Merge<Result, { [K in Current[0]]: Current[1] }>>
    : Result

export type Merge<A, B> = A extends any[] | NonRecursible
    ? B
    : B extends any[] | NonRecursible
    ? A
    : {
          [K in keyof A | keyof B]: K extends keyof A
              ? K extends keyof B
                  ? B[K]
                  : A[K]
              : K extends keyof B
              ? B[K]
              : never
      }

export type MergeAll<
    Objects,
    Result extends object = {}
> = Objects extends Iteration<any, infer Current, infer Remaining>
    ? MergeAll<Remaining, Merge<Result, Current>>
    : Result
