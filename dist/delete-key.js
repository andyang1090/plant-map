// Selecting a canvas object must leave property inputs before Delete is pressed.
window.addEventListener('pointerdown',e=>{
  if((e.button===0||e.button===1)&&e.target instanceof Element&&svg.contains(e.target))svg.focus({preventScroll:true});
},true);
function shouldDeleteCanvasObject(e){
  const target=e.target;
  if(/INPUT|TEXTAREA|SELECT/.test(target?.tagName)||target?.isContentEditable)return false;
  if(document.querySelector('dialog[open]')||e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return false;
  return e.key==='Delete'||e.key==='Del'||e.code==='Delete'||e.keyCode===46;
}
window.addEventListener('keydown',e=>{
  if(!shouldDeleteCanvasObject(e))return;
  syncSelection();if(!selectedObjects().length)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(sketch){toast('请先按 Esc 退出当前绘制，再删除对象');return}
  finishSelectionGesture(true);finishWallGesture(true);finishGesture(true);
  syncSelection();if(!selectedObjects().length)return;
  deleteSelection();svg.focus({preventScroll:true});
},true);
