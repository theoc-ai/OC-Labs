import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { canEditProjectSettings } from '@/lib/auth/permissions'
import { notifyNeedsHelp } from '@/lib/notifications/slack'
import { notifyHubSync } from '@/lib/hub-sync'

export async function POST(
  _req: NextRequest,
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

  const { data: project } = await supabase
    .from('projects')
    .select('title, needs_help, skills_needed, users!projects_owner_id_fkey(name)')
    .eq('id', id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const newValue = !project.needs_help

  const { error } = await supabase
    .from('projects')
    .update({ needs_help: newValue })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify Slack when toggled on — fire and forget
  if (newValue) {
    type OwnerRow = { name?: string } | { name?: string }[] | null
    const ownerRecord = project.users as OwnerRow
    const ownerName = Array.isArray(ownerRecord)
      ? (ownerRecord[0]?.name ?? 'Unknown')
      : (ownerRecord?.name ?? 'Unknown')

    notifyNeedsHelp(project.title, ownerName, project.skills_needed ?? []).catch((err) =>
      console.error('Slack notify failed:', err)
    )
  }

  notifyHubSync()
  return NextResponse.json({ needsHelp: newValue })
}
