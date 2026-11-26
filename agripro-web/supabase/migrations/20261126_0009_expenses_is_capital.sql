-- Capital purchases (fixed assets such as a solar system, tube well, tractor).
-- Standard accrual treatment: the payment still leaves cash (and any unpaid part is a
-- Credit Ledger payable), but it is NOT an operating expense, so it is excluded from
-- Total Expenses / Net Profit / P&L. The asset itself is recorded in `machinery`
-- (purchase_price / current_value) so it appears in Total Asset Value and the Balance Sheet.
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS is_capital boolean NOT NULL DEFAULT false;
