import type { Metadata } from 'next'
import { ClaimForm } from '@/components/challenge/ChallengeExtras'

// Where a Daily Challenge winner's email sends them: their shirt size and mailing address (Kyle 2026-11-12).
// Shows only to the signed-in winner; nothing links here but the email.
export const metadata: Metadata = { title: 'Claim your prize', robots: { index: false } }

export default function ClaimPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold mb-4">Daily Challenge prize</h1>
      <ClaimForm />
      <p className="text-sm text-slate-500 mt-4">Nothing to claim? Prizes show here for the account that won, once you&apos;re signed in.</p>
    </div>
  )
}
