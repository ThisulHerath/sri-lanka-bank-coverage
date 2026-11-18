import { banks, services, loadData } from './data.js';
import { icon, hydrateIcons } from './icons.js';
import { setupMapPresentation } from './presentation.js';
import { setupDistrictComparison } from './districts.js';
import { setupMapBackground } from './map-background.js';
import { setupResponsiveLayout } from './responsive.js';

hydrateIcons();
setupResponsiveLayout();
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const hasPin = location => Number.isFinite(location.lat) && Number.isFinite(location.lng) && location.coordinateStatus === 'published' && location.status !== 'closed';
const state = { mapMode:'locations', groupPins:false, streetMap:true, mode:'single', selected:new Set(['com']), district:'all', query:'', service:'all', kind:'branch', activeBranch:null, openDistricts:new Set(), openTowns:new Set() };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let branches = [], districts = [], metadata, geography, map, markers, districtLayer, pendingLayer, presentation, districtCounts, pinLayer, clusterLayer, background;
let userPositionedMap = false;
const markerById = new Map(), districtByName = new Map();
const count = value => value.toLocaleString('en-LK');
const assignmentLabels = {
  'coordinate-in-district':'District assigned from published coordinates',
  'source-district':'District as listed in the source directory',
  'town-reference':'District inferred from a town reference · review recommended',
  'bank-region-inference':'District inferred from the bank’s regional index · review recommended',
  'address-district-inference':'District inferred from the source address · review recommended',
  'unresolved':'District assignment needs review',
};

