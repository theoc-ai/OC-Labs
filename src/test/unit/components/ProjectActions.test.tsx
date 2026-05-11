/**
 * Unit tests for src/components/projects/ProjectActions.tsx
 *
 * Covers the stale-closure vote revert fix (#10): when the API call fails,
 * voteCount must revert to its original value, not drift by 2.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectActions } from '@/components/projects/ProjectActions'

// ---- helpers ---------------------------------------------------------------

function setup(overrides: Partial<Parameters<typeof ProjectActions>[0]> = {}) {
  const props = {
    projectId: 'proj-1',
    initialVoteCount: 5,
    initialHasVoted: false,
    initialHasRaisedHand: false,
    initialMembershipRole: null,
    initialIsRecruiting: false,
    isOwner: false,
    canRecruit: false,
    ...overrides,
  }
  render(<ProjectActions {...props} />)
}

function voteButton() {
  return screen.getByRole('button', { name: /vote/i })
}

// ---- tests -----------------------------------------------------------------

describe('ProjectActions — vote button', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the initial vote count', () => {
    setup({ initialVoteCount: 7 })
    expect(voteButton()).toHaveTextContent('7')
  })

  it('optimistically increments count and confirms from server response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ voteCount: 6, hasVoted: true }), { status: 200 })
    )
    setup({ initialVoteCount: 5, initialHasVoted: false })

    await userEvent.click(voteButton())

    await waitFor(() => expect(voteButton()).toHaveTextContent('6'))
    expect(voteButton()).toHaveTextContent('Voted')
  })

  it('reverts count to original value when the API call fails (not off-by-2)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 500 })
    )
    setup({ initialVoteCount: 5, initialHasVoted: false })

    await userEvent.click(voteButton())

    // After revert, count must be back to 5 — not 3 (the stale-closure bug)
    await waitFor(() => expect(voteButton()).toHaveTextContent('5'))
    expect(voteButton()).not.toHaveTextContent('Voted')
  })

  it('reverts correctly when un-voting fails (was voted, count was 5)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 500 })
    )
    setup({ initialVoteCount: 5, initialHasVoted: true })

    await userEvent.click(voteButton())

    // Optimistic: count drops to 4. On failure: must revert to 5, not 7.
    await waitFor(() => expect(voteButton()).toHaveTextContent('5'))
    expect(voteButton()).toHaveTextContent('Voted')
  })

  it('reverts count when fetch throws a network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))
    setup({ initialVoteCount: 5, initialHasVoted: false })

    await userEvent.click(voteButton())

    await waitFor(() => expect(voteButton()).toHaveTextContent('5'))
    expect(voteButton()).not.toHaveTextContent('Voted')
  })
})

describe('ProjectActions — join button', () => {
  it('is hidden when isOwner is true', () => {
    setup({ isOwner: true })
    expect(screen.queryByRole('button', { name: /raise hand/i })).not.toBeInTheDocument()
  })

  it('shows Raise Hand when not joined', () => {
    setup({ initialHasRaisedHand: false })
    expect(screen.getByRole('button', { name: /raise hand/i })).toBeInTheDocument()
  })

  it('shows Request sent and Withdraw when already raised', () => {
    setup({ initialHasRaisedHand: true, initialMembershipRole: 'interested' })
    expect(screen.getByRole('button', { name: /request sent/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /withdraw/i })).toBeInTheDocument()
  })

  it('hides raise hand when already an approved member', () => {
    setup({ initialMembershipRole: 'contributor' })
    expect(screen.queryByRole('button', { name: /raise hand/i })).not.toBeInTheDocument()
  })
})
