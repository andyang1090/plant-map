// Keep selection outside document data so exporting a plan never persists UI state.
let selectionIds = new Set(), selectionGesture = null, selectionFrame = 0;
let selectionPage = page;
const selectionLayer = node('g', {id:'selectionlayer', 'pointer-events':'none'});
svg.append(selectionLayer);

function selectedObjects() {
  return items().filter(o => selectionIds.has(o.id));
}

function syncSelection() {
  if (selectionPage !== page) {
    selectionIds.clear();
    selectionPage = page;
  }
  const present = new Set(items().map(o => o.id));
  selectionIds = new Set([...selectionIds].filter(id => present.has(id)));
  if (!selectionGesture) {
    if (!selected) selectionIds.clear();
    else if (!selectionIds.has(selected)) selectionIds = new Set([selected]);
  }
}

function setSelection(ids) {
  selectionIds = new Set(ids);
  selected = [...selectionIds].at(-1) || null;
  draw();
  props();
}

function selectionBounds(objects) {
  const visible = objects.filter(o => !o.type.endsWith('axis'));
  if (!visible.length) return null;
  const x = Math.min(...visible.map(o => o.x));
  const y = Math.min(...visible.map(o => o.y));
  return {x, y, w:Math.max(...visible.map(o => o.x + o.w)) - x,
    h:Math.max(...visible.map(o => o.y + o.h)) - y};
}

function drawSelection() {
  syncSelection();
  selectionLayer.replaceChildren();
  const group = selectedObjects();
  if (group.length > 1) {
    const scale = camera.w / Math.max(1, svg.getBoundingClientRect().width);
    for (const o of group) {
      if (o.type.endsWith('axis')) {
        const horizontal = o.type === 'haxis';
        selectionLayer.append(node('line', {
          ...axisLineCoordinates(o,true),
          stroke:'#2c926a', 'stroke-width':2, 'vector-effect':'non-scaling-stroke'
        }));
      } else {
        selectionLayer.append(node('rect', {x:o.x-3*scale, y:o.y-3*scale,
          width:o.w+6*scale, height:o.h+6*scale, fill:'none', stroke:'#2c926a',
          'stroke-width':1, 'vector-effect':'non-scaling-stroke'}));
      }
    }
    const b = selectionBounds(group);
    if (b) selectionLayer.append(node('rect', {x:b.x-9*scale, y:b.y-9*scale,
      width:b.w+18*scale, height:b.h+18*scale, fill:'none', stroke:'#237957',
      'stroke-dasharray':'5 4', 'vector-effect':'non-scaling-stroke'}));
    $('#objects').querySelectorAll('[data-resize]').forEach(n => n.remove());
    wallHandles.replaceChildren();
  }
  if (selectionGesture?.mode === 'box') {
    const a=selectionGesture.start, b=selectionGesture.end;
    selectionLayer.append(node('rect', {x:Math.min(a.x,b.x), y:Math.min(a.y,b.y),
      width:Math.abs(a.x-b.x), height:Math.abs(a.y-b.y), fill:'#32976d19',
      stroke:'#2c926a', 'stroke-width':1, 'stroke-dasharray':'5 3',
      'vector-effect':'non-scaling-stroke'}));
  }
  svg.append(selectionLayer);
}

const selectionDraw=draw;
draw=function(){ selectionDraw(); drawSelection(); };
const selectionCamera=applyCamera;
applyCamera=function(){ selectionCamera(); drawSelection(); };

function enclosed(o, box) {
  if (o.hidden || (o.type.endsWith('axis') && (!page || !data.axes))) return false;
  if (o.type === 'haxis') return o.y >= box.y && o.y <= box.bottom;
  if (o.type === 'vaxis') return o.x >= box.x && o.x <= box.right;
  return o.x >= box.x && o.y >= box.y && o.x+o.w <= box.right && o.y+o.h <= box.bottom;
}

