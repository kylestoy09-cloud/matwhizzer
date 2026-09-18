'use client'

// ── Types ──────────────────────────────────────────────────────────────────────

export type PublicBracketSlot = {
  slot_number: number
  round_name: string
  bracket_size: number
  top_name_raw: string | null
  top_seed: number | null
  top_wrestler_id: string | null
  bottom_name_raw: string | null
  bottom_seed: number | null
  bottom_wrestler_id: string | null
  winner_position: 'top' | 'bottom' | null
  result_type: string | null
  result_detail: string | null
}

// ── Result label ───────────────────────────────────────────────────────────────

function resultLabel(rt: string | null, rd: string | null): string {
  if (!rt) return ''
  const t = rt.toUpperCase()
  if (t === 'FALL') return rd ? `Fall ${rd}` : 'Fall'
  if (t === 'DECISION' || t === 'DEC') return rd ? `Dec ${rd}` : 'Dec'
  if (t === 'MAJOR' || t === 'MD') return rd ? `Maj ${rd}` : 'Maj'
  if (t === 'TECH' || t === 'TF') return rd ? `TF ${rd}` : 'TF'
  if (t === 'FORFEIT' || t === 'FORF') return 'Forf'
  if (t === 'BYE') return 'Bye'
  return rd ? `${rt} ${rd}` : rt
}

// ── Match card ─────────────────────────────────────────────────────────────────

const CW = 148  // card width
const CH = 72   // card height

