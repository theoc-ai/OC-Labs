import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifyNewProject } from '@/lib/notifications/slack-events'
import { createEpic } from '@/lib/jira/client'
import { canCreateProject, getPlatformRole, isPowerUser } from '@/lib/auth/permissions'
import { notifyHubSync } from '@/lib/hub-sync'
import type { ProjectStatus } from '@/types'

const VALID_STATUSES: ProjectStatus[] = ['Idea', 'In progress', 'Needs help', 'Paused', 'Shipped']

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await canCreateProject(supabase, user.id)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const role = await getPlatformRole(supabase, user.id)
  const powerUser = isPowerUser(role)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const status: ProjectStatus = powerUser
    ? (
      VALID_STATUSES.includes(body.status as ProjectStatus)
        ? (body.status as ProjectStatus)
        : 'Idea'
    )
    : 'Idea'

  const submissionStatus = powerUser ? 'approved' : 'pending_review'

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      title,
      summary: typeof body.summary === 'string' ? body.summary : null,
      status,
      submission_status: submissionStatus,
      owner_id: user.id,
      skills_needed: Array.isArray(body.skills_needed) ? body.skills_needed : [],
      github_repos: Array.isArray(body.github_repos) ? body.github_repos : [],
      notion_url: typeof body.notion_url === 'string' ? body.notion_url : null,
      needs_help: false,
      vote_count: 0,
    })
    .select()
    .single()

  if (error || !project) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  // Add owner as project member
  await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: user.id,
    role: 'owner',
  })

  // Fetch owner name for Slack notification
  const { data: ownerProfile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single()

  if (submissionStatus === 'approved') {
    // Notify Hub sync — fire and forget
    notifyHubSync()

    // Notify Slack — fire and forget
    notifyNewProject(
      project.id,
      project.title,
      ownerProfile?.name ?? user.email ?? 'Unknown'
    ).catch((err) => console.error('Slack notify failed:', err))

    // Create Jira Epic — fire and forget, never fail project creation.
    // Uses supabaseAdmin for the follow-up UPDATE to avoid cookie-context
    // issues inside the async callback.
    if (process.env.JIRA_BASE_URL && process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN && process.env.JIRA_PROJECT_KEY) {
      createEpic(project.title)
        .then((epicKey) =>
          supabaseAdmin
            .from('projects')
            .update({ jira_epic_key: epicKey })
            .eq('id', project.id)
        )
        .catch((err) => console.error('Jira create epic failed:', err))
    }
  }

  return NextResponse.json(project, { status: 201 })
}
