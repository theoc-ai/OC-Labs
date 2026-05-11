'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import type { MemberRole } from '@/types'

interface ProjectActionsProps {
  projectId: string
  initialVoteCount: number
  initialHasVoted: boolean
  initialHasRaisedHand: boolean
  initialMembershipRole: MemberRole | null
  initialIsRecruiting: boolean
  isOwner: boolean
  canRecruit: boolean
}

export function ProjectActions({
  projectId,
  initialVoteCount,
  initialHasVoted,
  initialHasRaisedHand,
  initialMembershipRole,
  initialIsRecruiting,
  isOwner,
  canRecruit,
}: ProjectActionsProps) {
  const [voteCount, setVoteCount] = useState(initialVoteCount)
  const [hasVoted, setHasVoted] = useState(initialHasVoted)
  const [hasRaisedHand, setHasRaisedHand] = useState(initialHasRaisedHand)
  const [membershipRole, setMembershipRole] = useState<MemberRole | null>(initialMembershipRole)
  const [isRecruiting, setIsRecruiting] = useState(initialIsRecruiting)
  const [recruitPending, setRecruitPending] = useState(false)
  const [votePending, setVotePending] = useState(false)
  const [joinPending, setJoinPending] = useState(false)
  const isApprovedMember = membershipRole !== null && membershipRole !== 'interested'

  async function handleVote() {
    if (votePending) return
    // Capture pre-toggle state so revert branches use the correct direction
    const wasVoted = hasVoted
    // Optimistic update
    setHasVoted(!wasVoted)
    setVoteCount((c) => (wasVoted ? c - 1 : c + 1))
    setVotePending(true)
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/vote`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setVoteCount(data.voteCount)
        setHasVoted(data.hasVoted)
      } else {
        // Revert on error
        setHasVoted(wasVoted)
        setVoteCount((c) => (wasVoted ? c + 1 : c - 1))
      }
    } catch {
      setHasVoted(wasVoted)
      setVoteCount((c) => (wasVoted ? c + 1 : c - 1))
    } finally {
      setVotePending(false)
    }
  }

  async function handleRaiseHand() {
    if (joinPending || hasRaisedHand) return

    const previousHasRaisedHand = hasRaisedHand
    const previousMembershipRole = membershipRole
    setHasRaisedHand(true)
    setMembershipRole('interested')
    setJoinPending(true)

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/raise-hand`, { method: 'POST' })
      if (!res.ok) {
        setHasRaisedHand(previousHasRaisedHand)
        setMembershipRole(previousMembershipRole)
        return
      }

      const data = (await res.json()) as { membershipRole?: MemberRole | null }
      if (data.membershipRole !== undefined) {
        setMembershipRole(data.membershipRole)
        setHasRaisedHand(data.membershipRole === 'interested')
      }
    } catch {
      setHasRaisedHand(previousHasRaisedHand)
      setMembershipRole(previousMembershipRole)
    } finally {
      setJoinPending(false)
    }
  }

  async function handleToggleRecruiting() {
    if (recruitPending) return
    const prev = isRecruiting
    setIsRecruiting(!prev)
    setRecruitPending(true)
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/needs-help`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setIsRecruiting(data.isRecruiting)
      } else {
        setIsRecruiting(prev)
      }
    } catch {
      setIsRecruiting(prev)
    } finally {
      setRecruitPending(false)
    }
  }

  async function handleWithdrawHand() {
    if (joinPending || !hasRaisedHand) return

    setJoinPending(true)

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/raise-hand`, { method: 'DELETE' })
      if (!res.ok) return

      const data = (await res.json()) as { membershipRole?: MemberRole | null }
      if (data.membershipRole !== undefined) {
        setMembershipRole(data.membershipRole)
        setHasRaisedHand(data.membershipRole === 'interested')
      }
    } finally {
      setJoinPending(false)
    }
  }

  return (
    <div className="flex gap-3">
      {canRecruit && (
        <button
          onClick={handleToggleRecruiting}
          disabled={recruitPending}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            isRecruiting
              ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          )}
        >
          {recruitPending ? 'Saving…' : isRecruiting ? 'Recruiting ✓' : 'Mark as Recruiting'}
        </button>
      )}
      <button
        onClick={handleVote}
        disabled={votePending}
        className={cn(
          'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
          hasVoted
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
        )}
      >
        ▲ {hasVoted ? 'Voted' : 'Vote'} ({voteCount})
      </button>

      {!isOwner && !isApprovedMember && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleRaiseHand}
            disabled={joinPending || hasRaisedHand}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              hasRaisedHand
                ? 'cursor-default bg-emerald-100 text-emerald-700'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            )}
          >
            {joinPending
              ? hasRaisedHand
                ? 'Saving...'
                : 'Submitting...'
              : hasRaisedHand
                ? 'Request sent ✓'
                : 'Raise Hand'}
          </button>

          {hasRaisedHand && (
            <button
              type="button"
              onClick={handleWithdrawHand}
              disabled={joinPending}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {joinPending ? 'Withdrawing...' : 'Withdraw'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
