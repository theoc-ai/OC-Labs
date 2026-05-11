import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { canEditProjectSettings, getPlatformRole, isPowerUser as checkPowerUser } from '@/lib/auth/permissions'
import { ProjectForm } from '@/components/projects/ProjectForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: project }, allowed, platformRole] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    canEditProjectSettings(supabase, user.id, id),
    getPlatformRole(supabase, user.id),
  ])

  if (!project) notFound()
  if (!allowed) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-zinc-900 dark:text-zinc-50">Edit project</h1>
        <p className="mt-1 text-sm text-zinc-500">{project.title}</p>
      </div>
      <ProjectForm mode="edit" projectId={id} initial={project} isPowerUser={checkPowerUser(platformRole)} />
    </div>
  )
}
