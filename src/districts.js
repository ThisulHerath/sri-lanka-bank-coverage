import { banks } from './data.js';

// The district statistics and the location directory describe different dates/scopes.
// Navigation connects them without converting aggregate counts into invented pins.
export function setupDistrictComparison(data, navigate) {
  const format = n => n.toLocaleString('en-LK');
  const bankIds = Object.keys(banks);
  document.querySelector('#district-mobile-national-total').textContent = `${format(data.totals.total)} branches`;
  document.querySelector('#national-cards').innerHTML = [...bankIds, 'total'].map(id => {
    const bank = banks[id];
    return `<button class="national-card" data-overview-bank="${id}" style="--card-color:${bank?.color || '#102642'}"><span>${bank?.name || 'Combined network'}</span><strong>${format(data.totals[id])}</strong><small>${bank ? 'Highest: Colombo (' + data.districts.find(r => r.district === 'Colombo')[id] + ')' : 'Three banks · 25 districts'}<b aria-hidden="true">↗</b></small></button>`;
  }).join('');
  const tbody = document.querySelector('#district-rows');
  const mobileList = document.querySelector('#district-mobile-list');
  const search = document.querySelector('#district-search');
  const sort = document.querySelector('#district-sort');
  function render() {
    const query = search.value.toLowerCase().trim();
    const rows = data.districts.filter(r => `${r.district} ${r.label}`.toLowerCase().includes(query));
    rows.sort(sort.value === 'district' ? (a,b) => a.label.localeCompare(b.label) : (a,b) => b[sort.value]-a[sort.value] || a.label.localeCompare(b.label));
    document.querySelector('#district-results').textContent = `${rows.length} of 25 districts · Number of branches`;
    tbody.innerHTML = rows.length ? rows.map(row => `<tr><th scope="row"><button data-district="${row.district}" data-count-bank="total">${row.label}</button></th>${bankIds.map(id => `<td><button data-district="${row.district}" data-count-bank="${id}" aria-label="${row.label}, ${banks[id].name}: ${row[id]} reported branches">${row[id]}</button></td>`).join('')}<td class="total-cell">${row.total}</td><td><button class="location-link" data-district="${row.district}" data-directory="true" aria-label="Browse imported locations in ${row.label}">Locations ↗</button></td></tr>`).join('') : '<tr><td colspan="6" class="district-no-results">No district matches. Try another name.</td></tr>';
    mobileList.innerHTML = rows.length ? rows.map(row => `<article class="district-mobile-card" aria-label="${row.label} district"><div class="district-card-heading"><button data-district="${row.district}" data-count-bank="total">${row.label}<span aria-hidden="true">↗</span></button><span>${row.total} total</span></div><div class="district-card-banks">${bankIds.map(id => `<button data-district="${row.district}" data-count-bank="${id}" style="--card-bank:${banks[id].color}" aria-label="${row.label}, ${banks[id].name}: ${row[id]} reported branches"><span>${id === 'com' ? 'Commercial' : id === 'pb' ? 'People’s' : 'BOC'}</span><strong>${row[id]}</strong></button>`).join('')}</div><button class="district-card-locations" data-district="${row.district}" data-directory="true">Explore locations in ${row.label}<span aria-hidden="true">→</span></button></article>`).join('') : '<p class="district-mobile-empty">No district matches. Try another name.</p>';
  }
  document.querySelector('#district-totals').innerHTML = `<th scope="row">Sri Lanka total</th>${[...bankIds,'total'].map(id => `<td>${format(data.totals[id])}</td>`).join('')}<td>2025</td>`;
  const top = [...data.districts].sort((a,b) => b.total-a.total).slice(0,5);
  document.querySelector('#top-districts').innerHTML = top.map((r,i) => `<button class="ranking-row" data-district="${r.district}" data-count-bank="total"><span class="ranking-label"><small>0${i+1}</small>${r.label}<strong>${r.total}</strong></span><span class="ranking-bar">${bankIds.map(id => `<i style="width:${r[id]/303*100}%;background:${banks[id].color}" title="${banks[id].name}: ${r[id]}"></i>`).join('')}</span></button>`).join('');
  search.addEventListener('input', render);
  sort.addEventListener('change', render);
  document.querySelector('#district-overview').addEventListener('click', event => {
    const button = event.target.closest('[data-district]');
    if (button) navigate({district:button.dataset.district, bank:button.dataset.countBank || 'total', directory:!!button.dataset.directory});
  });
  document.querySelector('#national-cards').addEventListener('click', event => {
    const button = event.target.closest('[data-overview-bank]');
    if (button) navigate({district:'all', bank:button.dataset.overviewBank, directory:false});
  });
  render();
}
