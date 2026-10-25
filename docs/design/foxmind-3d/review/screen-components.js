'use strict';
window.Fox = (() => {
  let sequence=0;
  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons={home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',book:'M3 4h7c1.2 0 2 .8 2 2v15c0-1.2-.8-2-2-2H3ZM21 4h-7c-1.2 0-2 .8-2 2v15c0-1.2.8-2 2-2h7Z',calendar:'M4 5h16v16H4ZM7 3v4m10-4v4M4 10h16',bell:'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3h4',user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-3a8 5 0 0 1 16 0v3',settings:'m9 3-1 3-3 1v3l-2 2 2 2v3l3 1 1 3h6l1-3 3-1v-3l2-2-2-2V7l-3-1-1-3ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',plus:'M12 4v16M4 12h16',arrow:'M4 12h16m-6-6 6 6-6 6',file:'M5 3h9l5 5v13H5ZM14 3v6h5M8 13h8m-8 4h6',upload:'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',check:'m5 12 4 4L19 6',info:'M12 8v.01M12 11v6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',lock:'M5 10h14v11H5Zm3 0V7a4 4 0 0 1 8 0v3',close:'m6 6 12 12M6 18 18 6',search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6',menu:'M4 6h16M4 12h16M4 18h16',clock:'M12 7v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',chat:'M3 4h18v13H9l-6 4Z',pencil:'m4 16 12-12 4 4L8 20l-5 1ZM13 7l4 4',download:'M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4',spark:'m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z'};
  const icon=(name)=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name]||icons.file}"></path></svg>`;
  const img=(name,classes='',alt='')=>`<img class="${classes}" src="../assets/${name}.webp" alt="${esc(alt)}">`;
  const btn=(label,primary=false,go='',extra='')=>`<button type="button" class="${primary?'primary':''} ${extra}" ${go?`data-go="${go}"`:'data-demo'}>${label}</button>`;
  const link=(label,go,classes='')=>`<a class="${classes}" href="#${go}">${label}</a>`;
  const tag=(text,color='')=>`<span class="tag ${color}">${esc(text)}</span>`;
  const notice=(title,body='',kind='info')=>`<div class="notice ${kind}" role="status">${icon(kind==='good'?'check':'info')}<div><strong>${title}</strong>${body?`<p>${body}</p>`:''}</div></div>`;
  const field=(label,value='',hint='',type='text',opts={})=>{
    const id='f-'+(++sequence);
    const options = opts.options;
    let control=options?`<select id="${id}" ${opts.disabled?'disabled':''}>${options.map(o=>`<option${o===value?' selected':''}>${esc(o)}</option>`).join('')}</select>`:type==='textarea'?`<textarea id="${id}" ${opts.readonly?'readonly':''} ${opts.rows?`rows="${opts.rows}"`:''}>${esc(value)}</textarea>`:`<input id="${id}" type="${type}" value="${esc(value)}" ${opts.readonly?'readonly':''} ${opts.maxlength?`maxlength="${opts.maxlength}"`:''} ${opts.inputmode?`inputmode="${opts.inputmode}"`:''} autocomplete="off">`;
    if(type==='password')control=`<div class="password-wrap">${control}<button type="button" data-password="${id}" aria-label="Mostrar ${esc(label).toLowerCase()}">Mostrar</button></div>`;
    return `<label class="field ${opts.wide?'span-2':''}" for="${id}"><span>${label}</span>${control}${hint?`<small>${hint}</small>`:''}</label>`;
  };
  const check=(label,checked=false,hint='',radio='')=>`<label class="check"><input type="${radio?'radio':'checkbox'}" ${radio?`name="${radio}"`:''} ${checked?'checked':''}><span>${label}${hint?`<small>${hint}</small>`:''}</span></label>`;
  const panel=(title,body,actions='',classes='')=>`<section class="panel ${classes}">${title?`<div class="panel-head"><h2>${title}</h2>${actions}</div>`:''}${body}</section>`;
  const title=(heading,sub='',actions='')=>`<div class="page-top"><div><h1>${heading}</h1>${sub?`<p>${sub}</p>`:''}</div><div class="page-tools">${actions}</div></div>`;
  const row=(heading,sub,action='',label='')=>`<div class="list-row"><div class="grow"><h3>${heading}</h3><p>${sub}</p></div>${label}${action}</div>`;
  const file=(name='Lecturas de la unidad.pdf',meta='PDF · 1,8 MB · Unidad 1',actions=true,state='Aprobado')=>`<div class="file-row"><span class="file-mark">${esc(name.split('.').pop().toUpperCase())}</span><div class="grow"><strong>${esc(name)}</strong><small>${meta}</small></div>${state?tag(state,'green'):''}${actions?`<div class="actions">${btn('Vista previa')}${btn(icon('download')+' Descargar')}</div>`:''}</div>`;
  const upload=(purpose='Elegir archivo',limits='PDF o DOCX · hasta 20 MB')=>`<div class="dropzone">${icon('upload')}<h3>${purpose}</h3><p class="muted">${limits}</p>${btn('Seleccionar archivo')}</div>`;
  const empty=(heading,body,cta='',go='')=>`<div class="empty">${img('states/empty')}<h2>${heading}</h2><p>${body}</p>${cta?btn(cta,true,go):''}</div>`;
  const confirm=(heading,body,action,detail='',danger=false)=>`<section class="dialog-frame"><div class="dialog-head"><h2>${heading}</h2>${btn(icon('close'))}</div><p>${body}</p>${detail}<div class="buttons">${btn('Cancelar')}${btn(action,!danger,'',danger?'danger':'')}</div></section>`;
  const keyValues=entries=>`<dl class="key-value">${entries.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const topics=()=>`<div class="check-group">${check('El relato fantástico',true)}${check('Narrador y punto de vista',true)}${check('Tiempo y espacio',false)}</div>`;
  const typeName=v=>({tp:'Trabajo práctico',quiz:'Cuestionario',exam:'Evaluación'})[v]||'Trabajo práctico';
  const activityName=v=>({tp:'Un relato, muchas miradas',quiz:'Voces que cuentan',exam:'Literatura · Primera unidad'})[v]||'Un relato, muchas miradas';
  const data={classes:[{name:'Literatura',detail:'3.º A · 2026',teacher:'Clara Ríos',cover:'literature',role:'Estudio'},{name:'Matemática',detail:'3.º B · 2026',teacher:'Alex Vega',cover:'math',role:'Enseño'},{name:'Biología',detail:'3.º A · 2026',teacher:'Julián Robles',cover:'biology',role:'Estudio'}],students:[{name:'Alma Torres',initial:'AT',tint:'',delivered:2,expected:3,grade:'8,00'},{name:'Bruno Sierra',initial:'BS',tint:'mint',delivered:1,expected:3,grade:'6,00'},{name:'Celia Flores',initial:'CF',tint:'yellow',delivered:0,expected:3,grade:'—'}]};
  const classCards=(list=data.classes)=>`<div class="class-cards">${list.map(c=>`<article class="class-card">${img('covers/'+c.cover)}<div>${tag(c.role,c.role==='Enseño'?'amber':'purple')}<h3>${c.name}</h3><p>${c.detail}<br>${c.teacher}</p><div class="buttons">${link('Entrar al aula →','PLAN-01/'+(c.role==='Enseño'?'teacher':'student')+'/normal','text-button')}</div></div></article>`).join('')}</div>`;
  const progress=percent=>`<div class="progress" aria-label="${percent}%"><i style="width:${percent}%"></i></div>`;
  const metrics=(scope='self')=>{
    const classroom=scope==='classroom';
    const delivered=classroom?data.students.reduce((n,s)=>n+s.delivered,0):2;
    const expected=classroom?data.students.reduce((n,s)=>n+s.expected,0):3;
    const percent=Math.round(delivered/expected*100);
    return `<div class="metric-strip"><section class="metric"><p>Cumplimiento de entregas</p><strong>${delivered} <span>de ${expected}</span></strong><span>${percent}% · actividades esperadas</span>${progress(percent)}</section><section class="metric"><p>Rendimiento académico</p><strong>7,00 <span>/ 10</span></strong><span>${classroom?'Promedio de 2 promedios individuales':'Media de 2 notas publicadas vigentes'}</span></section><section class="metric"><p>Avance del plan de estudio</p><strong>2 <span>de 6</span></strong><span>33% · temas enseñados en el aula</span>${progress(33)}</section></div>`;
  };
  const classHeader=(section='Plan',student=false)=>{
    const nav=[['Plan','PLAN-01'],['Biblioteca','LIB-01'],['Actividades','ACT-01'],['Muro','WALL-01'],[student?'Compañeros':'Alumnos','PEOPLE-01'],[student?'Mi progreso':'Progreso',student?'PROG-01':'PROG-02'],...(!student?[['Configuración','CLASS-14']]:[])];
    return `<div class="breadcrumb">${link('Mis aulas','CLASS-01/default/normal')}<span>›</span><span>Literatura</span></div><div class="class-banner">${img('covers/literature')}<div class="grow"><h2>Literatura</h2><p>3.º A · Ciclo 2026 · Clara Ríos · Hora de Buenos Aires</p>${tag(student?'Estudio en esta aula':'Enseño en esta aula',student?'purple':'amber')}</div></div><nav class="class-tabs" aria-label="Secciones del aula">${nav.map(([label,id])=>link(label,id+'/'+(student?'student':'teacher')+'/normal',label===section?'active':'')).join('')}</nav>`;
  };
  const shell=(content,active='Mis aulas',exam=false)=>{
    if(exam)return `<main class="focused-exam">${content}</main>`;
    if(!content.includes('<h1>'))content=content.replace('<h2>Literatura</h2>','<h1>Literatura</h1>');
    const nav=[['Inicio','home','HOME-01/study/normal'],['Mis aulas','book','CLASS-01/default/normal'],['Agenda','calendar','AGENDA-01/default/normal'],['Notificaciones','bell','NAV-02/default/normal']];
    const links=nav.map(([label,i,go])=>`<a href="#${go}" class="${label===active?'active':''}" ${label===active?'aria-current="page"':''}>${icon(i)}${label}</a>`).join('');
    return `<div class="app" data-ui><aside class="sidebar"><a href="#HOME-01/study/normal"><img class="logo" src="../assets/brand/logo-horizontal.svg" alt="FoxMind"></a><nav class="side-nav" aria-label="Navegación principal">${links}</nav><div class="side-bottom"><a href="#ACC-01/default/normal"${active==='Mi perfil'?' aria-current="page"':''}>${icon('user')}Mi perfil</a><a href="#ACC-02/default/normal"${active==='Configuración'?' aria-current="page"':''}>${icon('settings')}Configuración</a><div class="user-row"><span class="avatar">AV</span><div><strong>Alex Vega</strong><small>Mi cuenta</small></div></div></div></aside><div><div class="mobile-bar"><a href="#HOME-01/study/normal"><img src="../assets/brand/logo-horizontal.svg" alt="FoxMind"></a><div class="buttons"><button type="button" data-menu aria-expanded="false" aria-controls="mobile-nav">${icon('menu')}Menú</button>${link(icon('bell'),'NAV-02/default/normal','button bell')}</div></div><nav id="mobile-nav" class="mobile-nav hidden" aria-label="Navegación móvil">${links}<a href="#ACC-01/default/normal">Mi perfil</a><a href="#ACC-02/default/normal">Configuración</a></nav><main class="app-main">${content}</main></div></div>`;
  };
  const stateBlock=(state,id)=>{
    if(state==='conflict')return notice('Hay una versión más reciente','Tus cambios siguen en esta pantalla. Revisá la versión guardada antes de volver a guardar. <div class="buttons">'+btn('Revisar versión guardada')+'</div>','error');
    if(state==='readonly')return notice('Aula archivada · solo consulta','Podés consultar el contenido autorizado. Las acciones que modifican el aula están deshabilitadas.','info');
    if(state==='error')return notice('No pudimos completar esta operación','No se confirmó ningún cambio. Conservamos los campos en esta pantalla para que puedas revisar y reintentar. <div class="buttons">'+btn('Reintentar')+'</div>','error');
    if(state==='success')return notice('Confirmación recibida','Este estado muestra la confirmación que corresponde a la acción; guardar un borrador no lo publica.','good');
    return '';
  };
  return {esc,icon,img,btn,link,tag,notice,field,check,panel,title,row,file,upload,empty,confirm,keyValues,topics,typeName,activityName,data,classCards,progress,metrics,classHeader,shell,stateBlock};
})();
