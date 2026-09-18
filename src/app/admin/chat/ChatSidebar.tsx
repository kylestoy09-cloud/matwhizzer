'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ChatMessage, ChatPoll, PollVote } from './types'

type Tab = 'pinned' | 'polls' | 'photos'
type DateFilter = 'week' | 'month' | 'year' | 'all'

function filterByDate<T extends { created_at: string }>(items: T[], filter: DateFilter): T[] {
  if (filter === 'all') return items
  const now = new Date()
  const cutoff = new Date()
  if (filter === 'week') cutoff.setDate(now.getDate() - 7)
  if (filter === 'month') cutoff.setMonth(now.getMonth() - 1)
  if (filter === 'year') cutoff.setFullYear(now.getFullYear() - 1)
  return items.filter(item => new Date(item.created_at) >= cutoff)
}

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function PollRow({ poll, currentUser, onVote, onClosePoll }: {
  poll: ChatPoll
  currentUser: string
  onVote: (pollId: string, optionIndex: number) => void
  onClosePoll: (pollId: string) => void
}) {
  const votes = poll.votes ?? []
  const totalVotes = votes.length
  const userVotes = votes.filter(v => v.user_email === currentUser).map(v => v.option_index)
  const hasVoted = userVotes.length > 0

  return (
    <div className="border border-slate-200 rounded-lg p-2.5 bg-white">
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="text-xs font-semibold text-slate-800 leading-tight">{poll.question}</p>
        <span className="text-[10px] text-slate-400 shrink-0">{fmt(poll.created_at)}</span>
      </div>
      <div className="space-y-1">
        {poll.options.map((opt, i) => {
          const count = votes.filter(v => v.option_index === i).length
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const voted = userVotes.includes(i)
          const canVote = !poll.is_closed && (poll.allow_multiple_votes ? !voted : !hasVoted)

          return (
            <button
              key={i}
              onClick={() => canVote ? onVote(poll.id, i) : undefined}
              disabled={!canVote}
              className={`w-full text-left rounded px-1.5 py-0.5 text-[11px] ${canVote ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'} ${voted ? 'ring-1 ring-blue-400' : ''}`}
            >
              <div className="flex justify-between mb-0.5">
                <span className={voted ? 'text-blue-600 font-medium' : 'text-slate-700'}>{opt}</span>
                {(hasVoted || poll.is_closed) && <span className="text-slate-400">{pct}%</span>}
              </div>
              {(hasVoted || poll.is_closed) && (
                <div className="h-0.5 bg-slate-100 rounded-full">
                  <div className={`h-full rounded-full ${voted ? 'bg-blue-400' : 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
                </div>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
        <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}{poll.is_closed ? ' · closed' : ''}</span>
        {poll.user_email === currentUser && !poll.is_closed && (
          <button onClick={() => onClosePoll(poll.id)} className="hover:text-slate-600">Close poll</button>
        )}
      </div>
    </div>
  )
}

type Props = {
  messages: ChatMessage[]
  polls: ChatPoll[]
  photoUrls: Map<string, string>
  currentUser: string
  onVote: (pollId: string, optionIndex: number) => void
  onClosePoll: (pollId: string) => void
  onUnpinMessage: (id: string) => void
}

export function ChatSidebar({ messages, polls, photoUrls, currentUser, onVote, onClosePoll, onUnpinMessage }: Props) {
  const [tab, setTab] = useState<Tab>('pinned')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')

  const pinnedMessages = filterByDate(messages.filter(m => m.is_pinned), dateFilter)
  const allPolls = filterByDate(polls, dateFilter)
  const photos = filterByDate(messages.filter(m => m.photo_url), dateFilter)

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'pinned', label: 'Pinned', count: pinnedMessages.length },
    { id: 'polls', label: 'Polls', count: allPolls.length },
    { id: 'photos', label: 'Photos', count: photos.length },
  ]

  const DATE_FILTERS: { id: DateFilter; label: string }[] = [
    { id: 'week', label: '7d' },
    { id: 'month', label: '30d' },
    { id: 'year', label: '1y' },
    { id: 'all', label: 'All' },
  ]

  return (
    <div className="w-56 border-l border-slate-200 flex flex-col bg-slate-50 shrink-0">
      {/* Tab bar */}
      <div className="flex border-b border-slate-200 shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors relative ${
              tab === t.id ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-0.5 text-[9px] bg-slate-300 text-slate-600 rounded-full px-1">
                {t.count}
              </span>
            )}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Date filter */}
      <div className="flex gap-1 px-2 py-1.5 border-b border-slate-200 shrink-0">
        {DATE_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setDateFilter(f.id)}
            className={`flex-1 py-0.5 text-[10px] rounded transition-colors ${
              dateFilter === f.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">

        {/* Pinned messages */}
        {tab === 'pinned' && (
          pinnedMessages.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center mt-4">No pinned messages</p>
          ) : pinnedMessages.map(msg => (
            <div key={msg.id} className="bg-white border border-slate-200 rounded-lg p-2">
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className="text-[10px] font-semibold text-slate-600">{msg.user_email.split('@')[0]}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">{fmt(msg.created_at)}</span>
                  <button
                    onClick={() => onUnpinMessage(msg.id)}
                    title="Unpin"
                    className="text-slate-400 hover:text-slate-600 text-xs leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
              {msg.content && <p className="text-xs text-slate-800 break-words">{msg.content}</p>}
              {msg.photo_url && photoUrls.get(msg.id) && (
                <Image
                  src={photoUrls.get(msg.id)!}
                  alt="pinned photo"
                  width={180}
                  height={120}
                  className="rounded mt-1 object-cover w-full"
                  unoptimized
                />
              )}
              {msg.poll && (
                <p className="text-xs text-slate-500 italic mt-1">📊 {msg.poll.question}</p>
              )}
            </div>
          ))
        )}

        {/* Polls */}
        {tab === 'polls' && (
          allPolls.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center mt-4">No polls yet</p>
          ) : allPolls.map(poll => (
            <PollRow
              key={poll.id}
              poll={poll}
              currentUser={currentUser}
              onVote={onVote}
              onClosePoll={onClosePoll}
            />
          ))
        )}

        {/* Photos */}
        {tab === 'photos' && (
          photos.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center mt-4">No photos yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {photos.map(msg => {
                const signedUrl = photoUrls.get(msg.id)
                if (!signedUrl) return null
                return (
                  <a key={msg.id} href={signedUrl} target="_blank" rel="noopener noreferrer">
                    <Image
                      src={signedUrl}
                      alt="shared photo"
                      width={100}
                      height={80}
                      className="rounded object-cover w-full h-16 border border-slate-200 hover:opacity-90 transition-opacity"
                      unoptimized
                    />
                  </a>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}
