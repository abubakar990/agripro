-- Sub-categories (sub-khata), e.g. Otaq > Bijli, Otaq > Kiryana.
-- A category with parent_id set is a sub-category of that parent. Top-level categories keep parent_id NULL.
-- Expenses store the sub-category name alongside the category name (same pattern as `category`).

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id integer REFERENCES public.categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories (parent_id) WHERE parent_id IS NOT NULL;

-- The same sub-category name may exist under different parents (e.g. "Repair" under Otaq and under Car),
-- so uniqueness now includes the parent. NULLS NOT DISTINCT keeps top-level names unique as before.
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_user_id_name_module_key;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_user_name_module_parent_key
  UNIQUE NULLS NOT DISTINCT (user_id, name, module, parent_id);

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS sub_category varchar(80);
