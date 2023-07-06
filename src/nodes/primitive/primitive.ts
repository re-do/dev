import type { listable } from "@arktype/utils"
import type { Disjoint } from "../disjoint.js"
import type { PrimitiveNodeKind } from "../kinds.js"
import { type BaseNode, type BaseNodeConfig } from "../node.js"

export interface PrimitiveNodeConfig extends BaseNodeConfig {
    kind: PrimitiveNodeKind
    intersection: listable<this["rule"]>
}

export type definePrimitive<config extends PrimitiveNodeConfig> = config

export type PrimitiveIntersection<config extends PrimitiveNodeConfig> = (
    l: config["intersection"],
    r: config["intersection"]
) => config["intersection"] | Disjoint

export interface PrimitiveNode<
    config extends PrimitiveNodeConfig = PrimitiveNodeConfig
> extends BaseNode<config> {}
