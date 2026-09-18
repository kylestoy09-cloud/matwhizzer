'use client'

import { DashboardShell }            from '../dashboards/DashboardShell'
import { PreseasonHeader }           from './PreseasonHeader'
import { SchoolDirectoryWorkspace }  from '../dashboards/tools/SchoolDirectoryWorkspace'
import type { ComponentProps }       from 'react'

type HeaderProps = ComponentProps<typeof PreseasonHeader>
type Props = HeaderProps & { preSeasonIdM: number }

export function PreseasonDashboard({ preSeasonIdM, ...headerProps }: Props) {
  return (
    <DashboardShell
      dashboard="preseason"
      header={<PreseasonHeader {...headerProps} />}
      defaultContent={<SchoolDirectoryWorkspace seasonId={preSeasonIdM} />}
    />
  )
}
