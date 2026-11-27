-- Roznamcha / Khata bookkeeping.
-- `khatas` is the ledger register: folio (صفحہ) number -> khata name, per organisation,
-- matching the page numbers of the physical khata book.
-- Every money entry carries the folio of the khata it is posted to, exactly as written
-- in the Roznamcha (the same category can go to different khatas, e.g. rickshaw kiraya
-- under Kamad 17 one day and Seri 40 another). Payments inherit their parent's folio.

CREATE TABLE IF NOT EXISTS public.khatas (
  id         serial PRIMARY KEY,
  org_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  folio      integer NOT NULL CHECK (folio > 0),
  name       varchar(120) NOT NULL,
  name_ur    varchar(120),
  note       text,
  created_at timestamptz DEFAULT now(),
  user_id    uuid DEFAULT auth.uid(),
  UNIQUE (org_id, folio)
);

ALTER TABLE public.khatas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can access khatas" ON public.khatas
  FOR ALL USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));

ALTER TABLE public.expenses       ADD COLUMN IF NOT EXISTS folio integer CHECK (folio > 0);
ALTER TABLE public.revenue        ADD COLUMN IF NOT EXISTS folio integer CHECK (folio > 0);
ALTER TABLE public.loans          ADD COLUMN IF NOT EXISTS folio integer CHECK (folio > 0);
ALTER TABLE public.credit_entries ADD COLUMN IF NOT EXISTS folio integer CHECK (folio > 0);

CREATE INDEX IF NOT EXISTS expenses_folio_idx       ON public.expenses (farm_id, folio) WHERE folio IS NOT NULL;
CREATE INDEX IF NOT EXISTS revenue_folio_idx        ON public.revenue (farm_id, folio) WHERE folio IS NOT NULL;
CREATE INDEX IF NOT EXISTS loans_folio_idx          ON public.loans (farm_id, folio) WHERE folio IS NOT NULL;
CREATE INDEX IF NOT EXISTS credit_entries_folio_idx ON public.credit_entries (farm_id, folio) WHERE folio IS NOT NULL;
