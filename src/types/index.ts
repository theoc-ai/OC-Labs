// src/types/index.ts

export type ProjectStatus = 'Idea' | 'In progress' | 'Needs help' | 'Paused' | 'Shipped'
export type ProjectSubmissionStatus = 'pending_review' | 'approved' | 'rejected'
export type MemberRole = 'owner' | 'contributor' | 'interested' | 'observer' | 'tech_lead'
export type PlatformRole = 'user' | 'power_user'

export interface AvatarColor {
  bg: string
  fg: string
}

export interface ProjectSummary {
  id: string
  title: string
  status: ProjectStatus
  brand: string
}

export interface User {
  id: string
  email: string
  name: string
  title?: string
  brand?: string
  profile_photo_url?: string
  linkedin_url?: string
  github_username?: string
  cowork_synced_at?: string
  platform_role?: PlatformRole
  created_at: string
}

export interface RoleInvitation {
  id: string
  email: string
  platform_role: PlatformRole | null
  project_id: string | null
  project_role: MemberRole | null
  invited_by: string | null
  token: string
  accepted_at: string | null
  created_at: string
}

export interface Project {
  id: string
  title: string
  summary?: string
  description?: string
  status: ProjectStatus
  submission_status?: ProjectSubmissionStatus
  brand?: string
  owner_id?: string
  github_repos: string[]
  skills_needed: string[]
  needs_help: boolean
  vote_count: number
  notion_url?: string
  jira_epic_key?: string
  stream?: string
  category?: string
  priority?: string
  contributing_opcos?: string[]
  tags?: string[]
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  role: MemberRole
  joined_at: string
}

export interface Vote {
  project_id: string
  user_id: string
  voted_at: string
}

export interface ProjectUpdate {
  id: string
  project_id: string
  author_id?: string
  author_name?: string
  body: string
  milestone: boolean
  posted_at: string
}

export interface UserSkill {
  user_id: string
  skill: string
  source: string
}

export type BlockType = 'general' | 'architecture' | 'decision' | 'constraint'

export interface ContextBlock {
  id: string
  project_id: string
  author_id: string
  author_name: string
  title: string
  body: string
  block_type: BlockType
  version: number
  attachment_name?: string | null
  attachment_path?: string | null
  attachment_mime_type?: string | null
  attachment_size_bytes?: number | null
  attachment_url?: string | null
  created_at: string
  updated_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

export interface Task {
  id: string
  project_id: string
  title: string
  body?: string
  status: TaskStatus
  assignee_id?: string
  assigned_to_agent: boolean
  depends_on: string[]
  jira_issue_key?: string
  jira_issue_url?: string
  jira_synced_at?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  project_id: string
  role: 'user' | 'assistant'
  content: string
  author_id?: string
  created_at: string
}

export interface ApiKey {
  id: string
  user_id: string
  label?: string
  created_at: string
  last_used_at?: string
}

// Component prop interfaces

export interface ProjectCardProps {
  id: string
  title: string
  brand: string
  status: ProjectStatus
  desc: string
  skills: string[]
  owner: { id: string; name: string; avatarColor: AvatarColor }
  voteCount: number
  hasVoted: boolean
  hasJoined: boolean
  hasRaisedHand: boolean
  joinPending?: boolean
  joinError?: string | null
  needsHelp: boolean
  onVote: () => void
  onJoin: () => void
  onClick: () => void
}

export interface ProfileCardProps {
  id: string
  name: string
  title: string
  brand: string
  profilePhotoUrl?: string
  linkedinUrl: string
  githubUsername?: string
  skills: string[]
  projects: ProjectSummary[]
  voteCount: number
  activityScore: number
  badges: string[]
}
