-- =====================================================================================
-- AgriPro — pre-wipe backup, 2026-09-11
--
-- Taken immediately before clearing all operational data so the project could start
-- collecting real farm data. Restores the non-reproducible rows only.
--
-- The ~2,900 rows of demo/seed data that were also deleted are NOT dumped here, because
-- they are regenerated exactly by ../../seed/demo_seed.sql. Run that instead if you want
-- the demo dataset back.
--
-- NOT touched by the wipe (and therefore not in this file): auth.users, organizations,
-- organization_members, profiles, and the app-wide default rows in categories and
-- acre_presets (those with user_id IS NULL).
--
-- Usage: paste into the Supabase SQL editor, or run via the MCP execute_sql tool.
-- Every statement is idempotent (ON CONFLICT DO NOTHING), so re-running is safe.
-- =====================================================================================

begin;

-- -------------------------------------------------------------------------------------
-- vendors_buyers: the two parties that existed before the demo seed.
-- -------------------------------------------------------------------------------------
insert into public.vendors_buyers
  (id, type, name, contact, address, total_business, total_settled, note, created_at, user_id, org_id)
values
  (5, 'Vendor', 'Ali Fertilizers',   '0300-1234567', null, 150000.00, 100000.00, null,
   '2026-07-19T19:42:31.595007', 'da3f53cb-eecc-4b44-b99c-0028b59a12ad', '0bbeb6dc-4195-4cc8-89fa-8a58881f567e'),
  (6, 'Buyer',  'Mandi Broker Khan', '0300-7654321', null, 500000.00, 300000.00, null,
   '2026-07-19T19:42:31.595007', 'da3f53cb-eecc-4b44-b99c-0028b59a12ad', '0bbeb6dc-4195-4cc8-89fa-8a58881f567e')
on conflict (id) do nothing;

-- -------------------------------------------------------------------------------------
-- categories: the four the account owner created by hand. (The 37 app-wide defaults with
-- user_id IS NULL were never deleted.)
-- -------------------------------------------------------------------------------------
insert into public.categories (id, user_id, name, module, created_at, org_id)
values
  (1,  'da3f53cb-eecc-4b44-b99c-0028b59a12ad', 'Seed',         'expense', '2026-05-17T18:12:17.398937', '0bbeb6dc-4195-4cc8-89fa-8a58881f567e'),
  (2,  'da3f53cb-eecc-4b44-b99c-0028b59a12ad', 'Crop Sell',    'revenue', '2026-05-17T18:13:40.214504', '0bbeb6dc-4195-4cc8-89fa-8a58881f567e'),
  (38, 'da3f53cb-eecc-4b44-b99c-0028b59a12ad', 'Car Expense',  'expense', '2026-05-26T17:28:47.078279', null),
  (39, 'da3f53cb-eecc-4b44-b99c-0028b59a12ad', 'Dera Expense', 'expense', '2026-05-26T17:32:30.11187',  null)
on conflict (id) do nothing;

-- -------------------------------------------------------------------------------------
-- acre_presets: the owner's custom preset. (Presets 1-4 are app-wide defaults and were
-- never deleted.)
-- -------------------------------------------------------------------------------------
insert into public.acre_presets (id, org_id, name, length_ft, width_ft, created_at, user_id)
values
  (7, null, 'Punjab Acre Dimension', 220.00, 198.00, '2026-07-19T04:57:58.421755',
   'da3f53cb-eecc-4b44-b99c-0028b59a12ad')
on conflict (id) do nothing;

-- -------------------------------------------------------------------------------------
-- mandi_prices: the two global reference rows that pre-dated the seed (user_id IS NULL).
-- -------------------------------------------------------------------------------------
insert into public.mandi_prices (id, date, commodity, price, unit, market, created_at, user_id)
values
  (1, '2024-02-10', 'Wheat',  4500.00, 'Maund (40kg)', 'Faisalabad', '2026-07-19T19:42:31.595007', null),
  (2, '2024-02-10', 'Cotton', 8500.00, 'Maund (40kg)', 'Faisalabad', '2026-07-19T19:42:31.595007', null)
on conflict (id) do nothing;

-- -------------------------------------------------------------------------------------
-- notifications: all six were low-stock alerts raised by a trigger against demo inventory,
-- so they are recorded here for completeness but are not worth restoring.
--
--   Low Stock Alert: DAP (Engro) / Cotton Seed - BT 886 / Diesel /
--                    Confidor (Imidacloprid) / Wanda (Cattle Feed) / Copper Oxychloride
--   all org 0bbeb6dc-4195-4cc8-89fa-8a58881f567e, created 2026-09-10T22:30:25Z
-- -------------------------------------------------------------------------------------

-- Keep the sequences ahead of the restored ids.
select setval('vendors_buyers_id_seq', greatest((select coalesce(max(id),1) from public.vendors_buyers), 1));
select setval('categories_id_seq',     greatest((select coalesce(max(id),1) from public.categories), 1));
select setval('acre_presets_id_seq',   greatest((select coalesce(max(id),1) from public.acre_presets), 1));
select setval('mandi_prices_id_seq',   greatest((select coalesce(max(id),1) from public.mandi_prices), 1));

commit;
