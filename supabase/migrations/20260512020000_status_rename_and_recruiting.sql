-- Rename status enum values to align with Omnia Hub labels,
-- remove 'Needs help' (replaced by is_recruiting flag),
-- and rename needs_help column to is_recruiting.

-- Step 1: Rename surviving enum values
ALTER TYPE project_status RENAME VALUE 'In progress' TO 'In Flight';
ALTER TYPE project_status RENAME VALUE 'Paused'      TO 'On Hold';
ALTER TYPE project_status RENAME VALUE 'Shipped'     TO 'Complete';

-- Step 2: Move any 'Needs help' rows to 'In Flight' before removing the value
UPDATE public.projects SET status = 'In Flight' WHERE status = 'Needs help';

-- Step 3: Recreate enum without 'Needs help'
ALTER TYPE project_status RENAME TO project_status_old;
CREATE TYPE project_status AS ENUM ('Idea', 'In Flight', 'On Hold', 'Complete');
ALTER TABLE public.projects
  ALTER COLUMN status TYPE project_status
  USING status::text::project_status;
DROP TYPE project_status_old;

-- Step 4: Rename needs_help → is_recruiting
ALTER TABLE public.projects RENAME COLUMN needs_help TO is_recruiting;
DROP INDEX IF EXISTS projects_needs_help_idx;
CREATE INDEX ON public.projects(is_recruiting);
