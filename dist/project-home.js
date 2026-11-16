// Editor chrome for the project portal. Portal UI itself lives in index.html + portal.js.
const projectHome=$('#projecthome')||document.createElement('section');
const projectDialog=$('#projectdialog');
if(!projectHome.id){projectHome.id='projecthome';projectHome.hidden=true;document.body.append(projectHome)}

function showProjectEditor(id){
  const library=loadProjectsLibrary()||projectLibrary,project=library.projects.find(p=>p.id===id&&!p.deletedAt);
  if(!project)return;
  if(id===currentProjectId){
    document.body.classList.remove('project-home-open');
    projectHome.hidden=true;
    const root=$('#editor-root');if(root)root.hidden=false;
    sessionStorage.setItem('plant-atlas-project-mode','editor');
    if(typeof recordCanvasVisit==='function')recordCanvasVisit();
    render();
    return;
  }
  try{
    flushSave();library.activeId=id;saveProjectsLibrary(library);
    if(typeof markProjectEditorEntry==='function')markProjectEditorEntry();
    else sessionStorage.setItem('plant-atlas-project-mode','editor');
    location.reload();
  }catch{toast('无法保存项目，请先导出当前图纸备份')}
}

function showProjectHome(){
  try{roomTextEditor?.blur();settleFloorGestures?.();indicateSnap?.(null);clearPreview?.()}catch{}
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  try{flushSave()}catch{}
  sessionStorage.setItem('plant-atlas-project-mode','home');
  try{window.history.replaceState(window.history.state,'',location.pathname+location.search+'#/')}catch{}
  location.reload();
}

const projectHomeButton=document.createElement('button');
projectHomeButton.id='returnprojecthome';projectHomeButton.className='navitem';
projectHomeButton.textContent='⌂　项目主页';projectHomeButton.onclick=showProjectHome;
$('.nav').insertBefore(projectHomeButton,$('.navlabel'));
const currentProjectBadge=document.createElement('div');currentProjectBadge.className='currentproject';
$('.nav').insertBefore(currentProjectBadge,projectHomeButton);
function refreshProjectBadge(){
  const project=(loadProjectsLibrary()||projectLibrary).projects.find(p=>p.id===currentProjectId);
  currentProjectBadge.textContent=`当前项目：${project?.name||'默认项目'}`;
  currentProjectBadge.title=currentProjectBadge.textContent;
}
window.addEventListener('storage',e=>{if(e.key===PROJECT_LIBRARY_KEY)refreshProjectBadge()});
refreshProjectBadge();
document.body.classList.remove('project-home-open');
projectHome.hidden=true;
const editorRoot=$('#editor-root');if(editorRoot)editorRoot.hidden=false;
document.title=(loadProjectsLibrary()||projectLibrary).projects.find(p=>p.id===currentProjectId)?.name||'WebMap';
if(window.__syncSiteAfterBoot&&typeof syncWorkshopRoute==='function'){
  window.__syncSiteAfterBoot=false;
  if(page)changePage(null);
  syncWorkshopRoute();
}
