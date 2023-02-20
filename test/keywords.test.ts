import { describe, it } from "mocha"
import { ark, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("keywords", () => {
    it("integer", () => {
        const integer = type("integer")
        attest(integer(123).data).snap(123)
        attest(integer("123").problems?.summary).snap(
            "Must be a number (was string)"
        )
        attest(integer(12.12).problems?.summary).snap(
            "Must be an integer (was 12.12)"
        )
    })
    it("alpha", () => {
        const alpha = type("alpha")
        attest(alpha("user").data).snap("user")
        attest(alpha("user123").problems?.summary).snap(
            "Must be only letters (was 'user123')"
        )
    })
    it("alphanumeric", () => {
        const alphanumeric = type("alphanumeric")
        attest(alphanumeric("user123").data).snap("user123")
        attest(alphanumeric("user").data).snap("user")
        attest(alphanumeric("123").data).snap("123")
        attest(alphanumeric("abc@123").problems?.summary).snap(
            "Must be only letters and digits (was 'abc@123')"
        )
    })
    it("lowercase", () => {
        const lowercase = type("lowercase")
        attest(lowercase("var").data).snap("var")
        attest(lowercase("newVar").problems?.summary).snap(
            "Must be only lowercase letters (was 'newVar')"
        )
    })
    it("uppercase", () => {
        const uppercase = type("uppercase")
        attest(uppercase("VAR").data).snap("VAR")
        attest(uppercase("CONST_VAR").problems?.summary).snap(
            "Must be only uppercase letters (was 'CONST_VAR')"
        )
        attest(uppercase("myVar").problems?.summary).snap(
            "Must be only uppercase letters (was 'myVar')"
        )
    })

    it("email", () => {
        const email = type("email")
        attest(email("shawn@mail.com").data).snap("shawn@mail.com")
        attest(email("shawn@email").problems?.summary).snap(
            "Must be a valid email (was 'shawn@email')"
        )
    })
    it("uuid", () => {
        const uuid = type("uuid")
        attest(uuid("f70b8242-dd57-4e6b-b0b7-649d997140a0").data).snap(
            "f70b8242-dd57-4e6b-b0b7-649d997140a0"
        )
        attest(uuid(1234).problems?.summary).snap(
            "Must be a valid UUID (was number)"
        )
    })
    it("parsedDate", () => {
        const parsedDate = type("parsedDate")
        attest(parsedDate("5/21/1993").data?.toDateString()).snap(
            "Fri May 21 1993"
        )
        attest(parsedDate("foo").problems?.summary).snap(
            "Must be a valid date (was 'foo')"
        )
        attest(parsedDate(5).problems?.summary).snap(
            "Must be a string (was number)"
        )
    })

    it("credit card", () => {
        const validCC = "5489582921773376"

        attest(ark.creditCard(validCC).data).equals(validCC)

        // Regex validation
        attest(ark.creditCard("0".repeat(16)).problems?.summary).snap(
            "Must be a valid credit card number (was '0000000000000000')"
        )
        // Luhn validation
        attest(
            ark.creditCard(validCC.slice(0, -1) + "0").problems?.summary
        ).snap("Must be a valid credit card number (was '5489582921773370')")
    })

    it("semver", () => {
        attest(ark.semver("1.0.0").data).equals("1.0.0")
        attest(ark.semver("-1.0.0").problems?.summary).snap(
            "Must be a valid semantic version (see https://semver.org/) (was '-1.0.0')"
        )
    })
})
