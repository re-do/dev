/** Changesets doesn't understand version suffixes like -alpha by default, so we use this to preserve them */
import { join } from "node:path"
import { repoDirs } from "../common.js"
import { docgen } from "../docgen/main.js"
import {
    readFile,
    readJson,
    readPackageJson,
    shell,
    writeFile,
    writeJson
} from "../node/src/index.js"

const suffixedPackageEntries: [rootDir: string, suffix: string][] = []

const forEachPackageWithSuffix = (transformer: SuffixTransformer) => {
    for (const [packagePath, suffix] of suffixedPackageEntries) {
        const packageJsonPath = join(packagePath, "package.json")
        const changelogPath = join(packagePath, "CHANGELOG.md")
        const packageJson = readJson(packageJsonPath)
        const changelog = readFile(changelogPath)
        const transformed = transformer({
            packageJson,
            changelog,
            suffix
        })
        if (transformed.packageJson) {
            writeJson(packageJsonPath, transformed.packageJson)
        }
        if (transformed.changelog) {
            writeFile(changelogPath, transformed.changelog)
        }
    }
}

forEachPackageWithSuffix(({ packageJson, suffix }) => {
    // Temporarily remove the suffix, if it exists, so changesets can handle versioning
    if (packageJson.version.endsWith(suffix)) {
        packageJson.version = packageJson.version.slice(0, -suffix.length - 1)
    }
    return {
        packageJson
    }
})

shell("pnpm changeset version")

forEachPackageWithSuffix(({ packageJson, changelog, suffix }) => {
    const versionWithSuffix = packageJson.version + `-${suffix}`
    const updatedChangelog = changelog.replaceAll(
        packageJson.version,
        versionWithSuffix
    )
    packageJson.version = versionWithSuffix
    return { packageJson, changelog: updatedChangelog }
})

type SuffixTransformer = (args: {
    packageJson: any
    changelog: string
    suffix: string
}) => {
    packageJson?: any
    changelog?: string
}

docgen()

const packageJson = readPackageJson(repoDirs.root)
const existingVersions: string[] = readJson(
    join(repoDirs.packageRoots.arktypeIo, `versions.json`)
)
if (!existingVersions.includes(packageJson.version)) {
    shell(`pnpm docusaurus docs:version ${packageJson.version}`, {
        cwd: repoDirs.packageRoots.arktypeIo
    })
}
