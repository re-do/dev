import type { Dictionary } from "@arktype/tools"
import { throwInternalError } from "../../utils.js"
import { Base } from "../base/base.js"
import { Keyword } from "../terminal/keyword/keyword.js"
import { Terminal } from "../terminal/terminal.js"

export namespace ObjectLiteral {
    export class Node extends Base.Node {
        readonly kind = "objectLiteral"
        readonly definitionRequiresStructure = true

        constructor(public children: Base.Node[], public keys: string[]) {
            super()
        }

        traverse(traversal: Base.Traversal) {
            if (!Keyword.nodes.dictionary.traverse(traversal)) {
                return
            }
            for (let i = 0; i < this.children.length; i++) {
                const k = this.keys[i]
                const child = this.children[i]
                if (k in traversal.data) {
                    traversal.pushKey(k)
                    child.traverse(traversal)
                    traversal.popKey()
                    // TODO: Narrowed kind check
                } else if (child.kind !== "optional") {
                    // this.addMissingKeyDiagnostic(state, k)
                }
            }
        }

        get definition() {
            const result: Dictionary = {}
            for (let i = 0; i < this.children.length; i++) {
                result[this.keys[i]] = this.children[i].definition
            }
            return result
        }

        get ast() {
            const result: Dictionary = {}
            for (let i = 0; i < this.children.length; i++) {
                result[this.keys[i]] = this.children[i].ast
            }
            return result
        }

        toString() {
            if (!this.children.length) {
                return "{}"
            }
            let result = "{"
            let i = 0
            for (i; i < this.children.length - 1; i++) {
                result +=
                    this.keys[i] + ": " + this.children[i].toString() + ", "
            }
            return result + this.children[i] + "}"
        }

        get description() {
            return this.toString()
        }
    }
}
