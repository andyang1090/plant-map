// Wall paths are edited in world coordinates, then normalized for persistence.
let wallGesture=null,wallVertex=null,wallFrame=0;
const wallHandles=node('g',{id:'wallhandles'});svg.append(wallHandles);
function wallVertices(o){return o.points.map(p=>({x:o.x+p[0]*o.w,y:o.y+p[1]*o.h}))}
function writeWall(o,points){let x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y)),w=Math.max(...points.map(p=>p.x))-x,h=Math.max(...points.map(p=>p.y))-y;o.x=x;o.y=y;o.w=w;o.h=h;o.points=points.map(p=>[(p.x-x)/(w||1),(p.y-y)/(h||1)])}
function resolveWallVertex(e,neighbor){
  const exact=typeof rawBeforeNodeSnap==='function'?rawBeforeNodeSnap(e):rawPoint(e);
  let p={x:exact.x,y:exact.y};
  if(snap&&!e.altKey){p.x=Math.round(p.x/gridStep)*gridStep;p.y=Math.round(p.y/gridStep)*gridStep}
  if(orthogonalActive(e)&&neighbor){if(Math.abs(p.x-neighbor.x)>Math.abs(p.y-neighbor.y))p.y=neighbor.y;else p.x=neighbor.x}
  const candidate=snap&&!e.altKey?nearestDrawingNode(exact,new Set([wallGesture.id])):null;
  if(candidate&&(!orthogonalActive(e)||!neighbor||Math.abs(candidate.x-p.x)<.000001||Math.abs(candidate.y-p.y)<.000001)){
    indicateSnap(candidate);return{x:candidate.x,y:candidate.y};
  }
  indicateSnap(null);return{x:Math.round(p.x*100)/100,y:Math.round(p.y*100)/100};
}
function drawWallHandles(){wallHandles.replaceChildren();let o=sel();if(o?.type!=='wall'||tool!=='select')return;let points=wallVertices(o),scale=camera.w/Math.max(1,svg.getBoundingClientRect().width);points.forEach((p,i)=>{wallHandles.append(node('circle',{cx:p.x,cy:p.y,r:7*scale,fill:i===wallVertex?'#267b56':'#fff',stroke:'#267b56','stroke-width':2,'vector-effect':'non-scaling-stroke','data-wall-vertex':i,'data-wall-id':o.id,cursor:'move'}));if(i<points.length-1){let q=points[i+1],x=(p.x+q.x)/2,y=(p.y+q.y)/2;if(Math.hypot(q.x-p.x,q.y-p.y)>28*scale){wallHandles.append(node('rect',{x:x-4*scale,y:y-4*scale,width:8*scale,height:8*scale,fill:'#e4f4e9',stroke:'#267b56','vector-effect':'non-scaling-stroke','data-wall-insert':i,'data-wall-id':o.id,cursor:'copy'}))}}});svg.append(wallHandles)}
const wallDraw=draw;draw=function(){wallDraw();drawWallHandles()};
const wallPaint=paintObject;paintObject=function(o){wallPaint(o);if(o.type==='wall')drawWallHandles()};
const wallCamera=applyCamera;applyCamera=function(){wallCamera();drawWallHandles()};
function addWallVertex(index){let o=sel();if(o?.type!=='wall')return;let points=wallVertices(o),a=points[index],b=points[index+1];if(!a||!b)return;checkpoint();points.splice(index+1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});writeWall(o,points);wallVertex=index+1;save();paintObject(o);props()}
function deleteWallVertex(index){let o=sel();if(o?.type!=='wall')return;let points=wallVertices(o);if(points.length<=2){toast('墙体至少保留两个节点');return}checkpoint();points.splice(index,1);writeWall(o,points);wallVertex=null;save();paintObject(o);props()}
svg.addEventListener('pointerdown',e=>{let vertex=e.target.closest('[data-wall-vertex]'),insert=e.target.closest('[data-wall-insert]');if(e.button!==0||spaceHeld||tool!=='select'||(!vertex&&!insert))return;e.stopImmediatePropagation();e.preventDefault();if(insert){addWallVertex(Number(insert.dataset.wallInsert));return}let o=sel();if(!o||o.id!==vertex.dataset.wallId)return;wallVertex=Number(vertex.dataset.wallVertex);wallGesture={id:o.id,index:wallVertex,points:wallVertices(o),before:JSON.stringify(data),pointer:e.pointerId,moved:false,start:{x:e.clientX,y:e.clientY}};svg.setPointerCapture(e.pointerId);drawWallHandles();props()},true);
svg.addEventListener('pointermove',e=>{if(!wallGesture){if(drag?.mode==='move'&&sel()?.type==='wall'){cancelAnimationFrame(wallFrame);wallFrame=requestAnimationFrame(drawWallHandles)}return}e.stopImmediatePropagation();e.preventDefault();if(!wallGesture.moved&&Math.hypot(e.clientX-wallGesture.start.x,e.clientY-wallGesture.start.y)<(e.pointerType==='touch'?12:2))return;let points=wallGesture.points.map(p=>({...p})),index=wallGesture.index,neighbor=points[index?index-1:1];points[index]=resolveWallVertex(e,neighbor);let o=sel();if(o?.id!==wallGesture.id)return;writeWall(o,points);wallGesture.moved=true;paintObject(o);$('#properties').querySelectorAll('[data-k="x"],[data-k="y"]').forEach(n=>n.value=o[n.dataset.k]);$('#wallnodes').querySelectorAll('[data-node]').forEach(n=>n.value=Number(points[Number(n.dataset.node)][n.dataset.axis].toFixed(2)))},true);
function finishWallGesture(cancel=false){if(!wallGesture)return;let last=wallGesture;wallGesture=null;if(cancel){data=JSON.parse(last.before);flushSave()}else if(last.moved){history.push(last.before);if(history.length>40)history.shift();save()}draw();props()}
svg.addEventListener('pointerup',e=>{if(!wallGesture)return;e.stopImmediatePropagation();finishWallGesture()},true);
svg.addEventListener('pointercancel',e=>{if(!wallGesture)return;e.stopImmediatePropagation();finishWallGesture(true)},true);
svg.addEventListener('lostpointercapture',()=>finishWallGesture(true));
document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='Escape'&&wallGesture){e.stopImmediatePropagation();finishWallGesture(true)}},true);
window.addEventListener('blur',()=>finishWallGesture(true));
const wallProps=props;props=function(){wallProps();let o=sel();if(o?.type!=='wall')return;$('#hint').textContent='拖动墙体移动 · 圆点调整节点 · 小方块添加转角 · Shift 正交 · Ctrl+Z 撤销';let section=document.createElement('section');section.id='wallnodes';section.innerHTML='<div class="proptag">墙体节点</div><p>拖动圆点修改端点与转角；点击线段中点的小方块添加节点。</p>';wallVertices(o).forEach((p,i)=>{let row=document.createElement('div');row.className='wallnode';row.innerHTML=`<span>${i+1}</span><input aria-label="节点 ${i+1} X" type="number" step="any" data-node="${i}" data-axis="x" value="${Number(p.x.toFixed(2))}"><input aria-label="节点 ${i+1} Y" type="number" step="any" data-node="${i}" data-axis="y" value="${Number(p.y.toFixed(2))}"><button type="button" aria-label="删除节点 ${i+1}" ${o.points.length<=2?'disabled':''}>×</button>`;row.querySelector('button').onclick=()=>deleteWallVertex(i);row.querySelectorAll('input').forEach(n=>{n.onfocus=checkpoint;n.oninput=()=>{if(n.value==='')return;let v=Number(n.value);if(!Number.isFinite(v))return;let points=wallVertices(o);points[i][n.dataset.axis]=v;writeWall(o,points);wallVertex=i;paintObject(o);save()};n.onchange=flushSave});section.append(row)});let add=document.createElement('button');add.className='enter';add.textContent='在末段添加转角';add.onclick=()=>addWallVertex(o.points.length-2);section.append(add);$('#properties').append(section)};
const wallTool=setTool;setTool=function(t){wallTool(t);drawWallHandles();if(t==='select'&&sel()?.type==='wall')$('#hint').textContent='拖动墙体移动 · 圆点调整节点 · 小方块添加转角 · Shift 正交 · Ctrl+Z 撤销'};
render();



