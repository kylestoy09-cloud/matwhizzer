'use client'

import { useState } from 'react'

type Viewport = { label: string; width: number; height: number; icon: string }
type Concept  = { id: string; label: string; url: string; note?: string }

const VIEWPORTS: Viewport[] = [
  { label: 'Mobile',  width: 390,  height: 844,  icon: '📱' },
  { label: 'Tablet',  width: 768,  height: 1024, icon: '🖥' },
  { label: 'Desktop', width: 1280, height: 800,  icon: '🖥' },
]

const CONCEPTS: Concept[] = [
  { id: 'current', label: 'Current',   url: '/',    note: 'Live home page — FlipbookHero' },
  { id: 'a',       label: 'Concept A', url: '/homepage-concept-a', note: 'Scorebar · Articles · Poll · Vault · Rankings' },
  { id: 'b',       label: 'Concept B', url: '#',    note: 'Not yet built' },
]

export function HomepageTestClient() {
  const [conceptId,   setConceptId]   = useState('current')
  const [viewportIdx, setViewportIdx] = useState(2)  // desktop default
  const [scale,       setScale]       = useState(0.7)

  const concept  = CONCEPTS.find(c => c.id === conceptId) ?? CONCEPTS[0]
  const viewport = VIEWPORTS[viewportIdx]
  const isLive   = concept.url !== '#'

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-4 px-4 h-11 bg-white border-b border-slate-200 shrink-0 flex-wrap">
        {/* Concept tabs */}
        <div className="flex items-center gap-1">
          {CONCEPTS.map(c => (
            <button
              key={c.id}
              onClick={() => setConceptId(c.id)}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                conceptId === c.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200" />

        {/* Viewport picker */}
        <div className="flex items-center gap-1">
          {VIEWPORTS.map((v, i) => (
            <button
              key={v.label}
              onClick={() => setViewportIdx(i)}
              title={`${v.width}×${v.height}`}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                viewportIdx === i
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200" />

        {/* Scale */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Scale</span>
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.05}
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
            className="w-24 accent-slate-700"
          />
          <span className="text-xs text-slate-500 w-8 tabular-nums">{Math.round(scale * 100)}%</span>
        </div>

        <div className="flex-1" />

        {/* Concept note */}
        {concept.note && (
          <span className="text-xs text-slate-400 italic">{concept.note}</span>
        )}

        {/* Open in new tab */}
        {isLive && (
          <a
            href={concept.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Open ↗
          </a>
        )}
      </div>

      {/* ── Preview canvas ── */}
      <div className="flex-1 overflow-auto bg-slate-100 flex items-start justify-center pt-8 pb-8">
        <div
          style={{
            width:          viewport.width * scale,
            height:         viewport.height * scale,
            flexShrink:     0,
            boxShadow:      '0 4px 32px rgba(0,0,0,0.18)',
            borderRadius:   4,
            overflow:       'hidden',
            position:       'relative',
            background:     '#fff',
          }}
        >
          {isLive ? (
            <iframe
              key={`${concept.id}-${viewport.label}`}
              src={concept.url}
              title={concept.label}
              style={{
                width:            viewport.width,
                height:           viewport.height,
                border:           'none',
                transformOrigin:  'top left',
                transform:        `scale(${scale})`,
                pointerEvents:    'auto',
              }}
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center text-slate-400 text-sm gap-2"
              style={{ width: viewport.width * scale, height: viewport.height * scale }}
            >
              <span className="text-3xl">🚧</span>
              <span>{concept.label} — not yet built</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center gap-4 px-4 h-7 bg-white border-t border-slate-100 shrink-0">
        <span className="text-xs text-slate-400">{viewport.width} × {viewport.height} px</span>
        <span className="text-xs text-slate-300">·</span>
        <span className="text-xs text-slate-400">rendered at {Math.round(scale * 100)}%</span>
        {isLive && (
          <>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-400">src: <code className="font-mono">{concept.url}</code></span>
          </>
        )}
      </div>
    </div>
  )
}
