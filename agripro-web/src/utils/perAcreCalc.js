/**
 * Per-acre calculation utilities for AgriPro
 * Implements the area resolution chain:
 * entry.area_acres → plot.area_acres → crop_cycle.area_acres → farm.area_acres
 */

/**
 * Resolve the effective area for a given entry
 */
export const resolveArea = (entry, { farmPlots = [], cropCycles = [], farms = [] } = {}) => {
  // 1. Explicit area on entry
  if (entry.area_acres && parseFloat(entry.area_acres) > 0) {
    return parseFloat(entry.area_acres);
  }
  
  // 2. From linked plot
  if (entry.plot_id) {
    const plot = farmPlots.find(p => p.id === entry.plot_id);
    if (plot?.area_acres && parseFloat(plot.area_acres) > 0) {
      return parseFloat(plot.area_acres);
    }
  }
  
  // 3. From linked crop cycle
  if (entry.crop_cycle_id) {
    const cycle = cropCycles.find(c => c.id === entry.crop_cycle_id);
    if (cycle?.area_acres && parseFloat(cycle.area_acres) > 0) {
      return parseFloat(cycle.area_acres);
    }
  }
  
  // 4. From farm
  if (entry.farm_id) {
    const farm = farms.find(f => f.id === entry.farm_id);
    if (farm?.area_acres && parseFloat(farm.area_acres) > 0) {
      return parseFloat(farm.area_acres);
    }
  }
  
  return null;
};

/**
 * Calculate per-acre amount
 */
export const perAcre = (amount, area) => {
  if (!area || area <= 0 || !amount) return null;
  return Math.round((parseFloat(amount) / parseFloat(area)) * 100) / 100;
};

/**
 * Format per-acre value for display
 */
export const formatPerAcre = (amount, area) => {
  const result = perAcre(amount, area);
  if (result === null) return '—';
  return 'Rs ' + result.toLocaleString('en-PK');
};

/**
 * Calculate total area from entries that have area
 */
export const totalArea = (entries, context) => {
  if (!entries || entries.length === 0) return null;
  const uniqueAreas = new Map(); // key: source_type:id, value: area

  entries.forEach(entry => {
    if (entry.area_acres && parseFloat(entry.area_acres) > 0) {
      uniqueAreas.set(`entry:${entry.id}`, parseFloat(entry.area_acres));
    } else if (entry.plot_id) {
      const plot = context.farmPlots?.find(p => p.id === entry.plot_id);
      if (plot?.area_acres && parseFloat(plot.area_acres) > 0) {
        uniqueAreas.set(`plot:${entry.plot_id}`, parseFloat(plot.area_acres));
      }
    } else if (entry.crop_cycle_id) {
      const cycle = context.cropCycles?.find(c => c.id === entry.crop_cycle_id);
      if (cycle?.area_acres && parseFloat(cycle.area_acres) > 0) {
        uniqueAreas.set(`cycle:${entry.crop_cycle_id}`, parseFloat(cycle.area_acres));
      }
    } else if (entry.farm_id) {
      const farm = context.farms?.find(f => f.id === entry.farm_id);
      if (farm?.area_acres && parseFloat(farm.area_acres) > 0) {
        uniqueAreas.set(`farm:${entry.farm_id}`, parseFloat(farm.area_acres));
      }
    }
  });

  const areas = Array.from(uniqueAreas.values());
  if (areas.length === 0) return null;
  return areas.reduce((sum, a) => sum + a, 0);
};

/**
 * Get performance score for a plot (0-100)
 */
export const getPlotScore = (plotId, { expenses = [], revenue = [], cropCycles = [], farmPlots = [], farms = [] } = {}) => {
  const plot = farmPlots.find(p => p.id === plotId);
  if (!plot?.area_acres || parseFloat(plot.area_acres) <= 0) return null;
  
  const area = parseFloat(plot.area_acres);
  const plotExpenses = expenses.filter(e => e.plot_id === plotId);
  const plotRevenue = revenue.filter(r => r.plot_id === plotId);
  const plotCycles = cropCycles.filter(c => c.plot_id === plotId);
  
  if (plotExpenses.length === 0 && plotRevenue.length === 0) return null;
  
  const totalExpense = plotExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalRev = plotRevenue.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const profit = totalRev - totalExpense;
  const profitPerAcre = profit / area;
  
  // Simple scoring: normalize profit/acre to 0-100 range
  // ₨15K/acre or more = 100, ₨0 = 50, -₨15K or less = 0
  const score = Math.max(0, Math.min(100, 50 + (profitPerAcre / 300)));
  return Math.round(score);
};

/**
 * Get performance color based on score
 */
export const getScoreColor = (score) => {
  if (score === null) return '#94A3B8'; // gray - no data
  if (score >= 75) return '#22C55E'; // green
  if (score >= 50) return '#EAB308'; // yellow
  if (score >= 25) return '#F97316'; // orange
  return '#EF4444'; // red
};

/**
 * Get performance label based on score
 */
export const getScoreLabel = (score) => {
  if (score === null) return 'No Data';
  if (score >= 75) return 'Excellent';
  if (score >= 50) return 'Good';
  if (score >= 25) return 'Below Avg';
  return 'Poor';
};