function axisCrossingAt(p) {
  if (!page || !data.axes) return null;
  const threshold = 10 * camera.w / Math.max(1, svg.getBoundingClientRect().width);
  const axes = items().filter(o => !o.hidden && o.type.endsWith('axis'));
  const horizontal = axes.filter(o => o.type === 'haxis' && Math.abs(o.y-p.y) < threshold);
  const vertical = axes.filter(o => o.type === 'vaxis' && Math.abs(o.x-p.x) < threshold);
  let best = null, distance = threshold;
  for (const h of horizontal) for (const v of vertical) {
    if (typeof axisSpanContains === 'function' && (!axisSpanContains(h, v.x, h.y) || !axisSpanContains(v, v.x, h.y))) continue;
    const d = Math.hypot(v.x-p.x, h.y-p.y);
    if (d < distance) {best = {x:v.x, y:h.y, ids:[h.id, v.id]}; distance = d;}
  }
  return best;
}
function chooseAxisCrossing(e) {
  const marker = e.target.closest('[data-axis-cross]');
  if (marker) return [marker.dataset.horizontal, marker.dataset.vertical];
  const hit = e.target.closest('[data-id]');
  const object = hit && items().find(o => o.id === hit.dataset.id);
  if (!object || (object.type !== 'wall' && !object.type.endsWith('axis'))) return null;
  return axisCrossingAt(rawPoint(e))?.ids || null;
}
svg.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !['select','marquee'].includes(tool) || spaceHeld || wallGesture || drag) return;
  if (tool==='select' && e.target.closest('[data-wall-vertex],[data-wall-insert],[data-resize]')) return;
  if (tool === 'select' && !e.ctrlKey && !e.metaKey) {
    const ids = chooseAxisCrossing(e);
    if (ids && ids.length === 2 && ids.every(id => items().some(o => o.id === id && !o.hidden))) {
      e.stopImmediatePropagation(); e.preventDefault();
      setSelection(ids);
      return;
    }
  }
  const target=e.target.closest('[data-id]'), id=tool==='marquee'?null:target?.dataset.id;
  syncSelection();
  if (id && (e.ctrlKey||e.metaKey)) {
    e.stopImmediatePropagation(); e.preventDefault();
    const next=new Set(selectionIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelection(next);
    return;
  }
  if (id && !(selectionIds.size > 1 && selectionIds.has(id))) {
    selectionIds=new Set([id]);
    return; // Retain the existing single-object editor and node handles.
  }
  // A finger on empty space pans. A mouse drag in select mode still box-selects.
  if (!id && tool==='select' && e.pointerType==='touch') return;
  e.stopImmediatePropagation(); e.preventDefault();
  const p=rawPoint(e);
  svg.setPointerCapture(e.pointerId);
  selectionGesture={mode:id?'move':'box', start:{x:p.x,y:p.y}, end:{x:p.x,y:p.y},
    client:{x:e.clientX,y:e.clientY}, previous:new Set(selectionIds),
    additive:(e.ctrlKey||e.metaKey), marquee:tool==='marquee', before:JSON.stringify(data), moved:false,
    originals:id?selectedObjects().map(o=>({id:o.id,x:o.x,y:o.y})):[]};
  if (!id && !(e.ctrlKey||e.metaKey)) {selectionIds.clear(); selected=null;}
  drawSelection(); props();
}, true);

function paintSelectionGesture() {
  const gesture=selectionGesture;
  if (!gesture) return;
  if (gesture.mode==='move') {
    for (const initial of gesture.originals) {
      const o=items().find(o=>o.id===initial.id);
      const g=[...$('#objects').children].find(g=>g.dataset.id===initial.id);
      if (o && g) g.setAttribute('transform',`translate(${o.x-initial.x} ${o.y-initial.y})`);
    }
  }
  drawSelection();
}

svg.addEventListener('pointermove', e => {
  if (!selectionGesture) return;
  e.stopImmediatePropagation();
  const gesture=selectionGesture, p=rawPoint(e);
  gesture.end={x:p.x,y:p.y};gesture.altKey=e.altKey;
  if (!gesture.moved && Math.hypot(e.clientX-gesture.client.x,e.clientY-gesture.client.y)<(e.pointerType==='touch'?12:3)) return;
  gesture.moved=true;
  if (gesture.mode==='box') {
    const box={x:Math.min(p.x,gesture.start.x), y:Math.min(p.y,gesture.start.y),
      right:Math.max(p.x,gesture.start.x), bottom:Math.max(p.y,gesture.start.y)};
    const ids=items().filter(o=>enclosed(o,box)).map(o=>o.id);
    selectionIds=new Set([...(gesture.additive?gesture.previous:[]),...ids]);
    selected=[...selectionIds].at(-1)||null;
  } else {
    let dx=(snap&&!e.altKey)?align(p.x-gesture.start.x):p.x-gesture.start.x;
    let dy=(snap&&!e.altKey)?align(p.y-gesture.start.y):p.y-gesture.start.y;
    gesture.orthogonal=orthogonalActive(e);if(gesture.orthogonal){if(Math.abs(dx)>Math.abs(dy))dy=0;else dx=0}
    for (const initial of gesture.originals) {
      const o=items().find(o=>o.id===initial.id);
      if(o){o.x=Math.round((initial.x+dx)*10)/10;o.y=Math.round((initial.y+dy)*10)/10;}
    }
  }
  cancelAnimationFrame(selectionFrame);
  selectionFrame=requestAnimationFrame(paintSelectionGesture);
}, true);

