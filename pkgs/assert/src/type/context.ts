import { assertEquals } from "@deno/std/testing/asserts.ts"
import { AssertionContext } from "../assert.ts"
import { getAssertionData } from "./analysis.ts"
import { chainableAssertion, ChainableValueAssertion } from "../value/index.ts"
import { SourcePosition } from "../common.ts"

export type ValueFromTypeAssertion<
    Expected,
    Chained = Expected
> = ChainableValueAssertion<[expected: Expected], false, Chained, false>

export type TypeAssertions = {
    type: {
        toString: ValueFromTypeAssertion<string>
        errors: ValueFromTypeAssertion<string | RegExp, string>
    }
    typed: unknown
}

export type AssertTypeContext = (
    position: SourcePosition,
    config: AssertionContext
) => TypeAssertions

export const typeAssertions: AssertTypeContext = (
    position: SourcePosition,
    config: AssertionContext
) => {
    return new Proxy(
        {
            type: {
                toString: chainableAssertion(
                    position,
                    () => getAssertionData(position).type.actual,
                    { ...config, allowTypeAssertions: false }
                ),
                errors: chainableAssertion(
                    position,
                    () => getAssertionData(position).errors,
                    { ...config, allowTypeAssertions: false },
                    { allowRegex: true }
                )
            }
        },
        {
            get: (target, prop) => {
                if (prop === "typed") {
                    const assertionData = getAssertionData(position)
                    if (!assertionData.type.expected) {
                        throw new Error(
                            `Expected an 'as' expression after 'typed' prop access at position ${position.char} on` +
                                `line ${position.line} of ${position.file}.`
                        )
                    }
                    assertEquals(
                        assertionData.type.actual,
                        assertionData.type.expected
                    )
                }
                return (target as any)[prop]
            }
        }
    ) as any
}
