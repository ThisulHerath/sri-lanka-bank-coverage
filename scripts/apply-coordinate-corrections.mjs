import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const dataUrl = new URL('../assets/data/locations.json', import.meta.url);
const evidenceUrl = new URL('../assets/data/coordinate-corrections.json', import.meta.url);
const data = JSON.parse(await readFile(dataUrl, 'utf8'));
const evidence = JSON.parse(await readFile(evidenceUrl, 'utf8'));
const geography = JSON.parse(await readFile(new URL('../assets/sri-lanka-districts.geojson', import.meta.url), 'utf8'));
function inRing([x,y], ring) {
  let inside = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [xi,yi]=ring[i], [xj,yj]=ring[j];
    if ((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
function districtAt(point) {
  return geography.features.find(feature => {
    const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];
    return polygons.some(p => inRing(point,p[0]) && !p.slice(1).some(h => inRing(point,h)));
  })?.properties.name;
}
for (const fix of evidence.locations) {
  const row = data.locations.find(r => r.id === fix.id);
  assert.ok(row, `Unknown branch ${fix.id}`);
  const point = new URL(fix.sourceUrl).pathname.match(/!3d([\d.-]+)!4d([\d.-]+)/);
  assert.ok(point, `Missing Google Maps place coordinates for ${fix.id}`);
  assert.equal(Number(point[1]),fix.lat);
  assert.equal(Number(point[2]),fix.lng);
  assert.equal(districtAt([fix.lng,fix.lat]),fix.district, `District mismatch for ${fix.id}`);
  row.previousCoordinateSource ??= row.coordinateSource;
  row.previousPublishedCoordinates ??= row.publishedCoordinates || [row.lat,row.lng];
  row.coordinateReviewNote = 'The bank locator position conflicted with this branch’s locality or duplicated another branch. Replaced with the referenced Google Maps place position; the original source coordinates are retained in the dataset.';
  Object.assign(row, {
    lat:fix.lat, lng:fix.lng, district:fix.district, districtBasis:'coordinate-in-district',
    coordinateStatus:'published', coordinateMethod:'google-maps-place',
    coordinateSourceRecordId:fix.sourceId, coordinateSource:fix.sourceUrl, coordinateLookupSource:fix.sourceUrl,
    coordinateMatch:fix.match, coordinateVerifiedOn:evidence.verifiedOn,
    mapsUrl:fix.sourceUrl, mapsLinkType:'published-coordinate',
  });
}
for (const [bank,report] of Object.entries(data.metadata.banks)) {
  const rows = data.locations.filter(r => r.bank === bank);
  report.mapped = rows.filter(r => r.lat !== null).length;
  report.pinPending = rows.length-report.mapped;
  report.districts = new Set(rows.map(r => r.district).filter(d => d !== 'Needs review')).size;
  report.districtNeedsReview = rows.filter(r => r.district === 'Needs review').length;
}
data.metadata.sources = data.metadata.sources.filter(s => s.name !== 'Google Maps coordinate conflict corrections');
data.metadata.sources.push({name:'Google Maps coordinate conflict corrections',url:'https://www.google.com/maps',verifiedOn:evidence.verifiedOn,records:evidence.locations.length,evidenceFile:'coordinate-corrections.json'});
await writeFile(dataUrl,JSON.stringify(data)+'\n');
await writeFile(new URL('../assets/data/source-report.json',import.meta.url),JSON.stringify(data.metadata,null,2)+'\n');
console.log(`Applied ${evidence.locations.length} source-linked position corrections; all corrected districts checked against map geometry.`);
