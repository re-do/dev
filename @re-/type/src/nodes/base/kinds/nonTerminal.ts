import { Create, References, Validation } from "../base.js"
import { Parsing } from "../features/parsing.js"
import { Node } from "./node.js"

export type ParseChildren = Parsing.Node | Parsing.Node[]

export abstract class NonTerminal<Children extends ParseChildren = Parsing.Node>
    implements Node
{
    constructor(public children: Children, public ctx: Parsing.Context) {}

    abstract allows(args: Validation.Args): boolean
    abstract generate(args: Create.Args): unknown
    collectReferences(args: References.Args, collected: Set<string>) {
        if (Array.isArray(this.children)) {
            for (const child of this.children) {
                child.collectReferences(args, collected)
            }
        } else {
            this.children.collectReferences(args, collected)
        }
    }
}
