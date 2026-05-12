# OC Labs

Internal project discovery and collaboration board for the Omnia Collective.

**Stack:** Next.js · TypeScript · Supabase · Tailwind CSS
**Deployment:** Vercel → [oclabs.space](https://oclabs.space)
**Handover doc:** [Full Build Handover (oclabs_handover.docx)](https://github.com/williamlobb/OC-Labs)

---

## Getting started

```bash
cp .env.local.example .env.local
# Fill in credentials (Supabase, Slack, Resend, CoWork, GitHub)

npm install
npm run dev
```

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
    cowork/          LinkedIn/CoWork sync client
  types/             TypeScript interfaces
supabase/
  migrations/        SQL migration files
  seed.sql           Launch data (7 projects, 8 users)
```

## Agent

The project assistant is a separate Go service in [`agent/`](agent/README.md). See that README for scope, guardrails, tools, and deployment instructions.

---

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production — protected, requires PR + review |
| `develop` | Integration branch |
| `phase/1-mvp` | Phase 1 feature work (Claude Code) |

## Phase 1 PRs

Claude Code implements these in order:

| PR | Feature |
|----|---------|
| PR-01 | Auth — SSO login + user session |
| PR-02 | Project card component |
| PR-03 | Board view — list + filter + search |
| PR-04 | Raise hand mechanic |
| PR-05 | Vote mechanic |
| PR-06 | Profile card component |
| PR-07 | My profile view |
| PR-08 | GitHub repo link + README preview |
| PR-09 | Project registration form |
| PR-10 | Needs-help flag + Slack notification |