function MatchCard({ slot }: { slot: PublicBracketSlot | null }) {
  if (!slot) {
    return (
      <div
        className="border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center shrink-0"
        style={{ width: CW, height: CH }}
      >
        <span className="text-[10px] text-slate-300">TBD</span>
      </div>
    )
  }

  const s = slot
  const hasResult = !!s.winner_position

  function Row({ pos }: { pos: 'top' | 'bottom' }) {
    const name = pos === 'top' ? s.top_name_raw : s.bottom_name_raw
    const seed = pos === 'top' ? s.top_seed     : s.bottom_seed
    const isWinner = hasResult && s.winner_position === pos
    const isLoser  = hasResult && s.winner_position !== pos

    return (
      <div className={`flex-1 flex items-center gap-1 px-1.5 min-w-0 ${isWinner ? 'bg-emerald-50' : ''}`}>
        {seed != null ? (
          <span className={`text-[9px] font-bold w-4 shrink-0 text-right tabular-nums ${isWinner ? 'text-emerald-700' : 'text-slate-400'}`}>{seed}</span>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className={`text-[10px] truncate min-w-0 leading-tight ${
          isWinner ? 'font-semibold text-slate-900'
          : isLoser ? 'text-slate-400 line-through decoration-slate-300'
          : !name    ? 'text-slate-300 italic'
          : 'text-slate-700'
        }`}>
          {name ?? 'TBD'}
        </span>
        {isWinner && <span className="text-[8px] font-bold text-emerald-600 shrink-0 ml-auto">W</span>}
      </div>
    )
  }

  const res = hasResult ? resultLabel(s.result_type, s.result_detail) : ''

  return (
    <div
      className="border border-slate-300 bg-white overflow-hidden flex flex-col shrink-0"
      style={{ width: CW, height: CH }}
    >
      <Row pos="top" />
      <div className="border-t border-slate-200 shrink-0" />
      <Row pos="bottom" />
      {res && (
        <div className="border-t border-slate-100 px-1.5 shrink-0">
          <span className="text-[8px] text-slate-400 leading-none">{res}</span>
        </div>
      )}
    </div>
  )
}

// ── 8-man bracket (legacy / small tournaments) ─────────────────────────────────

const QF_Y8 = [0, CH + 8, CH + 8 + CH + 24, CH + 8 + CH + 24 + CH + 8]
const SF_CY8 = [(QF_Y8[0] + QF_Y8[1] + CH) / 2, (QF_Y8[2] + QF_Y8[3] + CH) / 2]
const SF_Y8  = SF_CY8.map(cy => cy - CH / 2)
const F_CY8  = (SF_Y8[0] + SF_Y8[1] + CH) / 2
const F_Y8   = F_CY8 - CH / 2
const H8     = QF_Y8[3] + CH
const KW8    = 24

function Bracket8({ bySlot }: { bySlot: Map<number, PublicBracketSlot> }) {
  const qf = [1, 2, 3, 4].map(n => bySlot.get(n) ?? null)
  const sf = [5, 6].map(n => bySlot.get(n) ?? null)
  const f  = bySlot.get(9) ?? null
  const csf = [7, 8].map(n => bySlot.get(n) ?? null)
  const p3  = bySlot.get(10) ?? null
  const p5  = bySlot.get(11) ?? null
  const p7  = bySlot.get(12) ?? null

  const X_QF = 0
  const X_SF = CW + KW8
  const X_F  = CW + KW8 + CW + KW8
  const KX1  = CW + KW8 / 2
  const KX2  = CW + KW8 + CW + KW8 / 2
  const QF_CY = QF_Y8.map(y => y + CH / 2)
  const stroke = '#CBD5E1'
  const sw = 1.5
  const W8 = CW + KW8 + CW + KW8 + CW

  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Championship</p>
      <div className="relative" style={{ width: W8, height: H8 }}>
        <svg className="absolute inset-0 pointer-events-none" width={W8} height={H8} style={{ overflow: 'visible' }}>
          <line x1={X_QF + CW} y1={QF_CY[0]} x2={KX1} y2={QF_CY[0]} stroke={stroke} strokeWidth={sw} />
          <line x1={X_QF + CW} y1={QF_CY[1]} x2={KX1} y2={QF_CY[1]} stroke={stroke} strokeWidth={sw} />
          <line x1={KX1} y1={QF_CY[0]} x2={KX1} y2={QF_CY[1]} stroke={stroke} strokeWidth={sw} />
          <line x1={KX1} y1={SF_CY8[0]} x2={X_SF} y2={SF_CY8[0]} stroke={stroke} strokeWidth={sw} />
          <line x1={X_QF + CW} y1={QF_CY[2]} x2={KX1} y2={QF_CY[2]} stroke={stroke} strokeWidth={sw} />
          <line x1={X_QF + CW} y1={QF_CY[3]} x2={KX1} y2={QF_CY[3]} stroke={stroke} strokeWidth={sw} />
          <line x1={KX1} y1={QF_CY[2]} x2={KX1} y2={QF_CY[3]} stroke={stroke} strokeWidth={sw} />
          <line x1={KX1} y1={SF_CY8[1]} x2={X_SF} y2={SF_CY8[1]} stroke={stroke} strokeWidth={sw} />
          <line x1={X_SF + CW} y1={SF_CY8[0]} x2={KX2} y2={SF_CY8[0]} stroke={stroke} strokeWidth={sw} />
          <line x1={X_SF + CW} y1={SF_CY8[1]} x2={KX2} y2={SF_CY8[1]} stroke={stroke} strokeWidth={sw} />
          <line x1={KX2} y1={SF_CY8[0]} x2={KX2} y2={SF_CY8[1]} stroke={stroke} strokeWidth={sw} />
          <line x1={KX2} y1={F_CY8} x2={X_F} y2={F_CY8} stroke={stroke} strokeWidth={sw} />
        </svg>
        <div className="absolute" style={{ left: X_QF }}>
          <p className="text-[9px] font-semibold text-slate-300 uppercase tracking-widest mb-1">QF</p>
          {qf.map((slot, i) => (
            <div key={i} className="absolute" style={{ top: QF_Y8[i] }}><MatchCard slot={slot} /></div>
          ))}
        </div>
        <div className="absolute" style={{ left: X_SF }}>
          <p className="absolute -top-5 text-[9px] font-semibold text-slate-300 uppercase tracking-widest">Semis</p>
          {sf.map((slot, i) => (
            <div key={i} className="absolute" style={{ top: SF_Y8[i] }}><MatchCard slot={slot} /></div>
          ))}
        </div>
        <div className="absolute" style={{ left: X_F }}>
          <p className="absolute -top-5 text-[9px] font-semibold text-slate-300 uppercase tracking-widest">Final</p>
          <div className="absolute" style={{ top: F_Y8 }}><MatchCard slot={f} /></div>
        </div>
      </div>
      {(csf[0] || csf[1] || p3 || p5 || p7) && (
        <div className="mt-8">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Consolation</p>
          <div className="flex flex-wrap gap-6">
            {(csf[0] || csf[1]) && (
              <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Cons. Semis</p>
                <div className="flex flex-col gap-2">{csf.map((s, i) => s && <MatchCard key={i} slot={s} />)}</div>
              </div>
            )}
            {p3 && <div><p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">3rd</p><MatchCard slot={p3} /></div>}
            {p5 && <div><p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">5th</p><MatchCard slot={p5} /></div>}
            {p7 && <div><p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">7th</p><MatchCard slot={p7} /></div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 32-man bracket ─────────────────────────────────────────────────────────────
// Layout: R1(16 cards) | R2(8 cards) | QF(4 cards) | SF(2 cards) | F(1 card)
// Consolation below: CQF(2 cards) | CSF(2 cards) | 3rd | 5th

// Gap sizes
const WG = 6    // within-pair
const PG = 16   // between pairs within a quad
const QG = 32   // between quads

// R1 has 16 slots grouped as: 4 quads of 4 (2 pairs each)
// Within pair: WG gap; between pairs in quad: PG gap; between quads: QG gap
function r1Tops(): number[] {
  const tops: number[] = []
  for (let slot = 1; slot <= 16; slot++) {
    const i = slot - 1
    const quad = Math.floor(i / 4)
    const inQuad = i % 4
    const pair = Math.floor(inQuad / 2)
    const inPair = inQuad % 2
    const y = quad * (4 * CH + 2 * WG + PG + QG) + pair * (2 * CH + WG + PG) + inPair * (CH + WG)
    tops.push(y)
  }
  return tops
}

const R1_TOPS = r1Tops()
const R1_H = R1_TOPS[15] + CH

// R2: 8 slots, each centered between its 2 R1 feeders
function r2Tops(): number[] {
  const tops: number[] = []
  for (let slot = 17; slot <= 24; slot++) {
    const i = slot - 17  // 0-7
    const r1a = (i * 2)     // R1 slot index 0-based feeding top
    const r1b = (i * 2) + 1 // R1 slot index 0-based feeding bottom
    const cy = (R1_TOPS[r1a] + R1_TOPS[r1b] + CH) / 2
    tops.push(cy - CH / 2)
  }
  return tops
}
const R2_TOPS = r2Tops()

// QF: 4 slots, each centered between its 2 R2 feeders
function qfTops(): number[] {
  return [0, 1, 2, 3].map(i => {
    const cy = (R2_TOPS[i * 2] + R2_TOPS[i * 2 + 1] + CH) / 2
    return cy - CH / 2
  })
}
const QF_TOPS = qfTops()

// SF: 2 slots, centered between their 2 QF feeders
const SF_TOPS = [0, 1].map(i => {
  const cy = (QF_TOPS[i * 2] + QF_TOPS[i * 2 + 1] + CH) / 2
  return cy - CH / 2
})

// F: 1 slot, centered between the 2 SFs
const F_CY32 = (SF_TOPS[0] + SF_TOPS[1] + CH) / 2
const F_TOP32 = F_CY32 - CH / 2

const KW = 20  // connector column width

function Bracket32({ bySlot }: { bySlot: Map<number, PublicBracketSlot> }) {
  const r1 = Array.from({ length: 16 }, (_, i) => bySlot.get(i + 1) ?? null)
  const r2 = Array.from({ length: 8 },  (_, i) => bySlot.get(i + 17) ?? null)
  const qf = Array.from({ length: 4 },  (_, i) => bySlot.get(i + 25) ?? null)
  const sf = [bySlot.get(29) ?? null, bySlot.get(30) ?? null]
  const f  = bySlot.get(31) ?? null
  const cqf = [bySlot.get(32) ?? null, bySlot.get(33) ?? null]
  const csf = [bySlot.get(34) ?? null, bySlot.get(35) ?? null]
  const p3  = bySlot.get(36) ?? null
  const p5  = bySlot.get(37) ?? null

  const X_R1 = 0
  const X_R2 = CW + KW
  const X_QF = X_R2 + CW + KW
  const X_SF = X_QF + CW + KW
  const X_F  = X_SF + CW + KW
  const TOTAL_W = X_F + CW

  const stroke = '#CBD5E1'
  const sw = 1

  // Connector helpers
  const r1Cx = (i: number) => R1_TOPS[i] + CH / 2
  const r2Cx = (i: number) => R2_TOPS[i] + CH / 2
  const qfCx = (i: number) => QF_TOPS[i] + CH / 2
  const sfCx = (i: number) => SF_TOPS[i] + CH / 2

  return (
    <div>
      {/* Championship */}
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Championship</p>
      <div className="relative overflow-x-auto pb-2">
        <div className="relative" style={{ width: TOTAL_W, height: R1_H }}>
          {/* SVG connectors */}
          <svg className="absolute inset-0 pointer-events-none" width={TOTAL_W} height={R1_H} style={{ overflow: 'visible' }}>
            {/* R1 → R2 */}
            {r2.map((_, ri) => {
              const ra = ri * 2, rb = ri * 2 + 1
              const mx = X_R1 + CW + KW / 2
              return (
                <g key={`r1r2-${ri}`}>
                  <line x1={X_R1 + CW} y1={r1Cx(ra)} x2={mx} y2={r1Cx(ra)} stroke={stroke} strokeWidth={sw} />
                  <line x1={X_R1 + CW} y1={r1Cx(rb)} x2={mx} y2={r1Cx(rb)} stroke={stroke} strokeWidth={sw} />
                  <line x1={mx} y1={r1Cx(ra)} x2={mx} y2={r1Cx(rb)} stroke={stroke} strokeWidth={sw} />
                  <line x1={mx} y1={r2Cx(ri)} x2={X_R2} y2={r2Cx(ri)} stroke={stroke} strokeWidth={sw} />
                </g>
              )
            })}
            {/* R2 → QF */}
            {qf.map((_, qi) => {
              const ra = qi * 2, rb = qi * 2 + 1
              const mx = X_R2 + CW + KW / 2
              return (
                <g key={`r2qf-${qi}`}>
                  <line x1={X_R2 + CW} y1={r2Cx(ra)} x2={mx} y2={r2Cx(ra)} stroke={stroke} strokeWidth={sw} />
                  <line x1={X_R2 + CW} y1={r2Cx(rb)} x2={mx} y2={r2Cx(rb)} stroke={stroke} strokeWidth={sw} />
                  <line x1={mx} y1={r2Cx(ra)} x2={mx} y2={r2Cx(rb)} stroke={stroke} strokeWidth={sw} />
                  <line x1={mx} y1={qfCx(qi)} x2={X_QF} y2={qfCx(qi)} stroke={stroke} strokeWidth={sw} />
                </g>
              )
            })}
            {/* QF → SF */}
            {sf.map((_, si) => {
              const ra = si * 2, rb = si * 2 + 1
              const mx = X_QF + CW + KW / 2
              return (
                <g key={`qfsf-${si}`}>
                  <line x1={X_QF + CW} y1={qfCx(ra)} x2={mx} y2={qfCx(ra)} stroke={stroke} strokeWidth={sw} />
                  <line x1={X_QF + CW} y1={qfCx(rb)} x2={mx} y2={qfCx(rb)} stroke={stroke} strokeWidth={sw} />
                  <line x1={mx} y1={qfCx(ra)} x2={mx} y2={qfCx(rb)} stroke={stroke} strokeWidth={sw} />
                  <line x1={mx} y1={sfCx(si)} x2={X_SF} y2={sfCx(si)} stroke={stroke} strokeWidth={sw} />
                </g>
              )
            })}
            {/* SF → F */}
            {(() => {
              const mx = X_SF + CW + KW / 2
              return (
                <g>
                  <line x1={X_SF + CW} y1={sfCx(0)} x2={mx} y2={sfCx(0)} stroke={stroke} strokeWidth={sw} />
                  <line x1={X_SF + CW} y1={sfCx(1)} x2={mx} y2={sfCx(1)} stroke={stroke} strokeWidth={sw} />
                  <line x1={mx} y1={sfCx(0)} x2={mx} y2={sfCx(1)} stroke={stroke} strokeWidth={sw} />
                  <line x1={mx} y1={F_CY32} x2={X_F} y2={F_CY32} stroke={stroke} strokeWidth={sw} />
                </g>
              )
            })()}
          </svg>

          {/* R1 column */}
          <div className="absolute" style={{ left: X_R1 }}>
            <p className="text-[9px] font-semibold text-slate-300 uppercase tracking-widest mb-1">R1</p>
            {r1.map((slot, i) => (
              <div key={i} className="absolute" style={{ top: R1_TOPS[i] }}><MatchCard slot={slot} /></div>
            ))}
          </div>

          {/* R2 column */}
          <div className="absolute" style={{ left: X_R2 }}>
            <p className="absolute -top-5 text-[9px] font-semibold text-slate-300 uppercase tracking-widest">R2</p>
            {r2.map((slot, i) => (
              <div key={i} className="absolute" style={{ top: R2_TOPS[i] }}><MatchCard slot={slot} /></div>
            ))}
          </div>

          {/* QF column */}
          <div className="absolute" style={{ left: X_QF }}>
            <p className="absolute -top-5 text-[9px] font-semibold text-slate-300 uppercase tracking-widest">QF</p>
            {qf.map((slot, i) => (
              <div key={i} className="absolute" style={{ top: QF_TOPS[i] }}><MatchCard slot={slot} /></div>
            ))}
          </div>

          {/* SF column */}
          <div className="absolute" style={{ left: X_SF }}>
            <p className="absolute -top-5 text-[9px] font-semibold text-slate-300 uppercase tracking-widest">Semis</p>
            {sf.map((slot, i) => (
              <div key={i} className="absolute" style={{ top: SF_TOPS[i] }}><MatchCard slot={slot} /></div>
            ))}
          </div>

          {/* F column */}
          <div className="absolute" style={{ left: X_F }}>
            <p className="absolute -top-5 text-[9px] font-semibold text-slate-300 uppercase tracking-widest">Final</p>
            <div className="absolute" style={{ top: F_TOP32 }}><MatchCard slot={f} /></div>
          </div>
        </div>
      </div>

      {/* Consolation */}
      {(cqf[0] || cqf[1] || csf[0] || csf[1] || p3 || p5) && (
        <div className="mt-8">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Consolation</p>
          <div className="flex flex-wrap gap-6 items-start">
            {(cqf[0] || cqf[1]) && (
              <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Cons. QF</p>
                <div className="flex flex-col gap-2">{cqf.map((s, i) => s && <MatchCard key={i} slot={s} />)}</div>
              </div>
            )}
            {(csf[0] || csf[1]) && (
              <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Cons. Semis</p>
                <div className="flex flex-col gap-2">{csf.map((s, i) => s && <MatchCard key={i} slot={s} />)}</div>
              </div>
            )}
            {p3 && <div><p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">3rd Place</p><MatchCard slot={p3} /></div>}
            {p5 && <div><p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">5th Place</p><MatchCard slot={p5} /></div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main export ─────────────────────────────────────────────────────────────────

export function BracketTree({ slots }: { slots: PublicBracketSlot[] }) {
  const bySlot = new Map(slots.map(s => [s.slot_number, s]))
  const size   = slots[0]?.bracket_size ?? 8

  if (size === 32) return <Bracket32 bySlot={bySlot} />
  if (size === 8 || size === 4) return <Bracket8 bySlot={bySlot} />

  return (
    <div className="text-sm text-slate-400 py-8">
      Bracket size {size} display coming soon.
    </div>
  )
}
