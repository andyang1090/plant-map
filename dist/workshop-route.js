// Reflect workshop / floor in the URL hash so links can be shared, e.g. #/CT1/1F
let applyingWorkshopRoute=false;
function workshopRouteParts(){
  if(!page)return [];
  const workshop=data.items.find(o=>o.id===page&&o.type==='workshop');
  if(!workshop)return [];
  const floor=typeof currentFloor==='function'?currentFloor():null;
  return [workshop.name||workshop.id,floor?.name].filter(Boolean);
}
function workshopRouteHash(parts=workshopRouteParts()){
  if(!parts.length)return '#/';
  return '#/'+parts.map(part=>encodeURIComponent(part)).join('/');
}
function syncWorkshopRoute(){
  if(applyingWorkshopRoute||document.body.classList.contains('project-home-open'))return;
  const next=workshopRouteHash();
  if(location.hash===next)return;
  const url=location.pathname+location.search+next;
  // The undo stack is named `history`, so this must use the browser session history.
  const state=typeof historyStateSafe==='function'?historyStateSafe():(window.history.state&&typeof window.history.state==='object'?window.history.state:{});
  try{window.history.replaceState(state,'',url)}catch{}
  const label=workshopRouteParts().join(' / ');
  if(label)document.title=`WebMap · ${label}`;
}
function applyWorkshopRoute(hash=location.hash){
  if(document.body.classList.contains('project-home-open'))return false;
  const raw=String(hash||'').replace(/^#\/?/,'');
  applyingWorkshopRoute=true;
  try{
    if(!raw||raw==='site'||raw==='home'){
      if(page)changePage(null);
      return true;
    }
    const [workshopName,floorName]=raw.split('/').map(part=>{try{return decodeURIComponent(part)}catch{return part}});
    const workshop=data.items.find(o=>o.type==='workshop'&&(o.name===workshopName||o.id===workshopName));
    if(!workshop)return false;
    if(page!==workshop.id)changePage(workshop.id);
    if(floorName&&typeof ensureWorkshopFloors==='function'){
      ensureWorkshopFloors(workshop.id);
      const floor=data.floorCatalog[workshop.id]?.find(f=>f.name===floorName||f.id===floorName);
      if(floor&&currentFloor()?.id!==floor.id)switchFloor(floor.id);
    }
    return true;
  }finally{applyingWorkshopRoute=false;syncWorkshopRoute()}
}
const routeChangePage=changePage;
changePage=function(id){routeChangePage(id);syncWorkshopRoute()};
const routeSwitchFloor=switchFloor;
switchFloor=function(id){routeSwitchFloor(id);syncWorkshopRoute()};
window.addEventListener('hashchange',()=>{
  if(applyingWorkshopRoute||(typeof canvasHistoryNavigating!=='undefined'&&canvasHistoryNavigating))return;
  applyWorkshopRoute();
});
// The portal class is still on <body> while this file loads, so a homepage
// open must ignore any leftover workshop hash before that class is removed.
const openedFromHome=sessionStorage.getItem('plant-atlas-land-on-site')==='1';
if(openedFromHome)sessionStorage.removeItem('plant-atlas-land-on-site');
if(openedFromHome){
  // Hash sync runs after project-home.js drops the portal class.
  window.__syncSiteAfterBoot=true;
  if(page)changePage(null);
}else if(location.hash&&location.hash!=='#/'&&location.hash!=='#')applyWorkshopRoute();
else syncWorkshopRoute();
