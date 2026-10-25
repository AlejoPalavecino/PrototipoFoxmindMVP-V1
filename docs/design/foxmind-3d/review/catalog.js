'use strict';
const kit = window.FOX_REVIEW;
document.getElementById('flow-count').textContent = kit.screens.length;
document.getElementById('family-count').textContent = new Set(kit.screens.map(s=>s.family)).size;
const illustrationAssets=kit.assets.filter(a=>!a.id.startsWith('brand/'));
const brandAssets=kit.assets.filter(a=>a.id.startsWith('brand/'));
document.getElementById('asset-count').textContent = illustrationAssets.length;
document.getElementById('asset-inventory').textContent=`${illustrationAssets.length} ilustraciones en ${illustrationAssets.reduce((n,a)=>n+a.variants.length,0)} archivos WebP responsive · ${brandAssets.length} variantes SVG de marca · ${kit.icons.length} iconos SVG y un sprite.`;
document.getElementById('icon-grid').innerHTML=kit.icons.map(icon=>`<a class="icon-item" href="../${icon.path}" aria-label="Abrir icono ${icon.id.slice(6)} en SVG"><img src="../${icon.path}" width="24" height="24" alt="" loading="lazy"><span>${icon.id.slice(6)}</span></a>`).join('');
function renderAssets(group='all') {
  document.getElementById('asset-grid').innerHTML = kit.assets.filter(a=>group==='all'||a.id.startsWith(group+'/')).map(a=>`<article class="asset-card"><a class="asset-preview ${a.id.includes('inverse')?'inverse':''} ${a.id.startsWith('brand')?'brand-preview':''}" href="../${a.default}"><img src="../${a.default}" alt="${a.description}" loading="lazy"></a><div><h3>${a.id}</h3><p>${a.description}</p><a href="../${a.default}">Abrir archivo</a>${a.variants.length?`<details><summary>Exportaciones disponibles</summary><ul>${a.variants.map(v=>`<li><a href="../${v.path}">${v.width} × ${v.height} · ${(v.bytes/1024).toFixed(1)} KB</a></li>`).join('')}</ul></details>`:''}</div></article>`).join('');
}
const domains = [...new Set(kit.screens.map(s=>s.domain))];
document.getElementById('flow-directory').innerHTML=domains.map(d=>`<details open><summary>${({ 'account-and-navigation':'Acceso, cuenta e Inicio','classrooms-and-membership':'Aulas y membresías','classroom-workspace':'Espacio del aula','activity-authoring':'Autoría de actividades','submissions-and-grading':'Entregas, corrección y progreso','agenda':'Agenda'})[d]}</summary><ul>${kit.screens.filter(s=>s.domain===d).map(s=>`<li><a href="${s.frame}"><span>${s.id}</span> ${s.title}</a></li>`).join('')}</ul></details>`).join('');
document.getElementById('asset-filter').addEventListener('change',e=>renderAssets(e.target.value));
renderAssets();
