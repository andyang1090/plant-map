// Editable identity and view snapshots are part of the exported document.
function identityText(selector, key, fallback) {
  const element=document.querySelector(selector);
  element.contentEditable='true'; element.spellcheck=false;
  element.setAttribute('role','textbox'); element.setAttribute('aria-label',key==='systemName'?'系统名称':'厂区名称');
  element.title='点击编辑，Enter 保存';
  element.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();element.blur()}};
  element.onblur=()=>{
    const value=element.textContent.trim().slice(0,60)||fallback;
    data.identity??={};data.identity[key]=value;element.textContent=value;save();
  };
}
$('.workspace').replaceChildren();
const siteName=document.createElement('span');siteName.id='sitename';$('.workspace').append(siteName);
identityText('.brand b','systemName','WebMap');identityText('#sitename','siteName','北区制造基地');
function refreshIdentity(){
  if(document.activeElement!==$('.brand b'))$('.brand b').textContent=data.identity?.systemName||'WebMap';
  if(document.activeElement!==$('#sitename'))$('#sitename').textContent=data.identity?.siteName||'北区制造基地';
  document.title=(data.identity?.systemName||'WebMap')+' · '+(data.identity?.siteName||'厂区管理');
}
const viewKey=()=>page?planKey():'site-overview';
function captureCurrentView(){
  if(document.activeElement?.isContentEditable)document.activeElement.blur();
  data.savedViews??={};
  data.savedViews[viewKey()]={camera:{...camera},grid:data.grid,axes:data.axes,snap,
    preferences:{...data.preferences},settings:page?{...referenceState()}:null};
  data.lastView={workshop:page,floor:page?currentFloor()?.id:null};
  flushSave();toast('当前视图、图纸和设置已保存');
}
function restoreCurrentView(){
  const view=data.savedViews?.[viewKey()];if(!view)return;
  if(!view.camera||!['x','y','w','h'].every(k=>Number.isFinite(view.camera[k]))||view.camera.w<=0||view.camera.h<=0)return;
  camera={...view.camera};const rect=svg.getBoundingClientRect();camera.h=camera.w*rect.height/Math.max(1,rect.width);
  data.grid=view.grid!==false;snap=view.snap!==false;data.preferences={...data.preferences,...view.preferences,snap};
  if(page&&view.settings){data.planSettings??={};data.planSettings[planKey()]={...view.settings};data.axes=view.axes!==false}
  render();applyCamera();
}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();e.stopImmediatePropagation();captureCurrentView()}},true);
const pageWithSavedView=changePage;changePage=function(id){pageWithSavedView(id);restoreCurrentView()};
const floorWithSavedView=switchFloor;switchFloor=function(id){floorWithSavedView(id);restoreCurrentView()};

