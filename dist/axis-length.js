// Keep same-direction axes flush: shared start + equal length, centered on the other direction.
function alignAxisGroup(type,length=configuredAxisLength(type)){
  if(!page||!['haxis','vaxis'].includes(type)||!Number.isFinite(length)||length<=0)return;
  const axes=items().filter(o=>o.type===type);
  if(!axes.length)return;
  if(type==='haxis'){
    const verts=items().filter(o=>o.type==='vaxis');
    const centerX=verts.length
      ?(Math.min(...verts.map(o=>o.x))+Math.max(...verts.map(o=>o.x)))/2
      :axes.reduce((sum,o)=>sum+o.x+(Number(o.w)||length)/2,0)/axes.length;
    const startX=Math.round((centerX-length/2)*100)/100;
    for(const o of axes){o.x=startX;o.w=length}
  }else{
    const hors=items().filter(o=>o.type==='haxis');
    const centerY=hors.length
      ?(Math.min(...hors.map(o=>o.y))+Math.max(...hors.map(o=>o.y)))/2
      :axes.reduce((sum,o)=>sum+o.y+(Number(o.h)||length)/2,0)/axes.length;
    const startY=Math.round((centerY-length/2)*100)/100;
    for(const o of axes){o.y=startY;o.h=length}
  }
}
function applyAxisLength(type,value){
  if(!page||!['haxis','vaxis'].includes(type)||!Number.isFinite(value)||value<=0)return false;
  data.planSettings??={};data.planSettings[planKey()]??={};data.planSettings[planKey()].axisLengths??={};
  data.planSettings[planKey()].axisLengths[type]=value;
  const saved=data.savedViews?.[planKey()];if(saved){saved.settings??={};saved.settings.axisLengths={...saved.settings.axisLengths,[type]:value}}
  alignAxisGroup(type,value);
  const other=type==='haxis'?'vaxis':'haxis';
  if(items().some(o=>o.type===other))alignAxisGroup(other,configuredAxisLength(other));
  return true;
}
function syncAxisLengths(){
  alignAxisGroup('haxis');
  alignAxisGroup('vaxis');
}
function axisLabelAnchor(o,scale){
  const length=configuredAxisLength(o.type)||0,pad=Math.min(30*scale,length/2||30*scale);
  if(o.type==='haxis'){
    if(o.y<camera.y-1||o.y>camera.y+camera.h+1)return null;
    const left=o.x,right=o.x+length;
    const visibleLeft=Math.max(left,camera.x+pad),visibleRight=Math.min(right,camera.x+camera.w-pad);
    if(visibleLeft>visibleRight)return null;
    return{x:visibleLeft,y:o.y};
  }
  if(o.x<camera.x-1||o.x>camera.x+camera.w+1)return null;
  const top=o.y,bottom=o.y+length;
  const visibleTop=Math.max(top,camera.y+pad),visibleBottom=Math.min(bottom,camera.y+camera.h-pad);
  if(visibleTop>visibleBottom)return null;
  return{x:o.x,y:visibleTop};
}
const lengthStretch=stretchAxis;
stretchAxis=function(g,o){
  if(!configuredAxisLength(o.type)){lengthStretch(g,o);return}
  const coordinates=axisLineCoordinates(o),scale=camera.w/Math.max(1,svg.getBoundingClientRect().width);
  g.querySelectorAll('line').forEach(line=>{for(const [k,v]of Object.entries(coordinates))line.setAttribute(k,v);line.setAttribute('vector-effect','non-scaling-stroke')});
  const circle=g.querySelector('circle'),text=g.querySelector('text'),anchor=axisLabelAnchor(o,scale);
  // Keep axis numbers on the visible segment when zoomed in (left for横轴, top for纵轴).
  if(!anchor){
    if(circle)circle.setAttribute('display','none');
    if(text)text.setAttribute('display','none');
    return;
  }
  if(circle){circle.removeAttribute('display');circle.setAttribute('cx',anchor.x);circle.setAttribute('cy',anchor.y);circle.setAttribute('r',13*scale);circle.setAttribute('vector-effect','non-scaling-stroke')}
  if(text){text.removeAttribute('display');text.setAttribute('x',anchor.x);text.setAttribute('y',anchor.y+4*scale);text.setAttribute('font-size',11*scale)}
};
function raiseAxisLabels(){
  let layer=$('#axislabellayer');
  if(!layer)layer=node('g',{id:'axislabellayer','pointer-events':'none'});
  svg.appendChild(layer);
  layer.replaceChildren();
  for(const g of $('#objects').children){
    const type=g.getAttribute('data-type');
    if(type!=='haxis'&&type!=='vaxis')continue;
    const circle=g.querySelector('circle'),text=g.querySelector('text');
    if(!circle||circle.getAttribute('display')==='none'){
      if(circle)circle.setAttribute('opacity','0');
      if(text)text.setAttribute('opacity','0');
      continue;
    }
    circle.setAttribute('opacity','0');
    if(text)text.setAttribute('opacity','0');
    const topCircle=circle.cloneNode(true);
    topCircle.setAttribute('opacity','1');
    topCircle.removeAttribute('display');
    layer.append(topCircle);
    if(text){
      const topText=text.cloneNode(true);
      topText.setAttribute('opacity','1');
      topText.removeAttribute('display');
      layer.append(topText);
    }
  }
}
const lengthDraw=draw;draw=function(){syncAxisLengths();lengthDraw();raiseAxisLabels()};
const lengthCamera=applyCamera;applyCamera=function(){lengthCamera();raiseAxisLabels()};
const lengthProps=props;props=function(){
  lengthProps();const o=sel();if(!o?.type.endsWith('axis'))return;
  const key=o.type==='haxis'?'w':'h',input=$(`#properties [data-k="${key}"]`);if(!input)return;
  input.parentElement.style.display='';input.min='0.01';input.step='0.01';input.removeAttribute('max');
  input.previousElementSibling.textContent=o.type==='haxis'?'本层横轴统一长度（m）':'本层纵轴统一长度（m）';
  input.value=configuredAxisLength(o.type);input.onfocus=checkpoint;
  input.oninput=()=>{if(input.value==='')return;const value=Number(input.value);if(!applyAxisLength(o.type,value))return;const origin=$(`#properties [data-k="${o.type==='haxis'?'x':'y'}"]`);if(origin)origin.value=o[o.type==='haxis'?'x':'y'];draw();save()};
  input.onchange=flushSave;
  const origin=$(`#properties [data-k="${o.type==='haxis'?'x':'y'}"]`);
  if(origin){
    origin.parentElement.style.display='';
    origin.previousElementSibling.textContent=o.type==='haxis'?'统一起点 X（m）':'统一起点 Y（m）';
    origin.onfocus=checkpoint;
    origin.oninput=()=>{
      if(origin.value==='')return;const value=Number(origin.value);if(!Number.isFinite(value))return;
      const startKey=o.type==='haxis'?'x':'y';
      for(const axis of items().filter(a=>a.type===o.type))axis[startKey]=value;
      save();draw();
    };
    origin.onchange=flushSave;
  }
  $('#properties').querySelectorAll('p').forEach(p=>{if(/轴线随画布无限延伸|修改长度会同步/.test(p.textContent))p.textContent='同向轴线共用起点与长度，并相对另一向轴网自动居中；默认长度 600 m。'});
};
let altSnapHeld=false;
function showTemporarySnap(){const label=$('#snap').closest('label');label.classList.toggle('temporarysnapoff',altSnapHeld&&snap);label.title=altSnapHeld&&snap?'Alt 按住：吸附已临时关闭':'F3 开关吸附；Alt 临时关闭吸附'}
window.addEventListener('keydown',e=>{if(e.key==='Alt'){e.preventDefault();altSnapHeld=true;indicateSnap(null);clearPreview();showTemporarySnap()}},true);
window.addEventListener('keyup',e=>{if(e.key==='Alt'){altSnapHeld=false;showTemporarySnap()}},true);
window.addEventListener('blur',()=>{altSnapHeld=false;showTemporarySnap()});
const lengthRender=render;render=function(){lengthRender();showTemporarySnap()};
render();
