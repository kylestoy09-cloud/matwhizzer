'use client'

import { DashboardShell } from '../dashboards/DashboardShell'
import { SeasonHeader } from './SeasonHeader'
import type { ComponentProps } from 'react'

type HeaderProps = ComponentProps<typeof SeasonHeader>

export function SeasonDashboard(headerProps: HeaderProps) {
  return (
    <DashboardShell
      dashboard="season"
      header={<SeasonHeader {...headerProps} />}
    />
  )
}
