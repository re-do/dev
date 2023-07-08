import { PredicateNode } from "./predicate/predicate.js"
import { BoundNode } from "./primitive/bound.js"
import { ClassNode } from "./primitive/class.js"
import { DivisorNode } from "./primitive/divisor.js"
import { DomainNode } from "./primitive/domain.js"
import { NarrowNode } from "./primitive/narrow.js"
import { RegexNode } from "./primitive/regex.js"
import { UnitNode } from "./primitive/unit.js"
import { PropertiesNode } from "./properties/properties.js"
import { TypeNode } from "./type.js"

const nodeConstructors = {
    type: TypeNode,
    domain: DomainNode,
    class: ClassNode,
    unit: UnitNode,
    bound: BoundNode,
    divisor: DivisorNode,
    regex: RegexNode,
    narrow: NarrowNode,
    predicate: PredicateNode,
    properties: PropertiesNode
}

type NodeConstructors = typeof nodeConstructors
export type NodeKind = keyof NodeConstructors

export type NodeKinds = {
    [k in NodeKind]: InstanceType<NodeConstructors[k]>
}

export type NodeInput<kind extends NodeKind = NodeKind> = {
    [k in NodeKind]: readonly [
        kind: k,
        ...args: ConstructorParameters<NodeConstructors[k]>
    ]
}[kind]

export type Node<kind extends NodeKind = NodeKind> = NodeKinds[kind]

export const node = <const input extends NodeInput>(
    ...input: input
): NodeKinds[input[0]] =>
    new (nodeConstructors[input[0]] as any)(input[1], input[2])
