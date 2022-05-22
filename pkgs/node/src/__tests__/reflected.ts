// Changing this file at all will break tests as it is used to test source locations
import { caller, dirName } from "../index.js"

const formatPath = { relative: dirName() }

export const callMe = (...args: any[]) => {
    const inTheNight = () => caller({ formatPath })
    return inTheNight()
}

export const callMeAnonymous = (...args: any[]) =>
    (() => caller({ formatPath }))()