// Preserve all existing objects and metadata while presenting one room category.
function unifyRooms(){let changed=false;for(const o of [...data.items,...Object.values(data.plans).flat()])if(o.type==='cabinet'){o.type='room';o.previousType='cabinet';changed=true}return changed}
function starPoints(o){const cx=o.x+o.w/2,cy=o.y+o.h/2;return Array.from({length:10},(_,i)=>{let a=-Math.PI/2+i*Math.PI/5,r=i%2?.44:1;return`${cx+Math.cos(a)*o.w/2*r},${cy+Math.sin(a)*o.h/2*r}`}).join(' ')}
function drawRoomStars(){
  const scale=camera.w/Math.max(1,svg.getBoundingClientRect().width);
  for(const o of items().filter(o=>o.type==='room')){
    const group=[...$('#objects').children].find(g=>g.dataset.id===o.id);if(!group)continue;
    const hit=group.querySelector('rect');if(hit){hit.style.fill='transparent';hit.style.stroke='none';hit.style.pointerEvents='all'}
    let star=group.querySelector('.roomstar');if(!star){star=node('polygon',{class:'roomstar','vector-effect':'non-scaling-stroke'});group.insertBefore(star,group.querySelector('text'))}
    star.setAttribute('points',starPoints(o));star.setAttribute('fill',/^#[0-9a-f]{6}$/i.test(o.color)?o.color:'#f3d77b');star.setAttribute('stroke',selectionIds.has(o.id)?'#247957':'#b7973b');star.setAttribute('stroke-width','1.5');
    const label=group.querySelector('text');if(label)label.setAttribute('y',o.y+o.h+objectFont(o)*fontWorldScale(o)+4*scale);
    const handle=group.querySelector('[data-resize]');if(handle){const size=Math.min(o.w,o.h)*.18;handle.setAttribute('x',o.x+o.w-size/2);handle.setAttribute('y',o.y+o.h-size/2);handle.setAttribute('width',size);handle.setAttribute('height',size)}
  }
}
const starText=formatDiagramText;formatDiagramText=function(){starText();drawRoomStars()};
const starDraw=draw;draw=function(){starDraw();drawRoomStars()};
const starPaint=paintObject;paintObject=function(o){starPaint(o);drawRoomStars()};
const roomProperties=props;props=function(){roomProperties();const o=sel();if(o?.type!=='room')return;
  const fields=document.createElement('section');fields.innerHTML='<label class="field">机房颜色</label><input type="color" aria-label="机房颜色"><label class="field">型号 / 规格</label><input aria-label="型号 / 规格">';
  const color=fields.querySelector('[type=color]'),model=fields.querySelector('input:not([type=color])');color.value=/^#[0-9a-f]{6}$/i.test(o.color)?o.color:'#f3d77b';model.value=o.model||'';
  for(const input of [color,model]){input.onfocus=checkpoint;input.oninput=()=>{o[input===color?'color':'model']=input.value;paintObject(o);save()}}
  for(const n of $('#properties').querySelectorAll('[data-k="w"],[data-k="h"]')){n.min='0.1';n.step='0.1';n.previousElementSibling.textContent=n.dataset.k==='w'?'宽度（m）':'高度（m）'}
  $('#properties').append(fields);
};

// Screen-distance tolerance keeps node snapping usable at every zoom level.
function drawingNodes(excluded=new Set()){
  return items().filter(o=>!o.hidden&&!excluded.has(o.id)&&!o.type.endsWith('axis')).flatMap(o=>
    o.points?o.points.map(p=>({x:o.x+p[0]*o.w,y:o.y+p[1]*o.h})):
    [{x:o.x,y:o.y},{x:o.x+o.w,y:o.y},{x:o.x,y:o.y+o.h},{x:o.x+o.w,y:o.y+o.h},{x:o.x+o.w/2,y:o.y+o.h/2}]);
}
function nearestDrawingNode(p,excluded=new Set()){
  const threshold=10*camera.w/Math.max(1,svg.getBoundingClientRect().width);let best=null,distance=threshold;
  for(const candidate of drawingNodes(excluded)){const d=Math.hypot(candidate.x-p.x,candidate.y-p.y);if(d<distance){best=candidate;distance=d}}
  if(page&&data.axes){
    const axes=items().filter(o=>!o.hidden&&!excluded.has(o.id));
    // Orthogonal axes: the nearest crossing is the nearest X and nearest Y.
    const horizontal=axes.filter(o=>o.type==='haxis'&&Math.abs(o.y-p.y)<threshold),vertical=axes.filter(o=>o.type==='vaxis'&&Math.abs(o.x-p.x)<threshold);
    for(const h of horizontal)for(const v of vertical){const candidate={x:v.x,y:h.y};if(typeof axisSpanContains==='function'&&(!axisSpanContains(h,candidate.x,candidate.y)||!axisSpanContains(v,candidate.x,candidate.y)))continue;const d=Math.hypot(candidate.x-p.x,candidate.y-p.y);if(d<distance){best=candidate;distance=d}}
  }
  return best;
}
const snapIndicator=node('g',{'pointer-events':'none',id:'nodesnapindicator'});svg.append(snapIndicator);
function indicateSnap(p){snapIndicator.replaceChildren();if(!p)return;const r=6*camera.w/Math.max(1,svg.getBoundingClientRect().width);snapIndicator.append(node('circle',{cx:p.x,cy:p.y,r,fill:'#ffffffbb',stroke:'#de8c20','stroke-width':2,'vector-effect':'non-scaling-stroke'}));svg.append(snapIndicator)}
const unsnappedPoint=point;point=function(e){const p=unsnappedPoint(e);if(!snap||e.altKey)return p;const exact=rawPoint(e),node=nearestDrawingNode(exact,new Set(drag?[selected]:[]));indicateSnap(node);return node?{...node}:p};
const rawBeforeNodeSnap=rawPoint;rawPoint=function(e){const p=rawBeforeNodeSnap(e);if(!snap||e.altKey||(!sketch&&!wallGesture))return p;const candidate=nearestDrawingNode(p,new Set(wallGesture?[wallGesture.id]:[]));indicateSnap(candidate);return candidate?{...candidate}:p};
const axisWithNodeSnap=smartAxis;smartAxis=function(e){const result=axisWithNodeSnap(e);if(!snap||e.altKey||items().some(o=>o.type===tool))return result;const candidate=nearestDrawingNode(rawBeforeNodeSnap(e));if(!candidate)return result;indicateSnap(candidate);return result.h?{...result,y:candidate.y,value:candidate.y}:{...result,x:candidate.x,value:candidate.x}};
const moveWithNodes=svg.onpointermove;
svg.onpointermove=function(e){moveWithNodes(e);if(!snap||e.altKey||drag?.mode!=='move')return;const o=sel();if(!o)return;
  const anchors=o.points?o.points.map(p=>({x:o.x+p[0]*o.w,y:o.y+p[1]*o.h})):[{x:o.x,y:o.y},{x:o.x+o.w,y:o.y+o.h},{x:o.x+o.w/2,y:o.y+o.h/2}];
  let best=null;for(const p of anchors){const candidate=nearestDrawingNode(p,new Set([o.id]));if(candidate){const d=Math.hypot(candidate.x-p.x,candidate.y-p.y);if(!best||d<best.d)best={d,dx:candidate.x-p.x,dy:candidate.y-p.y,target:candidate}}}
  if(best&&orthogonalActive(e)){const horizontal=Math.abs(o.x-drag.original.x)>Math.abs(o.y-drag.original.y);if(horizontal?Math.abs(best.dy)>.000001:Math.abs(best.dx)>.000001)best=null}if(best){o.x+=best.dx;o.y+=best.dy;indicateSnap(best.target);schedulePaint()}
};
svg.addEventListener('pointerup',()=>indicateSnap(null));svg.addEventListener('pointerleave',()=>indicateSnap(null));
const groupSnapPaint=paintSelectionGesture;paintSelectionGesture=function(){
  if(snap&&!selectionGesture?.altKey&&selectionGesture?.mode==='move'){
    const excluded=new Set(selectionIds);let best=null;
    for(const o of selectedObjects())for(const p of (o.points?o.points.map(v=>({x:o.x+v[0]*o.w,y:o.y+v[1]*o.h})):[{x:o.x,y:o.y}])){
      const target=nearestDrawingNode(p,excluded);if(target){const d=Math.hypot(target.x-p.x,target.y-p.y);if(!best||d<best.d)best={d,dx:target.x-p.x,dy:target.y-p.y,target}}
    }
    if(best&&selectionGesture.orthogonal){const first=selectionGesture.originals[0],current=items().find(o=>o.id===first.id),horizontal=Math.abs(current.x-first.x)>Math.abs(current.y-first.y);if(horizontal?Math.abs(best.dy)>.000001:Math.abs(best.dx)>.000001)best=null}if(best){selectedObjects().forEach(o=>{o.x+=best.dx;o.y+=best.dy});indicateSnap(best.target)}
  }
  groupSnapPaint();
};

const workspaceRender=render;render=function(){const changed=unifyRooms();workspaceRender();refreshIdentity();
  $('#tools [data-tool="cabinet"]')?.remove();const roomTool=$('#tools [data-tool="room"]');if(roomTool)roomTool.textContent='★ 机房';
  const stats=[...$('#stats').children];const cabinet=stats.find(n=>n.querySelector('small')?.textContent==='机柜数量');if(cabinet)cabinet.remove();$('#stats').style.gridTemplateColumns='repeat(3,minmax(80px,1fr))';
  $('.canvaslegend').innerHTML='<span>■ 车间</span><span>★ 机房</span><span>文字备注</span>';
  drawRoomStars();if(changed)save();
};
render();
const savedLocation=data.lastView;
if(savedLocation?.workshop&&data.items.some(o=>o.id===savedLocation.workshop&&o.type==='workshop')){
  ensureWorkshopFloors(savedLocation.workshop);if(data.floorCatalog[savedLocation.workshop].some(f=>f.id===savedLocation.floor))data.activeFloors[savedLocation.workshop]=savedLocation.floor;
  changePage(savedLocation.workshop);
}else restoreCurrentView();




