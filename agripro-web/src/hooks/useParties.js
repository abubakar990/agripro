import { useMemo } from 'react';
import { useFarms, useVendorsBuyers, useLoans, useCreditEntries, useExpenses, useRevenue } from './queries';
import { normalizePartyName, buildPartyFinancialSummary } from '../utils/partyFinancials';

export function useParties(orgIdOverride = null) {
  const currentOrgId = orgIdOverride || localStorage.getItem('agripro_current_org_id');
  const { data: farms = [], isLoading: isFarmsLoading } = useFarms(currentOrgId);
  const farmIds = useMemo(() => farms.map(f => f.id), [farms]);

  const { data: vendorsBuyers = [], isLoading: isVBLoading, refetch: refetchVB } = useVendorsBuyers(currentOrgId);
  const { data: loans = [], isLoading: isLoansLoading, refetch: refetchLoans } = useLoans(farmIds);
  const { data: creditEntries = [], isLoading: isCreditLoading, refetch: refetchCredit } = useCreditEntries(farmIds);
  const { data: expenses = [], isLoading: isExpLoading, refetch: refetchExp } = useExpenses(farmIds);
  const { data: revenue = [], isLoading: isRevLoading, refetch: refetchRev } = useRevenue(farmIds);

  const isLoading = isFarmsLoading || isVBLoading || isLoansLoading || isCreditLoading;

  const refetch = async () => {
    await Promise.all([
      refetchVB?.(),
      refetchLoans?.(),
      refetchCredit?.(),
      refetchExp?.(),
      refetchRev?.()
    ]);
  };

  const { parties, partiesMap } = useMemo(() => {
    const map = new Map();

    // 1. Collect all names from vendors_buyers
    for (const vb of vendorsBuyers) {
      const norm = normalizePartyName(vb.name);
      if (!norm) continue;
      if (!map.has(norm)) {
        map.set(norm, { name: vb.name.trim(), record: vb });
      } else {
        // Prefer record with contact details if present
        const existing = map.get(norm);
        if (!existing.record?.contact && vb.contact) {
          existing.record = vb;
        }
      }
    }

    // 2. Collect all party names from loans
    for (const l of loans) {
      const norm = normalizePartyName(l.party);
      if (!norm) continue;
      if (!map.has(norm)) {
        map.set(norm, { name: l.party.trim(), record: null });
      }
    }

    // 3. Collect from credit entries
    for (const c of creditEntries) {
      const norm = normalizePartyName(c.party);
      if (!norm) continue;
      if (!map.has(norm)) {
        map.set(norm, { name: c.party.trim(), record: null });
      }
    }

    // 4. Collect from expenses
    for (const e of expenses) {
      const norm = normalizePartyName(e.party);
      if (!norm) continue;
      if (!map.has(norm)) {
        map.set(norm, { name: e.party.trim(), record: null });
      }
    }

    // 5. Collect from revenue
    for (const r of revenue) {
      const norm = normalizePartyName(r.party);
      if (!norm) continue;
      if (!map.has(norm)) {
        map.set(norm, { name: r.party.trim(), record: null });
      }
    }

    // Build summaries for all distinct parties
    const result = [];
    const partyObjectMap = {};

    for (const [norm, { name, record }] of map.entries()) {
      const summary = buildPartyFinancialSummary({
        name,
        contactRecord: record,
        loans,
        creditEntries,
        expenses,
        revenue
      });
      result.push(summary);
      partyObjectMap[norm] = summary;
    }

    // Sort: parties with outstanding balance first, then alphabetically
    result.sort((a, b) => {
      const aHasBalance = Math.abs(a.netBalance) > 0 ? 1 : 0;
      const bHasBalance = Math.abs(b.netBalance) > 0 ? 1 : 0;
      if (aHasBalance !== bHasBalance) return bHasBalance - aHasBalance;
      return a.name.localeCompare(b.name);
    });

    return { parties: result, partiesMap: partyObjectMap };
  }, [vendorsBuyers, loans, creditEntries, expenses, revenue]);

  const getParty = (name) => {
    const norm = normalizePartyName(name);
    return partiesMap[norm] || buildPartyFinancialSummary({
      name,
      loans,
      creditEntries,
      expenses,
      revenue
    });
  };

  return {
    parties,
    partiesMap,
    getParty,
    isLoading,
    refetch,
    farms
  };
}