function safeLink(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && ['www.google.com','www.combank.lk','www.boc.lk','www.peoplesbank.lk','branches.lk'].includes(parsed.hostname)) return esc(parsed.href);
  } catch { /* Do not turn untrusted source strings into links. */ }
  return '#';
}
function coordinateReferenceLabel(row) {
  return row.coordinateMethod === 'google-maps-place' ? 'Google Maps place listing' : `${banks[row.bank].name} official locator`;
}
function coordinateDescription(row) {
  if (row.coordinateMethod === 'official-locator-map') return 'Position published in People’s Bank’s official map locator.';
  if (row.coordinateMethod === 'google-maps-place') return `Position from the referenced Google Maps place listing. Match: ${row.coordinateMatch || 'branch identity and address'}`;
  return 'Position from the bank’s published Google Maps direction link.';
}
function visibleBranches() {
  return branches.filter(row => state.selected.has(row.bank)
    && (state.district === 'all' || row.district === state.district)
    && (state.kind === 'all' || row.kind === state.kind)
    && (state.service === 'all' || row.services?.includes(state.service))
    && `${row.name} ${row.town} ${row.district} ${row.address || ''} ${row.branchCode || ''} ${banks[row.bank].name}`.toLowerCase().includes(state.query));
}
function facilities(row, full = false) {
  if (row.services === null) return '<span class="facility-unknown">Facilities not published</span>';
  if (!row.services.length) return '<span class="facility-unknown">No facilities listed</span>';
  return `<span class="facility-badges">${row.services.map(service => `<span class="facility-badge" title="${esc(services[service])}">${esc(service)}${full ? `<small>${esc(services[service])}</small>` : ''}</span>`).join('')}</span>`;
}
function renderBanks() {
  $('#bank-options').classList.toggle('compare-state', state.mode === 'compare');
  $('#bank-options').innerHTML = Object.entries(banks).map(([id, bank]) => `<button class="bank-option" data-bank="${id}" aria-pressed="${state.selected.has(id)}" aria-label="${esc(bank.name)}" style="--bank-color:${bank.color};--bank-tint:${bank.tint}"><span class="bank-logo">${bank.initials}</span><span><span class="bank-name">${esc(bank.name)}</span><span class="bank-abbr">${count(state.mapMode === 'reported' ? districtCounts.totals[id] : metadata.banks[id].records)} ${state.mapMode === 'reported' ? 'reported branches' : 'imported locations'}</span></span><span class="bank-radio">${state.selected.has(id) ? icon('check') : ''}</span></button>`).join('');
  $('#selection-hint').textContent = state.mode === 'single' ? 'Select one' : 'Select one or more';
  $('#single-mode').setAttribute('aria-pressed', String(state.mode === 'single'));
  $('#compare-mode').setAttribute('aria-pressed', String(state.mode === 'compare'));
  $('#service-options').innerHTML = ['all', ...Object.keys(services)].map(service => `<button data-service="${service}" aria-pressed="${state.service === service}" title="${esc(services[service] || 'All published and unknown facilities')}">${service === 'all' ? 'All' : service}</button>`).join('');
}
function renderList(visible) {
  if (state.mapMode === 'reported') {
    const rows = districtCounts.districts.filter(row => state.district === 'all' || state.district === row.district);
    $('#list-count').textContent = rows.length;
    $('#branch-list').innerHTML = rows.map(row => `<button class="reported-district-row" data-focus-district="${row.district}" aria-pressed="${state.district === row.district}"><span><strong>${row.label}</strong><small>${[...state.selected].map(id => `${banks[id].short} ${row[id]}`).join(' / ')}</small></span><b>${count(reportedTotal(row))}</b></button>`).join('');
    return;
  }
  $('#list-count').textContent = count(visible.length);
  const groups = new Map(districts.map(district => [district, []]));
  visible.forEach(row => {
    if (!groups.has(row.district)) groups.set(row.district, []);
    groups.get(row.district).push(row);
  });
  const selectedGroups = [...groups].filter(([district]) => state.district === 'all' || state.district === district);
  $('#branch-list').innerHTML = selectedGroups.map(([district, locations]) => {
    const towns = new Map();
    locations.forEach(row => { if (!towns.has(row.town)) towns.set(row.town, []); towns.get(row.town).push(row); });
    const isOpen = state.district === district || state.openDistricts.has(district) || (state.query && locations.length);
    const townHTML = [...towns].sort(([a],[b]) => a.localeCompare(b)).map(([town, rows]) => {
      const key = `${district}:${town}`;
      return `<details class="town-group" data-town-group="${esc(key)}" ${state.openTowns.has(key) || state.query ? 'open' : ''}><summary><span>${esc(town)}</span><small>${rows.length} ${rows.length === 1 ? 'location' : 'locations'}</small></summary><div class="town-locations">${rows.map(row => `<button class="branch-row sourced-row" data-branch="${row.id}" aria-label="View ${esc(banks[row.bank].name)}, ${esc(row.name)}" style="--bank-color:${banks[row.bank].color}"><span class="branch-dot ${row.kind === 'self-service' ? 'square' : ''}"></span><span class="branch-row-body"><strong>${esc(row.name)}</strong><small>${esc(banks[row.bank].name)}${row.branchCode ? ` · ${esc(row.branchCode)}` : ''}</small>${facilities(row)}${row.statusNote && row.status !== 'closed' ? '<span class="operation-review">Operating status needs review</span>' : ''}<span class="pin-status ${hasPin(row) ? 'located' : ''}">${row.status === 'closed' ? 'Closed / amalgamated' : hasPin(row) ? 'Published map pin' : 'Map pin pending'}</span></span><span>${icon('arrow-up-right')}</span></button>`).join('')}</div></details>`;
    }).join('');
    return `<details class="district-group" data-district-group="${esc(district)}" ${isOpen ? 'open' : ''}><summary><span>${esc(district)}</span><small>${count(locations.length)}</small><span class="summary-chevron">${icon('chevron-down')}</span></summary><div class="district-contents">${locations.length ? `${district !== 'Needs review' ? `<button class="district-focus" data-focus-district="${esc(district)}">Focus district on map ${icon('arrow-up-right')}</button>` : '<p class="district-review">These records need a reliable district assignment.</p>'}${townHTML}` : '<p class="district-empty">No classified records match these filters.</p>'}</div></details>`;
  }).join('');
  if (!visible.length) $('#branch-list').innerHTML = '<div class="empty-state">No locations match these filters.<br />Try another bank, district, facility or search.</div>';
}

