'use client'

import { DashboardShell }            from '../dashboards/DashboardShell'
import { PreseasonHeader }           from './PreseasonHeader'
import { SchoolDirectoryWorkspace }  from '../dashboards/tools/SchoolDirectoryWorkspace'
import { SchoolDirectoryWorkspaceGirls } from '../dashboards/tools/SchoolDirectoryWorkspaceGirls'
import { useAdminGender }            from '@/components/admin/AdminGenderContext'
import type { ComponentProps }       from 'react'

type HeaderProps = ComponentProps<typeof PreseasonHeader>
type Props = HeaderProps & { directorySeasonM: number; directorySeasonF: number }

// Each gender gets its own school directory (programs, coaches, alignment);
// the girls view never shows or edits boys rows.
export function PreseasonDashboard({ directorySeasonM, directorySeasonF, ...headerProps }: Props) {
  const { gender } = useAdminGender()
  return (
    <DashboardShell
      dashboard="preseason"
      header={<PreseasonHeader {...headerProps} />}
      defaultContent={gender === 'F'
        ? <SchoolDirectoryWorkspaceGirls key="F" seasonId={directorySeasonF} />
        : <SchoolDirectoryWorkspace key="M" seasonId={directorySeasonM} />}
    />
  )
}
