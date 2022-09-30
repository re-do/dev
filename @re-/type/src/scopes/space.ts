import type { Dictionary, Evaluate } from "@re-/tools"
import { chainableNoOpProxy, deepMerge, mapValues } from "@re-/tools"
import { ResolutionNode } from "../nodes/resolution.js"
import type { Infer } from "../nodes/traverse/ast/infer.js"
import { initializeParserContext } from "../parser/common.js"
import { Root } from "../parser/root.js"
import type { ParseSpace } from "./parse.js"
import { TypeRoot } from "./type.js"
import type {
    DynamicTypeRoot,
    InferredTypeFn,
    InternalTypeOptions,
    TypeOptions
} from "./type.js"

type TypedSpaceFn = <Aliases, Resolutions = ParseSpace<Aliases>>(
    aliases: Root.Validate<Aliases, Resolutions>,
    options?: TypeOptions
) => SpaceOutput<{ aliases: Aliases; resolutions: Resolutions }>

type DynamicSpaceFn = <Aliases extends Dictionary>(
    aliases: Aliases,
    options?: TypeOptions
) => DynamicSpace<Aliases>

export type SpaceFn = TypedSpaceFn & { dynamic: DynamicSpaceFn }

export type DynamicSpace<Aliases extends Dictionary = Dictionary> = Record<
    keyof Aliases,
    DynamicTypeRoot
> & {
    $root: DynamicSpaceRoot
}

export type DynamicSpaceRoot = SpaceRootFrom<{
    aliases: Dictionary
    resolutions: Dictionary
}>

const rawSpace = (aliases: Dictionary, opts: SpaceOptions = {}) => {
    const $root = new SpaceRoot(aliases, opts)
    const compiled: Record<string, any> = { $root }
    for (const name of Object.keys(aliases)) {
        const ctx = initializeParserContext(opts)
        ctx.space = $root
        const resolution = new ResolutionNode(name, ctx)
        $root.resolutions[name] = resolution
        compiled[name] = new TypeRoot(resolution.root, resolution, opts)
    }
    return compiled as DynamicSpace
}

rawSpace.dynamic = rawSpace
export const space: SpaceFn = rawSpace as any

// TODO: Update dict extension meta to not deepmerge, fix extension meta.
// TODO: Ensure there are no extraneous types/space calls from testing
// TODO: Ensure "Dict"/"dictionary" etc. is not used anywhere referencing space
export class SpaceRoot implements DynamicSpaceRoot {
    resolutions: Dictionary<ResolutionNode>

    constructor(public aliases: Dictionary, public options: SpaceOptions = {}) {
        this.resolutions = {}
    }

    type(def: unknown, opts: InternalTypeOptions = {}) {
        // TODO: What do we need to calculate here?
        const compiledOptions = deepMerge(this.options, opts)
        compiledOptions.space = this
        const root = Root.parse(def, initializeParserContext(compiledOptions))
        return new TypeRoot(def, root, compiledOptions) as any
    }

    extend(extensions: Dictionary, overrides?: SpaceOptions) {
        return rawSpace(
            { ...this.aliases, ...extensions },
            deepMerge(this.options, overrides)
        ) as any
    }

    get infer() {
        return chainableNoOpProxy
    }

    get ast() {
        return mapValues(this.resolutions, (resolution) => resolution.toAst())
    }
}

export type ResolvedSpace = {
    aliases: unknown
    resolutions: unknown
}

export namespace ResolvedSpace {
    export type From<S extends ResolvedSpace> = S

    export type Empty = From<{ aliases: {}; resolutions: {} }>
}

export type SpaceOutput<Space extends ResolvedSpace> = Evaluate<
    SpaceTypeRoots<Space["resolutions"]> & {
        $root: SpaceRootFrom<Space>
    }
>

export type SpaceOptions = TypeOptions

export type SpaceRootFrom<Space extends ResolvedSpace> = Evaluate<{
    infer: InferSpaceRoot<Space["resolutions"]>
    aliases: Space["resolutions"]
    ast: Space["resolutions"]
    type: InferredTypeFn<Space>
    // extend: ExtendFn<S>
    options: SpaceOptions
}>

export type SpaceTypeRoots<Resolutions> = Evaluate<{
    [Name in keyof Resolutions]: TypeRoot.New<
        Name,
        Resolutions[Name],
        Resolutions
    >
}>

export type InferSpaceRoot<Resolutions> = Evaluate<{
    [Name in keyof Resolutions]: Infer<Resolutions[Name], Resolutions>
}>