function reportedTotal(row) { return [...state.selected].reduce((sum,id) => sum+row[id],0); }
function reportedRows() { return districtCounts.districts.filter(row => state.district === 'all' || row.district === state.district); }
function renderReportedMap() {
  markers.clearLayers(); pendingLayer.clearLayers(); markerById.clear();
  const max = Math.max(...districtCounts.districts.map(reportedTotal));
  for (const [name,layer] of districtByName) {
    const row = districtCounts.districts.find(item => item.district === name);
    const value = reportedTotal(row);
    const selected = state.district === name;
    const muted = state.district !== 'all' && !selected;
    layer.unbindTooltip();
    layer.setStyle({fillColor:'#1769dc', fillOpacity:muted ? .06 : .12+.58*value/max, color:selected ? '#164e99' : '#8aa7c2',weight:selected ? 2 : 1});
    layer.bindTooltip(`${row.label}: ${value} reported branches (2025, provisional)`,{direction:'top'});
    if (muted) continue;
    const marker = L.marker(layer.getBounds().getCenter(), {icon:L.divIcon({className:'reported-count-marker',html:`<span>${row.label}</span><strong>${value}</strong>`,iconSize:[100,40],iconAnchor:[50,20]}),title:`${row.label}: ${value} reported branches; district aggregate, not an individual location`}).addTo(pendingLayer);
    marker.on('click',()=>focusDistrict(name));
  }
  $('#map-notice').hidden = true;
}
function renderMarkers(visible) {
  if (map) {
    pinLayer.clearLayers(); clusterLayer.clearLayers();
    markers = state.groupPins ? clusterLayer : pinLayer;
    background.setVisible(state.mapMode === 'locations' && state.streetMap);
  }
  if (state.mapMode === 'reported' && map) { renderReportedMap(); return; }
  if (!map) return;
  markers.clearLayers(); pendingLayer.clearLayers(); markerById.clear();
  const mapped = visible.filter(hasPin);
  const leafletMarkers = mapped.map(row => {
    const bank = banks[row.bank];
    const marker = L.marker([row.lat, row.lng], {
      bankId: row.bank,
      icon:L.divIcon({className:`branch-pin ${row.kind === 'self-service' ? 'machine-pin' : ''}`,html:`<span style="--bank-color:${bank.color}"></span>`,iconSize:[22,22],iconAnchor:[11,11],popupAnchor:[0,-6]}),
      title:`${bank.name} — ${row.name}`,alt:`${bank.name} — ${row.name}`,riseOnHover:true,
    }).bindPopup(`<div class="popup-bank" style="color:${bank.color}">${esc(bank.name)}</div><h3 class="popup-title">${esc(row.name)}</h3><div class="popup-district">${esc(row.town)} · ${esc(row.district)}</div>${facilities(row)}<p class="popup-coordinates">${row.lat.toFixed(6)}, ${row.lng.toFixed(6)}</p><p class="popup-address">${esc(row.address || 'Address not published')}</p><div class="popup-actions"><button data-detail="${row.id}">Location details ${icon('arrow-right')}</button><a href="${safeLink(row.mapsUrl)}" target="_blank" rel="noopener noreferrer">Google Maps ${icon('arrow-up-right')}</a></div>`,{maxWidth:300,autoPanPaddingTopLeft:[15,90],autoPanPaddingBottomRight:[20,35]});
    marker.on('click', () => { state.activeBranch = row.id; userPositionedMap = true; });
    markerById.set(row.id,marker);
    return marker;
  });
  leafletMarkers.forEach(marker => markers.addLayer(marker));
  for (const [name, layer] of districtByName) {
    const selected = state.district === name;
    layer.setStyle({fillColor:selected ? '#dbe9fc' : '#ffffff',color:selected ? '#5489c8' : '#9ab1c5',weight:selected ? 1.8 : .65,fillOpacity:state.streetMap ? (selected ? .08 : .015) : 1});
    layer.unbindTooltip();
    layer.bindTooltip(name,{direction:'top',className:'district-label',opacity:.85});
  }
  const pending = visible.filter(row=>!hasPin(row));
  $('#map-notice').hidden = !pending.length;
  $('#map-notice').textContent = `${count(pending.length)} records lack reliable coordinates and are listed in the directory only. No district-centre pins are used.`;
}

