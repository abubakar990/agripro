# Demo seed

`demo_seed.sql` regenerates the ~2,900-row demo dataset that was used for manual testing
on 2026-09-10/11 and removed on 2026-09-11 when the project switched to real data.

It is written to be re-runnable against any org: set `v_user` and `v_org` at the top.
Everything it creates hangs off the farms it inserts, so it can be removed again with:

```sql
delete from farms where org_id = '<your-org-id>' and name in (
  'Chak 42 Farm','Sahiwal Riverside','Jhang Road Block','Renala Orchard');
```

(child rows cascade or are cleaned by the matching delete in the script's header).

## What it covers

4 farms / 10 plots with map boundaries, 15 crop cycles, 282 revenue + 406 expense rows
spanning 18 months, 10 credit entries + 8 payments, 6 loans + 33 payments, 23 inventory
items, 14 workers, 1,170 attendance rows, 12 machines + 120 usage rows, 17 livestock +
64 health events, 140 irrigation + 80 spray rows, 20 vendors, 360 mandi prices.

It deliberately includes edge cases: overdue and fully-settled credit, fully-repaid and
part-repaid loans, Lent vs Borrowed, 8 below-reorder inventory items, and assets backdated
up to 19 months (which is what makes the point-in-time filter behaviour visible — on the
default 30-day range the old code showed 1 of 23 inventory items and Rs 0 of Rs 3.8M debt).

> Do not run this against a database holding real farm data.
