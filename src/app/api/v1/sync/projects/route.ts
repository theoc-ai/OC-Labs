import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const SYNC_SECRET = process.env.OMNIA_HUB_SYNC_SECRET

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization') ?? ''
  if (!SYNC_SECRET || auth !== `Bearer ${SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = supabaseAdmin

  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      summary,
      status,
      brand,
      skills_needed,
      stream,
      category,
      priority,
      contributing_opcos,
      tags,
      created_at,
      updated_at,
      owner:users!owner_id (
        id,
        name,
        email
      )
    `)
    .in('status', ['In progress', 'Needs help'])
    .eq('submission_status', 'approved')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  return NextResponse.json({ projects: data ?? [] })
}
