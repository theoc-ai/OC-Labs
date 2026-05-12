# OC Labs Agent

Go-based AI agent that powers the project assistant in OC Labs. Deployed on Fly.io, called by the Next.js app on each chat turn.

**Runtime:** Go · Anthropic SDK · Fly.io  
**Default URL:** `https://oclabs-agent.fly.dev`

---

## Getting started

```bash
cp .env.example .env
# Fill in ANTHROPIC_API_KEY (and optionally GITHUB_TOKEN)

go run .
# Listens on :8080
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `GITHUB_TOKEN` | No | Raises GitHub rate limit from 60 to 5000 req/hr |
| `PORT` | No | HTTP port (default: `8080`) |
| `AGENT_MODEL_GENERAL` | No | Override the general-purpose model |
| `AGENT_MODEL_REPO_READ` | No | Override the repo-read model |

---

## Deployment

The agent runs as two machines on Fly.io with a rolling deploy strategy.

```bash
# Update a secret (triggers redeploy automatically)
fly secrets set ANTHROPIC_API_KEY=sk-ant-... --app oclabs-agent

# Manual deploy
fly deploy --app oclabs-agent
```

---

## Scope

The agent is scoped to a single project per turn. The `project_id` is passed by the Next.js app on every request and all tool calls are bound to it — the agent cannot read or write data from other projects.

### What it can do

**Reading (all users)**
- Fetch project context and details
- Read project tasks
- List files and read file contents from linked GitHub repos

**Writing (project owner only)**
- Edit project fields — title, summary, status, skills, linked repos, Notion URL
- Create context blocks
- Create, update, and delete tasks
- Post activity feed updates

Contributors (non-owners) can read context and tasks but cannot write anything.

---

## Guardrails

| Guardrail | Detail |
|-----------|--------|
| **Project-scoped** | Every tool call is bound to the `project_id` from the request — cannot reach other projects |
| **No privilege escalation** | All writes go through the OC Labs API using the user's own auth token |
| **No fabrication** | Instructed to say "I don't know" rather than invent data |
| **52-second timeout** | Hard deadline per turn; user sees a hint to narrow scope if hit |
| **Max 6 tool iterations** | A turn cannot chain more than 6 tool calls before stopping |
| **Confirmation for large actions** | Multi-step plans (e.g. bulk task creation) require explicit user confirmation before execution |

---

## Model routing

| Trigger | Model |
|---------|-------|
| Message contains repo/file/GitHub keywords | `claude-sonnet-4-5` |
| Everything else | `claude-sonnet-4-6` |

Falls back to the general model if the repo model returns an error.

---

## Tools

| Tool | Description |
|------|-------------|
| `get_project_context` | Fetch project details and context blocks |
| `get_tasks` | List tasks for the project |
| `list_repo_files` | List files in a linked GitHub repo |
| `read_repo_file` | Read a specific file from a linked GitHub repo |
| `update_project` | Edit project fields (owner only) |
| `post_update` | Append an activity feed entry (owner only) |
| `create_context_block` | Add a context block to the project (owner only) |
| `create_tasks` | Bulk-create tasks (owner only) |
| `update_task` | Update a task's status or details (owner only) |
| `delete_task` | Delete a task (owner only) |
