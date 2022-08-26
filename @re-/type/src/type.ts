import {
    chainableNoOpProxy,
    ElementOf,
    Evaluate,
    IterateType,
    Merge,
    MutuallyExclusiveProps
} from "@re-/tools"
import { Node } from "./node/index.js"
import { Root } from "./root.js"
import type { Space, SpaceMeta } from "./space.js"

export const type: TypeFunction = (
    definition,
    options = {},
    space?: SpaceMeta
) => {
    const root = Root.parse(definition, Node.initializeContext(options, space))
    return new Type(definition, root, options) as any
}

export type TypeOptions = {
    validate?: Node.Allows.Options
    create?: Node.Create.Options
}

export type TypeFunction<
    S extends Space = { Dict: {}; Resolutions: {}; Meta: {} }
> = <Def>(
    definition: Root.Validate<Def, S["Resolutions"]>,
    options?: TypeOptions
) => TypeFrom<
    Def,
    Root.Parse<Def, S["Resolutions"]>,
    InferTree<
        Root.Parse<Def, S["Resolutions"]>,
        Node.InferenceContext.From<{
            Space: S
            Seen: {}
        }>
    >
>

export type TypeFrom<Def, Tree, Inferred> = Evaluate<{
    definition: Def
    infer: Inferred
    validate: ValidateFunction<Inferred>
    assert: AssertFunction<Inferred>
    default: Inferred
    tree: Tree
    create: CreateFunction<Inferred>
    references: ReferencesFunction<Tree>
}>

export class Type implements TypeFrom<unknown, unknown, unknown> {
    constructor(
        public definition: unknown,
        public root: Node.base,
        public config: TypeOptions = {}
    ) {}

    get infer() {
        return chainableNoOpProxy
    }

    get default() {
        return this.create()
    }

    get tree() {
        return {}
    }

    validate(value: unknown, options?: Node.Allows.Options) {
        const args = Node.Allows.createArgs(
            value,
            options,
            this.config.validate
        )
        const customValidator =
            args.cfg.validator ?? args.ctx.modelCfg.validator ?? "default"
        if (customValidator !== "default") {
            Node.Allows.customValidatorAllows(customValidator, this.root, args)
        } else {
            this.root.allows(args)
        }
        return args.errors.isEmpty()
            ? { data: value }
            : {
                  error: new Node.Allows.ValidationError(args.errors)
              }
    }

    assert(value: unknown, options?: Node.Allows.Options) {
        const validationResult = this.validate(value, options)
        if (validationResult.error) {
            throw validationResult.error
        }
        return validationResult.data
    }

    create(options?: Node.Create.Options) {
        return this.root.create(
            Node.Create.createArgs(options, this.config.create)
        )
    }

    references(options: Node.References.Options = {}) {
        return this.root.references(options) as any
    }
}

export type AssertOptions = Node.Allows.Options

export type ValidateFunction<Inferred> = (
    value: unknown,
    options?: Node.Allows.Options
) => ValidationResult<Inferred>

export type ValidationResult<Inferred> = MutuallyExclusiveProps<
    { data: Inferred },
    {
        error: Node.Allows.ValidationError
    }
>

export type AssertFunction<Inferred> = (
    value: unknown,
    options?: Node.Allows.Options
) => Inferred

export type CreateFunction<Inferred> = (
    options?: Node.Create.Options
) => Inferred

export type ReferencesFunction<Tree> = <
    Options extends Node.References.Options = {}
>(
    options?: Options
) => Merge<
    {
        filter: Node.References.FilterFunction<string>
        preserveStructure: false
    },
    Options
> extends Node.References.Options<infer Filter, infer PreserveStructure>
    ? TransformReferences<
          Root.References<Tree, PreserveStructure>,
          Filter,
          "list"
      >
    : []

export type Infer<Def, S extends Space> = InferTree<
    Root.Parse<Def, S["Resolutions"]>,
    Node.InferenceContext.From<{ Space: S; Seen: {} }>
>

export type InferTree<Tree, Ctx extends Node.InferenceContext> = Root.Infer<
    Tree,
    Ctx
>

export type Validate<Def, Dict = {}> = Root.Validate<Def, Dict>

export type References<
    Def,
    Dict = {},
    Options extends Node.References.TypeOptions = {}
> = ReferencesOfTree<Root.Parse<Def, Dict>, Options>

export type ReferencesOfTree<
    Tree,
    Options extends Node.References.TypeOptions
> = Merge<
    { filter: string; preserveStructure: false; format: "list" },
    Options
> extends Node.References.TypeOptions<
    infer Filter,
    infer PreserveStructure,
    infer Format
>
    ? TransformReferences<
          Root.References<Tree, PreserveStructure>,
          Filter,
          Format
      >
    : {}

type TransformReferences<
    References,
    Filter extends string,
    Format extends Node.References.TypeFormat
> = References extends string[]
    ? FormatReferenceList<FilterReferenceList<References, Filter, []>, Format>
    : {
          [K in keyof References]: TransformReferences<
              References[K],
              Filter,
              Format
          >
      }

type FilterReferenceList<
    References extends string[],
    Filter extends string,
    Result extends string[]
> = References extends IterateType<string, infer Current, infer Remaining>
    ? FilterReferenceList<
          Remaining,
          Filter,
          Current extends Filter ? [...Result, Current] : Result
      >
    : Result

type FormatReferenceList<
    References extends string[],
    Format extends Node.References.TypeFormat
> = Format extends "tuple"
    ? References
    : Format extends "list"
    ? ElementOf<References>[]
    : ElementOf<References>
