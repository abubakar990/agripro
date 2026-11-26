import { ownedLandValue } from '../../src/utils/finance.js';

export default function run(t) {
  t.equal(ownedLandValue({ area_acres: 97, leased_acres: 5, land_value: 6000000 }), 552000000, 'Sardargarh: 92 owned acres x 60 lac = 55.2 crore');
  t.equal(ownedLandValue({ area_acres: '97.00', leased_acres: '0', land_value: '6000000' }), 582000000, 'no rented land: all acres count');
  t.equal(ownedLandValue({ area_acres: 5, leased_acres: 5, land_value: 6000000 }), 0, 'fully rented farm has no land value');
  t.equal(ownedLandValue({ area_acres: null, leased_acres: 5, land_value: 6000000 }), 0, 'missing area never goes negative');
}
