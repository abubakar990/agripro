-- SECURITY FIX: mandi_prices INSERT policy was WITH CHECK (true) for role public,
-- so even anonymous callers could write arbitrary rows, and rows had no user_id so were undeletable.
DROP POLICY IF EXISTS "Authenticated users can insert mandi prices" ON public.mandi_prices;

ALTER TABLE public.mandi_prices ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE POLICY "Authenticated users can insert own mandi prices"
ON public.mandi_prices
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.mandi_prices FROM anon;
