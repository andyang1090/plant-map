// Browser history also covers mice whose side buttons are handled by the browser.
const canvasHistorySession=uid();
let canvasHistoryEntries=[],canvasHistoryIndex=0,restoringCanvasHistory=false;
function isProjectHomeView(){return sessionStorage.getItem('plant-atlas-project-mode')!=='editor'}
function canvasLocation(){return{home:isProjectHomeView(),workshop:page,floor:page?currentFloor()?.id:null,camera:{...camera}}}
function sameCanvas(a,b){return !!a?.home===!!b?.home&&a?.workshop===b?.workshop&&a?.floor===b?.floor}
function validCanvasLocation(entry){
  if(!entry)return false;
  // Site plan uses workshop:null; only concrete workshop/floor ids need catalog checks.
  if(entry.home||entry.workshop==null)return true;
  return data.items.some(o=>o.id===entry.workshop&&o.type==='workshop')&&!!data.floorCatalog?.[entry.workshop]?.some(f=>f.id===entry.floor);
}
function rememberCanvasCamera(){if(!isProjectHomeView()&&canvasHistoryEntries[canvasHistoryIndex])canvasHistoryEntries[canvasHistoryIndex].camera={...camera}}
function nextCanvasIndex(direction,from=canvasHistoryIndex){for(let i=from+direction;i>=0&&i<canvasHistoryEntries.length;i+=direction)if(validCanvasLocation(canvasHistoryEntries[i]))return i;return -1}
const canvasBack=document.createElement('button'),canvasForward=document.createElement('button');
canvasBack.textContent='‹';canvasBack.setAttribute('aria-label','上一个画布');canvasBack.title='上一个画布（鼠标后退键）';
canvasForward.textContent='›';canvasForward.setAttribute('aria-label','下一个画布');canvasForward.title='下一个画布（鼠标前进键）';
$('.headeractions').prepend(canvasBack,canvasForward);
function refreshCanvasHistoryButtons(){canvasBack.disabled=nextCanvasIndex(-1)<0;canvasForward.disabled=nextCanvasIndex(1)<0}
function browserCanvasState(index){return{...(historyStateSafe()),plantCanvas:{session:canvasHistorySession,index}}}
function historyStateSafe(){return window.history.state&&typeof window.history.state==='object'?window.history.state:{}}
function recordCanvasVisit(){
  if(restoringCanvasHistory)return;
  const entry=canvasLocation();
  if(sameCanvas(entry,canvasHistoryEntries[canvasHistoryIndex]))return;
  canvasHistoryEntries.splice(canvasHistoryIndex+1);canvasHistoryEntries.push(entry);canvasHistoryIndex++;
  window.history.pushState(browserCanvasState(canvasHistoryIndex),'');refreshCanvasHistoryButtons();
}
function travelCanvas(direction){const index=nextCanvasIndex(direction);if(index<0)return;rememberCanvasCamera();window.history.go(index-canvasHistoryIndex)}
function finishCanvasRestore(){queueMicrotask(()=>{restoringCanvasHistory=false;refreshCanvasHistoryButtons()})}
function restoreCanvasEntry(entry,index){
  roomTextEditor?.blur();settleFloorGestures();
  if(entry.home){
    showProjectHome();
    canvasHistoryIndex=index;
    return;
  }
  document.body.classList.remove('project-home-open');
  projectHome.hidden=true;
  const root=$('#editor-root');if(root)root.hidden=false;
  sessionStorage.setItem('plant-atlas-project-mode','editor');
  if(entry.workshop){ensureWorkshopFloors(entry.workshop);data.activeFloors[entry.workshop]=entry.floor}
  changePage(entry.workshop);
  if(entry.camera){camera={...entry.camera};const r=svg.getBoundingClientRect();camera.h=camera.w*r.height/Math.max(1,r.width);applyCamera()}
  canvasHistoryIndex=index;flushSave();
}
canvasBack.onclick=()=>travelCanvas(-1);canvasForward.onclick=()=>travelCanvas(1);
const historyChangePage=changePage;
changePage=function(id){if(!restoringCanvasHistory)rememberCanvasCamera();historyChangePage(id);recordCanvasVisit()};
const historySwitchFloor=switchFloor;
switchFloor=function(id){if(!restoringCanvasHistory)rememberCanvasCamera();historySwitchFloor(id);recordCanvasVisit()};
window.addEventListener('popstate',e=>{
  const state=e.state?.plantCanvas;
  if(!state||state.session!==canvasHistorySession)return;
  const entry=canvasHistoryEntries[state.index];if(!entry)return;
  if(!validCanvasLocation(entry)){
    const direction=state.index<canvasHistoryIndex?-1:1,index=nextCanvasIndex(direction,state.index);
    window.history.go((index<0?canvasHistoryIndex:index)-state.index);return;
  }
  rememberCanvasCamera();restoringCanvasHistory=true;
  try{restoreCanvasEntry(entry,state.index)}
  finally{finishCanvasRestore()}
});
window.addEventListener('pointerdown',e=>{
  if(e.button!==3&&e.button!==4)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(!document.querySelector('dialog[open]'))travelCanvas(e.button===3?-1:1);
},true);
for(const event of ['mousedown','mouseup','pointerup','auxclick'])window.addEventListener(event,e=>{if(e.button===3||e.button===4){e.preventDefault();e.stopImmediatePropagation()}},true);
const canvasHistoryRender=render;render=function(){canvasHistoryRender();refreshCanvasHistoryButtons()};
// Entry 0 is always the project portal. Entry 1 is the editor canvas at boot — never treat it as home,
// even while portal boot still has project-home-open on <body> while scripts load.
canvasHistoryEntries=[{home:true,workshop:null,floor:null,camera:{...camera}}];
window.history.replaceState(browserCanvasState(0),'');
if(sessionStorage.getItem('plant-atlas-project-mode')==='editor'){
  canvasHistoryEntries.push({home:false,workshop:page,floor:page?currentFloor()?.id:null,camera:{...camera}});
  canvasHistoryIndex=1;
  window.history.pushState(browserCanvasState(1),'');
}
refreshCanvasHistoryButtons();
