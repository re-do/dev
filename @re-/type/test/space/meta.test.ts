import { assert } from "@re-/assert"
import { space } from "../../src/index.js"

describe("meta", () => {
    it("with onCycle option", () => {
        const models = space({
            $meta: {
                onCycle: {
                    cyclic: "$cyclic?"
                }
            },
            a: { b: "b", isA: "true", isB: "false" },
            b: { a: "a", isA: "false", isB: "true" }
        })
        const cyclicModel = models.$meta.type({
            a: "a",
            b: "b"
        })
        assert(cyclicModel.infer.a.b.a.cyclic).type.toString.snap(
            `{ b: { a: { b: { cyclic?: { a: { b: { a: { cyclic?: { b: { a: { b: any; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined`
        )
        assert(cyclicModel.infer.b.a.b.cyclic).type.toString.snap(
            `{ a: { b: { a: { cyclic?: { b: { a: { b: { cyclic?: { a: { b: { a: any; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined`
        )
        assert(cyclicModel.infer.a.b.a.cyclic?.b.a.b.cyclic).type.toString.snap(
            `{ a: { b: { a: { cyclic?: { b: { a: { b: { cyclic?: { a: { b: { a: any; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined`
        )
    })
    it("with onResolve option", () => {
        const models = space({
            $meta: {
                onResolve: {
                    wasResolved: "true",
                    resolvedType: "$resolution"
                }
            },
            a: { b: "b", isA: "true", isB: "false" },
            b: { a: "a", isA: "false", isB: "true" }
        })
        const withOnResolve = models.$meta.type({
            referencesA: "a",
            noReferences: {
                favoriteSoup: "'borscht'"
            }
        })
        assert(withOnResolve.infer.referencesA.wasResolved).typed as true
        assert(withOnResolve.infer.referencesA.resolvedType.b.wasResolved)
            .typed as true
        // @ts-expect-error
        assert(withOnResolve.infer.noReferences.wasResolved).type.errors(
            "Property 'wasResolved' does not exist on type '{ favoriteSoup: \"borscht\"; }'."
        )
    })
    it("allows non-meta references within meta", () => {
        assert(
            space({ $meta: { onCycle: "s" }, a: { a: "a" }, s: "string" }).$meta
                .infer
        ).typed as {
            a: {
                a: string
            }
            s: string
        }
    })
    it("errors on bad meta key", () => {
        // @ts-expect-error
        assert(space({ $meta: { fake: "boolean" } })).type.errors.snap(
            `Type '{ fake: string; }' is not assignable to type '{ onCycle?: Validate<unknown, { $meta: { fake: string; }; } & { $cyclic: "unknown"; }> | undefined; onResolve?: Validate<unknown, { $meta: { fake: string; }; } & { $resolution: "unknown"; }> | undefined; }'.Object literal may only specify known properties, and 'fake' does not exist in type '{ onCycle?: Validate<unknown, { $meta: { fake: string; }; } & { $cyclic: "unknown"; }> | undefined; onResolve?: Validate<unknown, { $meta: { fake: string; }; } & { $resolution: "unknown"; }> | undefined; }'.`
        )
    })
    it("errors on bad meta def", () => {
        // @ts-expect-error
        assert(space({ $meta: { onCycle: "fake" } })).type.errors.snap(
            `Type '"fake"' is not assignable to type '"'fake' does not exist in your space."'.`
        )
    })
    it("doesn't allow meta-only defs outside meta", () => {
        // @ts-expect-error
        assert(space({ a: "$cyclic" })).type.errors.snap()
    })
    it("doesn't allow key-specific meta references in other meta keys", () => {
        // @ts-expect-error
        assert(space({ $meta: { onCycle: "$resolution" } })).type.errors.snap(
            `Type '"$resolution"' is not assignable to type '"'$resolution' does not exist in your space."'.`
        )
    })
    it("doesn't allow references to $meta", () => {
        // @ts-expect-error
        assert(space({ $meta: {}, a: "$meta" })).type.errors.snap(
            `Type '"$meta"' is not assignable to type '"'$meta' does not exist in your space."'.`
        )
    })
})
