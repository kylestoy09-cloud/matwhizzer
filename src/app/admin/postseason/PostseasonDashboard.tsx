'use client'

import { DashboardShell } from '../dashboards/DashboardShell'
import { PostseasonHeader } from './PostseasonHeader'
import { PostseasonClient } from './PostseasonClient'
import type { ComponentProps } from 'react'

type HeaderProps = ComponentProps<typeof PostseasonHeader>

export function PostseasonDashboard(headerProps: HeaderProps) {
  const { teamM, teamF, individualM, individualF } = headerProps
  return (
    <DashboardShell
      dashboard="postseason"
      header={<PostseasonHeader {...headerProps} />}
      defaultContent={
        <PostseasonClient
          statsM={{ ...teamM, ...individualM }}
          statsF={{ ...teamF, ...individualF }}
        />
      }
    />
  )
}
