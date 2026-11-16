// Lightweight project portal. Editor scripts load only when opening a project.
const EDITOR_SCRIPTS=[
  'app.js','editor.js','map.js','shapes.js','workshop-scope.js','wall-edit.js','multiselect.js',
  'view-options.js','floors.js','axis-spacing.js','workspace-options.js','axis-input.js','room-text.js',
  'axis-text.js','copy-defaults.js','escape-selection.js','delete-key.js','keyboard-motion.js',
  'drawing-link.js','canvas-history.js','axis-length.js','fullscreen.js','workshop-route.js','project-home.js','workshop-order.js','mobile.js'
];
const PORTAL_ASSET_BASE=(document.currentScript?.src||'').replace(/[^/]+$/,'')||'dist/';
let showProjectTrash=false,editingProjectId=null,editorBootPromise=null,selectedProjectId=null;
// mobile-view-only: same <960px / coarse-pointer check as the phone layout.
function plantMobileViewOnly(){
  return window.matchMedia('(max-width: 960px)').matches||window.matchMedia('(pointer: coarse)').matches;
}
window.plantMobileViewOnly=plantMobileViewOnly;
function syncPlantMobileView(){
  document.body.classList.toggle('mobile-view-only',plantMobileViewOnly());
  if(document.body.classList.contains('project-home-open')&&typeof renderProjectHome==='function')renderProjectHome();
}
syncPlantMobileView();
for(const query of ['(max-width: 960px)','(pointer: coarse)'])window.matchMedia(query).addEventListener('change',syncPlantMobileView);
function portalEditingTarget(target){
  return !!target&&(/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)||target.isContentEditable);
}
window.addEventListener('keydown',e=>{
  if(!plantMobileViewOnly()||document.body.classList.contains('project-home-open'))return;
  if(portalEditingTarget(e.target))return;
  const key=e.key,cmd=e.ctrlKey||e.metaKey,lower=key.toLowerCase();
  let block=key==='Escape'||key==='Delete'||key==='Backspace'||key==='Del'||e.code==='Delete'||key==='F3'||e.code==='F3';
  if(cmd&&['z','y','s','c','v','x','a','l'].includes(lower))block=true;
  if(!block&&!e.target?.closest?.('button,a,[role="tab"]')){
    if(key==='Enter'||(!cmd&&!e.altKey&&(lower==='v'||lower==='h'||/^[0-9.]$/.test(key))))block=true;
    if(key.startsWith('Arrow')&&!cmd&&!e.altKey&&!e.target?.closest?.('[role="tablist"]'))block=true;
  }
  if(!block)return;
  if(key==='Escape'){
    try{window.__plantCloseMobileSheets?.()}catch{}
    document.querySelectorAll('dialog[open]').forEach(dialog=>{try{dialog.close()}catch{}});
  }
  e.preventDefault();e.stopImmediatePropagation();
},true);
for(const type of ['copy','paste','cut'])window.addEventListener(type,e=>{
  if(!plantMobileViewOnly()||document.body.classList.contains('project-home-open')||portalEditingTarget(e.target))return;
  e.preventDefault();e.stopImmediatePropagation();
},true);
function pq(s){return document.querySelector(s)}
function portalToast(s){
  const el=pq('#toast');if(!el)return;el.textContent=s;el.style.display='block';
  clearTimeout(window.__portalToast);window.__portalToast=setTimeout(()=>el.style.display='none',2400);
}
function loadScript(src){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=PORTAL_ASSET_BASE+src;
    script.onload=()=>resolve();script.onerror=()=>reject(Error('script '+src));document.body.append(script);
  });
}
function wantEditor(){
  const active=(loadProjectsLibrary()||projectLibrary).projects.find(p=>p.id===currentProjectId);
  return sessionStorage.getItem('plant-atlas-project-mode')==='editor'&&!active?.deletedAt;
}
async function bootEditor(){
  if(editorBootPromise)return editorBootPromise;
  editorBootPromise=(async()=>{
    const loading=pq('#editorloading');
    if(loading){loading.hidden=false;loading.style.display='flex'}
    try{
      const root=pq('#editor-root');if(root)root.hidden=false;
      for(const src of EDITOR_SCRIPTS){if(window.__plantLinkReloading)return;await loadScript(src)}
      document.body.classList.remove('project-home-open');
      const home=pq('#projecthome');if(home)home.hidden=true;
      document.title='WebMap';
    }finally{
      if(loading){loading.hidden=true;loading.style.display='none'}
      if(!window.__plantLinkReloading)showPlantLinkNotice();
    }
  })();
  return editorBootPromise;
}
function enterProjectHome(){
  sessionStorage.removeItem('plant-atlas-land-on-site');
  sessionStorage.setItem('plant-atlas-project-mode','home');
  document.body.classList.add('project-home-open');
  const home=pq('#projecthome');if(home)home.hidden=false;
  const root=pq('#editor-root');if(root)root.hidden=true;
  document.title='WebMap · 项目主页';
  syncHomeAddress();
  renderProjectHome();
  showPlantLinkNotice();
}
function syncHomeAddress(){
  const link=parsePlantHash(location.hash);
  if(link.kind==='anchor'||location.hash==='#/')return;
  try{window.history.replaceState(window.history.state,'',location.pathname+location.search+'#/')}catch{}
}
function showPlantLinkNotice(){
  const message=sessionStorage.getItem('plant-atlas-link-notice');
  if(!message)return;
  sessionStorage.removeItem('plant-atlas-link-notice');
  portalToast(message);
}
function readStoredDiagram(projectId){
  try{return JSON.parse(localStorage.getItem(PROJECT_DIAGRAM_PREFIX+projectId)||'null')}catch{return null}
}
function drawingExists(diagram,link){
  const workshop=(diagram?.items||[]).find(o=>o&&o.type==='workshop'&&o.id===link.workshopId);
  if(!workshop)return false;
  if(!link.floorId)return true;
  const floors=diagram.floorCatalog?.[link.workshopId];
  if(!Array.isArray(floors))return link.floorId===link.workshopId;
  return floors.some(floor=>floor&&floor.id===link.floorId);
}
function activateLinkedProject(project,preferSite){
  const library=loadProjectsLibrary()||projectLibrary;
  if(preferSite)sessionStorage.setItem('plant-atlas-prefer-site','1');
  else sessionStorage.removeItem('plant-atlas-prefer-site');
  sessionStorage.setItem('plant-atlas-project-mode','editor');
  sessionStorage.removeItem('plant-atlas-land-on-site');
  if(library.activeId===project.id)return 'boot';
  library.activeId=project.id;saveProjectsLibrary(library);
  location.reload();
  return 'reload';
}
// A deep link opens that project and drawing. Homepage opens still go through markProjectEditorEntry.
function prepareDrawingLink(){
  const link=parsePlantHash(location.hash);
  if(link.kind==='empty'||link.kind==='anchor'||link.kind==='home'||link.kind==='other'||link.kind==='legacy-site')return false;
  const library=loadProjectsLibrary()||projectLibrary;
  if(link.kind==='legacy'){
    if(sessionStorage.getItem('plant-atlas-project-mode')!=='editor'){
      const diagram=readStoredDiagram(currentProjectId);
      const workshop=(diagram?.items||[]).find(o=>o&&o.type==='workshop'&&(o.id===link.workshopName||o.name===link.workshopName));
      if(!workshop){
        sessionStorage.setItem('plant-atlas-link-notice','未找到该图纸，已返回项目主页');
        sessionStorage.setItem('plant-atlas-project-mode','home');
        try{window.history.replaceState(window.history.state,'',location.pathname+location.search+'#/')}catch{}
        return false;
      }
    }
    const project=library.projects.find(p=>p.id===currentProjectId&&!p.deletedAt);
    return project?activateLinkedProject(project,false):false;
  }
  const project=library.projects.find(p=>p.id===link.projectId&&!p.deletedAt);
  if(!project){
    sessionStorage.setItem('plant-atlas-link-notice','未找到该项目，已返回项目主页');
    sessionStorage.setItem('plant-atlas-project-mode','home');
    sessionStorage.removeItem('plant-atlas-land-on-site');
    try{window.history.replaceState(window.history.state,'',location.pathname+location.search+'#/')}catch{}
    return false;
  }
  if(link.kind==='workshop'&&!drawingExists(readStoredDiagram(project.id),link)){
    sessionStorage.setItem('plant-atlas-link-notice','未找到该图纸，已打开厂区总平图');
    try{window.history.replaceState(window.history.state,'',location.pathname+location.search+'#/p/'+encodeURIComponent(project.id)+'/site')}catch{}
    return activateLinkedProject(project,true);
  }
  return activateLinkedProject(project,link.kind==='site');
}
// Homepage opens always boot the editor on the site plan. The one-shot flag is
// consumed after scripts load; prefer-site keeps a later refresh on that plan.
function markProjectEditorEntry(){
  sessionStorage.setItem('plant-atlas-project-mode','editor');
  sessionStorage.setItem('plant-atlas-land-on-site','1');
  sessionStorage.setItem('plant-atlas-prefer-site','1');
  try{if(location.hash)window.history.replaceState(window.history.state,'',location.pathname+location.search)}catch{}
}
function openProjectEditor(id){
  const library=loadProjectsLibrary()||projectLibrary,project=library.projects.find(p=>p.id===id&&!p.deletedAt);
  if(!project)return;
  try{
    library.activeId=id;saveProjectsLibrary(library);
    markProjectEditorEntry();
    location.reload();
  }catch{portalToast('无法打开项目，请先导出备份')}
}
function openProjectDialog(id=null){
  if(plantMobileViewOnly())return;
  editingProjectId=id;
  const project=(loadProjectsLibrary()||projectLibrary).projects.find(p=>p.id===id);
  pq('#projectdialogtitle').textContent=id?'重命名项目':'新建项目';
  pq('#projectname').value=project?.name||'';
  pq('#saveprojectname').textContent=id?'保存名称':'创建项目';
  pq('#projectdialoghint').textContent=id?'修改项目名称不会更改厂区名称或图纸。':'新项目从空白总平图开始。';
  pq('#projectname').removeAttribute('aria-invalid');
  pq('#projectdialog').showModal();pq('#projectname').focus();
}
function setProjectDeleted(id,deleted){
  if(deleted&&plantMobileViewOnly())return;
  const library=loadProjectsLibrary()||projectLibrary,project=library.projects.find(p=>p.id===id);if(!project)return;
  if(deleted&&!confirm(`将项目「${project.name}」移入回收站？图纸保留，可随时恢复。`))return;
  try{if(deleted)project.deletedAt=new Date().toISOString();else delete project.deletedAt;saveProjectsLibrary(library);renderProjectHome()}catch{portalToast('项目状态保存失败')}
}
function projectSummary(project){
  try{
    const diagram=JSON.parse(localStorage.getItem(PROJECT_DIAGRAM_PREFIX+project.id));
    const workshops=(diagram?.items||[]).filter(o=>o.type==='workshop').length;
    const all=[...(diagram?.items||[]),...Object.values(diagram?.plans||{}).flat()];
    return `${workshops} 个车间 · ${all.filter(o=>o.type==='room'||o.type==='cabinet').length} 个机房`;
  }catch{return '图纸暂不可读取'}
}
function currentHomeProjects(){
  const library=loadProjectsLibrary()||projectLibrary,search=(pq('#projectsearch')?.value||'').trim().toLowerCase();
  return library.projects.filter(p=>!!p.deletedAt===showProjectTrash&&p.name.toLowerCase().includes(search)).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
}
function markNavCurrent(id,on){
  const el=pq(id);if(!el)return;
  el.classList.toggle('active',on);
  if(on)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
}
function renderProjectCommands(projects){
  const bar=pq('#projectcommands');if(!bar)return;
  if(selectedProjectId&&!projects.some(p=>p.id===selectedProjectId))selectedProjectId=null;
  const project=projects.find(p=>p.id===selectedProjectId)||null;
  bar.replaceChildren();
  const add=(label,fn,opts={})=>{
    const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=!project;
    if(opts.primary)b.className='projectprimary';
    if(opts.danger)b.classList.add('danger');
    b.onclick=()=>{if(project)fn(project)};
    bar.append(b);
  };
  if(showProjectTrash)add('恢复项目',p=>setProjectDeleted(p.id,false),{primary:true});
  else{
    add('打开',p=>openProjectEditor(p.id),{primary:true});
    if(!plantMobileViewOnly()){add('重命名',p=>openProjectDialog(p.id));add('删除',p=>setProjectDeleted(p.id,true),{danger:true})}
  }
}
function selectProjectCard(id){
  selectedProjectId=id;
  document.querySelectorAll('#projectcards .projectcard').forEach(card=>{
    const on=card.dataset.id===id;
    card.classList.toggle('is-selected',on);
    card.setAttribute('aria-selected',on?'true':'false');
  });
  renderProjectCommands(currentHomeProjects());
}
function renderProjectHome(){
  if(plantMobileViewOnly()&&showProjectTrash)showProjectTrash=false;
  const search=(pq('#projectsearch')?.value||'').trim().toLowerCase();
  const projects=currentHomeProjects();
  if(selectedProjectId&&!projects.some(p=>p.id===selectedProjectId))selectedProjectId=null;
  pq('#projectlisttitle').textContent=showProjectTrash?'回收站':'最近使用的项目';
  const subtitle=pq('#projectlistsubtitle');
  if(subtitle)subtitle.textContent=showProjectTrash?'选择项目后可以恢复，图纸仍保留在此浏览器中。':(plantMobileViewOnly()?'点按「打开」或双击打开项目。':(window.matchMedia('(max-width: 960px)').matches?'点按选择项目，再点「打开」或双击打开。':'单击选择项目，双击或按 Enter 打开。'));
  markNavCurrent('#projectstart',!showProjectTrash);
  markNavCurrent('#projecttrash',showProjectTrash);
  const list=pq('#projectcards');
  list.setAttribute('aria-label',showProjectTrash?'回收站':'最近使用的项目');
  list.replaceChildren();
  const head=document.querySelector('.projectlisthead');if(head)head.hidden=!projects.length;
  for(const project of projects){
    const card=document.createElement('article');card.className='projectcard';card.dataset.id=project.id;card.tabIndex=0;card.role='option';
    card.title=showProjectTrash?'选择后可恢复项目':'双击打开项目';
    card.setAttribute('role','option');
    card.setAttribute('aria-label',project.name);
    card.setAttribute('aria-selected',project.id===selectedProjectId?'true':'false');
    card.classList.toggle('is-selected',project.id===selectedProjectId);
    card.ondblclick=e=>{if(!showProjectTrash&&!e.target.closest('button'))openProjectEditor(project.id)};
    card.addEventListener('pointerup',e=>{
      if(e.pointerType!=='touch'||showProjectTrash||e.target.closest('button'))return;
      const now=performance.now();
      if(card._tap&&now-card._tap<450){card._tap=0;openProjectEditor(project.id)}
      else card._tap=now;
    });
    const icon=document.createElement('div');icon.className='projecticon';icon.textContent='▧';
    const name=document.createElement('h2');name.textContent=project.name;name.title=project.name;
    const summary=document.createElement('p');summary.textContent=projectSummary(project);
    const time=document.createElement('small');const date=new Date(project.updatedAt);
    time.textContent=Number.isNaN(date.getTime())?'':`最近编辑 ${date.toLocaleString('zh-CN')}`;
    const actions=document.createElement('div');actions.className='projectactions';
    function action(label,fn,primary=false,danger=false){const b=document.createElement('button');b.textContent=label;b.type='button';b.onclick=fn;if(primary)b.className='projectprimary';if(danger)b.classList.add('danger');actions.append(b)}
    if(showProjectTrash)action('恢复项目',()=>setProjectDeleted(project.id,false),true);
    else{
      action('打开项目',()=>openProjectEditor(project.id),true);
      if(!plantMobileViewOnly()){action('重命名',()=>openProjectDialog(project.id));action('删除',()=>setProjectDeleted(project.id,true),false,true)}
    }
    const details=document.createElement('div');details.className='projectdetails';details.append(name,summary);
    card.append(icon,details,time,actions);list.append(card);
  }
  if(!projects.length){
    const empty=document.createElement('div');empty.className='projectempty';
    empty.textContent=showProjectTrash?'回收站为空':search?'没有找到匹配项目':(plantMobileViewOnly()?'还没有项目。':'还没有项目。从上方新建空白项目，或从左侧导入 JSON。');
    list.append(empty);
  }
  renderProjectCommands(projects);
}
function portalValidObject(o){
  return o&&typeof o.id==='string'&&typeof o.type==='string'&&typeof o.name==='string'&&['x','y','w','h'].every(k=>Number.isFinite(o[k]));
}
function portalValidFloorData(d){
  if(d.floorCatalog===undefined)return true;
  if(!d.floorCatalog||typeof d.floorCatalog!=='object'||Array.isArray(d.floorCatalog))return false;
  const keys=new Set();
  return Object.entries(d.floorCatalog).every(([id,floors])=>d.items.some(o=>o.type==='workshop'&&o.id===id)&&Array.isArray(floors)&&floors.length>0&&floors.every(f=>{
    if(!f||typeof f.id!=='string'||typeof f.name!=='string'||!f.name.trim()||typeof f.planKey!=='string'||!Object.hasOwn(d.plans,f.planKey)||keys.has(f.planKey))return false;
    keys.add(f.planKey);return true;
  })&&new Set(floors.map(f=>f.id)).size===floors.length);
}
pq('#projectdialog')?.querySelector('form')?.addEventListener('submit',e=>{
  e.preventDefault();if(plantMobileViewOnly())return;const name=pq('#projectname').value.trim();if(!name||name.length>60)return;
  const library=loadProjectsLibrary()||projectLibrary;
  if(library.projects.some(p=>!p.deletedAt&&p.id!==editingProjectId&&p.name===name)){pq('#projectname').setAttribute('aria-invalid','true');portalToast('已有同名项目，请换一个名称');return}
  try{
    if(editingProjectId){const project=library.projects.find(p=>p.id===editingProjectId);if(project){project.name=name;saveProjectsLibrary(library);selectedProjectId=project.id}}
    else{
      const id=crypto.randomUUID(),now=new Date().toISOString();
      const blank={version:1,items:[],plans:{},planSettings:{},floorCatalog:{},activeFloors:{},preferences:{snap:true,axisSpacing:15,roomDefaultWidth:4,roomDefaultHeight:4},identity:{systemName:'WebMap',siteName:name},axes:true,grid:true};
      localStorage.setItem(PROJECT_DIAGRAM_PREFIX+id,JSON.stringify(blank));
      library.projects.push({id,name,createdAt:now,updatedAt:now});saveProjectsLibrary(library);selectedProjectId=id;showProjectTrash=false;
    }
    pq('#projectname').removeAttribute('aria-invalid');
    pq('#projectdialog').close();renderProjectHome();
  }catch{portalToast('保存项目失败，浏览器存储空间可能不足')}
});
for(const id of ['closeprojectdialog','cancelprojectdialog'])document.getElementById(id)?.addEventListener('click',()=>pq('#projectdialog').close());
pq('#newproject')?.addEventListener('click',()=>openProjectDialog());
pq('#projectnewnav')?.addEventListener('click',()=>openProjectDialog());
function syncSearchClear(){const clear=pq('#projectsearchclear');if(clear)clear.hidden=!(pq('#projectsearch')?.value)}
pq('#projectsearch')?.addEventListener('input',()=>{syncSearchClear();renderProjectHome()});
pq('#projectsearchclear')?.addEventListener('click',()=>{const input=pq('#projectsearch');if(!input)return;input.value='';syncSearchClear();renderProjectHome();input.focus()});
pq('#projectname')?.addEventListener('input',()=>pq('#projectname').removeAttribute('aria-invalid'));
pq('#projectstart')?.addEventListener('click',()=>{showProjectTrash=false;selectedProjectId=null;renderProjectHome()});
pq('#projecttrash')?.addEventListener('click',()=>{showProjectTrash=true;selectedProjectId=null;renderProjectHome()});
pq('#projectcards')?.addEventListener('click',e=>{const card=e.target.closest?.('.projectcard');if(card)selectProjectCard(card.dataset.id)},true);
pq('#projectcards')?.addEventListener('keydown',e=>{
  const card=e.target.closest?.('.projectcard');if(!card||(e.target.closest?.('button')&&e.key==='Enter'))return;
  if(e.key==='Enter'){e.preventDefault();if(showProjectTrash)setProjectDeleted(card.dataset.id,false);else openProjectEditor(card.dataset.id)}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    const cards=[...pq('#projectcards').querySelectorAll('.projectcard')];
    const next=cards[cards.indexOf(card)+(e.key==='ArrowDown'?1:-1)];
    if(!next)return;selectProjectCard(next.dataset.id);next.focus();
  }
});
function setHomeNav(open){
  const nav=pq('#officenav'),toggle=pq('#homenavtoggle'),backdrop=pq('#homenavbackdrop');
  if(!nav||!toggle)return;
  const show=!!open&&window.matchMedia('(max-width: 960px)').matches;
  nav.classList.toggle('is-open',show);
  nav.toggleAttribute('inert',window.matchMedia('(max-width: 960px)').matches&&!show);
  toggle.setAttribute('aria-expanded',show?'true':'false');
  toggle.setAttribute('aria-label',show?'关闭导航':'打开导航');
  if(backdrop)backdrop.hidden=!show;
  if(show)nav.querySelector('button')?.focus();
  else if(window.matchMedia('(max-width: 960px)').matches&&nav.contains(document.activeElement)&&!document.querySelector('dialog[open]'))toggle.focus();
}
window.__setHomeNav=setHomeNav;
pq('#homenavtoggle')?.addEventListener('click',()=>setHomeNav(!pq('#officenav')?.classList.contains('is-open')));
pq('#homenavbackdrop')?.addEventListener('click',()=>setHomeNav(false));
pq('#officenav')?.addEventListener('click',e=>{if(window.matchMedia('(max-width: 960px)').matches&&e.target.closest('button'))setHomeNav(false)});
window.matchMedia('(max-width: 960px)').addEventListener('change',e=>{if(!e.matches)setHomeNav(false)});
setHomeNav(false);
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!document.body.classList.contains('project-home-open')||pq('#projectdialog')?.open)return;
  if(pq('#officenav')?.classList.contains('is-open')){setHomeNav(false);return}
  const active=document.activeElement;
  if(active?.id==='projectsearch'){
    if(active.value){active.value='';syncSearchClear();renderProjectHome()}
    else active.blur();
    return;
  }
  if(active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA'))return;
  if(!selectedProjectId)return;
  selectedProjectId=null;
  renderProjectHome();
});
const projectImportInput=document.createElement('input');projectImportInput.type='file';projectImportInput.accept='.json,application/json';projectImportInput.hidden=true;document.body.append(projectImportInput);
pq('#projectimport')?.addEventListener('click',()=>{if(!plantMobileViewOnly())projectImportInput.click()});
projectImportInput.onchange=async()=>{
  const file=projectImportInput.files[0];if(!file)return;
  try{
    if(file.size>5000000)throw Error();
    const diagram=JSON.parse(await file.text());
    if(diagram.version!==1||!Array.isArray(diagram.items)||!diagram.plans||typeof diagram.plans!=='object'||!diagram.items.every(portalValidObject)||!Object.values(diagram.plans).every(a=>Array.isArray(a)&&a.every(portalValidObject))||!portalValidFloorData(diagram))throw Error();
    const library=loadProjectsLibrary()||projectLibrary,id=crypto.randomUUID(),now=new Date().toISOString();
    const base=file.name.replace(/\.json$/i,'').trim().slice(0,50)||'导入项目';let name=base,n=2;
    while(library.projects.some(p=>!p.deletedAt&&p.name===name))name=base+' ('+(n++)+')';
    localStorage.setItem(PROJECT_DIAGRAM_PREFIX+id,JSON.stringify(diagram));
    library.projects.push({id,name,createdAt:now,updatedAt:now});saveProjectsLibrary(library);
    showProjectTrash=false;selectedProjectId=id;if(pq('#projectsearch'))pq('#projectsearch').value='';syncSearchClear();renderProjectHome();portalToast('已导入为独立项目');
  }catch{portalToast('导入失败：请选择有效的系统 JSON 图纸文件（不超过 5 MB）')}
  finally{projectImportInput.value=''}
};
window.returnToProjectPortal=function(){
  try{if(typeof flushSave==='function')flushSave()}catch{}
  sessionStorage.setItem('plant-atlas-project-mode','home');
  try{window.history.replaceState(window.history.state,'',location.pathname+location.search+'#/')}catch{}
  location.reload();
};
window.markProjectEditorEntry=markProjectEditorEntry;
window.openProjectEditor=openProjectEditor;
window.renderProjectHome=renderProjectHome;
window.showProjectHome=function(){window.returnToProjectPortal()};
window.showProjectEditor=openProjectEditor;

const drawingBoot=prepareDrawingLink();
if(drawingBoot!=='reload'){
  if(drawingBoot==='boot'||wantEditor())bootEditor().catch(err=>{console.error(err);portalToast('编辑器加载失败');enterProjectHome()});
  else enterProjectHome();
}
window.addEventListener('hashchange',()=>{
  if(window.__plantEditorRouting||editorBootPromise)return;
  const link=parsePlantHash(location.hash);
  if(link.kind!=='site'&&link.kind!=='workshop'&&link.kind!=='legacy')return;
  const outcome=prepareDrawingLink();
  if(outcome==='boot')bootEditor().catch(err=>{console.error(err);portalToast('编辑器加载失败');enterProjectHome()});
  else if(outcome!=='reload')enterProjectHome();
});
