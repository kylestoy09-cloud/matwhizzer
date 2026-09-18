export type PollVote = {
  id: string
  poll_id: string
  user_email: string
  option_index: number
  created_at: string
}

export type ChatPoll = {
  id: string
  user_email: string
  question: string
  options: string[]
  allow_multiple_votes: boolean
  is_pinned: boolean
  is_closed: boolean
  created_at: string
  votes?: PollVote[]
}

export type ChatMessage = {
  id: string
  user_email: string
  content: string | null
  photo_url: string | null
  poll_id: string | null
  is_pinned: boolean
  pinned_by: string | null
  pinned_at: string | null
  created_at: string
  poll?: ChatPoll | null
}
