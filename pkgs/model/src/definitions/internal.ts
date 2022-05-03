import { Evaluate } from "@re-/tools"

export * from "../internal.js"
export * from "./parser.js"

export * from "./root.js"

export type ParseTypeContext = {
    delimiter: string
    modifiers: string
}

export type DefaultParseTypeContext = {
    delimiter: never
    modifiers: never
}

export type ParseNode = {
    def: any
    kind: string
}

export type ShallowNode<Def, Kind extends string, T> = {
    def: Def
    kind: Kind
    type: T
}

export type DeepNode<Def, Kind extends string, Children> = {
    def: Def
    kind: Kind
    children: Children
}
