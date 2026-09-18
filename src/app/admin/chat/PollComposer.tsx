'use client'

import { useState } from 'react'

type Props = {
  onPost: (question: string, options: string[], allowMultiple: boolean) => Promise<void>
  onClose: () => void
}

export function PollComposer({ onPost, onClose }: Props) {
  const [question, setQuestion]         = useState('')
  const [options, setOptions]           = useState(['', ''])
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [saving, setSaving]             = useState(false)

  function setOption(i: number, val: string) {
    setOptions(prev => prev.map((o, idx) => idx === i ? val : o))
  }

  function addOption() {
    if (options.length < 6) setOptions(prev => [...prev, ''])
  }

  function removeOption(i: number) {
    if (options.length > 2) setOptions(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handlePost() {
    const filled = options.filter(o => o.trim())
    if (!question.trim() || filled.length < 2) return
    setSaving(true)
    await onPost(question.trim(), filled, allowMultiple)
    setSaving(false)
    onClose()
  }

  const valid = question.trim() && options.filter(o => o.trim()).length >= 2

  return (
    <div className="border-t border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">New Poll</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
      </div>

      <input
        autoFocus
        type="text"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="Ask a question…"
        className="w-full text-sm border border-slate-200 rounded px-2.5 py-1.5 mb-2 focus:outline-none focus:border-slate-400 bg-white"
      />

      <div className="space-y-1.5 mb-2">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              type="text"
              value={opt}
              onChange={e => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 text-sm border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-slate-400 bg-white"
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="text-slate-400 hover:text-red-400 px-1">×</button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {options.length < 6 && (
            <button onClick={addOption} className="text-xs text-slate-500 hover:text-slate-700">+ Add option</button>
          )}
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={e => setAllowMultiple(e.target.checked)}
              className="w-3 h-3"
            />
            Multiple votes
          </label>
        </div>
        <button
          onClick={handlePost}
          disabled={!valid || saving}
          className="text-xs px-3 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Posting…' : 'Post Poll'}
        </button>
      </div>
    </div>
  )
}
