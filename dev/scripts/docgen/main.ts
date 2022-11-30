import { existsSync, statSync } from "node:fs"
import { basename, join, relative } from "node:path"
import { stdout } from "node:process"
import { Project } from "ts-morph"
import type { WalkOptions } from "../../runtime/exports.js"
import { dirName, shell } from "../../runtime/exports.js"
import { repoDirs } from "../common.js"
import { extractApi } from "./api/extractApi.js"
import { writeApi } from "./api/writeApi.js"
import { mapDir } from "./mapDir.js"
import type {
    SnippetsByPath,
    SnippetTransformToggles
} from "./snippets/extractSnippets.js"
import { extractSnippets } from "./snippets/extractSnippets.js"
import { updateSnippetReferences } from "./snippets/writeSnippets.js"

export type DocGenConfig = {
    apis: DocGenApiConfig[]
    snippets: DocGenSnippetsConfig
    mappedDirs: DocGenMappedDirsConfig[]
}

export type DocGenApiConfig = {
    packageRoot: string
    outDir: string
}

export type DocGenSnippetsConfig = {
    universalTransforms: SnippetTransformToggles
}

export type DocGenMappedDirsConfig = {
    sources: string[]
    targets: string[]
    sourceOptions?: WalkOptions
    skipFormatting?: boolean
    skipSourceMap?: boolean
    transformOutputPaths?: (path: string) => string
    transformContents?: (content: string) => string
}

const createConfig = <Config extends DocGenConfig>(config: Config) => config

export const defaultConfig = createConfig({
    apis: [
        {
            packageRoot: repoDirs.root,
            outDir: join(repoDirs.docsDir, "api")
        }
    ],
    snippets: {
        universalTransforms: {
            imports: true
        }
    },
    mappedDirs: [
        {
            sources: [
                join(repoDirs.root, "examples"),
                join(repoDirs.docsDir, "demos", "layout")
            ],
            targets: [join(repoDirs.docsDir, "demos", "generated")],
            transformOutputPaths: (path) => {
                let outputFileName = basename(path)
                if (!outputFileName.endsWith(".ts")) {
                    outputFileName = outputFileName + ".ts"
                }
                return outputFileName
            },
            transformContents: (content) => {
                let transformed = content
                transformed = transformed.replaceAll(".js", "")
                return `export default \`${transformed.replaceAll(
                    /`|\${/g,
                    "\\$&"
                )}\``
            }
        }
    ]
})

export const docgen = () => {
    console.group(`Generating docs...✍️`)
    const project = getProject()
    updateApiDocs(project)
    const snippets = getSnippetsAndUpdateReferences(project)
    mapDirs(snippets)
    console.log(`Enjoy your new docs! 📚`)
    console.groupEnd()
}

export const getProject = () => {
    const project = new Project({
        tsConfigFilePath: join(repoDirs.root, "tsconfig.json"),
        skipAddingFilesFromTsConfig: true
    })
    return project
}

const updateApiDocs = (project: Project) => {
    stdout.write("Updating api docs...")
    for (const api of defaultConfig.apis) {
        const data = extractApi(project, api.packageRoot)
        writeApi(api, data)
    }
    stdout.write("✅\n")
}

const getSnippetsAndUpdateReferences = (project: Project) => {
    stdout.write("Updating snippets...")
    const sourceControlPaths = shell("git ls-files", { stdio: "pipe" })
        .toString()
        .split("\n")
        .filter(
            (path) =>
                existsSync(path) &&
                statSync(path).isFile() &&
                // Avoid conflicts between snip matching and the source
                // code defining those matchers
                !path.startsWith(relative(repoDirs.root, dirName()))
        )
    const snippets = extractSnippets(sourceControlPaths, project)
    updateSnippetReferences(snippets)
    stdout.write("✅\n")
    return snippets
}

export const mapDirs = (snippets: SnippetsByPath) => {
    stdout.write("Mapping dirs...")
    for (const mapConfig of defaultConfig.mappedDirs) {
        mapDir(snippets, mapConfig)
    }
    stdout.write("✅\n")
}
