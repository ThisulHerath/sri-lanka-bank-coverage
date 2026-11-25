import { setupMapBackground } from './map-background.js';

const $ = selector => document.querySelector(selector);

const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const number = value => Number(value).toLocaleString('en-LK');

const years = [2026,2027,2028,2029];

const phases = {2026:{name:'Baseline',color:'#2468c5'},2027:{name:'Phase 1',color:'#078b82'},2028:{name:'Phase 2',color:'#c58a19'},2029:{name:'Phase 3',color:'#8058ba'}};

const formats = {branch:'Branches',agency:'Agency candidates',pawn:'Pawn services'};

const local = ['localhost','127.0.0.1','[::1]'].includes(location.hostname);

const state = {year:2026,channels:new Set(Object.keys(formats)),layers:new Set([2026]),district:'all',query:'',cluster:true,coverage:false};

let background, streetMap=false;

let plan, geography, map, districtLayer, markerLayer, plainMarkers, clusters, selectedId, manualView=false, presenting=false, previousScroll=0;

const boundaries = new Map();

const markers = new Map();



function validatePlan(data) {

  if (!data || data.schemaVersion!==1 || data.confidential!==true || !Array.isArray(data.sites) || !Array.isArray(data.baselineLocations) || data.districts?.length!==25) throw new Error('This is not a supported confidential planning file.');

  const seen = new Set();

  for (const row of [...data.baselineLocations,...data.sites]) {

    if (seen.has(row.id) || !formats[row.channel] || !years.includes(row.year) || !Number.isFinite(row.lat) || !Number.isFinite(row.lng) || row.lat<5.8 || row.lat>9.95 || row.lng<79.4 || row.lng>82) throw new Error('A planning record has a duplicate ID, unsupported format or invalid Sri Lanka coordinate.');

    seen.add(row.id);

    if (row.year===2026 && row.channel!=='branch') throw new Error('The 2026 scenario must have zero agencies and pawn sites.');

  }

  for (const year of years.slice(1)) for (const channel of Object.keys(formats)) {

    if (data.sites.filter(r=>r.year===year && r.channel===channel).length!==data.nationalAdditions[year][channel]) throw new Error(`The ${year} ${formats[channel]} records do not reconcile with the selected national plan.`);

  }

  return data;

}

function cumulative(year,district='all') {

  const rows=plan.districts.filter(r=>district==='all'||r.district===district);

  const totals={branch:rows.reduce((n,r)=>n+r.baseline,0),agency:0,pawn:0};

  for (const y of years.slice(1).filter(y=>y<=year)) {

    totals.branch+=rows.reduce((n,r)=>n+r.years[y].branch,0);

    totals.agency+=rows.reduce((n,r)=>n+r.years[y].agencyAdjusted,0);

  }

  totals.pawn=plan.sites.filter(r=>r.channel==='pawn' && r.year<=year && (district==='all'||r.district===district)).length;

  return totals;

}

function coverageFor(year,district=state.district) {

  const row=plan.coverage.find(c=>c.year===year);

  return district==='all'?row:row.districts[district];

}

function sourceRows(includeHiddenChannels=false) {

  return [...plan.baselineLocations,...plan.sites].filter(r=>r.year<=state.year && state.layers.has(r.year) && (includeHiddenChannels || state.channels.has(r.channel)) && (state.district==='all'||r.district===state.district) && `${r.name} ${r.town} ${r.district}`.toLowerCase().includes(state.query));

}

function plotRows() {

  const rows=sourceRows();

  const integrated=new Set(rows.filter(r=>r.upgradesFrom).map(r=>r.upgradesFrom));

  return rows.filter(r=>!integrated.has(r.id));

}

function setYear(year) {

  state.year=year;state.layers=new Set(years.filter(y=>y<=year));

  render();fit();

}

function renderControls() {

  $('#year-options').innerHTML=years.map(y=>`<button class="year-option" data-year="${y}" aria-pressed="${state.year===y}" style="--phase:${phases[y].color}">${y}<small>${phases[y].name}</small></button>`).join('');

  $('#phase-layers').innerHTML=years.map(y=>`<label class="option-label"><input type="checkbox" data-layer="${y}" ${state.layers.has(y)?'checked':''} ${y>state.year?'disabled':''}/><span class="phase-dot" style="--phase:${phases[y].color}"></span>${y} · ${phases[y].name}</label>`).join('');

  $('#channel-layers').innerHTML=Object.entries(formats).map(([key,label])=>`<label class="option-label"><input type="checkbox" data-channel="${key}" ${state.channels.has(key)?'checked':''}/>${label}<small>${number(sourceRows(true).filter(r=>r.channel===key).length)}</small></label>`).join('');

  $('#phase-key').innerHTML=years.filter(y=>y<=state.year && state.layers.has(y)).map(y=>`<div class="phase-key-row"><span class="phase-dot" style="--phase:${phases[y].color}"></span>${y} · ${phases[y].name}</div>`).join('');

}

