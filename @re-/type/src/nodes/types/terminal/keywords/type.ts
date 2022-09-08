export abstract class typeNode extends terminalNode {
    allows(args: Nodes.Allows.Args) {
        if (this.allowsValue(args.data)) {
            return true
        }
        args.diagnostics.push(
            new Nodes.Allows.UnassignableDiagnostic(this.toString(), args)
        )
        return false
    }

    abstract allowsValue(value: unknown): boolean
}
