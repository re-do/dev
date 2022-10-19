import type { Base } from "../../base/base.js"
import { Terminal } from "../terminal.js"
import { typeKeywords } from "./type.js"

abstract class RegexKeywordNode extends Terminal.Node {
    readonly kind = "regexKeyword"

    traverse(traversal: Base.Traversal): traversal is Base.Traversal<string> {
        return (
            typeKeywords.string.traverse(traversal) &&
            (this.expression.test(traversal.data) ||
                traversal.problems.add(this))
        )
    }

    abstract readonly expression: RegExp
}

class EmailNode extends RegexKeywordNode {
    readonly definition = "email"
    readonly mustBe = "a valid email"
    expression = /^(.+)@(.+)\.(.+)$/
}

class AlphaonlyNode extends RegexKeywordNode {
    readonly definition = "alphaonly"
    readonly mustBe = "only letters"
    expression = /^[A-Za-z]+$/
}

class AlphanumericNode extends RegexKeywordNode {
    readonly definition = "alphanumeric"
    readonly mustBe = "only letters and digits"
    expression = /^[\dA-Za-z]+$/
}

class LowercaseNode extends RegexKeywordNode {
    readonly definition = "lowercase"
    readonly mustBe = "only lowercase letters"
    expression = /^[a-z]*$/
}

class UppercaseNode extends RegexKeywordNode {
    readonly definition = "uppercase"
    readonly mustBe = "only uppercase letters"
    expression = /^[A-Z]*$/
}

class IntegerNode extends Terminal.Node {
    readonly kind = "keyword"
    readonly definition = "integer"
    readonly mustBe = "an integer"
    traverse(traversal: Base.Traversal): traversal is Base.Traversal<number> {
        return typeKeywords.number.traverse(traversal) &&
            Number.isInteger(traversal.data)
            ? true
            : traversal.problems.add(this)
    }
}

export const stringSubtypeKeywords = {
    email: new EmailNode(),
    alphaonly: new AlphaonlyNode(),
    alphanumeric: new AlphanumericNode(),
    lowercase: new LowercaseNode(),
    uppercase: new UppercaseNode()
}

export const numberSubtypeKeywords = {
    integer: new IntegerNode()
}
