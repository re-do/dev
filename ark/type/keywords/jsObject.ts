import type { Module, rootResolutions, Scope } from "../scope.js"
import { root } from "./root.js"

export namespace jsObject {
	export interface exports {
		Array: unknown[]
		Function: Function
		Date: Date
		Error: Error
		Map: Map<unknown, unknown>
		RegExp: RegExp
		Set: Set<unknown>
		WeakMap: WeakMap<object, unknown>
		WeakSet: WeakSet<object>
		Promise: Promise<unknown>
	}

	export type resolutions = rootResolutions<exports>

	export type infer = (typeof jsObject)["infer"]
}

export const jsObject: Scope<jsObject.resolutions> = root.scope(
	{
		Array: root.schema(Array),
		Function: root.schema(Function),
		Date: root.schema(Date),
		Error: root.schema(Error),
		Map: root.schema(Map),
		RegExp: root.schema(RegExp),
		Set: root.schema(Set),
		WeakMap: root.schema(WeakMap),
		WeakSet: root.schema(WeakSet),
		Promise: root.schema(Promise)
	},
	{ prereducedAliases: true, registerKeywords: true }
)

export const jsObjectKeywords: Module<jsObject.resolutions> = jsObject.export()
