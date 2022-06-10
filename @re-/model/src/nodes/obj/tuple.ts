import { Entry } from "@re-/tools"
import { Root } from "../root.js"
import { Common, Linked } from "#common"

export namespace Tuple {
    export type Definition = unknown[] | readonly unknown[]

    export const matches = (def: object): def is Definition =>
        Array.isArray(def)

    type ParseResult = Entry<number, Common.Node<unknown>>[]

    export class Node extends Linked<Definition, ParseResult> {
        parse() {
            return this.def.map((elementDef, elementIndex) => [
                elementIndex,
                Root.parse(elementDef, {
                    ...this.ctx,
                    path: `${this.ctx.path}${
                        this.ctx.path ? "/" : ""
                    }${elementIndex}`,
                    shallowSeen: []
                })
            ]) as ParseResult
        }

        allows(value: unknown, errors: Common.ErrorsByPath) {
            if (!Array.isArray(value)) {
                this.addUnassignable(value, errors)
                return
            }
            if (this.def.length !== value.length) {
                this.addUnassignable(value, errors)
                return
            }
            for (const [i, node] of this.next()) {
                node.allows(value[i], errors)
            }
        }

        generate() {
            return this.next().map(([, node]) => node.generate())
        }
    }
}
