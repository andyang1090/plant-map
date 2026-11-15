const orthoControl=document.createElement('label');orthoControl.id='orthocontrol';
orthoControl.innerHTML='<input type="checkbox" id="orthomode"> 正交';
orthoControl.title='Ctrl+L 开关正交模式；Shift 可临时开启';$('.viewtools').prepend(orthoControl);
function refreshOrtho(){$('#orthomode').checked=!!data.preferences?.orthogonal}
function toggleOrtho(){data.preferences??={};data.preferences.orthogonal=!data.preferences.orthogonal;refreshOrtho();save();toast(data.preferences.orthogonal?'正交模式已开启':'正交模式已关闭')}
$('#orthomode').onchange=toggleOrtho;
function toggleSnapMode(){snap=!snap;data.preferences??={};data.preferences.snap=snap;$('#snap').checked=snap;indicateSnap(null);clearPreview();save();toast(snap?'吸附模式已开启（F3）':'吸附模式已关闭（F3）')}
$('#snap').closest('label').title='F3 开关吸附；Alt 临时关闭吸附';
let nudgeHeld=null;
function nudgeObjects(e){
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const direction=directions[e.key];if(!direction)return false;
  syncSelection();const objects=selectedObjects();if(!objects.length||tool!=='select'||drag||wallGesture||selectionGesture||sketch)return false;
  const step=e.shiftKey?1:.1,signature=[...selectionIds].sort().join(',')+':'+e.key+':'+step;
  if(!e.repeat||nudgeHeld!==signature)checkpoint();nudgeHeld=signature;
  for(const o of objects){o.x=Math.round((o.x+direction[0]*step)*100)/100;o.y=Math.round((o.y+direction[1]*step)*100)/100}
  draw();props();save();return true;
}
window.addEventListener('keydown',e=>{
  if((e.key==='F3'||e.code==='F3')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.isComposing){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)toggleSnapMode();return}
  if(e.isComposing||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)||e.target?.isContentEditable||document.querySelector('dialog[open]'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='l'){e.preventDefault();e.stopImmediatePropagation();toggleOrtho();return}
  if(e.ctrlKey||e.metaKey||e.altKey||e.target?.closest?.('[role="tablist"]'))return;
  if(nudgeObjects(e)){e.preventDefault();e.stopImmediatePropagation()}
},true);
window.addEventListener('keyup',e=>{if(e.key.startsWith('Arrow'))nudgeHeld=null});
window.addEventListener('blur',()=>nudgeHeld=null);
const orthoRender=render;render=function(){orthoRender();refreshOrtho()};refreshOrtho();
