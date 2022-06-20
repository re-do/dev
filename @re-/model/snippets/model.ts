import { model } from "../src/index.js"
// @snipStart id=creatingAModel
// Most common TypeScript expressions just work...
export const userModel = model({
    name: {
        first: "string",
        middle: "string?",
        last: "string"
    },
    age: "number",
    browser: "'chrome'|'firefox'|'other'|null"
})

// Mouse over "User" to see the inferred type...
export type User = typeof userModel.type
// @snipEnd id=creatingAModel

// But a model can also validate your data at runtime...
export const userData = {
    name: {
        first: "Reed",
        last: "Doe"
    },
    age: 28,
    browser: "Internet Explorer" // :(
}

export const userValidationResult = userModel.validate(userData)

// Try changing "userModel" or "userData" and see what happens!
