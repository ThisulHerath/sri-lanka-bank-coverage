import {banks} from './data.js';
import {setupMapBackground} from './map-background.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=value=>Number(value).toLocaleString('en-LK');
export async function setupComparisonMap(data){
 const $=s=>document.querySelector(s),ids=Object.keys(banks),selected=new Set(ids),districts=new Map(data.districts.map(row=>[row.district,row]));
 const get=async url=>{const r=await fetch(url);if(!r.ok)throw Error('Map data unavailable');return r.json();};
 const [geometry,directory]=await Promise.all([get('/assets/sri-lanka-districts.geojson'),get('/assets/data/locations.json')]);
 let district='all',mode='districts',streets=false,presenting=false,previousFocus,previousScroll=0,manualView=false;
 const map=L.map('comparison-map',{minZoom:5,maxZoom:17,zoomSnap:.25,zoomControl:false,maxBoundsViscosity:1});
 L.control.zoom({position:'topright'}).addTo(map);L.control.scale({position:'bottomright',imperial:false}).addTo(map);
 map.attributionControl.addAttribution('geoBoundaries · OSM / Wambacher · ODbL');
 const layers=new Map();
 const geometryLayer=L.geoJSON(geometry,{onEachFeature:(feature,layer)=>{layers.set(feature.properties.name,layer);layer.on('click',()=>chooseDistrict(feature.properties.name));}}).addTo(map);
 const background=setupMapBackground(map,geometry,'#comparison-street-status');
 const districtLabels=L.layerGroup().addTo(map);
 const pinLayer=L.markerClusterGroup({maxClusterRadius:42,showCoverageOnHover:false,animate:false,iconCreateFunction:cluster=>L.divIcon({className:'comparison-pin-cluster',html:`<strong>${cluster.getChildCount()}</strong>`,iconSize:[36,36]})}).addTo(map);
 map.setMaxBounds(geometryLayer.getBounds().pad(.5));
 $('#comparison-map-district').innerHTML='<option value="all">All Sri Lanka</option>'+[...districts.keys()].sort().map(name=>`<option>${esc(name)}</option>`).join('');
 map.on('dragstart',()=>{manualView=true;});
 $('#comparison-map').addEventListener('wheel',()=>{manualView=true;},{passive:true});
 $('#comparison-map').addEventListener('dblclick',()=>{manualView=true;});
 $('#comparison-map').addEventListener('click',event=>{if(event.target.closest('.leaflet-control-zoom'))manualView=true;},true);
 function fit(){manualView=false;const layer=layers.get(district);map.fitBounds((layer||geometryLayer).getBounds(),{padding:[30,30],maxZoom:12,animate:false});}
 function chooseDistrict(name){district=name;$('#comparison-map-district').value=name;render();fit();}
 const sum=row=>[...selected].reduce((n,id)=>n+row[id],0);
 function popup(row){return `<strong>${esc(row.district)}</strong><br /><small>Report appendix · district counts</small><dl class="map-count-facts">${[...selected].map(id=>`<dt>${esc(banks[id].name)}</dt><dd>${fmt(row[id])}</dd>`).join('')}</dl><small>District aggregate, not a branch position.</small>`;}
 function render(){
  $('#map-bank-buttons').innerHTML=`<button class="button secondary" data-map-bank="all" aria-pressed="${selected.size===ids.length}">Compare all</button>`+ids.map(id=>`<button class="button secondary" data-map-bank="${id}" aria-pressed="${selected.has(id)}" style="--bank-color:${banks[id].color}"><i style="background:${banks[id].color}"></i>${esc(id==='com'?'Commercial Bank':banks[id].short)}</button>`).join('');
  const rows=data.districts.filter(row=>district==='all'||row.district===district),maximum=Math.max(1,...data.districts.map(sum));
  districtLabels.clearLayers();pinLayer.clearLayers();
  for(const [name,layer] of layers){const row=districts.get(name),value=sum(row),active=district==='all'||district===name;
   const color=selected.size===1?banks[[...selected][0]].color:'#2468c5';
   layer.setStyle({fillColor:mode==='districts'?color:'#fff',fillOpacity:mode==='districts'?(active?.12+value/maximum*.65:.05):(streets?.025:1),color:district===name?'#214f7b':'#9bb3c9',weight:district===name?2:1});
   layer.unbindTooltip();layer.bindTooltip(`${name} · ${fmt(value)} selected-bank branches`,{direction:'top'});
   if(mode==='districts'&&active){
    const label=L.marker(layer.getBounds().getCenter(),{icon:L.divIcon({className:'comparison-district-count',html:`<span>${esc(name)}</span><strong>${fmt(value)}</strong>`,iconSize:[92,42],iconAnchor:[46,21]}),title:`${name}: ${value} branches in district, not a branch location`});
    label.bindPopup(popup(row),{maxWidth:300});label.on('click',()=>{district=name;$('#comparison-map-district').value=name;render();fit();const selectedLabel=districtLabels.getLayers()[0];selectedLabel?.openPopup();});districtLabels.addLayer(label);
   }
  }
  const pins=directory.locations.filter(row=>selected.has(row.bank)&&row.kind==='branch'&&row.status!=='closed'&&Number.isFinite(row.lat)&&Number.isFinite(row.lng)&&(district==='all'||row.district===district));
  if(mode==='pins')for(const row of pins){const bank=banks[row.bank];const marker=L.marker([row.lat,row.lng],{title:`${bank.name} · ${row.name}`,icon:L.divIcon({className:'comparison-bank-pin',html:`<i style="background:${bank.color}"></i>`,iconSize:[16,16],iconAnchor:[8,8]})});marker.bindPopup(`<small>${esc(bank.name)}</small><br /><strong>${esc(row.name)}</strong><p>${esc(row.address||row.town)}<br />${row.lat.toFixed(5)}, ${row.lng.toFixed(5)}</p><small>Public directory reference · ${esc(row.coordinateStatus)} coordinate. This directory is incomplete and separate from the report totals.</small>`,{maxWidth:300});pinLayer.addLayer(marker);}
  $('#comparison-map-context').textContent=mode==='districts'?'Report appendix counts for whole districts. Labels are district totals, not individual branch positions. Commercial Bank appendix total differs from its headline statutory baseline.':'Public directory snapshot · November 2026. Pins show available source coordinates only; BOC and People’s Bank coverage is incomplete. These pins do not reconcile to the report’s branch totals.';
  $('#comparison-map-summary').textContent=mode==='districts'?`${district==='all'?'All 25 districts':district} · ${fmt(rows.reduce((n,row)=>n+sum(row),0))} selected-bank branches (appendix)`:`${district==='all'?'All Sri Lanka':district} · ${fmt(pins.length)} directory branch pins · incomplete reference coverage`;
  $('#comparison-map-key').innerHTML=[...selected].map(id=>`<span><i style="background:${banks[id].color}"></i>${esc(banks[id].name)}</span>`).join('')+`<small>${mode==='districts'?'Darker fill = more selected-bank branches':'Pins = source-published locations; grouped numbers = nearby pins'}</small>`;
 }
 $('#map-bank-buttons').addEventListener('click',event=>{const button=event.target.closest('[data-map-bank]');if(!button)return;const id=button.dataset.mapBank;if(id==='all'){selected.clear();ids.forEach(key=>selected.add(key));}else{selected.clear();selected.add(id);}render();});
 $('#comparison-map-mode').addEventListener('change',event=>{mode=event.target.value;render();});
 $('#comparison-map-district').addEventListener('change',event=>chooseDistrict(event.target.value));
 $('#comparison-map-fit').addEventListener('click',fit);
 $('#comparison-streets').addEventListener('click',()=>{streets=!streets;background.setVisible(streets);$('#comparison-streets').textContent=`Street map: ${streets?'on':'off'}`;$('#comparison-streets').setAttribute('aria-pressed',String(streets));$('#comparison-street-status').textContent=streets?'OpenStreetMap · Internet required':'Clean district map';render();});
 async function present(show){if(presenting===show)return;const center=map.getCenter(),zoom=map.getZoom(),keepView=manualView;presenting=show;$('#bank-map-section').classList.toggle('comparison-map-presenting',show);document.body.classList.toggle('comparison-map-fullscreen',show);$('#comparison-map-present').hidden=show;$('#comparison-map-exit').hidden=!show;$('#comparison-map-present').setAttribute('aria-pressed',String(show));
  if(show){previousScroll=window.scrollY;previousFocus=document.activeElement;try{await document.documentElement.requestFullscreen?.();}catch{}$('#comparison-map-exit').focus({preventScroll:true});}else{try{if(document.fullscreenElement)await document.exitFullscreen();}catch{}window.scrollTo({top:previousScroll,behavior:'instant'});previousFocus?.focus({preventScroll:true});}
  requestAnimationFrame(()=>{map.invalidateSize({pan:false});if(keepView){manualView=true;map.setView(center,zoom,{animate:false});}else fit();});
 }
 $('#comparison-map-present').addEventListener('click',()=>present(true));$('#comparison-map-exit').addEventListener('click',()=>present(false));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&presenting)present(false);});document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&presenting)present(false);});
 let lastSize=null;new ResizeObserver(()=>{const current=map.getSize();map.invalidateSize({pan:false});if(!lastSize||!manualView)fit();lastSize=current;}).observe($('#comparison-map'));
 render();fit();
}
