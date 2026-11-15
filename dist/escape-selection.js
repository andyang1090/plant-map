// Window capture runs before the separate drawing/editor keyboard handlers.
window.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(typeof window.__plantCloseMobileSheets==='function'&&window.__plantCloseMobileSheets()){e.preventDefault();e.stopImmediatePropagation();return}
  e.preventDefault();e.stopImmediatePropagation();
  roomTextEditor?.cancelEdit();
  axisTextEditor?.cancelEdit();
  const pointer=drag?.pointer??wallGesture?.pointer??selectionGesture?.pointer;
  finishSelectionGesture(true);finishWallGesture(true);finishGesture(true);
  cancelSketch();clearPreview();indicateSnap(null);
  spaceHeld=false;lastTap=null;roomTap=null;axisTap=null;
  selectionIds.clear();selected=null;
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  $('#axisspacing').value=axisSpacing();$('#drawingaxisdistance').value=axisSpacing();
  const active=document.activeElement;if(active?.isContentEditable){active.textContent=active.id==='sitename'?(data.identity?.siteName||'北区制造基地'):(data.identity?.systemName||'厂图');active.blur()}
  setTool('select');
  if(pointer!==undefined&&svg.hasPointerCapture(pointer))svg.releasePointerCapture(pointer);
  draw();props();svg.focus();
},true);
const withoutAxisList=props;props=function(){withoutAxisList();$('#properties').querySelectorAll('.axislist').forEach(n=>n.remove())};
props();
