'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// ── Constants ──────────────────────────────────────────────────────────────────
// Sprite is 400 × 13600 px (400px/frame × 34 frames).
// WebP hard cap is 16383px; 34 × 800 = 27200 exceeds it, so frames are 400px.
// logo-final.webp is a separate 800×800 WebP (single-frame, within WebP limits).
//
// Display container: 400 × 400 CSS px.
// background-size: 100% auto → sprite renders at 400px wide, 13600px tall.
//
// Animation: steps(33) from "0 0" to "0 100%"
//   background-position 100% vertical = (container_h − bg_h) × 1.0
//                                     = (400 − 13600) × 1.0 = −13200px
//   Each step = 13200 / 33 = 400px = exactly one frame.
//   steps(33) shows frames 1–33 during animation;
//   fill-mode:forwards holds frame 34 permanently.
//
// Contrast ratios (WCAG 2.1 relative luminance formula):
//   Boys button:  white (#fff) on black (#000) → 21:1  (exceeds AAA)
//   Girls button: black (#000) on white (#fff) → 21:1  (exceeds AAA)
//
// Colorblind safety: buttons differ by LABEL ("Boys" / "Girls") AND SHAPE
//   (Boys = solid rectangle, Girls = outlined pill). Color is not the only cue.
//
// Button reveal uses opacity (not conditional rendering) so the button row's
// layout space is pre-allocated, preventing CLS when the hero is viewport-sized.

const DISPLAY_PX = 400  // CSS pixels (sprite is 1×, 400px wide)

export function FlipbookHero() {
  // done = animation finished → reveal entry buttons
  const [done,          setDone]          = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      setReducedMotion(true)
      setDone(true)
    }
  }, [])

  const handleAnimationEnd = useCallback(() => setDone(true), [])

  return (
    <section
      className="flex flex-col items-center"
      aria-label="MatWhizzer hero"
    >
      {/* ── Keyframes injected once per page ───────────────────────────────── */}
      <style>{`
        @keyframes mw-flipbook {
          from { background-position: 0 0; }
          to   { background-position: 0 100%; }
        }
        @keyframes mw-rise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Graphic ────────────────────────────────────────────────────────── */}
      {reducedMotion ? (
        /* Reduced-motion: render final logo immediately, no sprite */
        <Image
          src="/logo-final.webp"
          alt="MatWhizzer mascot logo"
          width={DISPLAY_PX}
          height={DISPLAY_PX}
          priority
        />
      ) : (
        <div
          role="img"
          aria-label="MatWhizzer mascot logo animation"
          onAnimationEnd={handleAnimationEnd}
          style={{
            width:              DISPLAY_PX,
            height:             DISPLAY_PX,
            backgroundImage:    'url(/flipbook.webp)',
            backgroundRepeat:   'no-repeat',
            backgroundSize:     '100% auto',
            backgroundPosition: '0 0',
            animation:          `mw-flipbook 4s steps(33) forwards`,
            // Fixed dimensions prevent CLS. Sprite preloaded in page.tsx.
            flexShrink:         0,
          }}
        />
      )}

      {/* ── Entry buttons ──────────────────────────────────────────────────── */}
      {/*
       * Pre-allocated height (opacity, not conditional) prevents CLS:
       * the button row occupies layout space from the start; only its
       * visibility changes when done flips true.
       *
       * Reduced-motion: done=true on mount, no rise animation.
       */}
      <div
        className="flex gap-5 mt-8"
        style={{
          opacity:       done ? undefined : 0,
          pointerEvents: done ? 'auto' : 'none',
          animation:     (done && !reducedMotion) ? 'mw-rise 0.3s ease-out forwards' : undefined,
        }}
      >
        {/*
         * Boys button — solid black rectangle
         * Contrast: white (#fff) on black (#000) = 21:1  ✓ WCAG AAA
         * Shape cue: sharp corners (rounded-none)
         */}
        <Link
          href="/boys"
          className={[
            'flex items-center justify-center gap-2',
            'w-36 py-3',
            'bg-black text-white font-bold text-lg',
            'border-2 border-black',
            'rounded-none',
            'hover:bg-slate-800 hover:border-slate-800',
            'transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
          ].join(' ')}
        >
          Boys
          <span aria-hidden="true">→</span>
        </Link>

        {/*
         * Girls button — outlined pill
         * Contrast: black (#000) on white (#fff) = 21:1  ✓ WCAG AAA
         * Shape cue: fully rounded (pill) + border-only style
         */}
        <Link
          href="/girls"
          className={[
            'flex items-center justify-center gap-2',
            'w-36 py-3',
            'bg-white text-black font-bold text-lg',
            'border-2 border-black',
            'rounded-full',
            'hover:bg-slate-100',
            'transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
          ].join(' ')}
        >
          Girls
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}
