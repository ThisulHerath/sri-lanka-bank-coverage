import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
let plan;
try { plan=JSON.parse(await readFile(new URL('../private/expansion-plan.json',import.meta.url),'utf8')); }
catch(error) { if(error.code==='ENOENT'){console.log('No private plan present; public build remains data-free.');process.exit(0);}throw error; }
const geography=JSON.parse(await readFile(new URL('../assets/sri-lanka-districts.geojson',import.meta.url),'utf8'));
assert.equal(plan.confidential,true);
assert.equal(plan.districts.length,25);
assert.equal(plan.districts.reduce((n,d)=>n+d.baseline,0),plan.baselineReported);
const ids=new Set(),allowed=new Set(['branch','agency','pawn']);
function inRing([x,y],ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
function inDistrict(row){const feature=geography.features.find(f=>f.properties.name===row.district);assert.ok(feature,`${row.id}: unknown district`);const ps=feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[feature.geometry.coordinates];return ps.some(p=>inRing([row.lng,row.lat],p[0])&&!p.slice(1).some(h=>inRing([row.lng,row.lat],h)));}
function nearHistoricalBoundary(row){
 if(row.year!==2026||!row.boundaryReviewNote||row.sourceUrl!=='https://www.combank.lk/branches')return false;
 const f=geography.features.find(f=>f.properties.name===row.district),ps=f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates];
 const sx=111.32*Math.cos(row.lat*Math.PI/180),sy=111.32;
 return ps.some(poly=>poly[0].some((a,i,ring)=>{const b=ring[(i+1)%ring.length],ax=(a[0]-row.lng)*sx,ay=(a[1]-row.lat)*sy,bx=(b[0]-row.lng)*sx,by=(b[1]-row.lat)*sy,dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));return Math.hypot(ax+t*dx,ay+t*dy)<=2;}));
}
for(const row of [...plan.baselineLocations,...plan.sites]){
 assert.ok(!ids.has(row.id),'Duplicate planning site');ids.add(row.id);
 assert.ok(allowed.has(row.channel),'Unsupported map format');
 assert.ok([2026,2027,2028,2029].includes(row.year));
 assert.ok(Number.isFinite(row.lat)&&Number.isFinite(row.lng));
 assert.ok(row.coordinateSource&&row.provenance,'Missing location provenance');
 assert.ok(inDistrict(row)||nearHistoricalBoundary(row),`${row.id}: coordinate outside its assigned district without a reviewed historical-boundary exception`);
 if(row.year===2026)assert.equal(row.channel,'branch');
 if(row.year>2026)assert.ok(row.geoId&&row.status.includes('candidate'),'Proposed premises must remain explicit candidates');
 if(row.upgradesFrom){const old=plan.sites.find(s=>s.id===row.upgradesFrom);assert.ok(old);assert.equal(old.channel,'pawn');assert.equal(row.lat,old.lat);assert.equal(row.lng,old.lng);}
}
for(const [year,target] of Object.entries(plan.nationalAdditions)){
 for(const channel of allowed)assert.equal(plan.sites.filter(s=>s.year===Number(year)&&s.channel===channel).length,target[channel],`${year} ${channel}: count mismatch`);
 assert.equal(plan.districts.reduce((n,d)=>n+d.years[year].agencyAdjusted,0),target.agency,'Adjusted agency allocation must preserve national totals');
 for(const d of plan.districts){assert.equal(plan.sites.filter(s=>s.year===Number(year)&&s.channel==='agency'&&s.district===d.district).length,d.years[year].agencyAdjusted);assert.equal(plan.sites.filter(s=>s.year===Number(year)&&s.channel==='branch'&&s.district===d.district).length,d.years[year].branch);}
}
assert.equal(new Set(plan.sites.filter(s=>s.channel==='agency').map(s=>s.geoId)).size,plan.sites.filter(s=>s.channel==='agency').length,'Agency candidates must use distinct referenced settlements');
for(let i=1;i<plan.coverage.length;i++){assert.ok(plan.coverage[i].within10kmPct>=plan.coverage[i-1].within10kmPct);assert.ok(plan.coverage[i].p90km<=plan.coverage[i-1].p90km);}
console.log('Validated local confidential plan: phase/channel totals, adjusted allocations, provenance, upgrades, district geometry and cumulative proximity.');
