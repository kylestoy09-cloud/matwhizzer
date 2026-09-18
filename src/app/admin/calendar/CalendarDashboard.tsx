'use client'

import { useState } from 'react'
import { CalendarHeader, type SeasonBounds } from './CalendarHeader'
import { CalendarView } from './CalendarView'
import { TaskCreatorPanel } from './TaskCreatorPanel'
import { TodayTaskCard } from './TodayTaskCard'

export type { SeasonBounds }

type Props = {
  bounds: SeasonBounds
  currentUser: string
}

export function CalendarDashboard({ bounds, currentUser }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const [refreshKey,   setRefreshKey]   = useState(0)

  return (
    /* Use explicit height (not min-height) so flex-1 propagates to the month grid */
    <div
      className="flex flex-col"
      style={{ height: 'calc(100vh - 3rem)', padding: '1rem', gap: '1rem', boxSizing: 'border-box' }}
    >
      {/* Header card — thin, standard format, fixed height */}
      <div className="shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <CalendarHeader bounds={bounds} />
      </div>

      {/* Body: 3-column card row — fills remaining height */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Left: Today task card */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <TodayTaskCard currentUser={currentUser} />
        </div>

        {/* Center: Calendar workspace — must fill full height */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
          <CalendarView
            key={refreshKey}
            onDayClick={date => { setSelectedDate(date); }}
          />
        </div>

        {/* Right: Create task card */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <TaskCreatorPanel
            currentUser={currentUser}
            defaultDate={selectedDate}
            bounds={bounds}
            onCreated={() => setRefreshKey(k => k + 1)}
          />
        </div>

      </div>
    </div>
  )
}
