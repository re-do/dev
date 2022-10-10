import { jsTypeOf } from "@re-/tools"
import type { Check } from "../../../traverse/check.js"
import { Terminal } from "../../terminal.js"

export class UndefinedNode extends Terminal.Node<"undefined"> {
    constructor() {
        super("undefined")
    }

    allows(state: Check.State) {
        if (state.data !== undefined) {
            state.addError("typeKeyword", {
                type: this,
                message: "Must be undefined",
                actual: jsTypeOf(state.data)
            })
        }
    }
}