function render() {
  const visible = visibleBranches();
  const mapped = visible.filter(hasPin).length;
  const selectedBanks = [...state.selected].map(id=>banks[id]);
  const branchCount = visible.filter(row=>row.kind === 'branch').length;
  const siteCount = visible.length - branchCount;
  $('#branch-count').textContent = count(visible.length);
  $('#location-breakdown').textContent = `${count(branchCount)} branch ${branchCount === 1 ? 'record' : 'records'} · ${count(siteCount)} self-service ${siteCount === 1 ? 'site' : 'sites'}`;
  $('#district-count').textContent = new Set(visible.map(row=>row.district).filter(name=>districts.includes(name))).size;
  const unclassified = visible.filter(row=>row.district === 'Needs review').length;
  $('#district-summary').textContent = unclassified ? `${unclassified} district assignments need review` : 'Districts with classified records';
  $('#bank-count').textContent = state.selected.size;
  $('#selected-summary').textContent = state.selected.size === 1 ? selectedBanks[0].name : selectedBanks.map(bank=>bank.short).join(' · ');
  $('#mapped-count').textContent = count(mapped);
  $('#pending-summary').textContent = `${count(visible.length-mapped)} records without usable pins`;
  $('#map-subtitle').textContent = state.selected.size === 1 ? selectedBanks[0].name : 'Three-bank comparison';
  if (state.selected.size === 2) $('#map-subtitle').textContent = selectedBanks.map(bank=>bank.short).join(' + ');
  $('#map-geography').textContent = state.district === 'all' ? '25 district boundaries' : state.district;
  $('#legend-items').innerHTML = selectedBanks.map(bank=>`<div class="legend-item" style="--bank-color:${bank.color}"><span class="legend-dot"></span>${esc(bank.name)}</div>`).join('');
  $('#visible-summary').textContent = `${count(mapped)} ${mapped === 1 ? 'pin' : 'pins'} · ${count(visible.length-mapped)} pending`;
  const unknown = visible.filter(row=>row.services === null).length;
  $('#service-explanation').textContent = state.service === 'all' ? (unknown ? `${count(unknown)} records have unpublished facility information.` : 'Badges indicate facilities listed at each location.') : `${state.service}: ${services[state.service]}. Only published facilities are included.`;
  renderBanks(); renderList(visible); renderMarkers(visible);
  const reported = state.mapMode === 'reported';
  const reviewOption = $('#district-filter option[value="Needs review"]');
  if (reviewOption) reviewOption.disabled = reported;
  document.body.classList.toggle('reported-view', reported);
  $('#location-only-filters').hidden = reported;
  $('#pin-map-options').hidden = reported;
  $('#map-data-mode').value = state.mapMode;
  $('#map-pins-button').setAttribute('aria-pressed',String(!reported));
  $('#map-totals-button').setAttribute('aria-pressed',String(reported));
  $('#presentation-data-toggle').textContent = reported ? 'Show branch pins' : 'Show district totals';
  $('#location-search-wrap').hidden = reported;
  $('#directory-stats').hidden = reported;
  $('#reference-context').hidden = reported;
  $('#reference-context').textContent = `2025 reference: ${count(reportedRows().reduce((sum,row)=>sum+reportedTotal(row),0))} reported branches for these banks and districts. Directory records below are a separate snapshot.`;
  $('#map-data-explanation').textContent = reported ? 'Official district counts, 2025 provisional. Select banks to compare their networks.' : 'One pin per published location. Select a pin for its address, coordinates and Google Maps directions.';
  $('#directory-list-title').textContent = reported ? 'District branch totals' : 'Districts & towns';
  $('#map-help').textContent = reported ? 'Numbers represent whole districts, not exact branch positions. Switch to individual locations for addresses and facilities.' : 'Each pin uses published branch coordinates. Zoom in to separate nearby pins. Records without reliable coordinates stay in the directory.';
  $('#legend-explanation').innerHTML = reported ? 'District counts · 2025 provisional<br />Darker fill = more selected-bank branches<br />CBSL · ESS 2026 · Table 7.8' : '<i class="legend-branch"></i> Branch <i class="legend-machine"></i> Self-service<br />Pins = published locations<br />Click a pin for coordinates and directions';
  $('#map-instruction').textContent = reported ? 'Select a district to focus its totals' : 'Click a district to explore its towns';
  $('#map-footer-instruction').textContent = reported ? 'District aggregates · Switch map data to explore individual locations' : 'Individual location pins · Click a pin for its address and coordinates';
  if (reported) {
    $('#map-subtitle').textContent += ' · 2025 reported';
    $('#visible-summary').textContent = `${count(reportedRows().reduce((sum,row)=>sum+reportedTotal(row),0))} reported branches`;
  }
  presentation?.refresh();
}

