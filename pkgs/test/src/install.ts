import { existsSync, rmSync } from "fs"
import fetch from "node-fetch"
import {
    makeExecutable,
    streamToFile,
    fromRedo,
    getOs,
    ensureDir,
    getRedoZipFileName
} from "@re-do/node-utils"
import Zip from "adm-zip"
import { Octokit } from "@octokit/rest"
import { join } from "path"
import { version } from "../package.json"
import { extractVersionFromDirString } from "./installHelpers"
export { version } from "../package.json"

export const getRelease = async (version: any) => {
    const gitHub = new Octokit().rest
    const { data } = await gitHub.repos.getReleaseByTag({
        owner: "re-do",
        repo: "redo",
        tag: `v${version}`
    })
    return data
}

export const install = async (versionDir: string) => {
    let wantedVersion = versionDir.includes(version) ? version : extractVersionFromDirString(versionDir)
    console.log(`Installing Redo (version ${wantedVersion})...`)
    ensureDir(versionDir)
    const data = await getRelease(wantedVersion)
    const zipName = getRedoZipFileName(getOs(), wantedVersion!)
    const appRelease = data.assets.find((asset) => asset.name === zipName)
    if (!appRelease) {
        throw new Error(`Unable to find a Redo release for your platform.`)
    }
    const { body } = await fetch(appRelease.browser_download_url)
    const zipPath = join(versionDir, zipName)
    await streamToFile(body, zipPath)
    const zipContents = new Zip(zipPath)
    zipContents.extractAllTo(versionDir, true)
    rmSync(zipPath)
    const executablePath = getExecutablePath(versionDir)
    if (!existsSync(executablePath)) {
        throw new Error(
            `Installation failed: expected file at ${executablePath} did not exist.`
        )
    }
    makeExecutable(executablePath)
    console.log(`Succesfully installed Redo (${data.tag_name})!`)
}

export const getPath = async (version: string) => {
    const versionDir = fromRedo(version)
    const executablePath = getExecutablePath(versionDir)
    if (!existsSync(executablePath)) {
        await install(versionDir)
    }
    return executablePath
}

export const getExecutablePath = (versionDir: string) => {
    const os = getOs()
    if (os === "windows") {
        return join(versionDir, "redo.exe")
    } else if (os === "linux") {
        return join(versionDir, "redo")
    } else {
        return join(versionDir, "redo.app", "Contents", "MacOS", "redo")
    }
}
