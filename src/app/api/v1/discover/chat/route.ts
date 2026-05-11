import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notifyNewProject } from '@/lib/notifications/slack-events'
import { createEpic } from '@/lib/jira/client'
import { canCreateProject, getPlatformRole, isPowerUser } from '@/lib/auth/permissions'
import type { ProjectStatus } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const POWER_USER_SYSTEM_PROMPT = `You are the OC Labs new-project assistant. Your sole purpose is helping the user create a new project on the OC Labs discovery board through a friendly, focused conversation.

Collect these details through natural conversation:
- **Title** (required): The project name
- **Summary**: What the project is and why it matters
- **Status**: Idea / In Flight / On Hold / Complete (default: Idea)
- **Skills needed**: Tags such as frontend, backend/integrations, AI/LLM, data/analytics, product/design, governance/workflow
- **GitHub repos**: Repository URLs (optional)
- **Notion URL**: Workspace or doc link (optional)
- **Tentative team members**: Who they'd like involved — note that you'll collect names but they'll be able to add members from the project page after creation

Once you have at least a title and the user signals they're ready, call the create_project tool. After successful creation, congratulate the user and include a markdown link to the project: [View your project](/projects/{id}).

GUARDRAILS — when these topics come up, respond with the exact guidance below and return to project creation:
- Questions about an existing project → "To work with that project, head to its project page — there's a dedicated assistant there. I'm here to help you create a new one."
- Profile or settings questions → "That's handled on the Profile or Settings page — you can get there from the top menu."
- Voting, joining, or browsing questions → "You can vote and join projects directly from the board above. I'm here to help you create a new project."
- Anything else off-topic → "I'm focused on helping you create a new project. Is there a project idea you'd like to add to OC Labs?"

Keep responses concise and conversational. Ask one or two questions at a time.`

const BASIC_USER_SYSTEM_PROMPT = `You are the OC Labs idea assistant. Your purpose is helping Omnia Collective members shape and submit project ideas for review by the OC Labs team.

Before submitting, guide the user through a short vetting conversation. Ask one or two questions at a time — never all at once. Cover these areas:
1. **What's the idea?** Title and a brief description of what it is.
2. **What problem does it solve?** What pain point or opportunity does this address?
3. **Who benefits?** Which teams, roles, or people across the Collective would use or gain from this?
4. **Why now?** Is there something making this timely or urgent?
5. **Skills likely needed**: Tags such as frontend, backend/integrations, AI/LLM, data/analytics, product/design, governance/workflow (optional but helpful).
6. **Any supporting links**: GitHub repos, Notion docs, or other context (all optional).

Once you have a title, summary, problem statement, and the user is satisfied, call the create_project tool to submit. The status should always be 'Idea' for submitted ideas. After submission, tell the user: "Your idea has been submitted for review! A power user will vet it before it's published to Discover. You can [view your submission](/projects/{id}) in the meantime."

GUARDRAILS — when these topics come up, respond with the exact guidance below and return to idea submission:
- Questions about an existing project → "To work with that project, head to its project page. I'm here to help you submit a new idea."
- Profile or settings questions → "That's handled on the Profile or Settings page — you can get there from the top menu."
- Voting, joining, or browsing questions → "You can vote and join projects directly from the board above. I'm here to help you submit an idea."
- Anything else off-topic → "I'm focused on helping you put forward a project idea. Do you have something you'd like to submit?"

Keep responses warm and concise. This is the user's first step — make it easy.`

const VALID_STATUSES: ProjectStatus[] = ['Idea', 'In Flight', 'On Hold', 'Complete']

const CREATE_PROJECT_TOOL: Anthropic.Tool = {
  name: 'create_project',
  description:
    'Create a new project on OC Labs once sufficient details have been collected and the user is ready to proceed.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Project name (required)' },
      summary: { type: 'string', description: 'Brief description of the project' },
      status: {
        type: 'string',
        enum: ['Idea', 'In Flight', 'On Hold', 'Complete'],
        description: 'Current project status',
      },
      skills_needed: {
        type: 'array',
        items: { type: 'string' },
        description: 'Skill or tag labels needed for the project',
      },
      github_repos: {
        type: 'array',
        items: { type: 'string' },
        description: 'GitHub repository URLs',
      },
      notion_url: { type: 'string', description: 'Notion workspace or doc URL' },
    },
    required: ['title'],
  },
}