function fitVisible({animate = !reducedMotion} = {}) {
  if (!map) return;
  userPositionedMap = false;
  const selected = districtByName.get(state.district);
  if (selected) map.fitBounds(selected.getBounds(),{padding:[55,70],maxZoom:11,animate});
  else if (state.query) {
    const mapped = visibleBranches().filter(hasPin);
    if (mapped.length) map.fitBounds(L.latLngBounds(mapped.map(row=>[row.lat,row.lng])),{padding:[80,90],maxZoom:14,animate});
    else map.fitBounds(districtLayer.getBounds(),{padding:[30,35],animate:false});
  } else map.fitBounds(districtLayer.getBounds(),{padding:[30,35],animate:false});
}
function focusDistrict(name) {
  state.district = name; state.openDistricts.add(name);
  $('#district-filter').value = name;
  render(); fitVisible();
}
function showLocation(id) {
  const row = branches.find(item=>item.id === id);
  if (!row) return;
  state.activeBranch = id;
  const bank = banks[row.bank];
  const status = row.status === 'closed' ? 'Closed / amalgamated' : hasPin(row) ? 'Published coordinates' : row.coordinateStatus.startsWith('rejected') ? 'Source coordinates need review · pin withheld' : 'Coordinates not published · pin pending';
  $('#location-content').innerHTML = `<div class="popup-bank" style="color:${bank.color}">${esc(bank.name)}${row.branchCode ? ` · ${esc(row.branchCode)}` : ''}</div><h2 id="location-dialog-title">${esc(row.name)}</h2><p class="location-subtitle">${esc(row.district)} district / ${esc(row.town)} · ${row.kind === 'branch' ? 'Branch' : 'Self-service site'}</p><p class="location-address">${esc(row.address || 'Address not published in this source.')}</p>${facilities(row,true)}<div class="coordinate-card ${hasPin(row) ? 'has-coordinate' : ''}"><strong>${esc(status)}</strong><p>${hasPin(row) ? `${row.lat}, ${row.lng}<br />${esc(coordinateDescription(row))}` : 'Google Maps opens an address search. An exact branch position has not been confirmed.'}</p>${row.statusNote ? `<p>${esc(row.statusNote)}</p>` : ''}</div><dl class="location-facts"><dt>District assignment</dt><dd>${esc(assignmentLabels[row.districtBasis] || 'Requires review')}</dd>${row.phones.length ? `<dt>Telephone</dt><dd>${row.phones.map(phone=>esc(phone)).join('<br />')}</dd>` : ''}${row.hours ? `<dt>Published hours</dt><dd>${esc(row.hours)}</dd>` : ''}<dt>Data source</dt><dd><a href="${safeLink(row.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(row.sourceLabel)} ${icon('arrow-up-right')}</a></dd>${row.coordinateLookupSource ? `<dt>Coordinate reference</dt><dd><a href="${safeLink(row.coordinateLookupSource)}" target="_blank" rel="noopener noreferrer">${esc(coordinateReferenceLabel(row))} ${icon('arrow-up-right')}</a></dd>` : ''}</dl><div class="location-actions"><a class="button button-primary" href="${safeLink(row.mapsUrl)}" target="_blank" rel="noopener noreferrer">${hasPin(row) ? 'Open location in Google Maps' : 'Search address in Google Maps'} ${icon('arrow-up-right')}</a>${hasPin(row) ? `<button class="button button-white" data-show-pin="${row.id}">Show on this map ${icon('pin')}</button>` : ''}</div><p class="snapshot-note">Source snapshot: 13 Nov 2026. Facility and opening-hour availability may change.</p>`;
  if (row.coordinateReviewNote) {
    const note = document.createElement('p');
    note.textContent = row.coordinateReviewNote;
    $('#location-content .coordinate-card').append(note);
  }
  if (!$('#location-dialog').open) $('#location-dialog').showModal();
}

