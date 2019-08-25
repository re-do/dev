import React, { FC } from "react"
import { IconButton, Icons } from "redo-components"

export type ScheduleButtonProps = {}

export const ScheduleButton: FC<ScheduleButtonProps> = ({}) => {
    return <IconButton Icon={Icons.schedule} style={{ color: "white" }} />
}
