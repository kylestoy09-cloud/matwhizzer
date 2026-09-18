'use client'

import { useRef, useState } from 'react'
import { PollComposer } from './PollComposer'
import { createSupabaseBrowser } from '@/lib/supabase/client'

const EMOJIS = [
  '😀','😂','😎','🤔','👍','👎','❤️','🔥','🎉','💯',
  '🏆','💪','😤','🤣','😅','🙌','👏','✅','❌','⚠️',
  '📌','📷','📊','🗓️','💬','🔔','⭐','🌟','💡','🎯',
]

type Props = {
  currentUser: string
  onSend: (content: string) => Promise<void>
  onSendPhoto: (url: string) => Promise<void>
  onPostPoll: (question: string, options: string[], allowMultiple: boolean) => Promise<void>
}

export function ChatInput({ currentUser, onSend, onSendPhoto, onPostPoll }: Props) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showPoll, setShowPoll] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    await onSend(text.trim())
    setText('')
    setSending(false)
    textRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function insertEmoji(emoji: string) {
    setText(prev => prev + emoji)
    setShowEmoji(false)
    textRef.current?.focus()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    const supabase = createSupabaseBrowser()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage.from('admin-chat').upload(path, file, { upsert: false })
    if (error) {
      console.error('Upload error:', error)
      setUploading(false)
      return
    }

    // Store the path (not a public URL) — bucket is private, signed URLs are generated at read time
    await onSendPhoto(path)
    setUploading(false)
  }

  if (showPoll) {
    return (
      <PollComposer
        onPost={onPostPoll}
        onClose={() => setShowPoll(false)}
      />
    )
  }

  return (
    <div className="border-t border-slate-200 bg-white px-3 py-2 shrink-0">
      {/* Emoji picker */}
      {showEmoji && (
        <div className="mb-2 flex flex-wrap gap-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => insertEmoji(e)}
              className="text-lg hover:bg-slate-200 rounded w-8 h-8 flex items-center justify-center transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Tool buttons */}
        <div className="flex gap-1 pb-1.5 shrink-0">
          <button
            onClick={() => { setShowEmoji(p => !p); setShowPoll(false) }}
            title="Emoji"
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-base transition-colors ${showEmoji ? 'bg-slate-100 text-blue-600' : 'text-slate-500'}`}
          >
            😊
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Photo"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-40"
          >
            {uploading ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M1 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V5zm2-1a1 1 0 00-1 1v6.586l3.293-3.293a1 1 0 011.414 0L10 11.586l2.293-2.293a1 1 0 011.414 0L17 12.586V5a1 1 0 00-1-1H3zm0 11h14v-.586l-3.293-3.293-2.293 2.293a1 1 0 01-1.414 0L7 10.414l-3 3V15z" clipRule="evenodd"/>
              </svg>
            )}
          </button>
          <button
            onClick={() => { setShowPoll(true); setShowEmoji(false) }}
            title="Create poll"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
            </svg>
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text input */}
        <textarea
          ref={textRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={1}
          className="flex-1 resize-none text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-400 leading-snug max-h-28 overflow-y-auto"
          style={{ minHeight: 36 }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = Math.min(el.scrollHeight, 112) + 'px'
          }}
        />

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-30 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 rotate-90">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
