import type { listable } from "../../../dev/utils/src/main.js"
import { intersectUniqueLists, listFrom } from "../../../dev/utils/src/main.js"
import { registry } from "../../compile/registry.js"
import type { Morph } from "../../parse/tuple.js"
import type { BaseNode } from "../node.js"
import { defineNodeKind } from "../node.js"

export interface MorphNode extends BaseNode<readonly Morph[]> {}

export const morphNode = defineNodeKind<MorphNode, listable<Morph>>(
    {
        kind: "morph",
        // Avoid alphabetical sorting since morphs are non-commutative,
        // i.e. a=>b and b=>a are distinct and valid
        parse: listFrom,
        compile: (rule, s) => {
            const compiled = rule.map((morph) => {
                const reference = registry().register(morph)
                return `${s.data} = ${reference}(${s.data})`
            })
            return s.kind === "allows"
                ? // we don't run morphs on allows checks so for now just add this as a comment
                  `/**${compiled.join("")}**/`
                : `morphs.push(() => {
                ${compiled}
            })`
        },
        intersect: (l, r): MorphNode =>
            morphNode(intersectUniqueLists(l.rule, r.rule))
    },
    (base) => ({
        description: `morphed by ${base.rule
            .map((morph) => morph.name)
            .join("=>")}`
    })
)
