import { calculateAcresFromLatLngs, getPolygonCenter } from '../../src/utils/geoUtils.js';
import { resolveArea, perAcre, getPlotScore, totalArea } from '../../src/utils/perAcreCalc.js';

export default function run(t) {
  // ---- geoUtils ----
  // 1 acre square ~ 63.6m x 63.6m, which is ~0.000571 degrees at the equator.
  const oneAcrePolygon = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 0.000571 },
    { lat: 0.000571, lng: 0.000571 },
    { lat: 0.000571, lng: 0 },
  ];
  t.close(calculateAcresFromLatLngs(oneAcrePolygon), 1, 0.05, '1 acre polygon calculates correctly');
  t.equal(calculateAcresFromLatLngs([]), 0, 'empty polygon has zero area');
  t.equal(
    calculateAcresFromLatLngs([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }]),
    0,
    'a line (fewer than 3 points) has zero area'
  );

  // The same ring given as [lat, lng] pairs must measure the same as {lat, lng} objects.
  const asPairs = oneAcrePolygon.map(p => [p.lat, p.lng]);
  t.equal(
    calculateAcresFromLatLngs(asPairs),
    calculateAcresFromLatLngs(oneAcrePolygon),
    'array-pair and object coordinate forms agree'
  );

  const center = getPolygonCenter(oneAcrePolygon);
  t.close(center[0], 0.0002855, 1e-6, 'polygon center latitude is the mean of the vertices');
  t.close(center[1], 0.0002855, 1e-6, 'polygon center longitude is the mean of the vertices');
  t.deepEqual(getPolygonCenter([]), [31.5, 73.1], 'empty polygon falls back to the default center');

  // ---- perAcreCalc: the area resolution chain ----
  const mockPlot = { id: 1, area_acres: '2.5' };
  const mockCycle = { id: 7, area_acres: '4' };
  const mockFarm = { id: 3, area_acres: '10' };
  const context = { farmPlots: [mockPlot], cropCycles: [mockCycle], farms: [mockFarm] };

  t.equal(
    resolveArea({ amount: 5000, plot_id: 1 }, context),
    2.5,
    'resolveArea cascades from the linked plot'
  );
  t.equal(
    resolveArea({ area_acres: '1.5', plot_id: 1 }, context),
    1.5,
    'an explicit area on the entry wins over the plot'
  );
  t.equal(
    resolveArea({ crop_cycle_id: 7 }, context),
    4,
    'resolveArea cascades from the crop cycle when there is no plot'
  );
  t.equal(
    resolveArea({ farm_id: 3 }, context),
    10,
    'resolveArea falls back to the farm area'
  );
  t.equal(
    resolveArea({ plot_id: 999 }, context),
    null,
    'resolveArea returns null when nothing in the chain resolves'
  );
  t.equal(
    resolveArea({ area_acres: '0', plot_id: 1 }, context),
    2.5,
    'a zero area on the entry is ignored and the chain continues'
  );

  // ---- perAcre ----
  t.equal(perAcre(5000, 2.5), 2000, 'perAcre math correct');
  t.equal(perAcre(5000, 0), null, 'perAcre guards against divide-by-zero');
  t.equal(perAcre(5000, null), null, 'perAcre guards against a missing area');
  t.equal(perAcre(1000, 3), 333.33, 'perAcre rounds to two decimals');

  // ---- totalArea: each source must only be counted once ----
  t.equal(
    totalArea([{ id: 1, plot_id: 1 }, { id: 2, plot_id: 1 }], context),
    2.5,
    'two entries on the same plot count that plot area once, not twice'
  );
  t.equal(
    totalArea([{ id: 1, plot_id: 1 }, { id: 2, crop_cycle_id: 7 }], context),
    6.5,
    'distinct area sources are summed'
  );
  t.equal(totalArea([], context), null, 'totalArea of no entries is null');

  // ---- getPlotScore ----
  // Profit = (20000 - 5000) / 2.5 acres = 6000/acre. Score = 50 + 6000/300 = 70.
  t.equal(
    getPlotScore(1, {
      farmPlots: [mockPlot],
      expenses: [{ amount: 5000, plot_id: 1 }],
      revenue: [{ amount: 20000, plot_id: 1 }],
    }),
    70,
    'performance score algorithm correct'
  );
  t.equal(
    getPlotScore(1, { farmPlots: [mockPlot], expenses: [], revenue: [] }),
    null,
    'a plot with no activity scores null rather than a misleading 50'
  );
  t.equal(
    getPlotScore(999, { farmPlots: [mockPlot] }),
    null,
    'an unknown plot scores null'
  );
  // Score is clamped to 0-100 at both ends.
  t.equal(
    getPlotScore(1, {
      farmPlots: [mockPlot],
      expenses: [],
      revenue: [{ amount: 10_000_000, plot_id: 1 }],
    }),
    100,
    'an extreme profit clamps the score at 100'
  );
  t.equal(
    getPlotScore(1, {
      farmPlots: [mockPlot],
      expenses: [{ amount: 10_000_000, plot_id: 1 }],
      revenue: [],
    }),
    0,
    'an extreme loss clamps the score at 0'
  );
}
