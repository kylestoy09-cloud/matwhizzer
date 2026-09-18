'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import type { ChatMessage, ChatPoll, PollVote } from './types'

function initials(email: string) {
  const name = email.split('@')[0]
  return name.slice(0, 2).toUpperCase()
}

function avatar(email: string) {
  const colors = ['bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-rose-500','bg-teal-500']
  const idx = email.charCodeAt(0) % colors.length
  return colors[idx]
}

function fmt(ts: string) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function PollCard({
  poll,
  currentUser,
  onVote,
  onClosePoll,
  onPinPoll,
}: {
  poll: ChatPoll
  currentUser: string
  onVote: (pollId: string, optionIndex: number) => void
  onClosePoll: (pollId: string) => void
  onPinPoll: (pollId: string) => void
}) {
  const votes = poll.votes ?? []
  const totalVotes = votes.length
  const userVotes = votes.filter(v => v.user_email === currentUser).map(v => v.option_index)
  const hasVoted = userVotes.length > 0

  function voteCount(i: number) {
    return votes.filter(v => v.option_index === i).length
  }

  function canVote(i: number) {
    if (poll.is_closed) return false
    if (!poll.allow_multiple_votes && hasVoted) return false
    if (poll.allow_multiple_votes && userVotes.includes(i)) return false
    return true
  }

  const isOwner = poll.user_email === currentUser

  return (
    <div className="mt-1 border border-slate-200 rounded-lg bg-white p-3 max-w-xs">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-slate-800 leading-tight">{poll.question}</p>
        {poll.is_pinned && <span title="Pinned" className="text-slate-400 shrink-0">📌</span>}
      </div>

      <div className="space-y-1.5 mb-2">
        {poll.options.map((opt, i) => {
          const count = voteCount(i)
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const voted = userVotes.includes(i)

          return (
            <button
              key={i}
              onClick={() => canVote(i) ? onVote(poll.id, i) : undefined}
              disabled={!canVote(i)}
              className={`w-full text-left rounded px-2 py-1 text-xs transition-colors ${
                canVote(i) ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'
              } ${voted ? 'ring-1 ring-blue-400' : ''}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`font-medium ${voted ? 'text-blue-600' : 'text-slate-700'}`}>{opt}</span>
                {(hasVoted || poll.is_closed) && <span className="text-slate-500">{count} ({pct}%)</span>}
              </div>
              {(hasVoted || poll.is_closed) && (
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${voted ? 'bg-blue-400' : 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''} {poll.allow_multiple_votes ? '· multi-vote' : ''} {poll.is_closed ? '· closed' : ''}</span>
        {isOwner && !poll.is_closed && (
          <button onClick={() => onClosePoll(poll.id)} className="hover:text-slate-600">Close</button>
        )}
        {!poll.is_pinned && (
          <button onClick={() => onPinPoll(poll.id)} className="hover:text-slate-600 ml-2">Pin</button>
        )}
      </div>
    </div>
  )
}

type Props = {
  messages: ChatMessage[]
  photoUrls: Map<string, string>
  currentUser: string
  onPin: (id: string) => void
  onUnpin: (id: string) => void
  onVote: (pollId: string, optionIndex: number) => void
  onClosePoll: (pollId: string) => void
  onPinPoll: (pollId: string) => void
}

export function ChatFeed({ messages, photoUrls, currentUser, onPin, onUnpin, onVote, onClosePoll, onPinPoll }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
        No messages yet. Say something!
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      {messages.map(msg => {
        const isMine = msg.user_email === currentUser
        return (
          <div key={msg.id} className="group flex gap-2.5">
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold ${avatar(msg.user_email)}`}>
              {initials(msg.user_email)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-semibold text-slate-700">{msg.user_email.split('@')[0]}</span>
                <span className="text-[10px] text-slate-400">{fmt(msg.created_at)}</span>
                {msg.is_pinned && <span className="text-[10px] text-slate-400">📌</span>}
              </div>

              {msg.content && (
                <p className="text-sm text-slate-800 leading-relaxed break-words">{msg.content}</p>
              )}

              {msg.photo_url && photoUrls.get(msg.id) && (
                <a href={photoUrls.get(msg.id)} target="_blank" rel="noopener noreferrer" className="block mt-1">
                  <Image
                    src={photoUrls.get(msg.id)!}
                    alt="shared photo"
                    width={200}
                    height={150}
                    className="rounded-lg object-cover max-h-48 w-auto border border-slate-200"
                    unoptimized
                  />
                </a>
              )}

              {msg.poll && (
                <PollCard
                  poll={msg.poll}
                  currentUser={currentUser}
                  onVote={onVote}
                  onClosePoll={onClosePoll}
                  onPinPoll={onPinPoll}
                />
              )}
            </div>

            {/* Hover actions */}
            <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 pt-0.5 transition-opacity">
              <button
                onClick={() => msg.is_pinned ? onUnpin(msg.id) : onPin(msg.id)}
                title={msg.is_pinned ? 'Unpin' : 'Pin'}
                className="text-slate-400 hover:text-slate-700 text-xs px-1 py-0.5 rounded hover:bg-slate-100"
              >
                {msg.is_pinned ? '📌' : '📍'}
              </button>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
