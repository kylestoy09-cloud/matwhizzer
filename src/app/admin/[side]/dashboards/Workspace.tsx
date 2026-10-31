'use client'

import type React from 'react'
import type { Task } from './GlobalTaskPanel'
import { RosterRolloverWorkspace }    from './tools/RosterRolloverWorkspace'
import { TransfersWorkspace }         from './tools/TransfersWorkspace'
import { TournamentRolloverWorkspace } from './tools/TournamentRolloverWorkspace'
import { CoachesImportWorkspace }     from './tools/CoachesImportWorkspace'

function ScheduleImportStub() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-8">
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-slate-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
        </svg>
      </div>
      <p className="text-slate-600 font-medium text-sm">Schedule Importer</p>
      <p className="text-slate-400 text-xs max-w-xs">The two-stage schedule import tool is being built. Stage 1 loads and confirms school matches; Stage 2 does the master merge.</p>
      <span className="text-[11px] text-slate-400 border border-slate-200 rounded px-2 py-0.5">Coming soon</span>
    </div>
  )
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-64 gap-2 text-center px-8">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-10 h-10 text-slate-200">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"/>
      </svg>
      <p className="text-slate-400 text-sm mt-1">Select a task to load its tool here</p>
    </div>
  )
}

const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  roster_rollover:    RosterRolloverWorkspace,
  transfers:          TransfersWorkspace,
  tournament_rollover: TournamentRolloverWorkspace,
  coaches_import:     CoachesImportWorkspace,
  schedule_import:    ScheduleImportStub,
}

export function Workspace({ task, defaultContent }: { task: Task | null; defaultContent?: React.ReactNode }) {
  if (!task) return defaultContent ? <div className="p-6">{defaultContent}</div> : <Empty />

  const Tool = task.workspace_tool ? TOOL_COMPONENTS[task.workspace_tool] : null

  if (!Tool) {
    return (
      <div className="flex items-center justify-center h-full min-h-64 text-sm text-slate-400">
        No tool linked to this task yet.
      </div>
    )
  }

  return <Tool />
}
