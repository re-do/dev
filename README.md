<h1 align="center">ArkType <sub><sup>Isomorphic types for TS/JS</sup></sub></h1>

[<img src="./dev/arktype.io/static/img/arktype.gif">](https://arktype.io/try)
<sub><i>`typescript@4.9.5` in VS Code— no extensions or plugins required (<a href="#how">how?</a>)</i></sub>

<!-- @snipStart:install -->

<img src="./dev/arktype.io/static/img/logo.svg" alt="ArkType Icon" height="16px"><b> Try this demo in-browser at [arktype.io/try](https://arktype.io/try)</b>

## Install <sub><sub>📦`4KB` gzipped, `0` dependencies</sub></sub>

<img src="./dev/arktype.io/static/img/npm.svg" alt="Npm Icon" height="16px"> `npm install arktype` <sub>(or whatever package manager you prefer)</sub>

<img src="./dev/arktype.io/static/img/deno.svg" alt="Deno Icon" height="16px"> `import { type } from "https://deno.land/x/arktype"`

Our types are tested in [strict-mode](https://www.typescriptlang.org/tsconfig#strict) with TypeScript versions `4.8`, `4.9`, and `5.0`.

_Our APIs have mostly stabilized, but details may still change during the alpha/beta stages of our 1.0 release. If you have suggestions that may require a breaking change, now is the time to let us know!_ ⛵

<!-- @snipEnd:install -->

## Types

[Try it in-browser.](https://arktype.io/docs/#your-first-type)

```ts @blockFrom:dev/examples/type.ts
import { type } from "arktype"

// Define your type...
export const user = type({
    name: "string",
    device: {
        platform: "'android'|'ios'",
        "version?": "number"
    }
})

// Infer it...
export type User = typeof user.infer

// Get validated data or clear, customizable error messages.
export const { data, problems } = user({
    name: "Alan Turing",
    device: {
        platform: "enigma"
    }
})

if (problems) {
    // "device/platform must be 'android' or 'ios' (was 'enigma')"
    console.log(problems.summary)
}
```

### Scopes

[Try it in-browser.](https://arktype.io/docs/scopes)

```ts @blockFrom:dev/examples/scope.ts
import { scope } from "arktype"

// Scopes are collections of types that can reference each other.
export const types = scope({
    package: {
        name: "string",
        "dependencies?": "package[]",
        "contributors?": "contributor[]"
    },
    contributor: {
        // Subtypes like 'email' are inferred like 'string' but provide additional validation at runtime.
        email: "email",
        "packages?": "package[]"
    }
}).compile()

// Cyclic types are inferred to arbitrary depth...
export type Package = typeof types.package.infer

// And can validate cyclic data.
const packageData: Package = {
    name: "arktype",
    dependencies: [{ name: "typescript" }],
    contributors: [{ email: "david@sharktypeio" }]
}
packageData.dependencies![0].dependencies = [packageData]

export const { data, problems } = types.package(packageData)
```

### API

ArkType supports many of TypeScript's built-in types and operators, as well as some new nes dedicated exclusively to runtime validation. In fact, we got a little ahead of ourselves and built a ton of cool features, but we're still working on getting caught up syntax and API docs. Keep an eye out for more in the next couple weeks!

In the meantime, check out the examples from this README and use the type hints you get to learn how you can customize your types and scopes. If you want to explore some of the more advanced features, take a look at [our unit tests](./dev/test) and don't hesitate to reach out on our [Discord channel](https://discord.gg/WSNF3Kc4xh)!

### How

ArkType's isomorphic parser has parallel static and dynamic implementations. This means as soon as you type a definition in your editor, you'll know the eventual result at runtime.

If you're curious, below is an example of what that looks like under the hood. If not, close that hood back up, `npm install arktype` and enjoy top-notch developer experience 🧑‍💻

```ts
export const parseOperator = (s: DynamicState): void => {
    const lookahead = s.scanner.shift()
    return lookahead === ""
        ? s.finalize()
        : lookahead === "["
        ? s.scanner.shift() === "]"
            ? s.rootToArray()
            : s.error(incompleteArrayTokenMessage)
        : isKeyOf(lookahead, Scanner.branchTokens)
        ? s.pushRootToBranch(lookahead)
        : lookahead === ")"
        ? s.finalizeGroup()
        : isKeyOf(lookahead, Scanner.comparatorStartChars)
        ? parseBound(s, lookahead)
        : lookahead === "%"
        ? parseDivisor(s)
        : lookahead === " "
        ? parseOperator(s)
        : throwInternalError(writeUnexpectedCharacterMessage(lookahead))
}

export type parseOperator<s extends StaticState> =
    s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
        ? lookahead extends "["
            ? unscanned extends Scanner.shift<"]", infer nextUnscanned>
                ? state.setRoot<s, [s["root"], "[]"], nextUnscanned>
                : error<incompleteArrayTokenMessage>
            : lookahead extends Scanner.BranchToken
            ? state.reduceBranch<s, lookahead, unscanned>
            : lookahead extends ")"
            ? state.finalizeGroup<s, unscanned>
            : lookahead extends Scanner.ComparatorStartChar
            ? parseBound<s, lookahead, unscanned>
            : lookahead extends "%"
            ? parseDivisor<s, unscanned>
            : lookahead extends " "
            ? parseOperator<state.scanTo<s, unscanned>>
            : error<writeUnexpectedCharacterMessage<lookahead>>
        : state.finalize<s>
```

## Contributing

If you're interested in contributing to ArkType...

1.  Thank you! We'll do everything we can to make this as straightforward as possible, regardless of your level of experience.
2.  Check out our [guide](./dev/configs/CONTRIBUTING.md) to get started!

## License

This project is licensed under the terms of the
[MIT license](./LICENSE).
