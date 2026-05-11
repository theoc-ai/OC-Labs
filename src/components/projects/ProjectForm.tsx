'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Project, ProjectStatus } from '@/types'

const ALL_STATUSES: ProjectStatus[] = ['Idea', 'In progress', 'Needs help', 'Paused', 'Shipped']

const HUB_STREAMS = [
  { value: 'internal_rnd',         label: 'Internal R&D' },
  { value: 'client_work',          label: 'Client Work' },
  { value: 'licensable_solution',  label: 'Licensable' },
  { value: 'marketing_collateral', label: 'Marketing Collateral' },
  { value: 'internal_tool',        label: 'Internal Tool' },
]

const HUB_PRIORITIES = [
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const OPCOS = [
  { id: 'omnia-collective', label: 'Omnia Collective' },
  { id: 'edgered',          label: 'EdgeRed' },
  { id: 'ai-decisions',     label: 'ai decisions' },
  { id: 'bound',            label: 'Bound' },
  { id: 'elysium-digital',  label: 'Elysium Digital' },
  { id: 'onset',            label: 'Onset' },
]

interface ProjectFormProps {
  initial?: Partial<Project>
  mode: 'create' | 'edit'
  projectId?: string
  isPowerUser?: boolean
}

interface FormErrors {
  title?: string
  notion_url?: string
  github_repos?: string
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function isDeleteConfirmationValid(input: string, projectTitle: string): boolean {
  const normalizedInput = input.trim().toLocaleLowerCase()
  const normalizedTitle = projectTitle.trim().toLocaleLowerCase()
  return normalizedInput === 'delete' || (Boolean(normalizedTitle) && normalizedInput === normalizedTitle)
}

export function ProjectForm({ initial, mode, projectId, isPowerUser = false }: ProjectFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? 'Idea')
  const [notionUrl, setNotionUrl] = useState(initial?.notion_url ?? '')
  const [hubStream, setHubStream] = useState(initial?.stream ?? 'internal_rnd')
  const [hubCategory, setHubCategory] = useState(initial?.category ?? '')
  const [hubPriority, setHubPriority] = useState(initial?.priority ?? 'medium')
  const [hubOpcos, setHubOpcos] = useState<string[]>(initial?.contributing_opcos ?? [])
  const [hubTagInput, setHubTagInput] = useState('')
  const [hubTags, setHubTags] = useState<string[]>(initial?.tags ?? [])
  const [skillInput, setSkillInput] = useState('')
  const [skills, setSkills] = useState<string[]>(initial?.skills_needed ?? [])
  const [repoInput, setRepoInput] = useState('')
  const [repos, setRepos] = useState<string[]>(initial?.github_repos ?? [])
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const projectTitle = initial?.title?.trim() ?? ''
  const canDelete =
    mode === 'edit'
    && Boolean(projectId)
    && isDeleteConfirmationValid(deleteConfirmation, projectTitle)
  const showStatusPicker = mode === 'edit' || isPowerUser

  function validate(): boolean {
    const next: FormErrors = {}
    if (!title.trim()) next.title = 'Title is required.'
    if (notionUrl && !isValidUrl(notionUrl)) next.notion_url = 'Must be a valid URL.'
    if (repoInput && !isValidUrl(repoInput)) next.github_repos = 'Must be a valid URL.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function addSkill() {
    const trimmed = skillInput.trim()
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed])
    }
    setSkillInput('')
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill))
  }

  function addRepo() {
    const trimmed = repoInput.trim()
    if (trimmed && isValidUrl(trimmed) && !repos.includes(trimmed)) {
      setRepos((prev) => [...prev, trimmed])
      setRepoInput('')
      setErrors((e) => ({ ...e, github_repos: undefined }))
    } else if (trimmed && !isValidUrl(trimmed)) {
      setErrors((e) => ({ ...e, github_repos: 'Must be a valid URL.' }))
    }
  }

  function removeRepo(url: string) {
    setRepos((prev) => prev.filter((r) => r !== url))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setServerError(null)

    const payload = {
      title: title.trim(),
      summary: summary.trim() || undefined,
      status: showStatusPicker ? status : 'Idea',
      notion_url: notionUrl.trim() || undefined,
      skills_needed: skills,
      github_repos: repos,
      ...(isPowerUser && {
        stream: hubStream,
        category: hubCategory.trim() || undefined,
        priority: hubPriority,
        contributing_opcos: hubOpcos,
        tags: hubTagInput.trim()
          ? [...new Set([...hubTags, ...hubTagInput.split(',').map((t) => t.trim()).filter(Boolean)])]
          : hubTags,
      }),
    }

    try {
      const url =
        mode === 'create'
          ? '/api/v1/projects'
          : `/api/v1/projects/${projectId}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setServerError(body.error ?? 'Something went wrong.')
        return
      }

      const data = await res.json()
      router.push(`/projects/${data.id}`)
    } catch {
      setServerError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteProject() {
    if (mode !== 'edit' || !projectId || deleting) return

    const confirmation = deleteConfirmation.trim()
    if (!isDeleteConfirmationValid(confirmation, projectTitle)) {
      setDeleteError(`Type DELETE or the exact project name (${projectTitle}) to confirm.`)
      return
    }

    if (!window.confirm('Delete this project permanently? This cannot be undone.')) return

    setDeleting(true)
    setDeleteError(null)

    try {
      const res = await fetch(`/api/v1/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      })

      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}))
        setDeleteError(body.error ?? 'Unable to delete project.')
        return
      }

      router.push('/discover')
      router.refresh()
    } catch {
      setDeleteError('Network error. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6 max-w-3xl">
      {serverError && (
        <div className="col-span-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {serverError}
        </div>
      )}

      {/* Title — full width */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
      </div>

      {/* Summary — full width */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Summary
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      {/* Status | Stream */}
      {showStatusPicker ? (
        <div className={!isPowerUser ? 'col-span-2' : undefined}>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
          Submissions start as <span className="font-medium">Idea</span> and stay private until a power user approves them.
        </div>
      )}

      {isPowerUser && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Stream
          </label>
          <select
            value={hubStream}
            onChange={(e) => setHubStream(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {HUB_STREAMS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Category | Priority — power users only */}
      {isPowerUser && (
        <>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Category
            </label>
            <input
              type="text"
              value={hubCategory}
              onChange={(e) => setHubCategory(e.target.value)}
              maxLength={80}
              placeholder="e.g. Discovery, Internal Tooling"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Priority
            </label>
            <select
              value={hubPriority}
              onChange={(e) => setHubPriority(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {HUB_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Skills needed | Tags */}
      <div className={`self-start${!isPowerUser ? ' col-span-2' : ''}`}>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Skills needed
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
            placeholder="e.g. React"
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={addSkill}
            className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Add
          </button>
        </div>
        {skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="text-zinc-400 hover:text-zinc-700"
                  aria-label={`Remove ${skill}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {isPowerUser && (
        <div className="self-start">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Tags
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={hubTagInput}
              onChange={(e) => setHubTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const newTags = hubTagInput.split(',').map((t) => t.trim()).filter(Boolean)
                  setHubTags((prev) => [...new Set([...prev, ...newTags])])
                  setHubTagInput('')
                }
              }}
              placeholder="e.g. launch, demo (comma-separated)"
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => {
                const newTags = hubTagInput.split(',').map((t) => t.trim()).filter(Boolean)
                setHubTags((prev) => [...new Set([...prev, ...newTags])])
                setHubTagInput('')
              }}
              className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Add
            </button>
          </div>
          {hubTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hubTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setHubTags((prev) => prev.filter((t) => t !== tag))}
                    className="text-zinc-400 hover:text-zinc-700"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GitHub repositories | Contributing brands */}
      <div className={`self-start${!isPowerUser ? ' col-span-2' : ''}`}>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          GitHub repositories
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRepo() } }}
            placeholder="https://github.com/org/repo"
            className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={addRepo}
            className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Add
          </button>
        </div>
        {errors.github_repos && <p className="mt-1 text-xs text-red-600">{errors.github_repos}</p>}
        {repos.length > 0 && (
          <ul className="mt-2 space-y-1">
            {repos.map((url) => (
              <li key={url} className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                <span className="truncate">{url}</span>
                <button
                  type="button"
                  onClick={() => removeRepo(url)}
                  className="ml-2 text-zinc-400 hover:text-red-600"
                  aria-label={`Remove ${url}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isPowerUser && (
        <div className="self-start">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Contributing brands
          </label>
          <div className="space-y-1.5">
            {OPCOS.map((opco) => (
              <label key={opco.id} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={hubOpcos.includes(opco.id)}
                  onChange={(e) => {
                    setHubOpcos(e.target.checked
                      ? [...hubOpcos, opco.id]
                      : hubOpcos.filter((id) => id !== opco.id))
                  }}
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
                {opco.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Notion URL — full width */}
      <div className="col-span-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Notion URL
        </label>
        <input
          type="url"
          value={notionUrl}
          onChange={(e) => setNotionUrl(e.target.value)}
          placeholder="https://notion.so/..."
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {errors.notion_url && <p className="mt-1 text-xs text-red-600">{errors.notion_url}</p>}
      </div>

      <div className="col-span-2 flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || deleting}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitting ? 'Saving…' : mode === 'create' ? 'Create project' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-200 px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>

      {mode === 'edit' && projectId && (
        <section className="col-span-2 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">Danger zone</h2>
          <p className="mt-1 text-xs text-red-700/90 dark:text-red-300/90">
            Delete this project permanently. Type <strong>DELETE</strong> or the exact project name and press Enter.
          </p>
          {projectTitle && (
            <p className="mt-1 text-xs text-red-700/90 dark:text-red-300/90">
              Project name: <strong>{projectTitle}</strong>
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => {
                setDeleteConfirmation(e.target.value)
                if (deleteError) setDeleteError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleDeleteProject()
                }
              }}
              placeholder={projectTitle ? `Type DELETE or ${projectTitle}` : 'Type DELETE to confirm'}
              className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-red-400 focus:outline-none dark:border-red-900/70 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => void handleDeleteProject()}
              disabled={!canDelete || deleting || submitting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete project'}
            </button>
          </div>
          {deleteError && <p className="mt-2 text-xs text-red-700 dark:text-red-300">{deleteError}</p>}
        </section>
      )}
    </form>
  )
}