function renderMetrics() {

  const totals=cumulative(state.year,state.district), geo=coverageFor(state.year);

  const metrics=[['Reported branches',number(totals.branch),'Full branches, Minicoms and CSPs','#2468c5'],['Agency candidates',number(totals.agency),'National-target district allocation','#078b82'],['Pawn services',number(totals.pawn),'Named town candidates; includes integrated services','#c58a19'],['Settlement proximity',`${geo.within10kmPct}%`,`${plan.baselineLocations.length} reference branch pins + scenario; settlement samples within 10 km, not population coverage`,'#8058ba']];

  $('#plan-metrics').innerHTML=metrics.map(([label,value,note,color])=>`<article class="plan-metric" style="--metric-color:${color}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('');

  $('#year-heading').textContent=`${state.year} · ${phases[state.year].name}`;

  $('#map-stage-label').textContent=state.district==='all'?'Sri Lanka · 25 districts':state.district;

  $('#baseline-note').textContent=`${number(plan.baselineReported)} reported branches; ${number(plan.baselineLocations.length)} public directory reference pins. The documents do not identify the records required to reconcile that difference.`;

  $('#presentation-stage').textContent=`${state.year} · ${phases[state.year].name} · ${state.district==='all'?'Sri Lanka':state.district}`;

  $('#presentation-plan-counts').textContent=`Reported network: ${number(totals.branch)} branches · ${number(totals.agency)} agency candidates · ${number(totals.pawn)} pawn services`;

  $('#previous-plan-year').disabled=state.year===2026;

  $('#next-plan-year').disabled=state.year===2029;

}

function renderList() {

  const rows=plotRows().sort((a,b)=>b.year-a.year||a.name.localeCompare(b.name));

  $('#plan-list-count').textContent=number(rows.length);

  $('#plan-site-list').innerHTML=rows.length?rows.map(row=>`<button class="plan-list-row" data-site="${esc(row.id)}"><span class="list-symbol" style="--phase:${phases[row.year].color}"></span><span><strong>${esc(row.name)}</strong><small>${row.year} · ${esc(row.district)}<br />${row.year===2026?'Directory reference':row.channel==='agency'?'Analyst candidate':'Report town candidate'}</small></span></button>`).join(''):'<p class="control-note">No locations match these layers and filters.</p>';

}

function renderMap() {

  plainMarkers.clearLayers();clusters.clearLayers();markers.clear();

  markerLayer=state.cluster?clusters:plainMarkers;

  const rows=plotRows();

  for (const row of rows) {

    const marker=L.marker([row.lat,row.lng],{title:`${row.year} · ${row.name}`,alt:`${row.year} · ${row.name}`,phaseYear:row.year,icon:L.divIcon({className:`planning-marker channel-${row.channel}`,html:`<span style="--phase:${phases[row.year].color}"></span>`,iconSize:[14,14],iconAnchor:[7,7]}),zIndexOffset:row.channel==='agency'?0:500});

    marker.bindPopup(`<strong>${esc(row.town || row.name)}</strong><br />${row.year} · ${esc(formats[row.channel])}${row.upgradesFrom?' · Pawn-to-branch upgrade':''}<br /><small>${row.lat.toFixed(5)}, ${row.lng.toFixed(5)}<br />${row.year===2026?'Public directory reference':'Candidate anchor; premises not approved'}</small>`,{maxWidth:280});

    marker.on('click',()=>{manualView=true;selectSite(row.id);});

    markers.set(row.id,marker);markerLayer.addLayer(marker);

  }

  for (const [name,layer] of boundaries) {

    const selected=state.district===name;

    const percent=coverageFor(state.year,name)?.within10kmPct || 0;

    layer.setStyle({fillColor:state.coverage?'#169282':selected?'#d7e8fc':'#fff',fillOpacity:state.coverage ? (streetMap ? 0.1+percent/100*.25 : 0.12+percent/100*.65) : streetMap ? .025 : 1,color:selected?'#3977b7':'#9bb2c8',weight:selected?1.8:.8});

    layer.unbindTooltip();

    layer.bindTooltip(state.coverage?`${name}: ${percent}% of sampled settlements within 10 km`:name,{direction:'center',permanent:!state.coverage && map.getZoom()<8,className:'plan-district-label'});

  }

  $('#map-view-summary').textContent=`${number(rows.length)} mapped positions · ${number(sourceRows().length)} service records · ${state.district==='all'?'all districts':state.district}`;

}

function renderAnnual() {

  $('#annual-comparison').innerHTML=years.map(year=>{

    const t=cumulative(year),c=coverageFor(year,'all');

    return `<button class="annual-card" data-year="${year}" aria-pressed="${year===state.year}" style="--phase:${phases[year].color}"><strong>${year}</strong><small>${phases[year].name} · cumulative</small><dl><dt>Branches</dt><dd>${number(t.branch)}</dd><dt>Agency</dt><dd>${number(t.agency)}</dd><dt>Pawn</dt><dd>${number(t.pawn)}</dd></dl><p>${c.within10kmPct}% of settlement samples within 10 km.<br />Branches use the report’s statutory baseline; map reference roster differs.</p></button>`;

  }).join('');

}

function renderLedger() {

  $('#ledger-year').textContent=state.year;

  $('#district-ledger').innerHTML=[...plan.districts].sort((a,b)=>a.district.localeCompare(b.district)).map(row=>{

    const t=cumulative(state.year,row.district);

    const additions=plan.sites.filter(s=>s.channel==='branch'&&s.year<=state.year&&s.district===row.district).length;

    const rawAgency=years.filter(y=>y>2026&&y<=state.year).reduce((n,y)=>n+row.years[y].agency,0);

    const matrixPawn=years.filter(y=>y>2026&&y<=state.year).reduce((n,y)=>n+row.years[y].pawn,0);

    const c=coverageFor(state.year,row.district);

    return `<tr><td><button data-district="${esc(row.district)}">${esc(row.district)}</button></td><td>${row.baseline}</td><td>${t.branch}</td><td>${additions}</td><td>${t.pawn}${matrixPawn!==t.pawn?`<span class="source-difference">Matrix: ${matrixPawn}</span>`:''}</td><td>${t.agency}${rawAgency!==t.agency?`<span class="source-difference">Adjusted from ${rawAgency}</span>`:''}</td><td>${c.within10kmPct}%<span class="source-difference">${number(c.sampleSize)} samples</span></td></tr>`;

  }).join('');

}

function render() {renderControls();renderMetrics();renderList();renderMap();renderAnnual();renderLedger();}

function fit() {

  manualView=false;

  const district=boundaries.get(state.district);

  const rows=plotRows();

  const padding=matchMedia('(max-width:600px)').matches?{paddingTopLeft:[25,65],paddingBottomRight:[25,160]}:{padding:[40,45]};

  if (district) map.fitBounds(district.getBounds(),{...padding,maxZoom:12,animate:false});

  else if (state.query && rows.length) map.fitBounds(L.latLngBounds(rows.map(r=>[r.lat,r.lng])),{...padding,maxZoom:13,animate:false});

  else map.fitBounds(districtLayer.getBounds(),{...padding,animate:false});

}

function selectSite(id) {

  selectedId=id;

  const row=[...plan.baselineLocations,...plan.sites].find(r=>r.id===id);

  if (!row)return;

  const pointLabel=row.year===2026?'Published directory coordinate':row.coordinateMethod==='public-administrative-area-reference'?'Administrative catchment anchor':'Public settlement anchor';

  $('#site-inspector').innerHTML=`<p class="eyebrow">LOCATION & SITING EVIDENCE</p><h3>${esc(row.name)}</h3><div class="inspector-badges"><span>${row.year} · ${phases[row.year].name}</span><span>${esc(row.district)}</span><span>${esc(row.status)}</span></div><dl class="site-facts"><dt>Coordinate status</dt><dd>${pointLabel}${row.year>2026?' · proposed premises not approved':''}</dd><dt>Coordinates</dt><dd>${row.lat.toFixed(6)}, ${row.lng.toFixed(6)}</dd><dt>Source reference</dt><dd>${esc(row.coordinateSource)}</dd><dt>Selection basis</dt><dd>${esc(row.provenance)}</dd>${row.nearestBranch?`<dt>Nearest branch / hub</dt><dd>${esc(row.nearestBranch.name)} · ${row.nearestBranch.km} km straight-line. Operational hub and road route require validation.</dd>`:''}${row.alternatives?`<dt>Source alternatives</dt><dd>${esc(row.alternatives)}</dd>`:''}${row.upgradesFrom?'<dt>Upgrade relationship</dt><dd>Reuses the 2027 pawn location. Pawning remains an integrated service, not a second building.</dd>':''}${row.address?`<dt>Directory address</dt><dd>${esc(row.address)}</dd>`:''}</dl>${row.reviewFlags?.length?`<p class="site-review-note">${row.reviewFlags.map(esc).join('<br />')}</p>`:''}<button id="focus-plan-site" class="button secondary">Focus this location</button>`;

  $('#focus-plan-site').addEventListener('click',()=>{

    const marker=markers.get(id);if(!marker)return;

    manualView=true;

    if(state.cluster)clusters.zoomToShowLayer(marker,()=>{map.setView(marker.getLatLng(),13,{animate:false});marker.openPopup();});

    else{map.setView(marker.getLatLng(),13,{animate:false});marker.openPopup();}

    $('.planning-map-panel').scrollIntoView({behavior:'instant',block:'start'});

  });

}

function initMap() {

  map=L.map('plan-map',{minZoom:5,maxZoom:17,zoomSnap:.25,zoomControl:false,maxBoundsViscosity:1});

  L.control.zoom({position:'topright'}).addTo(map);L.control.scale({position:'bottomright',imperial:false,maxWidth:80}).addTo(map);

  map.attributionControl.addAttribution('geoBoundaries · OSM / Wambacher · ODbL · GeoNames CC BY 4.0');

  districtLayer=L.geoJSON(geography,{style:{fillColor:'#fff',fillOpacity:1,color:'#a3bad0',weight:.8},onEachFeature:(feature,layer)=>{

    boundaries.set(feature.properties.name,layer);

    layer.on('click',()=>{$('#plan-district').value=feature.properties.name;state.district=feature.properties.name;render();fit();});

  }}).addTo(map);

  background=setupMapBackground(map,geography,'#plan-street-status');

  plainMarkers=L.layerGroup().addTo(map);

  clusters=L.markerClusterGroup({maxClusterRadius:34,showCoverageOnHover:false,animate:false,spiderfyOnMaxZoom:true,iconCreateFunction:cluster=>{

    const latest=Math.max(...cluster.getAllChildMarkers().map(m=>m.options.phaseYear));

    const cohorts=[...new Set(cluster.getAllChildMarkers().map(m=>m.options.phaseYear))].sort();

    return L.divIcon({className:`planning-cluster cohort-${latest}`,html:`<strong>${cluster.getChildCount()}</strong><span class="cluster-cohorts">${cohorts.map(y=>`<i style="background:${phases[y].color}"></i>`).join('')}</span>`,iconSize:[36,36],iconAnchor:[18,18]});

  }}).addTo(map);

  map.setMaxBounds(districtLayer.getBounds().pad(.55));

  map.on('dragstart',()=>{manualView=true;});

  $('#plan-map').addEventListener('wheel',()=>{manualView=true;},{passive:true});

  $('#plan-map').addEventListener('click',event=>{if(event.target.closest('.leaflet-control-zoom'))manualView=true;},true);

  let frame;

  new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const center=map.getCenter(),zoom=map.getZoom();map.invalidateSize({pan:false,animate:false});if(manualView)map.setView(center,zoom,{animate:false});else fit();});}).observe($('#plan-map'));

}

async function showPresentation(show) {

  if (presenting===show)return;

  presenting=show;document.body.classList.toggle('plan-presentation',show);$('#present-plan').setAttribute('aria-pressed',String(show));

  if(show){previousScroll=scrollY;try{await document.documentElement.requestFullscreen?.();}catch{/* CSS viewport presentation works when native fullscreen is unavailable. */}$('#exit-plan-presentation').focus({preventScroll:true});}

  else{try{if(document.fullscreenElement)await document.exitFullscreen();}catch{/* Layout already restored. */}window.scrollTo({top:previousScroll,behavior:'instant'});$('#present-plan').focus({preventScroll:true});}

  requestAnimationFrame(()=>{map.invalidateSize({animate:false});fit();});

}

function setFilterPanel(open) {

  $('#planning-controls').hidden=matchMedia('(max-width:1000px)').matches&&!open;

  $('#plan-filters').setAttribute('aria-expanded',String(open));

}

async function loadPlan(data) {

  plan=validatePlan(data);

  if(!geography){const r=await fetch('/assets/sri-lanka-districts.geojson');if(!r.ok)throw new Error('Local district boundaries are unavailable.');geography=await r.json();}

  $('#planning-workspace').hidden=false;

  $('#plan-district').innerHTML='<option value="all">All 25 districts</option>'+plan.districts.map(r=>r.district).sort().map(d=>`<option>${esc(d)}</option>`).join('');

  $('#plan-review-content').innerHTML=plan.issues.map(i=>`<section class="review-item"><h3>${esc(i.title)}</h3><p>${esc(i.detail)}</p></section>`).join('')+`<section class="review-item"><h3>Local sources and coordinate research</h3><p>${plan.sources.map(s=>`${esc(s.name)} · ${esc(s.section)}`).join('<br />')}</p><p>Public coordinates: GeoNames Sri Lanka country extract, CC BY 4.0. Generic geography research contained no phase counts, internal figures or source document contents. Agency suggestions maximize spatial spread within adjusted district quotas; they are not merchant contracts or premises approvals.</p></section>`;

  $('#review-plan').disabled=false;

  if(!map)initMap();

  state.year=2026;state.district='all';state.query='';state.layers=new Set([2026]);$('#plan-search').value='';

  setFilterPanel(false);render();fit();

  $('#plan-status').textContent='Confidential plan loaded locally. Proposed locations remain candidates pending branch-roster reconciliation, merchant selection and premises due diligence. Planning records stay local. If enabled, the street map requests visible map tiles from OpenStreetMap; confidential records are not included.';

  $('#plan-status').classList.remove('error');

}

document.addEventListener('click',event=>{

  if(event.target.closest('[data-street-toggle]') && map){streetMap=!streetMap;background.setVisible(streetMap);document.querySelectorAll('[data-street-toggle]').forEach(button=>{button.setAttribute('aria-pressed',String(streetMap));button.textContent=`Street map: ${streetMap?'on':'off'}`;});$('#plan-street-status').textContent=streetMap?'OpenStreetMap · Internet required; viewed tile areas are requested externally':'Clean district map · Street map is off';renderMap();}

  const year=event.target.closest('[data-year]');if(year&&plan)setYear(Number(year.dataset.year));

  const site=event.target.closest('[data-site]');if(site)selectSite(site.dataset.site);

  const district=event.target.closest('[data-district]');if(district){state.district=district.dataset.district;$('#plan-district').value=state.district;render();fit();$('.planning-map-panel').scrollIntoView({behavior:'instant',block:'start'});}

  if(event.target.closest('[data-review]'))$('#plan-review-dialog').showModal();

});

$('#phase-layers').addEventListener('change',e=>{const y=Number(e.target.dataset.layer);if(e.target.checked)state.layers.add(y);else state.layers.delete(y);render();});

$('#channel-layers').addEventListener('change',e=>{const key=e.target.dataset.channel;if(e.target.checked)state.channels.add(key);else state.channels.delete(key);render();});

$('#plan-district').addEventListener('change',e=>{state.district=e.target.value;render();fit();});

$('#plan-search').addEventListener('input',e=>{state.query=e.target.value.toLowerCase().trim();render();fit();});

$('#plan-clusters').addEventListener('change',e=>{state.cluster=e.target.checked;render();});

$('#plan-coverage').addEventListener('change',e=>{state.coverage=e.target.checked;renderMap();});

$('#fit-plan').addEventListener('click',fit);$('#present-plan').addEventListener('click',()=>showPresentation(true));$('#exit-plan-presentation').addEventListener('click',()=>showPresentation(false));

$('#previous-plan-year').addEventListener('click',()=>setYear(Math.max(2026,state.year-1)));$('#next-plan-year').addEventListener('click',()=>setYear(Math.min(2029,state.year+1)));

$('#plan-filters').addEventListener('click',()=>setFilterPanel($('#plan-filters').getAttribute('aria-expanded')!=='true'));$('#close-plan-filters').addEventListener('click',()=>setFilterPanel(false));

matchMedia('(max-width:1000px)').addEventListener('change',()=>setFilterPanel(false));

$('#review-plan').addEventListener('click',()=>$('#plan-review-dialog').showModal());$('#close-plan-review').addEventListener('click',()=>$('#plan-review-dialog').close());

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&presenting&&!$('#plan-review-dialog').open)showPresentation(false);});

document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&presenting)showPresentation(false);});

$('#plan-file').addEventListener('change',async event=>{

  if(!local)return;

  const file=event.target.files?.[0];if(!file)return;

  try{await loadPlan(JSON.parse(await file.text()));}catch(error){$('#plan-status').textContent=error.message;$('#plan-status').classList.add('error');}

});

if(!local){$('#plan-file').disabled=true;$('#plan-status').textContent='Confidential data loading is available only on localhost. Open the local project to review a plan; deployment builds exclude the private dataset.';}

else{

  try{const response=await fetch('/private/expansion-plan.json',{cache:'no-store'});if(!response.ok)throw new Error('No local plan is loaded. Choose a confidential JSON planning file; it stays in this browser session.');await loadPlan(await response.json());}

  catch(error){$('#plan-status').textContent=error.message;$('#plan-status').classList.add('error');}

}
