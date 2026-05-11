'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { BoardToolbar } from './BoardToolbar'
import { avatarColor } from '@/lib/utils/avatar'
import type { Project, ProjectStatus } from '@/types'

const PAGE_SIZE = 20

interface ProjectWithOwner extends Project {
  owner_name: string
  team_members_preview: { id: string; name: string; profile_photo_url?: string | null }[]
}

interface FilterableBoardProps {
  projects: ProjectWithOwner[]
  votedProjectIds: string[]
  requestedProjectIds: string[]
  joinedProjectIds: string[]
}

export function FilterableBoard({
  projects,
  votedProjectIds,
  requestedProjectIds,
  joinedProjectIds,
}: FilterableBoardProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | null>(null)
  const [page, setPage] = useState(1)
  const [localVotes, setLocalVotes] = useState<Record<string, { hasVoted: boolean; voteCount: number }>>({})
  const [localRequestedByProject, setLocalRequestedByProject] = useState<Record<string, true>>({})
  const [localJoinedByProject, setLocalJoinedByProject] = useState<Record<string, true>>({})
  const [joinPendingByProject, setJoinPendingByProject] = useState<Record<string, boolean>>({})
  const [joinErrorByProject, setJoinErrorByProject] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const handleStatusChange = useCallback((status: ProjectStatus | null) => {
    setStatusFilter(status)
    setPage(1)
  }, [])

  useEffect(() => {
    setLocalRequestedByProject({})
    setLocalJoinedByProject({})
    setJoinPendingByProject({})
    setJoinErrorByProject({})
  }, [requestedProjectIds, joinedProjectIds])

  const hasVotedMap = useMemo(
    () => Object.fromEntries(votedProjectIds.map((id) => [id, true])) as Record<string, boolean>,
    [votedProjectIds]
  )

  const voteCountMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.vote_count])) as Record<string, number>,
    [projects]
  )

  const filtered = useMemo(() => {
    let result = projects
    if (statusFilter) {
      result = result.filter((p) => p.status === statusFilter)
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.summary ?? '').toLowerCase().includes(q) ||
          (p.brand ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [projects, statusFilter, debouncedSearch])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <BoardToolbar
        search={search}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
      />

      {paginated.length === 0 ? (
        <div className="py-20 text-center text-zinc-500">
          No projects match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginated.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              title={project.title}
              brand={project.brand ?? ''}
              status={project.status}
              desc={project.summary ?? ''}
              skills={project.skills_needed}
              owner={{
                id: project.owner_id ?? '',
                name: project.owner_name,
                avatarColor: avatarColor(project.owner_id ?? ''),
              }}
              teamMembers={project.team_members_preview.map((member) => ({
                id: member.id,
                name: member.name,
                profilePhotoUrl: member.profile_photo_url ?? null,
              }))}
              voteCount={localVotes[project.id]?.voteCount ?? project.vote_count}
              hasVoted={localVotes[project.id]?.hasVoted ?? hasVotedMap[project.id] ?? false}
              hasJoined={joinedProjectIds.includes(project.id) || !!localJoinedByProject[project.id]}
              hasRaisedHand={requestedProjectIds.includes(project.id) || !!localRequestedByProject[project.id]}
              joinPending={!!joinPendingByProject[project.id]}
              joinError={joinErrorByProject[project.id] ?? null}
              isRecruiting={project.is_recruiting}
              onVote={async () => {
                const projectId = project.id
                const currentVoted = localVotes[projectId]?.hasVoted ?? hasVotedMap[projectId] ?? false
                const currentCount = localVotes[projectId]?.voteCount ?? voteCountMap[projectId] ?? 0
                setLocalVotes(prev => ({
                  ...prev,
                  [projectId]: {
                    hasVoted: !currentVoted,
                    voteCount: currentVoted ? currentCount - 1 : currentCount + 1,
                  },
                }))
                try {
                  const res = await fetch(`/api/v1/projects/${projectId}/vote`, { method: 'POST' })
                  const data = (await res.json().catch(() => null)) as { hasVoted?: boolean; voteCount?: number } | null
                  if (res.ok && data?.hasVoted !== undefined && data?.voteCount !== undefined) {
                    setLocalVotes(prev => ({
                      ...prev,
                      [projectId]: { hasVoted: data.hasVoted!, voteCount: data.voteCount! },
                    }))
                  } else {
                    setLocalVotes(prev => ({
                      ...prev,
                      [projectId]: { hasVoted: currentVoted, voteCount: currentCount },
                    }))
                  }
                } catch {
                  setLocalVotes(prev => ({
                    ...prev,
                    [projectId]: { hasVoted: currentVoted, voteCount: currentCount },
                  }))
                }
              }}
              onJoin={async () => {
                if (
                  joinPendingByProject[project.id] ||
                  requestedProjectIds.includes(project.id) ||
                  joinedProjectIds.includes(project.id) ||
                  localRequestedByProject[project.id] ||
                  localJoinedByProject[project.id]
                ) {
                  return
                }

                setJoinPendingByProject((prev) => ({ ...prev, [project.id]: true }))
                setJoinErrorByProject((prev) => {
                  const next = { ...prev }
                  delete next[project.id]
                  return next
                })

                try {
                  const res = await fetch(`/api/v1/projects/${project.id}/raise-hand`, { method: 'POST' })
                  const data = (await res.json().catch(() => null)) as
                    | { membershipRole?: string | null; alreadyRequested?: boolean; alreadyMember?: boolean; error?: string }
                    | null

                  if (!res.ok) {
                    setJoinErrorByProject((prev) => ({
                      ...prev,
                      [project.id]: data?.error ?? 'Unable to submit your request right now.',
                    }))
                    return
                  }

                  if (data?.membershipRole === 'interested' || data?.alreadyRequested) {
                    setLocalRequestedByProject((prev) => ({ ...prev, [project.id]: true }))
                  }

                  if (
                    data?.alreadyMember ||
                    (data?.membershipRole !== undefined &&
                      data?.membershipRole !== null &&
                      data.membershipRole !== 'interested')
                  ) {
                    setLocalJoinedByProject((prev) => ({ ...prev, [project.id]: true }))
                  }
                } catch {
                  setJoinErrorByProject((prev) => ({
                    ...prev,
                    [project.id]: 'Network error while sending your request.',
                  }))
                } finally {
                  setJoinPendingByProject((prev) => ({ ...prev, [project.id]: false }))
                }
              }}
              onClick={() => router.push(`/projects/${project.id}`)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 disabled:opacity-40 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 disabled:opacity-40 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
