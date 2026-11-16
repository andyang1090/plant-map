// Keep the address bar on the drawing canvas history already recorded.
// replaceState only — pushState belongs to canvas history, otherwise mouse
// and browser back would step through a duplicate entry.
let applyingDrawingLink=false;
window.__plantEditorRouting=true;
function drawingTitle(entry){
  if(!entry||entry.home)return 'WebMap · 项目主页';
  if(!entry.workshop)return 'WebMap · 厂区总平图';
  const workshop=data.items.find(o=>o.id===entry.workshop);
  const floor=data.floorCatalog?.[entry.workshop]?.find(f=>f.id===entry.floor);
  return 'WebMap · '+[workshop?.name,floor?.name].filter(Boolean).join(' / ');
}
function syncCurrentDrawingLink(){
  if(applyingDrawingLink||(typeof restoringCanvasHistory!=='undefined'&&restoringCanvasHistory))return;
  if(plantHashIsAnchor(location.hash))return;
  const home=document.body.classList.contains('project-home-open')&&sessionStorage.getItem('plant-atlas-project-mode')!=='editor';
  const entry=home?{home:true,workshop:null,floor:null}:(typeof canvasLocation==='function'?canvasLocation():{home:false,workshop:page,floor:page?currentFloor()?.id||null:null});
  if(!home&&typeof canvasHistoryEntries!=='undefined'&&typeof sameCanvas==='function'){
    const slot=canvasHistoryEntries[canvasHistoryIndex];
    if(slot&&!sameCanvas(slot,entry)){slot.home=!!entry.home;slot.workshop=entry.workshop||null;slot.floor=entry.floor||null}
  }
  const next=drawingHashFor(entry);
  if(location.hash!==next){
    const state=typeof historyStateSafe==='function'?historyStateSafe():(window.history.state&&typeof window.history.state==='object'?window.history.state:{});
    try{window.history.replaceState(state,'',plantHistoryUrl(next))}catch{}
  }
  if(!home)document.title=drawingTitle(entry);
}
function syncWorkshopRoute(){syncCurrentDrawingLink()}
function adoptDrawingHash(){
  if(applyingDrawingLink||(typeof canvasHistoryNavigating!=='undefined'&&canvasHistoryNavigating))return;
  const link=parsePlantHash(location.hash);
  if(link.kind==='anchor'||link.kind==='empty'||link.kind==='other')return;
  const target=typeof plantResolveDrawing==='function'?plantResolveDrawing(link):{type:'ignore'};
  if(target.type==='ignore')return;
  if(target.type==='missing-project'){
    sessionStorage.setItem('plant-atlas-link-notice','未找到该项目，已返回项目主页');
    sessionStorage.setItem('plant-atlas-project-mode','home');
    try{window.history.replaceState(window.history.state,'',plantHistoryUrl('#/'))}catch{}
    location.reload();
    return;
  }
  if(target.type==='missing-drawing')toast('未找到该图纸，已打开厂区总平图');
  const resolved=target.type==='missing-drawing'?{type:'site'}:target;
  const entry={home:resolved.type==='home',workshop:resolved.type==='workshop'?resolved.workshopId:null,floor:resolved.type==='workshop'?resolved.floorId||null:null,camera:resolved.type==='home'?null:{...camera}};
  if(typeof canvasHistoryEntries==='undefined'){
    applyingDrawingLink=true;
    try{if(entry.home)showCanvasPortal();else plantShowDrawing(resolved)}finally{applyingDrawingLink=false;syncCurrentDrawingLink()}
    return;
  }
  if(typeof sameCanvas==='function'&&sameCanvas(entry,canvasHistoryEntries[canvasHistoryIndex])){
    const canonical=drawingHashFor(canvasHistoryEntries[canvasHistoryIndex]);
    if(location.hash!==canonical)window.history.back();
    return;
  }
  if(typeof rememberCanvasCamera==='function')rememberCanvasCamera();
  canvasHistoryEntries.splice(canvasHistoryIndex+1);
  canvasHistoryEntries.push(entry);
  canvasHistoryIndex=canvasHistoryEntries.length-1;
  applyingDrawingLink=true;
  const previousRestore=restoringCanvasHistory;
  restoringCanvasHistory=true;
  try{
    if(entry.home)showCanvasPortal();
    else plantShowDrawing(resolved);
    const shown=typeof canvasLocation==='function'?canvasLocation():entry;
    const slot=canvasHistoryEntries[canvasHistoryIndex];
    slot.home=!!shown.home;slot.workshop=shown.workshop||null;slot.floor=shown.floor||null;slot.camera=shown.home?null:shown.camera;
    window.history.replaceState(browserCanvasState(canvasHistoryIndex),'',plantHistoryUrl(drawingHashFor(slot)));
    document.title=drawingTitle(slot);
  }finally{
    restoringCanvasHistory=previousRestore;
    applyingDrawingLink=false;
    if(typeof refreshCanvasHistoryButtons==='function')refreshCanvasHistoryButtons();
  }
}
const routeChangePage=changePage;
changePage=function(id){routeChangePage(id);syncCurrentDrawingLink()};
const routeSwitchFloor=switchFloor;
switchFloor=function(id){routeSwitchFloor(id);syncCurrentDrawingLink()};
window.addEventListener('hashchange',adoptDrawingHash);
const openedFromHome=sessionStorage.getItem('plant-atlas-land-on-site')==='1';
if(openedFromHome)sessionStorage.removeItem('plant-atlas-land-on-site');
if(openedFromHome){
  window.__syncSiteAfterBoot=true;
  if(page)changePage(null);
}else syncCurrentDrawingLink();
