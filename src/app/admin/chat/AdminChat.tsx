'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import { ChatFeed } from './ChatFeed'
import { ChatInput } from './ChatInput'
import { ChatSidebar } from './ChatSidebar'
import type { ChatMessage, ChatPoll, PollVote } from './types'

type Props = {
  currentUser: string
  onClose: () => void
}

export function AdminChat({ currentUser, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [polls, setPolls] = useState<ChatPoll[]>([])
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Stable refs — survive re-renders without breaking the subscription closure
  const supabase = useRef(createSupabaseBrowser()).current
  const mountedRef = useRef(true)
  const loadAllRef = useRef<() => Promise<void>>(async () => {})

  // Keep the ref pointing at the latest loadAll so the subscription callback never goes stale.
  // This runs on every render (before the effect), so the subscription always calls the right version.
  loadAllRef.current = loadAll

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true
    loadAll()  // call directly — ref isn't populated until after first render

    const channel = supabase
      .channel(`admin-chat-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_chat_messages' }, () => {
        loadAllRef.current()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_chat_poll_votes' }, () => {
        loadAllRef.current()
      })
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [])

  async function loadAll(): Promise<void> {
    // Load polls with votes
    const { data: pollRows, error: pollErr } = await supabase
      .from('admin_chat_polls')
      .select('*, votes:admin_chat_poll_votes(*)')
      .order('created_at', { ascending: false })

    if (pollErr) {
      if (mountedRef.current) setError('Error loading polls: ' + pollErr.message)
      return
    }

    const pollMap = new Map<string, ChatPoll>()
    for (const p of (pollRows ?? [])) {
      const poll: ChatPoll = {
        ...p,
        options: Array.isArray(p.options) ? p.options : [],
        votes: (p.votes ?? []) as PollVote[],
      }
      pollMap.set(poll.id, poll)
    }

    if (mountedRef.current) setPolls(Array.from(pollMap.values()))

    // Load messages with poll join
    const { data: msgRows, error: msgErr } = await supabase
      .from('admin_chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200)

    if (msgErr) {
      if (mountedRef.current) setError('Error loading messages: ' + msgErr.message)
      return
    }

    const hydrated: ChatMessage[] = (msgRows ?? []).map(m => {
      const row = m as unknown as ChatMessage
      return { ...row, poll: row.poll_id ? (pollMap.get(row.poll_id) ?? null) : null }
    })

    if (mountedRef.current) {
      setMessages(hydrated)
      setLoading(false)
      resolvePhotoUrls(hydrated)
    }
  }

  async function resolvePhotoUrls(msgs: ChatMessage[]) {
    const withPhoto = msgs.filter(m => m.photo_url)
    if (withPhoto.length === 0) return

    const entries = await Promise.all(
      withPhoto.map(async m => {
        const { data, error } = await supabase.storage
          .from('admin-chat')
          .createSignedUrl(m.photo_url!, 3600)
        return [m.id, error ? null : data?.signedUrl] as const
      })
    )

    if (mountedRef.current) {
      setPhotoUrls(new Map(entries.filter(([, url]) => url != null) as [string, string][]))
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleSend(content: string) {
    const { error } = await supabase.from('admin_chat_messages').insert({
      user_email: currentUser,
      content,
    })
    if (error) console.error('Send error:', error)
    else loadAll()
  }

  async function handleSendPhoto(photoUrl: string) {
    const { error } = await supabase.from('admin_chat_messages').insert({
      user_email: currentUser,
      photo_url: photoUrl,
    })
    if (error) console.error('Photo send error:', error)
    else loadAll()
  }

  async function handlePostPoll(question: string, options: string[], allowMultiple: boolean) {
    const { data: pollData, error: pollErr } = await supabase
      .from('admin_chat_polls')
      .insert({ user_email: currentUser, question, options, allow_multiple_votes: allowMultiple })
      .select()
      .single()

    if (pollErr || !pollData) {
      console.error('Poll create error:', pollErr)
      return
    }

    const { error: msgErr } = await supabase.from('admin_chat_messages').insert({
      user_email: currentUser,
      poll_id: pollData.id,
    })
    if (msgErr) console.error('Poll message error:', msgErr)
    else loadAll()
  }

  async function handleVote(pollId: string, optionIndex: number) {
    const { error } = await supabase.from('admin_chat_poll_votes').insert({
      poll_id: pollId,
      user_email: currentUser,
      option_index: optionIndex,
    })
    if (error) console.error('Vote error:', error)
    else loadAll()
  }

  async function handleClosePoll(pollId: string) {
    const { error } = await supabase
      .from('admin_chat_polls')
      .update({ is_closed: true })
      .eq('id', pollId)
    if (error) console.error('Close poll error:', error)
    else loadAll()
  }

  async function handlePinPoll(pollId: string) {
    const { error } = await supabase
      .from('admin_chat_polls')
      .update({ is_pinned: true })
      .eq('id', pollId)
    if (error) console.error('Pin poll error:', error)
    else loadAll()
  }

  async function handlePinMessage(id: string) {
    const { error } = await supabase
      .from('admin_chat_messages')
      .update({ is_pinned: true, pinned_by: currentUser, pinned_at: new Date().toISOString() })
      .eq('id', id)
    if (error) console.error('Pin error:', error)
    else loadAll()
  }

  async function handleUnpinMessage(id: string) {
    const { error } = await supabase
      .from('admin_chat_messages')
      .update({ is_pinned: false, pinned_by: null, pinned_at: null })
      .eq('id', id)
    if (error) console.error('Unpin error:', error)
    else loadAll()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed right-4 bottom-4 z-[200] flex flex-col rounded-xl shadow-2xl overflow-hidden"
      style={{ width: 680, height: 520, border: '1px solid rgba(0,0,0,0.12)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 text-white shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-70">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
          </svg>
          <span className="text-sm font-semibold">Admin Chat</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xl leading-none transition-colors"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden bg-white">
        {/* Main chat area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Loading…</div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-sm text-red-500 px-4 text-center">{error}</div>
          ) : (
            <ChatFeed
              messages={messages}
              photoUrls={photoUrls}
              currentUser={currentUser}
              onPin={handlePinMessage}
              onUnpin={handleUnpinMessage}
              onVote={handleVote}
              onClosePoll={handleClosePoll}
              onPinPoll={handlePinPoll}
            />
          )}
          <ChatInput
            currentUser={currentUser}
            onSend={handleSend}
            onSendPhoto={handleSendPhoto}
            onPostPoll={handlePostPoll}
          />
        </div>

        {/* Sidebar */}
        <ChatSidebar
          messages={messages}
          polls={polls}
          photoUrls={photoUrls}
          currentUser={currentUser}
          onVote={handleVote}
          onClosePoll={handleClosePoll}
          onUnpinMessage={handleUnpinMessage}
        />
      </div>
    </div>
  )
}
