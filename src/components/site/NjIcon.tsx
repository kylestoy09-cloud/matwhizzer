// A small outline of New Jersey (Kyle 2026-11-21: "put a little new jersey state icon next to njsiaa wrestlers") —
// marks an NJSIAA school's wrestler where out-of-state wrestlers are listed too (brackets of out-of-state events).
export function NjIcon({ className = 'h-3 w-2 shrink-0' }: { className?: string }) {
  return (
    <svg viewBox="0 0 13.5 25" className={className} aria-label="NJSIAA wrestler" role="img">
      <title>NJSIAA wrestler</title>
      <path d="M7.0 0.4 L13.1 4.1 L12.3 9.3 L12.5 11.5 L11.6 16.5 L9.2 20.4 L4.9 24.7 L5.5 22.3 L3.6 22.2 L0.4 18.0 L4.2 14.0 L6.7 12.1 L5.0 10.6 L3.1 7.1 L3.9 5.5 L4.8 3.2 Z" fill="#16284A" />
    </svg>
  )
}
