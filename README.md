# OC Labs

Internal project discovery and collaboration board for the Omnia Collective. Members log in via SSO, browse and vote on projects, raise their hand to join, and post milestone updates.

**Live:** [oclabs.space](https://oclabs.space)  
**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Supabase · Vercel

---

## Getting started

```bash
cp .env.local.example .env.local
# Fill in credentials — see .env.local.example for all required vars

npm install
npm run dev
# → http://localhost:3000
```

---

## Project structure

```
src/
  app/
    (auth)/          Login, OAuth callback
    (board)/         Main board views
    api/v1/          REST API routes
  components/
    board/           ProjectCard, BoardToolbar, FilterChips
    profile/         ProfileCard, Avatar
    ui/              Shared design system components
  lib/
    supabase/        client, server, admin, middleware
    github/          Repo metadata fetcher
    notifications/   Slack webhook, email digest
    cowork/          Identity sync client
  types/             TypeScript interfaces
supabase/
  migrations/        SQL migration files
agent/               Go-based AI project assistant (see below)
```

---

## Project agent

Every project has an AI assistant built on Claude. It lives in [`agent/`](agent/README.md) — a lightweight Go service deployed on Fly.io, called by the app on each chat turn.

### What it can do

| | Contributors | Owners |
|---|---|---|
| Read project context & tasks | ✓ | ✓ |
| Browse linked GitHub repos | ✓ | ✓ |
| Edit project fields (title, summary, status, skills) | — | ✓ |
| Create / update / delete tasks | — | ✓ |
| Post activity feed updates | — | ✓ |
| Add context blocks | — | ✓ |

### How to use it

Open any project and click the chat icon. Ask it anything about the project — it can read your linked repos, answer questions about the codebase, break work into tasks, and post updates.

**Tips:**
- Ask it to decompose a goal into tasks — it will propose a plan and wait for your confirmation before creating anything
- Link a GitHub repo to the project first if you want it to read code
- Keep requests focused — one repo or folder at a time is faster and more accurate

### Guardrails

- **Project-scoped** — cannot read or write data from other projects
- **Auth-bound** — all writes use your own session token, no privilege escalation
- **No fabrication** — will say "I don't know" rather than invent answers
- **52-second hard timeout** per turn
- **Max 6 tool calls** per turn to prevent runaway loops
- **Confirms before bulk actions** — task creation and multi-step plans require your explicit go-ahead

---

## Key environment variables

| Variable | Required | Used for |
|----------|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | All Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser + server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin operations (server only) |
| `ANTHROPIC_API_KEY` | Yes | Project agent (Next.js app) |
| `RESEND_API_KEY` | Yes | Email digest |
| `CRON_SECRET` | Yes | Secures the digest cron endpoint |
| `GITHUB_TOKEN` | No | Raises GitHub API rate limit to 5000 req/hr |
| `SLACK_WEBHOOK_PROJECTS` | No | Project creation / join notifications |
| `SLACK_WEBHOOK_WINS` | No | Milestone update notifications |

Full list with descriptions in `.env.local.example`.
