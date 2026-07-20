import { calculateAcresFromLatLngs, getPolygonCenter } from '../../src/utils/geoUtils.js';
import { resolveArea, perAcre, getPlotScore } from '../../src/utils/perAcreCalc.js';

async function runTests() {
  let passed = 0;
  let failed = 0;
  
  const assert = (condition, msg) => {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  };

  console.log('--- Testing geoUtils ---');
  // 1 Acre square ~ 63.6m x 63.6m
  // In degrees at equator roughly: 0.00057 degrees
  const oneAcrePolygon = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 0.000571 },
    { lat: 0.000571, lng: 0.000571 },
    { lat: 0.000571, lng: 0 },
  ];
  const acres = calculateAcresFromLatLngs(oneAcrePolygon);
  assert(acres >= 0.95 && acres <= 1.05, `1 Acre polygon calculates correctly (got ${acres})`);

  const center = getPolygonCenter(oneAcrePolygon);
  assert(center[0] > 0 && center[1] > 0, 'Center point calculated correctly');

  console.log('--- Testing perAcreCalc ---');
  const mockPlot = { id: 1, area_acres: '2.5' };
  const mockExpense = { amount: 5000, plot_id: 1 };
  
  const resolved = resolveArea(mockExpense, { farmPlots: [mockPlot] });
  assert(resolved === 2.5, `resolveArea cascaded correctly from plot (got ${resolved})`);

  const pa = perAcre(5000, 2.5);
  assert(pa === 2000, `perAcre math correct (got ${pa})`);

  const score = getPlotScore(1, { 
    farmPlots: [mockPlot], 
    expenses: [mockExpense],
    revenue: [{ amount: 20000, plot_id: 1 }] 
  });
  // Profit = 15000 / 2.5 = 6000 per acre
  // Score = 50 + (6000 / 300) = 70
  assert(score === 70, `Performance score algorithm correct (got ${score})`);

  console.log(`\nTests Complete: ${passed} Passed, ${failed} Failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
