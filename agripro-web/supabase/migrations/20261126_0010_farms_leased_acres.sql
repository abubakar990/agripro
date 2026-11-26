-- Part of a farm can be rented (leased) land. It is farmed (counts for cost per acre)
-- but is not an asset, so land value = (area_acres - leased_acres) x land_value (per acre).
ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS leased_acres numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.farms
  ADD CONSTRAINT farms_leased_acres_nonneg CHECK (leased_acres >= 0);
