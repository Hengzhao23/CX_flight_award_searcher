// Run with: node results.test.js
const assert = require('assert');
const { summarize } = require('./results.js');
const seg = (fl, o, d, t, cabins) => ({ flightIdentifier: { marketingAirline: 'CX', flightNumber: fl, originDate: t }, originLocation: o, destinationLocation: d, cabins });
const bom = { modelObject: { availabilities: { upsell: { bounds: [{ flights: [
  { segments: [seg('500', 'A:HKG', 'A:NRT', Date.UTC(2026, 10, 1, 9, 5), { B: { status: '2' }, E: { status: '1' }, R: { status: '3' } })] },
  { segments: [seg('400', 'HKG', 'TPE', 0, { F: { status: '1' }, B: { status: '4' } }), seg('450', 'TPE', 'NRT', 0, { B: { status: '1' } })] },
  { segments: [seg('502', 'HKG', 'NRT', 0, { B: { status: '0' } })] },
] }] } } } };
const rows = summarize(bom);
assert.strictEqual(rows.length, 2, 'itinerary with no seats is dropped');
assert.deepStrictEqual(rows[0], { flights: 'CX500', route: 'HKG-NRT', dep: '2026-11-01 09:05', F: 0, J: 2, PY: 0, Y: 4 });
assert.deepStrictEqual([rows[1].route, rows[1].F, rows[1].J], ['HKG-TPE-NRT', 0, 1], 'connection limited by tightest segment');
assert.throws(() => summarize({ modelObject: { isContainingErrors: true, messages: [{ text: 'No flights' }] } }), /No flights/);
console.log('ok');
