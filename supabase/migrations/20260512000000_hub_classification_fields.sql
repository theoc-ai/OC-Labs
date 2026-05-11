-- Add Omnia Hub classification fields to projects.
-- hub_stream: maps to ai_projects.stream ('internal_rnd' | 'client_work' | 'licensable_solution')
-- hub_category: maps to ai_projects.category (free text chip on the Hub project card)
-- Both are optional — the sync mapper falls back to sensible defaults when null.

alter table public.projects
  add column if not exists hub_stream   text default 'internal_rnd',
  add column if not exists hub_category text;

comment on column public.projects.hub_stream is
  'Omnia Hub stream to surface this project under. One of: internal_rnd, client_work, licensable_solution. Defaults to internal_rnd.';
comment on column public.projects.hub_category is
  'Omnia Hub category chip shown on the project card. Free text, e.g. "Marketing Collateral", "Internal Tool", "AI Capability".';
