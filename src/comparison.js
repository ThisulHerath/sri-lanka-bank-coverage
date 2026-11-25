import { setupComparisonMap } from './comparison-map.js';
import { banks } from './data.js';
const $=s=>document.querySelector(s), ids=['com','boc','pb'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v).toLocaleString('en-LK');
let data,comparisonMapReady=false;
function validate(value){
  if(value.version!==1||value.districts?.length!==25||new Set(value.districts.map(r=>r.district)).size!==25)throw Error('Invalid comparison dataset');
  for(const id of ids){if(!Number.isInteger(value.baseline[id])||value.baseline[id]<0)throw Error('Invalid baseline');if(value.districts.some(r=>!Number.isInteger(r[id])||r[id]<0)||value.districts.reduce((n,r)=>n+r[id],0)!==value.districtTotals[id])throw Error('District count mismatch');}
  return value;
}
function renderDistricts(){
 const query=$('#comparison-search').value.trim().toLowerCase(),sort=$('#comparison-sort').value;
 const rows=data.districts.filter(r=>r.district.toLowerCase().includes(query));
 rows.sort(sort==='az'?(a,b)=>a.district.localeCompare(b.district):(a,b)=>b[sort]-a[sort]||a.district.localeCompare(b.district));
 const max=Math.max(...data.districts.flatMap(r=>ids.map(id=>r[id])));
 $('#comparison-results').textContent=`${rows.length} of ${data.districts.length} districts`;
 $('#district-visuals').innerHTML=rows.length?rows.map(r=>`<article class="district-visual"><h3>${esc(r.district)}<small>${fmt(r.total)} combined</small></h3>${ids.map(id=>`<div class="bank-bar-row"><span>${esc(banks[id].short)}</span><div class="bank-bar-track"><i style="width:${r[id]/max*100}%;background:${banks[id].color}"></i></div><strong>${fmt(r[id])}</strong></div>`).join('')}</article>`).join(''):'<p>No districts match this search.</p>';
}
function load(value){
 data=validate(value);$('#comparison-content').hidden=false;$('#comparison-unlock').hidden=true;
 $('#baseline-year').textContent=`${data.year} · REPORT BASELINE`;
 $('#comparison-headlines').innerHTML=ids.map(id=>`<article class="comparison-headline" style="--metric-color:${banks[id].color}"><span>${esc(banks[id].name)}</span><strong>${fmt(data.baseline[id])}</strong><small>${esc(data.scopeNotes[id])}</small></article>`).join('');
 const max=Math.max(...ids.map(id=>data.baseline[id]));
 $('#national-comparison-bars').innerHTML=ids.map(id=>`<div class="bank-bar-row"><span>${esc(banks[id].name)}</span><div class="bank-bar-track"><i style="width:${data.baseline[id]/max*100}%;background:${banks[id].color}"></i></div><strong>${fmt(data.baseline[id])}</strong></div>`).join('');
 $('#comparison-discrepancy').textContent=data.note;
 $('#headline-source').textContent=`Source: supplied board report · ${data.headlineSource}. Report-aligned figures; not independently certified.`;
 $('#district-source').textContent=`Source: supplied board report · ${data.districtSource}. Appendix totals: ${ids.map(id=>`${banks[id].short} ${fmt(data.districtTotals[id])}`).join(' · ')}.`;
 $('#comparison-legend').innerHTML=ids.map(id=>`<span><i style="background:${banks[id].color}"></i>${esc(banks[id].name)}</span>`).join('');
 renderDistricts();
 if(!comparisonMapReady){comparisonMapReady=true;setupComparisonMap(data).catch(()=>{const error=$('#comparison-map-error');error.hidden=false;error.textContent='The map could not load. Refresh the page to try again; district charts remain available.';});}
}
$('#reset-comparison').addEventListener('click',()=>{$('#comparison-search').value='';$('#comparison-sort').value='az';renderDistricts();});
$('#comparison-search').addEventListener('input',renderDistricts);$('#comparison-sort').addEventListener('change',renderDistricts);
$('#comparison-unlock').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.currentTarget.querySelector('button[type="submit"],button:not([type])');button.disabled=true;$('#comparison-status').textContent='Unlocking comparison…';
 try{const response=await fetch('/assets/comparison.enc.json');if(!response.ok)throw Error('Unavailable');const sealed=await response.json();if(sealed.version!==1||sealed.iterations!==600000)throw Error('Invalid package');
 const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));const password=$('#comparison-password').value;$('#comparison-password').value='';
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(sealed.salt),iterations:sealed.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
 const content=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(sealed.iv)},key,bytes(sealed.ciphertext));load(JSON.parse(new TextDecoder().decode(content)));$('#comparison-status').textContent='';
 }catch{$('#comparison-status').textContent='Unable to unlock. Check the presenter password and try again.';}finally{button.disabled=false;}
});
if(['localhost','127.0.0.1','[::1]'].includes(location.hostname)){
 try{const response=await fetch('/private/comparison-data.json',{cache:'no-store'});if(!response.ok)throw Error('Unavailable');load(await response.json());}catch{$('#comparison-unlock').hidden=false;}
}else $('#comparison-unlock').hidden=false;
