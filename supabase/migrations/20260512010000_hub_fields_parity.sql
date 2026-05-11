-- Rename hub_stream → stream and hub_category → category for naming consistency
-- with the Omnia Hub ai_projects table. Add priority, contributing_opcos, tags.

ALTER TABLE public.projects RENAME COLUMN hub_stream TO stream;
ALTER TABLE public.projects RENAME COLUMN hub_category TO category;

-- Enforce the full 5-value stream taxonomy
ALTER TABLE public.projects
  ADD CONSTRAINT projects_stream_check CHECK (
    stream IN ('client_work','internal_rnd','licensable_solution','marketing_collateral','internal_tool')
  );

-- New Hub display fields
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS priority           text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS contributing_opcos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags               jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_priority_check CHECK (
    priority IN ('low','medium','high','critical')
  );

-- Backfill stream for specific known projects
UPDATE public.projects SET stream = 'marketing_collateral' WHERE title = 'AI Risk Navigator Landing Page';
UPDATE public.projects SET stream = 'internal_tool' WHERE title = 'OC Labs';
UPDATE public.projects SET stream = 'internal_tool' WHERE title = 'Omnia Hub';
UPDATE public.projects SET stream = 'internal_tool' WHERE title = 'Omnia Capacity & Skills Finder';
-- 'Pricing Model Agent' stays as internal_rnd (already the default)
