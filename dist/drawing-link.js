// Deep links are applied before canvas history records the open drawing,
// so a reload does not push an extra site-plan entry on the way in.
function drawingHashFor(entry){return plantDrawingHash(entry,currentProjectId)}
function plantResolveDrawing(link){
  if(!link||link.kind==='empty'||link.kind==='anchor'||link.kind==='other')return {type:'ignore'};
  if(link.kind==='home')return {type:'home'};
  if(link.kind==='site'||link.kind==='legacy-site'){
    if(link.projectId&&link.projectId!==currentProjectId)return {type:'missing-project'};
    return {type:'site'};
  }
  if(link.kind==='workshop'){
    if(link.projectId!==currentProjectId)return {type:'missing-project'};
    const workshop=data.items.find(o=>o.type==='workshop'&&o.id===link.workshopId);
    if(!workshop)return {type:'missing-drawing'};
    ensureWorkshopFloors(workshop.id);
    if(link.floorId){
      const floor=data.floorCatalog[workshop.id].find(f=>f.id===link.floorId);
      if(!floor)return {type:'missing-drawing'};
      return {type:'workshop',workshopId:workshop.id,floorId:floor.id};
    }
    return {type:'workshop',workshopId:workshop.id,floorId:data.activeFloors[workshop.id]||null};
  }
  if(link.kind==='legacy'){
    const workshop=data.items.find(o=>o.type==='workshop'&&(o.id===link.workshopName||o.name===link.workshopName));
    if(!workshop)return {type:'ignore'};
    ensureWorkshopFloors(workshop.id);
    if(!link.floorName)return {type:'workshop',workshopId:workshop.id,floorId:data.activeFloors[workshop.id]||null};
    const floor=data.floorCatalog[workshop.id].find(f=>f.id===link.floorName||f.name===link.floorName);
    if(!floor)return {type:'missing-drawing'};
    return {type:'workshop',workshopId:workshop.id,floorId:floor.id};
  }
  return {type:'ignore'};
}
function plantShowDrawing(target){
  if(!target||target.type==='home'||target.type==='ignore'||target.type==='missing-project')return;
  if(target.type!=='workshop'){if(page)changePage(null);return}
  ensureWorkshopFloors(target.workshopId);
  if(target.floorId)data.activeFloors[target.workshopId]=target.floorId;
  if(page!==target.workshopId)changePage(target.workshopId);
  else if(target.floorId&&currentFloor()?.id!==target.floorId)switchFloor(target.floorId);
}
function rememberDrawingNotice(message){if(message)sessionStorage.setItem('plant-atlas-link-notice',message)}
if(sessionStorage.getItem('plant-atlas-land-on-site')!=='1'){
  const pending=plantResolveDrawing(parsePlantHash(location.hash));
  if(pending.type==='missing-project'){
    rememberDrawingNotice('未找到该项目，已返回项目主页');
    sessionStorage.setItem('plant-atlas-project-mode','home');
    window.__plantLinkReloading=true;
    try{window.history.replaceState(window.history.state,'',plantHistoryUrl('#/'))}catch{}
    location.reload();
  }else if(pending.type==='missing-drawing'){
    rememberDrawingNotice('未找到该图纸，已打开厂区总平图');
    if(page)changePage(null);
  }else plantShowDrawing(pending);
}

const copyDrawingLinkButton=document.createElement('button');
copyDrawingLinkButton.id='copydrawinglink';
copyDrawingLinkButton.type='button';
copyDrawingLinkButton.className='fluent-command';
copyDrawingLinkButton.textContent='复制链接';
copyDrawingLinkButton.title='复制当前图纸链接';
copyDrawingLinkButton.setAttribute('aria-label','复制当前图纸链接');
async function copyCurrentDrawingLink(){
  const entry=typeof canvasLocation==='function'?canvasLocation():{home:!!document.body.classList.contains('project-home-open'),workshop:page,floor:page?currentFloor()?.id||null:null,camera:null};
  const hash=drawingHashFor(entry);
  const url=location.origin+plantHistoryUrl(hash);
  if(!plantHashIsAnchor(location.hash)&&location.hash!==hash){
    const state=typeof historyStateSafe==='function'?historyStateSafe():(window.history.state&&typeof window.history.state==='object'?window.history.state:{});
    try{window.history.replaceState(state,'',plantHistoryUrl(hash))}catch{}
  }
  let copied=false;
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);copied=true}}catch{}
  if(!copied){
    const field=document.createElement('textarea');
    field.value=url;field.setAttribute('readonly','');field.style.cssText='position:fixed;left:-9999px;top:0';
    document.body.append(field);field.focus();field.select();
    try{copied=document.execCommand('copy')}catch{}
    field.remove();
  }
  toast(copied?'链接已复制':'无法复制链接');
}
copyDrawingLinkButton.onclick=()=>{copyCurrentDrawingLink()};
const drawingLinkAnchor=document.querySelector('#import');
if(drawingLinkAnchor)drawingLinkAnchor.parentElement.insertBefore(copyDrawingLinkButton,drawingLinkAnchor);
else document.querySelector('.headeractions')?.append(copyDrawingLinkButton);
