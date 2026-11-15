let roomTap=null,roomTextEditor=null;
function editRoomText(o){
  if(roomTextEditor)roomTextEditor.blur();
  selected=o.id;selectionIds=new Set([o.id]);draw();props();
  const input=document.createElement('input');input.id='roomtexteditor';input.setAttribute('aria-label','编辑机房文本');input.value=o.name;
  const wrap=$('.canvaswrap'),rect=wrap.getBoundingClientRect();
  let p=svg.createSVGPoint();p.x=o.x+o.w/2;p.y=o.y+o.h;p=p.matrixTransform(svg.getScreenCTM());
  input.style.left=Math.max(6,Math.min(rect.width-226,p.x-rect.left-110))+'px';
  input.style.top=Math.max(6,Math.min(rect.height-44,p.y-rect.top+8))+'px';
  let canceled=false,closed=false;
  function finish(){if(closed)return;closed=true;const text=input.value.trim();if(!canceled&&text&&text!==o.name){checkpoint();o.name=text;save()}input.remove();roomTextEditor=null;paintObject(o);props()}
  input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish();svg.focus()}if(e.key==='Escape'){e.preventDefault();canceled=true;finish();svg.focus()}};
  input.cancelEdit=()=>{canceled=true;finish()};input.onblur=finish;wrap.append(input);roomTextEditor=input;input.focus();input.select();
}
svg.addEventListener('pointerdown',e=>{
  if(tool!=='select'||spaceHeld||e.button!==0||e.ctrlKey||e.metaKey||selectionIds.size>1||e.target.hasAttribute('data-resize'))return;
  const g=e.target.closest('[data-id]'),o=g&&items().find(o=>o.id===g.dataset.id);
  if(o?.type!=='room'){roomTap=null;return}
  if(roomTap?.id===o.id&&performance.now()-roomTap.at<400&&Math.hypot(e.clientX-roomTap.x,e.clientY-roomTap.y)<7){e.preventDefault();e.stopImmediatePropagation();roomTap=null;editRoomText(o)}
},true);
svg.addEventListener('pointerup',e=>{if(drag?.mode==='move'&&!drag.moved&&sel()?.type==='room')roomTap={id:selected,at:performance.now(),x:e.clientX,y:e.clientY};else roomTap=null},true);
svg.addEventListener('dblclick',e=>{const g=e.target.closest('[data-id]'),o=g&&items().find(o=>o.id===g.dataset.id);if(tool==='select'&&o?.type==='room'&&!roomTextEditor){e.preventDefault();e.stopImmediatePropagation();editRoomText(o)}},true);
const beforeRoomTextPage=changePage;changePage=function(id){roomTextEditor?.blur();roomTap=null;beforeRoomTextPage(id)};
const beforeRoomTextFloor=switchFloor;switchFloor=function(id){roomTextEditor?.blur();roomTap=null;beforeRoomTextFloor(id)};
