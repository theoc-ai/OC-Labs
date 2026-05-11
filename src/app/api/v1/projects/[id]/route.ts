import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { canEditProjectSettings, canDeleteProject } from '@/lib/auth/permissions'
import { notifyHubSync, notifyHubWebhook } from '@/lib/hub-sync'
import type { ProjectStatus } from '@/types'

const VALID_STATUSES: ProjectStatus[] = ['Idea', 'In Flight', 'On Hold', 'Complete']

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await canEditProjectSettings(supabase, user.id, id)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : undefined
  if (title !== undefined && !title) {
    return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (title) updates.title = title
  if (typeof body.summary === 'string') updates.summary = body.summary
  if (VALID_STATUSES.includes(body.status as ProjectStatus)) updates.status = body.status
  if (Array.isArray(body.skills_needed)) updates.skills_needed = body.skills_needed
  if (Array.isArray(body.github_repos)) updates.github_repos = body.github_repos
  if (typeof body.notion_url === 'string') updates.notion_url = body.notion_url
  if (typeof body.stream === 'string') updates.stream = body.stream
  if (typeof body.category === 'string') updates.category = body.category || null
  if (typeof body.priority === 'string') updates.priority = body.priority
  if (Array.isArray(body.contributing_opcos)) updates.contributing_opcos = body.contributing_opcos
  if (Array.isArray(body.tags)) updates.tags = body.tags

  const { data: project, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !project) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  }

  notifyHubWebhook(project as Record<string, unknown>)
  return NextResponse.json(project)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', id)
    .maybeSingle()

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 })
  }

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const allowed = await canDeleteProject(supabase, user.id, id)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // Body is required for destructive confirmation.
  }

  const confirmation = typeof body.confirmation === 'string' ? body.confirmation.trim() : ''
  const normalizedConfirmation = confirmation.toLocaleLowerCase()
  const projectTitle = typeof project.title === 'string' ? project.title.trim() : ''
  const normalizedProjectTitle = projectTitle.toLocaleLowerCase()

  if (!confirmation || (normalizedConfirmation !== 'delete' && normalizedConfirmation !== normalizedProjectTitle)) {
    return NextResponse.json(
      {
        error: 'Type DELETE or the exact project name to confirm deletion.',
      },
      { status: 400 }
    )
  }

  const { error: deleteError } = await supabase.from('projects').delete().eq('id', id)
  if (deleteError) {
    const status = deleteError.code === '42501' ? 403 : 500
    return NextResponse.json({ error: deleteError.message }, { status })
  }

  notifyHubSync()
  return new NextResponse(null, { status: 204 })
}
