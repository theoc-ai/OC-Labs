'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import InviteDialog from './InviteDialog'
import type { ProjectStatus } from '@/types'

interface Project {
  id: string
  title: string
  owner_id: string
  status: string | null
}

interface Props {
  projects: Project[]
}

const STATUS_TO_VARIANT: Record<ProjectStatus, 'blue' | 'amber' | 'red' | 'default' | 'green'> = {
  Idea: 'blue',
  'In Flight': 'amber',
  'On Hold': 'default',
  Complete: 'green',
}

function statusVariant(status: string | null): 'blue' | 'amber' | 'red' | 'default' | 'green' {
  if (!status) return 'default'
  return STATUS_TO_VARIANT[status as ProjectStatus] ?? 'default'
}

export default function ProjectAssignmentsPanel({ projects }: Props) {
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)

  function openProjectDialog(projectId: string) {
    setActiveProjectId(projectId)
    setDialogOpen(true)
  }

  function closeProjectDialog() {
    setDialogOpen(false)
    setActiveProjectId(undefined)
  }

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-zinc-800 text-sm">{project.title}</span>
              <Badge variant={statusVariant(project.status)}>
                {project.status ?? 'Unknown'}
              </Badge>
            </div>
            <button
              onClick={() => openProjectDialog(project.id)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Invite Member
            </button>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-zinc-400">
            No projects found.
          </div>
        )}
      </div>

      <InviteDialog
        isOpen={dialogOpen}
        onClose={closeProjectDialog}
        projectId={activeProjectId}
      />
    </section>
  )
}