function navigateOverview({district, bank}) {
  state.mapMode = 'locations';
  state.mode = bank === 'total' ? 'compare' : 'single';
  state.selected = new Set(bank === 'total' ? Object.keys(banks) : [bank]);
  state.query=''; state.service='all'; state.kind='branch';
  $('#branch-search').value=''; $('#location-type').value=state.kind;
  $('#map-data-mode').value=state.mapMode;
  focusDistrict(district);
  $('#network-explorer').scrollIntoView({behavior:reducedMotion ? 'instant' : 'smooth',block:'start'});
}
function setupEvents() {
  function setMapMode(mode) {
    state.mapMode = mode;
    if (mode === 'reported' && state.district === 'Needs review') { state.district='all'; $('#district-filter').value='all'; }
    render(); fitVisible();
  }
  $('#map-data-mode').addEventListener('change', event => setMapMode(event.target.value));
  $('#map-pins-button').addEventListener('click', () => setMapMode('locations'));
  $('#map-totals-button').addEventListener('click', () => setMapMode('reported'));
  $('#presentation-data-toggle').addEventListener('click', () => setMapMode(state.mapMode === 'reported' ? 'locations' : 'reported'));
  $('#group-pins').addEventListener('change', event => {state.groupPins=event.target.checked;render();});
  $('#street-map').addEventListener('change', event => {state.streetMap=event.target.checked;render();});
  $('#bank-options').addEventListener('click',event=>{
    const button = event.target.closest('[data-bank]'); if (!button) return;
    const bank = button.dataset.bank;
    if (state.mode === 'single') state.selected = new Set([bank]);
    else if (state.selected.has(bank) && state.selected.size > 1) state.selected.delete(bank);
    else state.selected.add(bank);
    state.activeBranch = null; render();
    $(`[data-bank="${bank}"]`).focus({preventScroll:true});
  });
  $('#single-mode').addEventListener('click',()=>{
    state.mode='single';state.selected=new Set([state.selected.has('com')?'com':[...state.selected][0]]);render();
  });
  $('#compare-mode').addEventListener('click',()=>{
    if(state.mode==='compare')return;
    state.mode='compare';state.selected=new Set(Object.keys(banks));render();
  });
  $('#district-filter').addEventListener('change',event=>focusDistrict(event.target.value));
  $('#location-type').addEventListener('change',event=>{state.kind=event.target.value;render();fitVisible();});
  $('#service-options').addEventListener('click',event=>{
    const button=event.target.closest('[data-service]');if(!button)return;
    state.service=button.dataset.service;render();
    $(`[data-service="${state.service}"]`).focus({preventScroll:true});
  });
  $('#branch-search').addEventListener('input',event=>{state.query=event.target.value.toLowerCase().trim();render();fitVisible();});
  $('#branch-list').addEventListener('toggle',event=>{
    const el=event.target;
    if(!el.isConnected)return;
    const key=el.dataset.districtGroup || el.dataset.townGroup;
    if(!key)return;
    const store=el.dataset.districtGroup ? state.openDistricts : state.openTowns;
    if(el.open)store.add(key);else store.delete(key);
  },true);
  $('#branch-list').addEventListener('click',event=>{
    const location=event.target.closest('[data-branch]');
    const district=event.target.closest('[data-focus-district]');
    if(location)showLocation(location.dataset.branch);
    else if(district)focusDistrict(district.dataset.focusDistrict);
  });
  $('#map').addEventListener('click',event=>{const button=event.target.closest('[data-detail]');if(button)showLocation(button.dataset.detail);});
  $('#location-content').addEventListener('click',event=>{
    const button=event.target.closest('[data-show-pin]');if(!button)return;
    const marker=markerById.get(button.dataset.showPin);
    if(!marker)return;
    $('#location-dialog').close();
    userPositionedMap = true;
    if (state.groupPins) markers.zoomToShowLayer(marker,()=>{map.setView(marker.getLatLng(),Math.max(map.getZoom(),16));marker.openPopup();});
    else { map.setView(marker.getLatLng(),16,{animate:!reducedMotion}); marker.openPopup(); }
  });
  $('#reset-map').addEventListener('click',()=>{
    state.district='all';state.query='';state.kind='branch';state.service='all';state.activeBranch=null;
    $('#district-filter').value='all';$('#branch-search').value='';$('#location-type').value='branch';
    render();map?.closePopup();fitVisible();
  });
}

