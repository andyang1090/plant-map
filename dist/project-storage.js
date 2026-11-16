const PROJECT_LIBRARY_KEY='plant-atlas-projects-v1';
const PROJECT_DIAGRAM_PREFIX='plant-atlas-project:';
function loadProjectsLibrary(){
  try{const value=JSON.parse(localStorage.getItem(PROJECT_LIBRARY_KEY));if(value?.version===1&&Array.isArray(value.projects)&&value.projects.length&&value.projects.every(p=>typeof p.id==='string'&&typeof p.name==='string'))return value}catch{}
  return null;
}
function saveProjectsLibrary(value){localStorage.setItem(PROJECT_LIBRARY_KEY,JSON.stringify(value));projectLibrary=value}
let projectLibrary=loadProjectsLibrary(),legacyProjectFallback=false;
if(!projectLibrary){
  legacyProjectFallback=true;
  const id=crypto.randomUUID(),now=new Date().toISOString();
  projectLibrary={version:1,activeId:id,projects:[{id,name:'默认项目',createdAt:now,updatedAt:now}]};
  // Copy legacy data; retain the original key as a migration backup.
  try{const old=localStorage.getItem('plant-atlas-v1');if(old)localStorage.setItem(PROJECT_DIAGRAM_PREFIX+id,old);saveProjectsLibrary(projectLibrary)}catch{}
}
const currentProjectId=projectLibrary.projects.some(p=>p.id===projectLibrary.activeId)?projectLibrary.activeId:projectLibrary.projects[0].id;
function readProjectDiagram(){return localStorage.getItem(PROJECT_DIAGRAM_PREFIX+currentProjectId)||(legacyProjectFallback?localStorage.getItem('plant-atlas-v1'):null)}
function persistProjectDiagram(diagram){
  localStorage.setItem(PROJECT_DIAGRAM_PREFIX+currentProjectId,JSON.stringify(diagram));
  const library=loadProjectsLibrary()||projectLibrary,project=library.projects.find(p=>p.id===currentProjectId);
  if(project)project.updatedAt=new Date().toISOString();saveProjectsLibrary(library);
}
// The home screen must not send editing shortcuts to the hidden canvas.
// Keys aimed at the portal itself still propagate so the command bar can handle them.
for(const event of ['keydown','copy','paste'])window.addEventListener(event,e=>{
  if(!document.body?.classList.contains('project-home-open'))return;
  if(event==='keydown'&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s')e.preventDefault();
  if(event==='keydown'&&e.target.closest?.('#projecthome, #projectdialog'))return;
  e.stopImmediatePropagation();
},true);
window.addEventListener('keydown',e=>{
  if(document.body?.classList.contains('project-home-open'))e.stopImmediatePropagation();
});
// Hash routes for static hosting. #sitefold, #home and #tree stay element anchors.
const PLANT_HASH_ANCHORS=new Set(['sitefold','home','tree']);
function plantDecodePart(value){try{return decodeURIComponent(value)}catch{return value}}
function plantHashIsAnchor(hash){const bare=String(hash||'').replace(/^#/,'');return PLANT_HASH_ANCHORS.has(bare)}
function parsePlantHash(hash){
  const raw=String(hash||'');
  if(!raw||raw==='#')return {kind:'empty'};
  if(raw.charAt(0)!=='#')return {kind:'other'};
  if(plantHashIsAnchor(raw))return {kind:'anchor',id:raw.slice(1)};
  const body=raw.slice(1).replace(/^\//,'');
  if(!body)return {kind:'home'};
  let match=body.match(/^p\/([^/]+)\/site\/?$/);
  if(match)return {kind:'site',projectId:plantDecodePart(match[1])};
  match=body.match(/^p\/([^/]+)\/w\/([^/]+)(?:\/f\/([^/]+))?\/?$/);
  if(match)return {kind:'workshop',projectId:plantDecodePart(match[1]),workshopId:plantDecodePart(match[2]),floorId:match[3]?plantDecodePart(match[3]):null};
  if(body==='site'||body==='home')return {kind:'legacy-site'};
  const parts=body.split('/').filter(Boolean).map(plantDecodePart);
  if(parts.length&&parts.length<=2&&parts[0]!=='p')return {kind:'legacy',workshopName:parts[0],floorName:parts[1]||null};
  return {kind:'other'};
}
function plantDrawingHash(entry,projectId){
  if(!entry||entry.home)return '#/';
  const id=encodeURIComponent(projectId||'');
  if(!entry.workshop)return '#/p/'+id+'/site';
  let hash='#/p/'+id+'/w/'+encodeURIComponent(entry.workshop);
  if(entry.floor)hash+='/f/'+encodeURIComponent(entry.floor);
  return hash;
}
function plantHistoryUrl(hash){return location.pathname+location.search+(hash||'')}
