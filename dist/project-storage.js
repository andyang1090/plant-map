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
for(const event of ['keydown','copy','paste'])window.addEventListener(event,e=>{
  if(document.body?.classList.contains('project-home-open')){
    if(event==='keydown'&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s')e.preventDefault();
    e.stopImmediatePropagation();
  }
},true);