function initializeMap() {
  if (!window.L?.markerClusterGroup) throw new Error('The local map library could not load. Reload to try again.');
  map=L.map('map',{zoomControl:false,minZoom:5,maxZoom:18,zoomSnap:.25,zoomDelta:.5,scrollWheelZoom:true,zoomAnimation:!reducedMotion,fadeAnimation:!reducedMotion,maxBoundsViscosity:1});
  L.control.zoom({position:'topright'}).addTo(map);
  L.control.scale({position:'bottomright',imperial:false,maxWidth:70}).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>');
  map.attributionControl.addAttribution('<a href="https://www.geoboundaries.org/">geoBoundaries</a> · <a href="https://www.openstreetmap.org/copyright">OSM / Wambacher</a> · ODbL');
  districtLayer=L.geoJSON(geography,{style:{color:'#bdcddd',weight:.8,fillColor:'#f5f8fc',fillOpacity:1},onEachFeature:(feature,layer)=>{
    districtByName.set(feature.properties.name,layer);
    layer.on('click',()=>focusDistrict(feature.properties.name));
    layer.on('mouseover',()=>layer.setStyle({weight:1.8,color:'#6d94c5'}));
    layer.on('mouseout',()=>layer.setStyle({weight:state.district===feature.properties.name?1.8:1,color:state.district===feature.properties.name?'#5489c8':'#9ab1c5'}));
  }}).addTo(map);
  background=setupMapBackground(map,geography);
  pinLayer=L.featureGroup().addTo(map);
  clusterLayer=L.markerClusterGroup({maxClusterRadius:32,showCoverageOnHover:false,animate:!reducedMotion,spiderfyOnMaxZoom:true,iconCreateFunction:cluster=>{
    const colors=[...new Set(cluster.getAllChildMarkers().map(marker=>banks[marker.options.bankId].color))];
    return L.divIcon({className:'network-cluster',iconSize:[38,38],html:`<span class="cluster-number" style="--cluster-color:${colors.length===1?colors[0]:'#254c73'}">${cluster.getChildCount()}<span class="cluster-colors">${colors.map(color=>`<i style="background:${color}"></i>`).join('')}</span></span>`});
  }}).addTo(map);
  markers=pinLayer;
  pendingLayer=L.layerGroup().addTo(map);
  map.setMaxBounds(districtLayer.getBounds().pad(.65));
  fitVisible();
  map.on('dragstart',()=>{userPositionedMap=true;});
  $('#map').addEventListener('wheel',()=>{userPositionedMap=true;},{passive:true});
  $('#map').addEventListener('touchstart',event=>{if(event.touches.length>1)userPositionedMap=true;},{passive:true});
  $('#map').addEventListener('click',event=>{if(event.target.closest('.leaflet-control-zoom'))userPositionedMap=true;},true);
  let resizeFrame;
  new ResizeObserver(()=>{
    cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(()=>{
      const center=map.getCenter(), zoom=map.getZoom();
      map.invalidateSize({animate:false,pan:false});
      // Refit automatic views after rotation/sidebar changes; preserve manual exploration.
      if (!userPositionedMap) fitVisible({animate:false});
      else map.setView(center,zoom,{animate:false});
    });
  }).observe($('#map'));
}

