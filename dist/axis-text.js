// Double-click an axis label to rename its number in place.
let axisTap=null,axisTextEditor=null;
function editAxisText(o){
  if(!o?.type?.endsWith('axis'))return;
  if(axisTextEditor)axisTextEditor.blur();
  if(roomTextEditor)roomTextEditor.blur();
  selected=o.id;if(typeof selectionIds!=='undefined')selectionIds=new Set([o.id]);
  draw();props();
  const input=document.createElement('input');input.id='axistexteditor';input.setAttribute('aria-label','编辑轴线编号');input.value=o.name;
  const wrap=$('.canvaswrap'),rect=wrap.getBoundingClientRect();
  let p=svg.createSVGPoint();p.x=o.x;p.y=o.y;p=p.matrixTransform(svg.getScreenCTM());
  input.style.left=Math.max(6,Math.min(rect.width-120,p.x-rect.left-40))+'px';
  input.style.top=Math.max(6,Math.min(rect.height-40,p.y-rect.top-18))+'px';
  input.style.width='88px';input.style.textAlign='center';
  let canceled=false,closed=false;
  function finish(){
    if(closed)return;closed=true;
    const text=input.value.trim();
    if(!canceled&&text&&text!==o.name){checkpoint();o.name=text;save()}
    input.remove();axisTextEditor=null;draw();props();
  }
  input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish();svg.focus()}if(e.key==='Escape'){e.preventDefault();canceled=true;finish();svg.focus()}};
  input.cancelEdit=()=>{canceled=true;finish()};input.onblur=finish;wrap.append(input);axisTextEditor=input;input.focus();input.select();
}
svg.addEventListener('pointerdown',e=>{
  if(tool!=='select'||spaceHeld||e.button!==0||e.ctrlKey||e.metaKey||(typeof selectionIds!=='undefined'&&selectionIds.size>1))return;
  const g=e.target.closest('[data-id]'),o=g&&items().find(item=>item.id===g.dataset.id);
  if(!o?.type?.endsWith('axis')){axisTap=null;return}
  if(axisTap?.id===o.id&&performance.now()-axisTap.at<400&&Math.hypot(e.clientX-axisTap.x,e.clientY-axisTap.y)<7){
    e.preventDefault();e.stopImmediatePropagation();axisTap=null;editAxisText(o);
  }
},true);
svg.addEventListener('pointerup',e=>{
  if(drag?.mode==='move'&&!drag.moved&&sel()?.type?.endsWith('axis'))axisTap={id:selected,at:performance.now(),x:e.clientX,y:e.clientY};
  else axisTap=null;
},true);
svg.addEventListener('dblclick',e=>{
  const g=e.target.closest('[data-id]'),o=g&&items().find(item=>item.id===g.dataset.id);
  if(tool==='select'&&o?.type?.endsWith('axis')&&!axisTextEditor){
    e.preventDefault();e.stopImmediatePropagation();editAxisText(o);
  }
},true);
const beforeAxisTextPage=changePage;changePage=function(id){axisTextEditor?.blur();axisTap=null;beforeAxisTextPage(id)};
const beforeAxisTextFloor=switchFloor;switchFloor=function(id){axisTextEditor?.blur();axisTap=null;beforeAxisTextFloor(id)};
