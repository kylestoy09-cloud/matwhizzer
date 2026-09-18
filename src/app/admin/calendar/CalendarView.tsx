'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'

type ViewMode = 'year' | 'month' | '2week' | 'week' | 'day'

type CalendarEvent = {
  id:    string
  date:  string
  title: string
  type:  'dual' | 'tournament' | 'task'
}

type Props = {
  onDayClick?: (date: string) => void
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_NAMES   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const EVENT_COLORS: Record<string, string> = {
  dual:       'bg-blue-100 text-blue-700',
  tournament: 'bg-amber-100 text-amber-700',
  task:       'bg-slate-100 text-slate-600',
}

export function CalendarView({ onDayClick }: Props) {
  const [mode,   setMode]   = useState<ViewMode>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])

  const supabase = createSupabaseBrowser()

  useEffect(() => { loadEvents() }, [])

  async function loadEvents() {
    const [{ data: duals }, { data: girlsDuals }, { data: tourneys }, { data: girlsTourneys }, { data: tasks }] = await Promise.all([
      supabase.from('dual_meets').select('id, date, home_team_name, away_team_name').not('date', 'is', null),
      (supabase as any).from('dual_meets_girls').select('id, meet_date, team1_school_name_raw, team2_school_name_raw').not('meet_date', 'is', null),
      supabase.from('in_season_tournaments').select('id, date, name').not('date', 'is', null),
      (supabase as any).from('in_season_tournaments_girls').select('id, date, name').not('date', 'is', null),
      supabase.from('admin_tasks').select('id, due_date, title').not('due_date', 'is', null),
    ])

    const ev: CalendarEvent[] = [
      ...((duals ?? []) as { id: string; date: string; home_team_name: string; away_team_name: string }[])
        .map(d => ({ id: d.id, date: d.date, title: `${d.home_team_name} vs ${d.away_team_name}`, type: 'dual' as const })),
      ...((girlsDuals ?? []) as { id: string; meet_date: string; team1_school_name_raw: string; team2_school_name_raw: string }[])
        .map(d => ({ id: d.id, date: d.meet_date, title: `[G] ${d.team1_school_name_raw ?? '?'} vs ${d.team2_school_name_raw ?? '?'}`, type: 'dual' as const })),
      ...((tourneys ?? []) as { id: string; date: string; name: string }[])
        .map(t => ({ id: t.id, date: t.date, title: t.name, type: 'tournament' as const })),
      ...((girlsTourneys ?? []) as { id: string; date: string; name: string }[])
        .map(t => ({ id: t.id, date: t.date, title: `[G] ${t.name}`, type: 'tournament' as const })),
      ...((tasks ?? []) as { id: string; due_date: string; title: string }[])
        .map(t => ({ id: t.id, date: t.due_date, title: t.title, type: 'task' as const })),
    ]
    setEvents(ev)
  }

  function eventsOn(date: string) { return events.filter(e => e.date === date) }

  const VIEW_MODES: { id: ViewMode; label: string }[] = [
    { id: 'year',   label: 'Year' },
    { id: 'month',  label: 'Month' },
    { id: '2week',  label: '2 Week' },
    { id: 'week',   label: 'Week' },
    { id: 'day',    label: 'Day' },
  ]

  function navPrev() {
    const d = new Date(anchor)
    if (mode === 'year')   d.setFullYear(d.getFullYear() - 1)
    else if (mode === 'month')  d.setMonth(d.getMonth() - 1)
    else if (mode === '2week')  d.setDate(d.getDate() - 14)
    else if (mode === 'week')   d.setDate(d.getDate() - 7)
    else if (mode === 'day')    d.setDate(d.getDate() - 1)
    setAnchor(d)
  }

  function navNext() {
    const d = new Date(anchor)
    if (mode === 'year')   d.setFullYear(d.getFullYear() + 1)
    else if (mode === 'month')  d.setMonth(d.getMonth() + 1)
    else if (mode === '2week')  d.setDate(d.getDate() + 14)
    else if (mode === 'week')   d.setDate(d.getDate() + 7)
    else if (mode === 'day')    d.setDate(d.getDate() + 1)
    setAnchor(d)
  }

  function navLabel() {
    const y = anchor.getFullYear()
    const m = MONTH_NAMES[anchor.getMonth()]
    if (mode === 'year')  return String(y)
    if (mode === 'month') return `${m} ${y}`
    if (mode === 'day')   return anchor.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    const start = new Date(anchor)
    start.setDate(start.getDate() - start.getDay())
    const end = new Date(start)
    end.setDate(end.getDate() + (mode === '2week' ? 13 : 6))
    return `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  // ── Year view ── (scrollable)
  function YearView() {
    const y = anchor.getFullYear()
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 12 }, (_, mi) => {
            const firstDay    = new Date(y, mi, 1).getDay()
            const daysInMonth = new Date(y, mi + 1, 0).getDate()
            return (
              <div key={mi} className="border border-slate-100 rounded-lg p-2">
                <p className="text-xs font-semibold text-slate-500 mb-1">{MONTH_NAMES[mi]}</p>
                <div className="grid grid-cols-7 gap-px text-center">
                  {DAY_NAMES.map(d => <div key={d} className="text-[8px] text-slate-400 pb-0.5">{d[0]}</div>)}
                  {Array.from({ length: firstDay }, (_, i) => <div key={`b${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, di) => {
                    const date    = isoDate(y, mi, di + 1)
                    const ev      = eventsOn(date)
                    const isToday = date === new Date().toISOString().slice(0, 10)
                    return (
                      <button
                        key={di}
                        onClick={() => { setAnchor(new Date(date + 'T00:00:00')); setMode('day'); onDayClick?.(date) }}
                        className={`text-[9px] leading-5 rounded relative ${
                          isToday ? 'bg-blue-500 text-white font-bold' : ev.length ? 'text-slate-800 font-medium' : 'text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {di + 1}
                        {ev.length > 0 && !isToday && (
                          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full bg-blue-400" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Month view — fills full height, no scroll ──
  function MonthView() {
    const y           = anchor.getFullYear()
    const mi          = anchor.getMonth()
    const firstDay    = new Date(y, mi, 1).getDay()
    const daysInMonth = new Date(y, mi + 1, 0).getDate()
    const todayStr    = new Date().toISOString().slice(0, 10)
    const rows        = Math.ceil((firstDay + daysInMonth) / 7)

    return (
      <div className="flex-1 flex flex-col min-h-0 px-3 pb-3">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 py-1.5 shrink-0">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-slate-400">{d}</div>
          ))}
        </div>

        {/* Day grid — flex-1 fills all remaining space */}
        <div
          className="grid grid-cols-7 flex-1 min-h-0"
          style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
        >
          {/* Empty leading cells */}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`blank-${i}`} className="border-r border-b border-slate-100 bg-slate-50/40" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, di) => {
            const date    = isoDate(y, mi, di + 1)
            const ev      = eventsOn(date)
            const isToday = date === todayStr
            return (
              <button
                key={di}
                onClick={() => onDayClick?.(date)}
                className="border-r border-b border-slate-100 p-1.5 text-left hover:bg-slate-50 transition-colors overflow-hidden"
              >
                <span className={`text-xs font-semibold inline-flex w-5 h-5 items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-500 text-white' : 'text-slate-600'
                }`}>
                  {di + 1}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {ev.slice(0, 3).map(e => (
                    <div key={e.id} className={`text-[10px] px-1 rounded truncate leading-tight ${EVENT_COLORS[e.type]}`}>
                      {e.title}
                    </div>
                  ))}
                  {ev.length > 3 && (
                    <div className="text-[9px] text-slate-400">+{ev.length - 3} more</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Week / 2-week view ── (horizontally scrollable)
  function WeekView({ weeks }: { weeks: 1 | 2 }) {
    const start = new Date(anchor)
    start.setDate(start.getDate() - start.getDay())
    const days = Array.from({ length: 7 * weeks }, (_, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i)
      return d.toISOString().slice(0, 10)
    })
    const todayStr = new Date().toISOString().slice(0, 10)

    return (
      <div className="flex-1 overflow-auto p-3">
        <div className="grid min-w-full" style={{ gridTemplateColumns: `repeat(7, minmax(120px, 1fr))` }}>
          {days.slice(0, 7).map((date, i) => (
            <div key={date} className={`text-center text-xs font-medium py-1 text-slate-500 ${i < 6 ? 'border-r border-slate-100' : ''}`}>
              {DAY_NAMES[new Date(date + 'T00:00:00').getDay()]}
            </div>
          ))}
          {days.map((date, i) => {
            const ev  = eventsOn(date)
            const col = i % 7
            return (
              <div
                key={date}
                onClick={() => onDayClick?.(date)}
                className={`border-t min-h-24 p-2 cursor-pointer hover:bg-slate-50 transition-colors ${col < 6 ? 'border-r border-slate-100' : ''} ${i >= 7 ? 'border-t border-slate-100' : ''}`}
              >
                <span className={`text-xs font-semibold inline-flex w-5 h-5 items-center justify-center rounded-full ${
                  date === todayStr ? 'bg-blue-500 text-white' : 'text-slate-500'
                }`}>
                  {new Date(date + 'T00:00:00').getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {ev.map(e => (
                    <div key={e.id} className={`text-[10px] px-1 rounded truncate ${EVENT_COLORS[e.type]}`}>{e.title}</div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Day view ── (scrollable)
  function DayView() {
    const date = anchor.toISOString().slice(0, 10)
    const ev   = eventsOn(date)
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {ev.length === 0 && (
          <p className="text-sm text-slate-400">No events or tasks on this day.</p>
        )}
        {ev.map(e => (
          <div key={e.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${EVENT_COLORS[e.type]}`}>
            <span className="text-xs font-semibold capitalize">{e.type}</span>
            <span className="text-sm">{e.title}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 shrink-0">
        <button onClick={navPrev} className="p-1 rounded hover:bg-slate-100 text-slate-500">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/>
          </svg>
        </button>
        <button
          onClick={() => { setAnchor(new Date()); setMode('month') }}
          className="px-2 py-0.5 text-xs border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
        >
          Today
        </button>
        <button onClick={navNext} className="p-1 rounded hover:bg-slate-100 text-slate-500">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
          </svg>
        </button>
        <span className="text-sm font-semibold text-slate-700 flex-1">{navLabel()}</span>
        <div className="flex border border-slate-200 rounded overflow-hidden">
          {VIEW_MODES.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setMode(v.id)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === v.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'
              } ${i > 0 ? 'border-l border-slate-200' : ''}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* View body — flex-1, each mode manages its own overflow */}
      <div className="flex-1 flex flex-col min-h-0">
        {mode === 'year'   && <YearView />}
        {mode === 'month'  && <MonthView />}
        {mode === '2week'  && <WeekView weeks={2} />}
        {mode === 'week'   && <WeekView weeks={1} />}
        {mode === 'day'    && <DayView />}
      </div>
    </div>
  )
}
