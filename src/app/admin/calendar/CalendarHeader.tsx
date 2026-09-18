export type SeasonBounds = {
  preseason_start:  string
  season_start:     string
  postseason_start: string
  season_end:       string
  postseason_end:   string
  season_label:     string
}

type Phase = 'offseason' | 'preseason' | 'season' | 'postseason'

function today() { return new Date().toISOString().slice(0, 10) }

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
}

function getPhase(b: SeasonBounds, t: string): Phase {
  if (t >= b.postseason_start) return 'postseason'
  if (t >= b.season_start)     return 'season'
  if (t >= b.preseason_start)  return 'preseason'
  return 'offseason'
}

function yearProgress(b: SeasonBounds, t: string) {
  if (t <= b.preseason_start) return 0
  if (t >= b.postseason_end)  return 1
  return daysBetween(b.preseason_start, t) / daysBetween(b.preseason_start, b.postseason_end)
}

function phaseWidths(b: SeasonBounds) {
  const total = daysBetween(b.preseason_start, b.postseason_end)
  return {
    preseason:  daysBetween(b.preseason_start,  b.season_start)      / total,
    season:     daysBetween(b.season_start,      b.postseason_start)  / total,
    postseason: daysBetween(b.postseason_start,  b.postseason_end)    / total,
  }
}

function daysLeft(b: SeasonBounds, t: string, phase: Phase): number {
  const end =
    phase === 'preseason'  ? b.season_start :
    phase === 'season'     ? b.postseason_start :
    phase === 'postseason' ? b.postseason_end :
    b.preseason_start
  return Math.max(0, daysBetween(t, end))
}

const PHASE_CHIP: Record<Phase, string> = {
  offseason:  'bg-slate-100 text-slate-500',
  preseason:  'bg-blue-100  text-blue-700',
  season:     'bg-green-100 text-green-700',
  postseason: 'bg-amber-100 text-amber-700',
}

const PHASE_LABEL: Record<Phase, string> = {
  offseason:  'Off-Season',
  preseason:  'Preseason',
  season:     'Regular Season',
  postseason: 'Post-Season',
}

type Props = { bounds: SeasonBounds }

export function CalendarHeader({ bounds }: Props) {
  const t         = today()
  const phase     = getPhase(bounds, t)
  const pct       = Math.round(yearProgress(bounds, t) * 100)
  const widths    = phaseWidths(bounds)
  const left      = daysLeft(bounds, t, phase)
  const markerPct = yearProgress(bounds, t) * 100
  const showMarker = markerPct > 1 && markerPct < 99

  // Clamp label position so it doesn't overflow the edges
  const labelLeft = Math.min(Math.max(markerPct, 5), 95)

  return (
    <div className="p-4">
      {/* Top row */}
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-base font-bold text-slate-800">Calendar</p>
        <p className="text-sm text-slate-500 font-medium">{bounds.season_label}</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          {/* Bar + circle marker in a shared relative container */}
          <div className="relative flex items-center" style={{ height: '12px' }}>
            {/* Colored bar — absolutely fills the row, overflow-hidden for rounded ends */}
            <div className="absolute inset-0 rounded-full overflow-hidden flex bg-slate-100">
              <div className="h-full bg-blue-400"  style={{ width: `${widths.preseason  * 100}%` }} />
              <div className="h-full bg-green-500" style={{ width: `${widths.season     * 100}%` }} />
              <div className="h-full bg-amber-400" style={{ width: `${widths.postseason * 100}%` }} />
            </div>

            {/* Today circle marker — sibling of bar, not clipped */}
            {showMarker && (
              <div
                className="absolute z-10"
                style={{ left: `${markerPct}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white border-[2.5px] border-slate-800 shadow-md" />
              </div>
            )}
          </div>

          {/* Phase labels + "Today" annotation row */}
          <div className="relative mt-1" style={{ height: '16px' }}>
            {/* Phase labels (fixed flex widths) */}
            <div className="flex text-[9px] text-slate-400 font-medium absolute inset-0">
              <span style={{ width: `${widths.preseason  * 100}%` }} className="truncate">Preseason</span>
              <span style={{ width: `${widths.season     * 100}%` }} className="truncate text-center">Season</span>
              <span style={{ width: `${widths.postseason * 100}%` }} className="truncate text-right">Postseason</span>
            </div>

            {/* "Today" label pinned under the circle marker */}
            {showMarker && (
              <div
                className="absolute text-[9px] font-bold text-slate-700 whitespace-nowrap"
                style={{
                  left:      `${labelLeft}%`,
                  top:       0,
                  transform: 'translateX(-50%)',
                }}
              >
                ▾ Today
              </div>
            )}
          </div>
        </div>

        {/* Phase chip */}
        <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${PHASE_CHIP[phase]}`}>
          <span>{PHASE_LABEL[phase]}</span>
          <span className="opacity-60">·</span>
          <span>{left}d left</span>
          <span className="opacity-60">·</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  )
}
