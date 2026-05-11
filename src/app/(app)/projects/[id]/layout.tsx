import { notFound } from 'next/navigation'
import { ProjectHeader } from '@/components/projects/ProjectHeader'
import { ProjectActions } from '@/components/projects/ProjectActions'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { ProjectChatPanel } from '@/components/chat/ProjectChatPanel'
import {
  canMemberRoleEditProjectContent,
  canMemberRoleReviewHandRaises,
  isPowerUser,
} from '@/lib/auth/permissions'
import {
  getAuthenticatedUser,
  getCachedPlatformRole,
  getCachedProject,
  getCachedUserMembership,
  getCachedUserVote,
} from '@/lib/data/project-queries'
import type { Project, MemberRole } from '@/types'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function ProjectLayout({ children, params }: LayoutProps) {
  const { id } = await params

  const user = await getAuthenticatedUser()

  const [project, userVote, userMembership, platformRole] = await Promise.all([
    getCachedProject(id),
    getCachedUserVote(id, user?.id ?? ''),
    getCachedUserMembership(id, user?.id ?? ''),
    user ? getCachedPlatformRole(user.id) : Promise.resolve<'user'>('user'),
  ])

  if (!project) notFound()

  const powerUser = isPowerUser(platformRole)
  const isOwner = project.owner_id === user?.id
  const canManageProject = isOwner || powerUser
  const membershipRole = (userMembership?.role ?? null) as MemberRole | null
  const hasVoted = !!userVote
  const hasRaisedHand = membershipRole === 'interested'
  const isChatMember = canManageProject || canMemberRoleEditProjectContent(membershipRole)
  const canViewHandRaises = isOwner || canMemberRoleReviewHandRaises(membershipRole)

  return (
    <div className="w-full space-y-6 pb-[28rem]">
      <ProjectHeader project={project as Project} isOwner={canManageProject} />

      <ProjectActions
        projectId={id}
        initialVoteCount={project.vote_count}
        initialHasVoted={hasVoted}
        initialHasRaisedHand={hasRaisedHand}
        initialMembershipRole={membershipRole}
        initialIsRecruiting={!!(project as Record<string, unknown>).is_recruiting}
        isOwner={canManageProject}
        canRecruit={canManageProject || membershipRole === 'tech_lead'}
      />

      <ProjectTabs projectId={id} canViewHandRaises={canViewHandRaises} />

      <div>{children}</div>

      {/* Persistent chat panel — visible to project members and power users */}
      {isChatMember && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pointer-events-none">
          <div className="mx-auto max-w-7xl pointer-events-auto">
            <ProjectChatPanel key={id} projectId={id} />
          </div>
        </div>
      )}
    </div>
  )
}
