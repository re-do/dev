import type { RegexLiteral, StringLiteral } from "../parse/operand/enclosed.js"
import type { Keyword } from "../parse/operand/keyword.js"
import type { BadDefinitionType } from "../parse/parse.js"
import type { Scanner } from "../parse/state/scanner.js"
import type { parseString } from "../parse/string.js"

import type { dictionary } from "../utils/dynamicTypes.js"
import type { evaluate, isTopType, stringKeyOf } from "../utils/generics.js"
import type { NumberLiteral } from "../utils/numericLiterals.js"

export type inferRoot<
    def,
    scope extends dictionary,
    aliases
    // TODO: Remove maybe?
> = isTopType<def> extends true
    ? unknown
    : def extends string
    ? inferAst<
          parseString<def, stringKeyOf<aliases> | stringKeyOf<scope>>,
          scope,
          aliases
      >
    : def extends BadDefinitionType
    ? unknown
    : inferObjectLiteral<def, scope, aliases>

export type inferAst<
    ast,
    scope extends dictionary,
    aliases
> = ast extends readonly unknown[]
    ? ast[1] extends "[]"
        ? inferAst<ast[0], scope, aliases>[]
        : ast[1] extends "|"
        ? inferAst<ast[0], scope, aliases> | inferAst<ast[2], scope, aliases>
        : ast[1] extends "&"
        ? evaluate<
              inferAst<ast[0], scope, aliases> &
                  inferAst<ast[2], scope, aliases>
          >
        : ast[1] extends Scanner.Comparator
        ? ast[0] extends NumberLiteral
            ? inferAst<ast[2], scope, aliases>
            : inferAst<ast[0], scope, aliases>
        : ast[1] extends "%"
        ? inferAst<ast[0], scope, aliases>
        : // If the value at index 1 was none of the above, it's a normal tuple definition
          evaluate<{
              [i in keyof ast]: inferAst<ast[i], scope, aliases>
          }>
    : inferTerminal<ast, scope, aliases>

type inferTerminal<
    token,
    scope extends dictionary,
    aliases
> = token extends Keyword
    ? Keyword.Inferences[token]
    : token extends keyof scope
    ? scope[token]
    : token extends keyof aliases
    ? inferRoot<aliases[token], scope, aliases>
    : token extends StringLiteral<infer Text>
    ? Text
    : token extends RegexLiteral
    ? string
    : token extends number | bigint
    ? token
    : unknown

type inferObjectLiteral<
    def,
    scope extends dictionary,
    aliases,
    optionalKey extends optionalKeyOf<def> = optionalKeyOf<def>,
    requiredKey extends keyof def = Exclude<keyof def, optionalKey>
> = evaluate<
    {
        [requiredKeyName in requiredKey]: inferRoot<
            def[requiredKeyName],
            scope,
            aliases
        >
    } & {
        [optionalKeyName in extractNameOfOptionalKey<optionalKey>]?: inferRoot<
            def[`${optionalKeyName}?` & keyof def],
            scope,
            aliases
        >
    }
>

type optionalKeyWithName<name extends string = string> = `${name}?`

type optionalKeyOf<def> = {
    [k in keyof def]: k extends optionalKeyWithName ? k : never
}[keyof def]

type extractNameOfOptionalKey<k extends optionalKeyWithName> =
    k extends optionalKeyWithName<infer name> ? name : never