function finishSelectionGesture(cancel=false) {
  const gesture=selectionGesture;
  if (!gesture) return;
  cancelAnimationFrame(selectionFrame);
  selectionGesture=null;
  if (cancel) {
    if (gesture.mode==='move') {data=JSON.parse(gesture.before);flushSave();}
    selectionIds=gesture.previous;
    selected=[...selectionIds].at(-1)||null;
  } else if (gesture.mode==='move' && gesture.moved) {
    history.push(gesture.before);
    if(history.length>40)history.shift();
    save();
  }
  if(gesture.marquee)setTool('select');
  draw();props();
}
svg.addEventListener('pointerup',e=>{if(selectionGesture){e.stopImmediatePropagation();finishSelectionGesture();}},true);
svg.addEventListener('pointercancel',e=>{if(selectionGesture){e.stopImmediatePropagation();finishSelectionGesture(true);}},true);
svg.addEventListener('lostpointercapture',()=>finishSelectionGesture(true));

function deleteSelection() {
  const objects=selectedObjects();
  if(objects.some(o=>o.type==='workshop'&&workshopHasContent(o.id)) &&
    !confirm(`删除选中的 ${objects.length} 个对象及所含车间内部图纸？可使用撤销恢复。`)) return;
  checkpoint();
  for(const o of objects)if(o.type==='workshop')removeWorkshopPlans(o.id);
  const remaining=items().filter(o=>!selectionIds.has(o.id));
  if(page)data.plans[planKey()]=remaining;else data.items=remaining;
  selectionIds.clear();selected=null;save();render();
}
const selectionProps=props;
props=function(){
  syncSelection();
  const objects=selectedObjects();
  if(objects.length<2){selectionProps();return;}
  $('#properties').innerHTML=`<div class="proptag">MULTIPLE SELECTION</div><h3>已选择 ${objects.length} 个对象</h3><p>拖动任一已选对象可整体移动。<br>Ctrl 点击可增减选择。</p><div class="selectionlist">${objects.map(o=>`<div>${esc(types[o.type])} · ${esc(o.name)}</div>`).join('')}</div><button class="delete" id="deleteselection">删除所选对象</button><button class="enter" id="clearselection">取消选择</button>`;
  $('#deleteselection').onclick=deleteSelection;
  $('#clearselection').onclick=()=>setSelection([]);
  $('#hint').textContent=`已选 ${objects.length} 个 · 拖动整体移动 · Ctrl 增减 · Delete 删除 · Esc 取消`;
};

document.addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;
  if(e.key==='Escape'){
    if(selectionGesture)finishSelectionGesture(true);else setSelection([]);
  }
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&selectionGesture)finishSelectionGesture(true);
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'&&['select','marquee'].includes(tool)){
    e.preventDefault();e.stopImmediatePropagation();setSelection(items().filter(o=>!o.hidden&&(!o.type.endsWith('axis')||(page&&data.axes))).map(o=>o.id));
  }
  if(selectionIds.size>1&&(e.key==='Delete'||e.key==='Backspace')){
    e.preventDefault();e.stopImmediatePropagation();deleteSelection();
  }
},true);
window.addEventListener('blur',()=>finishSelectionGesture(true));
const selectionPageChange=changePage;
changePage=function(id){finishSelectionGesture(true);selectionIds.clear();selectionPage=id;selectionPageChange(id);};
const selectionTool=setTool;
setTool=function(t){selectionTool(t);if(t==='select'&&selectionIds.size<2)$('#hint').textContent='空白处拖动框选 · Ctrl 增减选择 · 空格 / 中键平移 · Ctrl+A 全选';if(t==='select'&&selectionIds.size>1){wallHandles.replaceChildren();$('#hint').textContent=`已选 ${selectionIds.size} 个 · 拖动整体移动 · Ctrl 增减 · Delete 删除 · Esc 取消`;}if(t==='marquee')$('#hint').textContent='拖动框住对象 · 可从机房内部起框 · Ctrl 追加选择 · Esc 取消';};
const multiRender=render;
render=function(){multiRender();let b=document.createElement('button');b.dataset.tool='marquee';b.textContent='▱ 框选';b.onclick=()=>setTool('marquee');$('#tools').querySelector('[data-tool="select"]').after(b);setTool(tool);};
render();