const dataDialog=$('#data-dialog'),locationDialog=$('#location-dialog');
document.querySelectorAll('[data-open-notes]').forEach(button=>button.addEventListener('click',()=>dataDialog.showModal()));
$('#close-dialog').addEventListener('click',()=>dataDialog.close());
$('#dialog-done').addEventListener('click',()=>dataDialog.close());
$('#close-location').addEventListener('click',()=>locationDialog.close());
for (const dialog of [dataDialog,locationDialog]) dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)dialog.close();
});

try {
  ({branches,districts,metadata,geography,districtCounts}=await loadData());
  setupDistrictComparison(districtCounts, navigateOverview);
  $('#location-type').value=state.kind;
  districts.forEach(district=>{const option=document.createElement('option');option.value=district;option.textContent=district;$('#district-filter').append(option);});
  if(branches.some(row=>row.district==='Needs review')){const option=document.createElement('option');option.value='Needs review';option.textContent='District assignment needs review';$('#district-filter').append(option);}
  $('#data-status').textContent=`${count(branches.length)} imported locations · 13 Nov 2026 · Published pins and address-only records are distinguished.`;
  $('#source-summary').innerHTML=`<div class="source-cards">${Object.entries(banks).map(([id,bank])=>`<div><strong style="color:${bank.color}">${esc(bank.name)}</strong><span>${count(metadata.banks[id].records)} records · ${count(metadata.banks[id].mapped)} map pins</span><small>${metadata.banks[id].pinPending} awaiting usable coordinates</small></div>`).join('')}</div><div class="dialog-callout"><strong>Coordinate completeness varies by source.</strong><p>Commercial Bank publishes location coordinates and machine types; three conflicting direction links were corrected against matching Google Maps place listings. People’s Bank directory records are matched to its official map locator and individual Google Maps place listings. BOC’s official locator supplied partial coordinate enrichment, then blocked further pages. A duplicate-coordinate audit also corrected four conflicting People’s Bank locator positions. Original positions are retained in the local data, and each corrected location includes its place reference and matching evidence. Source and map references are included in location details.</p></div><div class="source-links"><a href="https://www.combank.lk/branches" target="_blank" rel="noopener noreferrer">Commercial Bank locator ↗</a><a href="https://branches.lk/listing-cat/peoples-bank/" target="_blank" rel="noopener noreferrer">People’s Bank directory ↗</a><a href="https://www.peoplesbank.lk/branch-service-center/" target="_blank" rel="noopener noreferrer">People’s Bank map locator ↗</a><a href="https://branches.lk/listing-cat/bank-of-ceylon/" target="_blank" rel="noopener noreferrer">BOC directory ↗</a></div>`;
  setupEvents();initializeMap();
  presentation = setupMapPresentation({
    map,
    fitSelection: fitVisible,
    describeSelection: () => {
      const rows = visibleBranches();
      const bankNames = [...state.selected].map(id => banks[id].name).join(' + ');
      const filters = [state.mapMode === 'reported' ? 'Reported district totals' : 'Individual locations', bankNames, state.district === 'all' ? 'All districts' : state.district];
      if (state.mapMode === 'reported') return {selection:filters.join(' · '), counts:`${count(reportedRows().reduce((sum,row)=>sum+reportedTotal(row),0))} reported branches\nCBSL · 2025 provisional · ESS 2026 Table 7.8`};
      if (state.kind !== 'all') filters.push(state.kind === 'branch' ? 'Branches only' : 'Self-service sites');
      if (state.service !== 'all') filters.push(state.service);
      if (state.query) filters.push(`Search: ${state.query}`);
      const pins = rows.filter(hasPin).length;
      return { selection: filters.join(' · '), counts: `${count(rows.length)} ${rows.length === 1 ? 'location' : 'locations'} · ${count(pins)} map ${pins === 1 ? 'pin' : 'pins'}\nSource snapshot: 13 Nov 2026` };
    },
  });
  render();
} catch(error) {
  console.error(error);
  $('#data-status').textContent=error.message;
  $('#data-status').setAttribute('role','alert');
  $('#map-notice').hidden=false;
  $('#map-notice').textContent='The local map or dataset failed to load. Reload this page to retry.';
}
