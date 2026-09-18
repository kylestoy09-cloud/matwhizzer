'use client'

import { useAdminGender } from './AdminGenderContext'

export function AdminGenderSelector({ className = '' }: { className?: string }) {
  const { gender, setGender } = useAdminGender()

  return (
    <div className={`flex items-center rounded overflow-hidden border border-slate-600 ${className}`}>
      <button
        onClick={() => setGender('M')}
        className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
          gender === 'M'
            ? 'bg-blue-500 text-white'
            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
        }`}
      >
        Boys
      </button>
      <button
        onClick={() => setGender('F')}
        className={`flex-1 py-1.5 text-xs font-bold transition-colors border-l border-slate-600 ${
          gender === 'F'
            ? 'bg-pink-500 text-white'
            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
        }`}
      >
        Girls
      </button>
    </div>
  )
}
