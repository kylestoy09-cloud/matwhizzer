'use client'
// An icon next to a name (👑 👻 🥈 S4 ↑3 …) that says what it means: on hover with a mouse, on tap on a
// phone (tap again or elsewhere to close). The note is placed on the page (fixed), so table scrolling
// doesn't cut it off. Kyle, 2026-11-07.
import { useState, type ReactNode } from 'react'

export function IconHint({ hint, children, className = '' }: { hint: string; children: ReactNode; className?: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const show = (el: HTMLElement) => { const r = el.getBoundingClientRect(); setPos({ x: r.left + r.width / 2, y: r.top }) }
  return (
    <span
      tabIndex={0}
      aria-label={hint}
      className={`inline-flex shrink-0 cursor-help ${className}`}
      onMouseEnter={e => show(e.currentTarget)}
      onMouseLeave={() => setPos(null)}
      onFocus={e => show(e.currentTarget)}
      onBlur={() => setPos(null)}
      onClick={e => { e.preventDefault(); e.stopPropagation(); if (pos) setPos(null); else show(e.currentTarget) }}
    >
      {children}
      {pos && (
        <span role="tooltip" className="pointer-events-none fixed z-50 w-max max-w-[240px] -translate-x-1/2 -translate-y-full bg-slate-900 px-2 py-1 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-white shadow"
          style={{ left: Math.min(Math.max(pos.x, 128), (typeof window === 'undefined' ? 0 : window.innerWidth) - 128), top: pos.y - 6 }}>
          {hint}
        </span>
      )}
    </span>
  )
}
