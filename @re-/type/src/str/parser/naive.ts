import { Terminal } from "../base/index.js"
import { Node } from "../common.js"
import { ListNode, OptionalNode } from "../operator/index.js"
import { Parse } from "./main.js"

/**
 * Try to parse the definition from right to left using the most common syntax.
 * This can be much more efficient for simple definitions. Unfortunately,
 * parsing from right to left makes maintaining a tree that can either be returned
 * or discarded in favor of a full parse tree much more costly.
 *
 * Hence, this repetitive (but efficient) shallow parse that decides whether to
 * delegate parsing in a single pass.
 */
export type TryParse<Def extends string, Dict> = Def extends `${infer Child}?`
    ? Child extends `${infer Item}[]`
        ? Terminal.IsResolvableName<Item, Dict> extends true
            ? [[Item, "[]"], "?"]
            : Parse<Def, Dict>
        : Terminal.IsResolvableName<Child, Dict> extends true
        ? [Child, "?"]
        : Parse<Def, Dict>
    : Def extends `${infer Child}[]`
    ? Terminal.IsResolvableName<Child, Dict> extends true
        ? [Child, "[]"]
        : Parse<Def, Dict>
    : Terminal.IsResolvableName<Def, Dict> extends true
    ? Def
    : Parse<Def, Dict>

export const tryParse = (def: string, ctx: Node.Context) => {
    if (def.endsWith("?")) {
        const possibleIdentifierNode = tryParseList(def.slice(0, -1), ctx)
        if (possibleIdentifierNode) {
            return new OptionalNode(possibleIdentifierNode, ctx)
        }
    }
    return tryParseList(def, ctx)
}

const tryParseList = (def: string, ctx: Node.Context) => {
    if (def.endsWith("[]")) {
        const possibleIdentifierNode = Terminal.toNodeIfResolvableIdentifier(
            def.slice(0, -2),
            ctx
        )
        if (possibleIdentifierNode) {
            return new ListNode(possibleIdentifierNode, ctx)
        }
    }
    return Terminal.toNodeIfResolvableIdentifier(def, ctx)
}
