import { hasDomain } from "../utils/domains.js"
import { registry } from "../utils/registry.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive } from "../utils/serialize.js"
import type {
    ComparisonState,
    CompilationState,
    CompiledAssertion
} from "./node.js"
import { Node } from "./node.js"

export class EqualityNode<value = unknown> extends Node<typeof EqualityNode> {
    constructor(value: value) {
        super(EqualityNode, value)
    }

    intersect(other: EqualityNode, s: ComparisonState) {
        return this === other ? this : s.addDisjoint("value", this, other)
    }

    static compile(value: unknown): CompiledAssertion {
        return `data !== ${
            hasDomain(value, "object") || typeof value === "symbol"
                ? registry().register(typeof value, value)
                : serializePrimitive(value as SerializablePrimitive)
        }`
    }
}