interface History {
  role: 'user' | 'assistant'
  content: string
}

async function createProject(
  input: Record<string, unknown>,
  userId: string,
  userEmail: string,
  powerUser: boolean
): Promise<{ id: string; title: string } | { error: string }> {
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) return { error: 'title is required' }

  const status: ProjectStatus = powerUser
    ? (
      VALID_STATUSES.includes(input.status as ProjectStatus)
        ? (input.status as ProjectStatus)
        : 'Idea'
    )
    : 'Idea'
  const submissionStatus = powerUser ? 'approved' : 'pending_review'

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .insert({
      title,
      summary: typeof input.summary === 'string' ? input.summary : null,
      status,
      submission_status: submissionStatus,
      owner_id: userId,
      skills_needed: Array.isArray(input.skills_needed) ? input.skills_needed : [],
      github_repos: Array.isArray(input.github_repos) ? input.github_repos : [],
      notion_url: typeof input.notion_url === 'string' ? input.notion_url : null,
      is_recruiting: false,
      vote_count: 0,
    })
    .select()
    .single()

  if (error || !project) return { error: error?.message ?? 'Insert failed' }

  await supabaseAdmin.from('project_members').insert({
    project_id: project.id,
    user_id: userId,
    role: 'owner',
  })

  if (submissionStatus === 'approved') {
    notifyNewProject(project.id, project.title, userEmail).catch(() => {})

    if (
      process.env.JIRA_BASE_URL &&
      process.env.JIRA_EMAIL &&
      process.env.JIRA_API_TOKEN &&
      process.env.JIRA_PROJECT_KEY
    ) {
      createEpic(project.title)
        .then((epicKey) =>
          supabaseAdmin.from('projects').update({ jira_epic_key: epicKey }).eq('id', project.id)
        )
        .catch(() => {})
    }
  }

  return { id: project.id, title: project.title }
}

export async function POST(req: NextRequest): Promise<Response> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })
  const authedUser = user

  const platformRole = await getPlatformRole(supabase, authedUser.id)
  const powerUser = isPowerUser(platformRole)
  const systemPrompt = powerUser ? POWER_USER_SYSTEM_PROMPT : BASIC_USER_SYSTEM_PROMPT

  let body: { message?: unknown; history?: unknown }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return new Response('message is required', { status: 400 })

  const history: History[] = Array.isArray(body.history)
    ? (body.history as History[]).filter(
        (h) =>
          (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string'
      )
    : []

  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: message },
  ]

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  async function run() {
    try {
      const stream = client.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        tools: [CREATE_PROJECT_TOOL],
        messages,
      })

      let toolUseBlock: Anthropic.ToolUseBlock | null = null

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          await writer.write(encoder.encode(event.delta.text))
        }
      }

      const finalMsg = await stream.finalMessage()

      // Detect tool use in the final message content
      for (const block of finalMsg.content) {
        if (block.type === 'tool_use') {
          toolUseBlock = block
          break
        }
      }

      if (finalMsg.stop_reason === 'tool_use' && toolUseBlock) {
        const permitted = await canCreateProject(supabase, authedUser.id)

        let result: { id: string; title: string } | { error: string }
        if (!permitted) {
          result = { error: 'You do not have permission to create projects.' }
        } else {
          result = await createProject(
            toolUseBlock.input as Record<string, unknown>,
            authedUser.id,
            authedUser.email ?? 'Unknown',
            powerUser
          )
        }

        const toolResultContent =
          'error' in result
            ? `Error: ${result.error}`
            : JSON.stringify({
                success: true,
                project_id: result.id,
                title: result.title,
                url: `/projects/${result.id}`,
              })

        const followUpMessages: Anthropic.MessageParam[] = [
          ...messages,
          { role: 'assistant' as const, content: finalMsg.content },
          {
            role: 'user' as const,
            content: [
              {
                type: 'tool_result' as const,
                tool_use_id: toolUseBlock.id,
                content: toolResultContent,
              },
            ],
          },
        ]

        const followUp = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: systemPrompt,
          tools: [CREATE_PROJECT_TOOL],
          messages: followUpMessages,
        })

        for await (const event of followUp) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            await writer.write(encoder.encode(event.delta.text))
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      await writer.write(encoder.encode(msg))
    } finally {
      await writer.close()
    }
  }

  run()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
