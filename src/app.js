import { banks, branches, districts } from './data.js';

const icons = {
  layout: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M9 9h12"/>',
  document: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
  'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
  'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-4 6v-3h2v3"/>',
  pin: '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/>',
  compare: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  maximize: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
const $ = selector => document.querySelector(selector);
const state = { mode: 'single', selected: new Set(['com']), district: 'all', query: '', activeBranch: null };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const countryBounds = [[5.75, 79.45], [9.9, 82.0]];
let map;
let markers;
const markerById = new Map();
const labelTowns = new Set(['Colombo', 'Jaffna', 'Kandy', 'Galle', 'Trincomalee', 'Batticaloa', 'Anuradhapura']);

districts.forEach(district => {
  const option = document.createElement('option');
  option.value = district;
  option.textContent = district;
  $('#district-filter').append(option);
});

function visibleBranches() {
  return branches.filter(branch => state.selected.has(branch.bank)
    && (state.district === 'all' || branch.district === state.district)
    && `${branch.name} ${branch.district} ${banks[branch.bank].name}`.toLowerCase().includes(state.query));
}

function fitVisible() {
  if (!map) return;
  const visible = visibleBranches();
  if (state.district === 'all' && !state.query) {
    map.fitBounds(countryBounds, { padding: window.innerWidth > 760 ? [35, 32] : [20, 20], animate: false });
  } else if (visible.length) {
    map.fitBounds(L.latLngBounds(visible.map(branch => [branch.lat, branch.lng])), { padding: [85, 85], maxZoom: 11, animate: !reducedMotion });
  }
}

function renderBanks() {
  $('#bank-options').classList.toggle('compare-state', state.mode === 'compare');
  $('#bank-options').innerHTML = Object.entries(banks).map(([id, bank]) => `
    <button class="bank-option" data-bank="${id}" aria-pressed="${state.selected.has(id)}" aria-label="${bank.name}" style="--bank-color:${bank.color};--bank-tint:${bank.tint}">
      <span class="bank-logo">${bank.initials}</span><span><span class="bank-name">${bank.name}</span><span class="bank-abbr">${id === 'com' ? 'Our branch network' : 'Competitor network'}</span></span>
      <span class="bank-radio">${state.selected.has(id) ? icon('check') : ''}</span>
    </button>`).join('');
  $('#selection-hint').textContent = state.mode === 'single' ? 'Select one' : 'Select one or more';
  $('#single-mode').setAttribute('aria-pressed', String(state.mode === 'single'));
  $('#compare-mode').setAttribute('aria-pressed', String(state.mode === 'compare'));
}

function selectBranch(id) {
  const branch = branches.find(item => item.id === id);
  const marker = markerById.get(id);
  if (!branch || !marker) return;
  state.activeBranch = id;
  renderList(visibleBranches());
  map.setView([branch.lat, branch.lng], 11, { animate: !reducedMotion });
  marker.openPopup();
}

function renderList(visible) {
  $('#list-count').textContent = visible.length;
  $('#branch-list').innerHTML = visible.length ? visible.map(branch => `
    <button class="branch-row" data-branch="${branch.id}" aria-pressed="${state.activeBranch === branch.id}" aria-label="View ${branch.town}, ${banks[branch.bank].name}, demo branch" style="--bank-color:${banks[branch.bank].color}">
      <span class="branch-dot"></span><span><strong>${branch.town}</strong><small>${banks[branch.bank].name} · Sample</small></span><span data-icon="arrow-up-right">${icon('arrow-up-right')}</span>
    </button>`).join('') : '<div class="empty-state">No sample branches match this view.<br />Try another district, bank, or search.</div>';
}

function renderMarkers(visible) {
  if (!map) return;
  markers.clearLayers();
  markerById.clear();
  const labelled = new Set();
  visible.forEach(branch => {
    const bank = banks[branch.bank];
    const marker = L.marker([branch.lat, branch.lng], {
      icon: L.divIcon({ className: 'branch-pin', html: `<span style="--bank-color:${bank.color}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -7] }),
      title: `${bank.name} — ${branch.town} (demo)`, alt: `${bank.name} ${branch.town} demo branch`,
      riseOnHover: true,
    });
    marker.bindPopup(`<div class="popup-bank" style="color:${bank.color}"><span class="small-dot" style="background:${bank.color}"></span>${bank.name}</div><h3 class="popup-title">${branch.town}</h3><div class="popup-district">${branch.district} district · Demo branch</div><p class="popup-note">Illustrative town-centre location.<br />Not a verified branch address.</p>`, { autoPanPaddingTopLeft: [15, 85], autoPanPaddingBottomRight: [20, 25] });
    marker.on('click', () => { state.activeBranch = branch.id; renderList(visibleBranches()); });
    if (labelTowns.has(branch.town) && !labelled.has(branch.town)) {
      marker.bindTooltip(branch.town, { permanent: true, direction: 'right', offset: [11, 0], className: 'town-label' });
      labelled.add(branch.town);
    }
    marker.addTo(markers);
    markerById.set(branch.id, marker);
  });
}

function render() {
  const visible = visibleBranches();
  const selectedBanks = [...state.selected].map(id => banks[id]);
  $('#branch-count').textContent = visible.length;
  $('#district-count').textContent = new Set(visible.map(branch => branch.district)).size;
  $('#bank-count').textContent = state.selected.size;
  $('#selected-summary').textContent = state.selected.size === 1 ? selectedBanks[0].name : selectedBanks.map(bank => bank.short).join(' · ');
  $('#map-subtitle').textContent = state.selected.size === 1 ? `${selectedBanks[0].name} network` : `${state.selected.size} bank networks · Comparison`;
  $('#legend-items').innerHTML = selectedBanks.map(bank => `<div class="legend-item" style="--bank-color:${bank.color}"><span class="legend-dot"></span>${bank.name}</div>`).join('');
  $('#visible-summary').textContent = `${visible.length} sample ${visible.length === 1 ? 'branch' : 'branches'} displayed`;
  renderBanks();
  renderList(visible);
  renderMarkers(visible);
}

$('#bank-options').addEventListener('click', event => {
  const button = event.target.closest('[data-bank]');
  if (!button) return;
  const bank = button.dataset.bank;
  if (state.mode === 'single') state.selected = new Set([bank]);
  else if (state.selected.has(bank) && state.selected.size > 1) state.selected.delete(bank);
  else state.selected.add(bank);
  state.activeBranch = null;
  render();
  // The option list is replaced during render; retain keyboard focus on selection.
  $(`[data-bank="${bank}"]`).focus({ preventScroll: true });
});
$('#single-mode').addEventListener('click', () => {
  state.mode = 'single';
  state.selected = new Set([state.selected.has('com') ? 'com' : [...state.selected][0]]);
  state.activeBranch = null;
  render();
});
$('#compare-mode').addEventListener('click', () => {
  if (state.mode === 'compare') return;
  state.mode = 'compare';
  state.selected = new Set(Object.keys(banks));
  state.activeBranch = null;
  render();
});
$('#district-filter').addEventListener('change', event => {
  state.district = event.target.value;
  state.activeBranch = null;
  render();
  fitVisible();
});
$('#branch-search').addEventListener('input', event => {
  state.query = event.target.value.toLowerCase().trim();
  state.activeBranch = null;
  render();
  fitVisible();
});
$('#branch-list').addEventListener('click', event => {
  const button = event.target.closest('[data-branch]');
  if (button) selectBranch(button.dataset.branch);
});
$('#reset-map').addEventListener('click', () => {
  state.district = 'all';
  state.query = '';
  state.activeBranch = null;
  $('#district-filter').value = 'all';
  $('#branch-search').value = '';
  render();
  map?.closePopup();
  fitVisible();
});

const dialog = $('#data-dialog');
document.querySelectorAll('[data-open-notes]').forEach(button => button.addEventListener('click', () => dialog.showModal()));
$('#close-dialog').addEventListener('click', () => dialog.close());
$('#dialog-done').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });

async function initializeMap() {
  if (!window.L) {
    $('#map-notice').textContent = 'The map library could not load. Reload this page to try again.';
    $('#map-notice').hidden = false;
    return;
  }
  map = L.map('map', { zoomControl: false, minZoom: 6, maxZoom: 17, maxBounds: [[3.5, 76], [12, 85]], maxBoundsViscosity: .8, scrollWheelZoom: true, zoomAnimation: !reducedMotion, fadeAnimation: !reducedMotion });
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.scale({ position: 'bottomright', imperial: false, maxWidth: 80 }).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>');
  markers = L.layerGroup().addTo(map);
  fitVisible();
  try {
    const response = await fetch('/assets/sri-lanka.geojson');
    if (!response.ok) throw new Error('Country outline unavailable');
    const outline = await response.json();
    L.geoJSON(outline, { style: { color: '#9fbcc1', weight: 1.1, fillColor: '#f6f6ee', fillOpacity: .2 }, interactive: false }).addTo(map).bringToBack();
    map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/">Natural Earth</a>');
  } catch (error) {
    console.warn(error.message);
  }
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    opacity: .48, maxZoom: 19,
  });
  let tileLoaded = false;
  const tileTimeout = setTimeout(() => { if (!tileLoaded) $('#map-notice').hidden = false; }, 9000);
  tiles.on('tileload', () => { tileLoaded = true; clearTimeout(tileTimeout); $('#map-notice').hidden = true; });
  tiles.on('tileerror', () => { if (!tileLoaded) $('#map-notice').hidden = false; });
  tiles.addTo(map);
  renderMarkers(visibleBranches());
  new ResizeObserver(() => { map.invalidateSize({ animate: false }); }).observe($('#map'));
}

render();
initializeMap();
