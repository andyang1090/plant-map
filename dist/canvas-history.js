// Browser history also covers mice whose side buttons are handled by the browser.
// `history` in this page is the undo stack, so session history must go through `window.history`.
// The portal class stays on <body> until the editor finishes booting, so it cannot mark the open canvas as home.
const canvasHistorySession=uid();
let canvasHistoryEntries=[],canvasHistoryIndex=0,restoringCanvasHistory=false,canvasHistoryNavigating=false,canvasMouseHistory=false,canvasMouseSwallow=false;
function canvasLocation(){
  const portal=document.body.classList.contains('project-home-open')&&sessionStorage.getItem('plant-atlas-project-mode')!=='editor';
  return{home:portal,workshop:portal?null:page,floor:!portal&&page?currentFloor()?.id||null:null,camera:portal?null:{...camera}};
}
function sameCanvas(a,b){return !!a&&!!b&&!!a.home===!!b.home&&a.workshop===b.workshop&&a.floor===b.floor}
function validCanvasLocation(entry){return !!entry&&(!entry.workshop||data.items.some(o=>o.id===entry.workshop&&o.type==='workshop')&&data.floorCatalog?.[entry.workshop]?.some(f=>f.id===entry.floor))}
function finiteCamera(c){return !!c&&['x','y','w','h'].every(k=>Number.isFinite(c[k]))&&c.w>0&&c.h>0}
function rememberCanvasCamera(){const entry=canvasHistoryEntries[canvasHistoryIndex];if(entry&&!entry.home&&finiteCamera(camera))entry.camera={...camera}}
function nextCanvasIndex(direction,from=canvasHistoryIndex){for(let i=from+direction;i>=0&&i<canvasHistoryEntries.length;i+=direction)if(validCanvasLocation(canvasHistoryEntries[i]))return i;return -1}
const canvasBack=document.createElement('button'),canvasForward=document.createElement('button');
canvasBack.textContent='‹';canvasBack.setAttribute('aria-label','上一个画布');canvasBack.title='上一个画布（鼠标后退键）';
canvasForward.textContent='›';canvasForward.setAttribute('aria-label','下一个画布');canvasForward.title='下一个画布（鼠标前进键）';
$('.headeractions').prepend(canvasBack,canvasForward);
function refreshCanvasHistoryButtons(){canvasBack.disabled=nextCanvasIndex(-1)<0;canvasForward.disabled=nextCanvasIndex(1)<0}
function browserCanvasState(index){return{...(historyStateSafe()),plantCanvas:{session:canvasHistorySession,index}}}
function historyStateSafe(){const state=window.history.state;return state&&typeof state==='object'?state:{}}
function recordCanvasVisit(){
  if(restoringCanvasHistory)return;
  const entry=canvasLocation();
  if(sameCanvas(entry,canvasHistoryEntries[canvasHistoryIndex]))return;
  canvasHistoryEntries.splice(canvasHistoryIndex+1);canvasHistoryEntries.push(entry);canvasHistoryIndex++;
  window.history.pushState(browserCanvasState(canvasHistoryIndex),'');refreshCanvasHistoryButtons();
}
function travelCanvas(direction){const index=nextCanvasIndex(direction);if(index<0)return;rememberCanvasCamera();window.history.go(index-canvasHistoryIndex)}
canvasBack.onclick=()=>travelCanvas(-1);canvasForward.onclick=()=>travelCanvas(1);
const historyChangePage=changePage;
changePage=function(id){if(!restoringCanvasHistory)rememberCanvasCamera();historyChangePage(id);recordCanvasVisit()};
const historySwitchFloor=switchFloor;
switchFloor=function(id){if(!restoringCanvasHistory)rememberCanvasCamera();historySwitchFloor(id);recordCanvasVisit()};
function showCanvasPortal(){
  try{roomTextEditor?.blur();settleFloorGestures()}catch{}
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  try{flushSave()}catch{}
  sessionStorage.setItem('plant-atlas-project-mode','home');
  document.body.classList.add('project-home-open');
  const home=document.querySelector('#projecthome');if(home)home.hidden=false;
  const root=document.querySelector('#editor-root');if(root)root.hidden=true;
  document.title='WebMap · 项目主页';
  if(typeof renderProjectHome==='function')renderProjectHome();
}
window.addEventListener('popstate',e=>{
  canvasHistoryNavigating=true;setTimeout(()=>{canvasHistoryNavigating=false},0);
  const state=e.state?.plantCanvas;
  if(!state||state.session!==canvasHistorySession)return;
  const entry=canvasHistoryEntries[state.index];if(!entry)return;
  if(!validCanvasLocation(entry)){
    const direction=state.index<canvasHistoryIndex?-1:1,index=nextCanvasIndex(direction,state.index);
    window.history.go((index<0?canvasHistoryIndex:index)-state.index);return;
  }
  rememberCanvasCamera();restoringCanvasHistory=true;
  try{
    roomTextEditor?.blur();settleFloorGestures();
    if(entry.home){showCanvasPortal();canvasHistoryIndex=state.index;return}
    document.body.classList.remove('project-home-open');
    const home=document.querySelector('#projecthome');if(home)home.hidden=true;
    const root=document.querySelector('#editor-root');if(root)root.hidden=false;
    sessionStorage.setItem('plant-atlas-project-mode','editor');
    if(entry.workshop){
      ensureWorkshopFloors(entry.workshop);
      if(entry.floor&&data.floorCatalog[entry.workshop].some(f=>f.id===entry.floor))data.activeFloors[entry.workshop]=entry.floor;
    }
    changePage(entry.workshop);
    if(finiteCamera(entry.camera)){camera={...entry.camera};const r=svg.getBoundingClientRect();if(r.width>0&&r.height>0)camera.h=camera.w*r.height/r.width;applyCamera()}
    canvasHistoryIndex=state.index;flushSave();
  }finally{restoringCanvasHistory=false;refreshCanvasHistoryButtons()}
});
window.addEventListener('pointerdown',e=>{
  if(e.button!==3&&e.button!==4)return;
  const direction=e.button===3?-1:1,dialogOpen=!!document.querySelector('dialog[open]');
  canvasMouseHistory=!dialogOpen&&nextCanvasIndex(direction)>=0;
  canvasMouseSwallow=dialogOpen||canvasMouseHistory;
  if(!canvasMouseSwallow)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(canvasMouseHistory)travelCanvas(direction);
},true);
for(const event of ['mousedown','mouseup','pointerup','auxclick'])window.addEventListener(event,e=>{
  if(e.button!==3&&e.button!==4)return;
  if(canvasMouseSwallow){e.preventDefault();e.stopImmediatePropagation()}
  if(event==='auxclick'){canvasMouseSwallow=false;canvasMouseHistory=false}
},true);
const canvasHistoryRender=render;render=function(){canvasHistoryRender();refreshCanvasHistoryButtons()};
canvasHistoryEntries=[{home:true,workshop:null,floor:null,camera:null}];
window.history.replaceState(browserCanvasState(0),'');
if(sessionStorage.getItem('plant-atlas-project-mode')==='editor'){
  canvasHistoryEntries.push(canvasLocation());canvasHistoryIndex=1;window.history.pushState(browserCanvasState(1),'');
}
refreshCanvasHistoryButtons();
