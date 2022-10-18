import { InternalArktypeError } from "../internal.js"
import type { Base } from "../nodes/base.js"
import type { Scope } from "../nodes/scope.js"
import type { Terminal } from "../nodes/terminal/terminal.js"
import type { DynamicSpace } from "../space.js"
import { Problem, Problems } from "./problems.js"

export class TraversalState<Data = unknown> {
    private problemsByPath: Record<string, Problems> = {}
    private traversalStack: unknown[] = []
    private resolutionStack: ResolvedData[] = []
    private scopes: Scope[]

    private path = ""

    constructor(public readonly data: Data, private space?: DynamicSpace) {
        // TODO: Add space scope,start alias
        this.scopes = []
    }

    pushKey(key: string) {
        this.traversalStack.push(this.data)
        this.path = pushedPath(this.path, key)
    }

    popKey() {
        this.path = poppedPath(this.path)
        // readonly modifier is to guide external use, but it is still most efficient
        // to directly set the value here.
        ;(this.data as any) = this.traversalStack.pop()!
    }

    addProblem(source: Terminal.Node) {
        if (!this.problemsByPath[this.path]) {
            this.problemsByPath[this.path] = new Problems()
        }
        if (this.path in this.problemsByPath) {
            this.problemsByPath[this.path][source.definition] = attributeValue
        } else {
            this.problemsByPath[this.path] = { [source.kind]: attributeValue }
        }
    }

    pushScope(scope: Scope) {
        this.scopes.push(scope)
    }

    popScope() {
        this.scopes.pop()
    }

    queryOption<K1 extends RootKey, K2 extends ConfigKey<K1>>(
        baseKey: K1,
        specifierKey: K2
    ): OptionQueryResult<K1, K2> {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            const baseConfig = this.scopes[i][baseKey] as any
            if (baseConfig) {
                const specifierConfig =
                    baseConfig[specifierKey] ?? baseConfig["$"]
                if (specifierConfig !== undefined) {
                    return specifierConfig
                }
            }
        }
    }

    resolve(alias: string) {
        const resolution = this.space?.[alias]
        if (!resolution) {
            throw new InternalArktypeError(
                `Unexpectedly failed to resolve alias '${alias}'`
            )
        }
        this.resolutionStack.push({
            alias,
            data: this.data,
            priorScopes: this.scopes
        })
        return resolution
    }

    popResolution() {
        this.scopes = this.resolutionStack.pop()!.priorScopes
    }
}

const pushedPath = (path: string, key: string, delimiter = ".") =>
    path === "" ? key : path + delimiter + key

const poppedPath = (path: string, delimiter = ".") => {
    const lastDelimiterIndex = path.lastIndexOf(delimiter)
    return lastDelimiterIndex === -1 ? "" : path.slice(0, lastDelimiterIndex)
}

export type ResolvedData = {
    alias: string
    data: unknown
    priorScopes: Scope[]
}

type OptionQueryResult<K1 extends RootKey, K2 extends ConfigKey<K1>> =
    | Required<Scope>[K1][K2]
    | undefined

export type RootKey = keyof Scope

export type ConfigKey<K1 extends RootKey> = keyof Required<Scope>[K1]
