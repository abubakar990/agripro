-- Track what was bought/sold, not just the rupee amount.
-- e.g. Expense: 10 bags of Urea @ 4,500/bag = 45,000
--      Revenue: 120 maund of Wheat @ 3,900/maund = 468,000
-- All columns are nullable so existing rows and amount-only entries (labour, fuel bills) keep working.
-- `note` is added because both forms already send it; without the column, saving a note failed.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS item_name  varchar(120),
  ADD COLUMN IF NOT EXISTS quantity   numeric(14,3),
  ADD COLUMN IF NOT EXISTS unit       varchar(30),
  ADD COLUMN IF NOT EXISTS unit_price numeric(14,2),
  ADD COLUMN IF NOT EXISTS note       text;

ALTER TABLE public.revenue
  ADD COLUMN IF NOT EXISTS item_name  varchar(120),
  ADD COLUMN IF NOT EXISTS quantity   numeric(14,3),
  ADD COLUMN IF NOT EXISTS unit       varchar(30),
  ADD COLUMN IF NOT EXISTS unit_price numeric(14,2),
  ADD COLUMN IF NOT EXISTS note       text;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_quantity_nonneg   CHECK (quantity IS NULL OR quantity >= 0),
  ADD CONSTRAINT expenses_unit_price_nonneg CHECK (unit_price IS NULL OR unit_price >= 0);

ALTER TABLE public.revenue
  ADD CONSTRAINT revenue_quantity_nonneg   CHECK (quantity IS NULL OR quantity >= 0),
  ADD CONSTRAINT revenue_unit_price_nonneg CHECK (unit_price IS NULL OR unit_price >= 0);

-- Fast "how much Urea did we buy" lookups per farm.
CREATE INDEX IF NOT EXISTS expenses_farm_item_idx ON public.expenses (farm_id, lower(item_name)) WHERE item_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS revenue_farm_item_idx  ON public.revenue  (farm_id, lower(item_name)) WHERE item_name IS NOT NULL;
