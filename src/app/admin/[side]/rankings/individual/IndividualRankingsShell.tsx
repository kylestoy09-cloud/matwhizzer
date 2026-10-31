'use client'

import { useState } from 'react'
import { IndividualRankingsWorkbench } from './IndividualRankingsWorkbench'
import { DistrictPreseedClient } from '../../district-preseed/DistrictPreseedClient'

type Tab = 'rankings' | 'district-preseeds'

export function IndividualRankingsShell({ currentSeason, gender }: { currentSeason: string; gender: 'M' | 'F' }) {
  const [tab, setTab] = useState<Tab>('rankings')

  return (
    <div className="space-y-6">
      {/* Outer tab bar */}
      <div className="flex gap-0 border-b border-slate-200">
        {([
          { key: 'rankings',         label: 'Rankings Workbench' },
          { key: 'district-preseeds', label: 'District Pre-Seeds' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === t.key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'rankings' && <IndividualRankingsWorkbench season={currentSeason} gender={gender} />}
      {tab === 'district-preseeds' && <DistrictPreseedClient season={currentSeason} gender={gender} />}
    </div>
  )
}
