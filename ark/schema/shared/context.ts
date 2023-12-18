import { ArkErrors } from "./errors.js"

export class TraversalContext {
	path = []
	errorsStack: ArkErrors[] = [new ArkErrors(this)]
	// TODO: add morphs here
	entriesToPrune: [data: Record<string, unknown>, key: string][] = []

	// Qualified
	seen: { [name in string]?: object[] } = {}

	constructor(public data: unknown) {}

	get errors() {
		return this.errorsStack.at(-1)!
	}

	get addError() {
		return this.errors.add
	}

	pushUnion() {
		this.errorsStack.push(new ArkErrors(this))
	}

	popUnion(branchCount: number, data: unknown, path: string[]) {
		const branchProblems = this.errorsStack.pop()!
		if (branchProblems.count === branchCount) {
			this.addError("union", { errors: branchProblems })
		}
	}
}