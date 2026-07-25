'use client'

import { useState } from 'react'

export default function SchedulePage() {
  const [date, setDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Schedule</h1>
      <p className="text-slate-500 text-sm mb-8">View dual meets and tournaments by date.</p>

      <div className="flex items-center gap-3 mb-8">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 rounded-none"
        />
      </div>

      <div className="border border-slate-200 rounded-none px-6 py-12 text-center text-slate-400">
        <p className="text-sm">Schedule data coming soon.</p>
        <p className="text-xs mt-1">Once dual meet data is imported, matches for the selected date will appear here.</p>
      </div>
    </div>
  )
}
