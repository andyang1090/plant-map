// Lightweight project portal. Editor scripts load only when opening a project.
const EDITOR_SCRIPTS=[
  'app.js','editor.js','map.js','shapes.js','workshop-scope.js','wall-edit.js','multiselect.js',
  'view-options.js','floors.js','axis-spacing.js','workspace-options.js','axis-input.js','room-text.js',
  'axis-text.js','copy-defaults.js','escape-selection.js','delete-key.js','keyboard-motion.js',
  'canvas-history.js','axis-length.js','fullscreen.js','workshop-route.js','project-home.js','workshop-order.js'
];
const PORTAL_ASSET_BASE=(document.currentScript?.src||'').replace(/[^/]+$/,'')||'dist/';
let showProjectTrash=false,editingProjectId=null,editorBootPromise=null;
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
      for(const src of EDITOR_SCRIPTS)await loadScript(src);
      document.body.classList.remove('project-home-open');
      const home=pq('#projecthome');if(home)home.hidden=true;
      document.title='WebMap';
    }finally{
      if(loading){loading.hidden=true;loading.style.display='none'}
    }
  })();
  return editorBootPromise;
}
function enterProjectHome(){
  sessionStorage.setItem('plant-atlas-project-mode','home');
  document.body.classList.add('project-home-open');
  const home=pq('#projecthome');if(home)home.hidden=false;
  const root=pq('#editor-root');if(root)root.hidden=true;
  document.title='WebMap · 项目主页';
  renderProjectHome();
}
function openProjectEditor(id){
  const library=loadProjectsLibrary()||projectLibrary,project=library.projects.find(p=>p.id===id&&!p.deletedAt);
  if(!project)return;
  try{
    library.activeId=id;saveProjectsLibrary(library);
    sessionStorage.setItem('plant-atlas-project-mode','editor');
    location.reload();
  }catch{portalToast('无法打开项目，请先导出备份')}
}
function openProjectDialog(id=null){
  editingProjectId=id;
  const project=(loadProjectsLibrary()||projectLibrary).projects.find(p=>p.id===id);
  pq('#projectdialogtitle').textContent=id?'重命名项目':'新建项目';
  pq('#projectname').value=project?.name||'';
  pq('#saveprojectname').textContent=id?'保存名称':'创建项目';
  pq('#projectdialoghint').textContent=id?'修改项目名称不会更改厂区名称或图纸。':'新项目从空白总平图开始。';
  pq('#projectdialog').showModal();pq('#projectname').focus();
}
function setProjectDeleted(id,deleted){
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
function renderProjectHome(){
  const library=loadProjectsLibrary()||projectLibrary,search=(pq('#projectsearch')?.value||'').trim().toLowerCase();
  const projects=library.projects.filter(p=>!!p.deletedAt===showProjectTrash&&p.name.toLowerCase().includes(search)).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  pq('#projectlisttitle').textContent=showProjectTrash?'回收站':'最近使用的项目';
  pq('#projectstart').classList.toggle('active',!showProjectTrash);
  pq('#projecttrash').classList.toggle('active',showProjectTrash);
  pq('#projectcards').replaceChildren();
  for(const project of projects){
    const card=document.createElement('article');card.className='projectcard';card.title='双击打开项目';
    card.ondblclick=e=>{if(!showProjectTrash&&!e.target.closest('button'))openProjectEditor(project.id)};
    const icon=document.createElement('div');icon.className='projecticon';icon.textContent='▧';
    const name=document.createElement('h2');name.textContent=project.name;
    const summary=document.createElement('p');summary.textContent=projectSummary(project);
    const time=document.createElement('small');const date=new Date(project.updatedAt);
    time.textContent=Number.isNaN(date.getTime())?'':`最近编辑 ${date.toLocaleString('zh-CN')}`;
    const actions=document.createElement('div');actions.className='projectactions';
    function action(label,fn,primary=false){const b=document.createElement('button');b.textContent=label;b.type='button';b.onclick=fn;if(primary)b.className='projectprimary';actions.append(b)}
    if(showProjectTrash)action('恢复项目',()=>setProjectDeleted(project.id,false),true);
    else{action('打开项目',()=>openProjectEditor(project.id),true);action('重命名',()=>openProjectDialog(project.id));action('删除',()=>setProjectDeleted(project.id,true))}
    const details=document.createElement('div');details.className='projectdetails';details.append(name,summary);
    card.append(icon,details,time,actions);pq('#projectcards').append(card);
  }
  if(!projects.length){
    const empty=document.createElement('div');empty.className='projectempty';
    empty.textContent=showProjectTrash?'回收站为空':search?'没有找到匹配项目':'还没有项目，点击左侧新建。';
    pq('#projectcards').append(empty);
  }
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
  e.preventDefault();const name=pq('#projectname').value.trim();if(!name||name.length>60)return;
  const library=loadProjectsLibrary()||projectLibrary;
  if(library.projects.some(p=>!p.deletedAt&&p.id!==editingProjectId&&p.name===name)){portalToast('已有同名项目，请换一个名称');return}
  try{
    if(editingProjectId){const project=library.projects.find(p=>p.id===editingProjectId);if(project){project.name=name;saveProjectsLibrary(library)}}
    else{
      const id=crypto.randomUUID(),now=new Date().toISOString();
      const blank={version:1,items:[],plans:{},planSettings:{},floorCatalog:{},activeFloors:{},preferences:{snap:true,axisSpacing:15,roomDefaultWidth:4,roomDefaultHeight:4},identity:{systemName:'WebMap',siteName:name},axes:true,grid:true};
      localStorage.setItem(PROJECT_DIAGRAM_PREFIX+id,JSON.stringify(blank));
      library.projects.push({id,name,createdAt:now,updatedAt:now});saveProjectsLibrary(library);
    }
    pq('#projectdialog').close();renderProjectHome();
  }catch{portalToast('保存项目失败，浏览器存储空间可能不足')}
});
for(const id of ['closeprojectdialog','cancelprojectdialog'])document.getElementById(id)?.addEventListener('click',()=>pq('#projectdialog').close());
pq('#newproject')?.addEventListener('click',()=>openProjectDialog());
pq('#projectnewnav')?.addEventListener('click',()=>openProjectDialog());
pq('#projectsearch')?.addEventListener('input',renderProjectHome);
pq('#projectstart')?.addEventListener('click',()=>{showProjectTrash=false;renderProjectHome()});
pq('#projecttrash')?.addEventListener('click',()=>{showProjectTrash=true;renderProjectHome()});
const projectImportInput=document.createElement('input');projectImportInput.type='file';projectImportInput.accept='.json,application/json';projectImportInput.hidden=true;document.body.append(projectImportInput);
pq('#projectimport')?.addEventListener('click',()=>projectImportInput.click());
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
    showProjectTrash=false;if(pq('#projectsearch'))pq('#projectsearch').value='';renderProjectHome();portalToast('已导入为独立项目');
  }catch{portalToast('导入失败：请选择有效的系统 JSON 图纸文件（不超过 5 MB）')}
  finally{projectImportInput.value=''}
};
window.returnToProjectPortal=function(){
  try{if(typeof flushSave==='function')flushSave()}catch{}
  sessionStorage.setItem('plant-atlas-project-mode','home');
  location.reload();
};
window.openProjectEditor=openProjectEditor;
window.renderProjectHome=renderProjectHome;
window.showProjectHome=function(){window.returnToProjectPortal()};
window.showProjectEditor=openProjectEditor;

if(wantEditor())bootEditor().catch(err=>{console.error(err);portalToast('编辑器加载失败');enterProjectHome()});
else enterProjectHome();
