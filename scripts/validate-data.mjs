import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const dataset = JSON.parse(await readFile(new URL('../assets/data/locations.json', import.meta.url), 'utf8'));
const geography = JSON.parse(await readFile(new URL('../assets/sri-lanka-districts.geojson', import.meta.url), 'utf8'));
const { locations, metadata } = dataset;
const districts = new Set(geography.features.map(feature => feature.properties.name));
assert.equal(districts.size, 25, 'The map must include all 25 districts.');
assert.equal(new Set(locations.map(row=>row.id)).size,locations.length,'Duplicate location IDs.');
assert.equal(locations.length,metadata.records,'Source report total differs from the dataset.');
const knownServices = new Set(['ATM','CRM','CDM','EDM','ACDM']);
for (const row of locations) {
  assert.ok(['com','boc','pb'].includes(row.bank),`${row.id}: unknown bank`);
  assert.ok(row.name && row.town,`${row.id}: missing name or town`);
  assert.ok(districts.has(row.district) || row.district === 'Needs review',`${row.id}: invalid district`);
  assert.ok(['branch','self-service'].includes(row.kind),`${row.id}: invalid location type`);
  assert.ok(!/\b(?:demo|sample)\s+branch\b/i.test(row.name),`${row.id}: leftover demo record`);
  assert.ok(!/^and contact details/i.test(row.address || ''),`${row.id}: introduction was parsed as an address`);
  assert.ok(row.services === null || row.services.every(service=>knownServices.has(service)),`${row.id}: unknown facility`);
  const source = new URL(row.sourceUrl);
  assert.ok(source.protocol === 'https:' && ['www.combank.lk','branches.lk'].includes(source.hostname),`${row.id}: invalid source link`);
  const maps = new URL(row.mapsUrl);
  assert.equal(maps.hostname,'www.google.com',`${row.id}: invalid Maps link`);
  if (row.lat !== null || row.lng !== null) {
    assert.ok(Number.isFinite(row.lat) && Number.isFinite(row.lng),`${row.id}: invalid coordinate values`);
    assert.ok(row.lat>=5.85 && row.lat<=9.9 && row.lng>=79.5 && row.lng<=82,`${row.id}: outside Sri Lanka bounds`);
    assert.equal(row.coordinateStatus,'published',`${row.id}: unsourced pin`);
    assert.notEqual(row.status,'closed',`${row.id}: closed branch must not have a live map pin`);
    const [lat,lng] = new URL(row.coordinateSource).searchParams.get('daddr').split(',').map(Number);
    assert.equal(row.lat,lat,`${row.id}: latitude changed from the published source`);
    assert.equal(row.lng,lng,`${row.id}: longitude changed from the published source`);
    assert.equal(row.mapsLinkType,'published-coordinate');
  } else {
    assert.equal(row.mapsLinkType,'address-search',`${row.id}: missing pin must use an address search`);
    assert.equal(maps.searchParams.get('api'),'1');
  }
}
for (const bank of ['com','boc','pb']) {
  const rows = locations.filter(row=>row.bank === bank);
  assert.equal(rows.length,metadata.banks[bank].records,`${bank}: source count mismatch`);
  assert.equal(rows.filter(row=>row.lat !== null).length,metadata.banks[bank].mapped,`${bank}: mapped count mismatch`);
  assert.equal(rows.filter(row=>row.lat === null).length,metadata.banks[bank].pinPending,`${bank}: pending count mismatch`);
}
assert.equal(locations.filter(row=>row.bank==='com' && row.kind==='branch').length,metadata.sources[0].branchRecords);
console.log(`Validated ${locations.length} source-linked records, 25 districts, service types, and source-coordinate integrity.`);
