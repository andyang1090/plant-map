// App-local clipboard retains a snapshot, even if originals are later changed/deleted.
let objectClipboard=null,pasteSequence=0;
const cloneDocumentValue=value=>JSON.parse(JSON.stringify(value));
function copyObjects(){
  roomTextEditor?.blur();syncSelection();const objects=selectedObjects();if(!objects.length){toast('请先选择对象');return}
  objectClipboard=objects.map(o=>({object:cloneDocumentValue(o),floors:o.type==='workshop'?(data.floorCatalog?.[o.id]||[{id:o.id,name:'1F',planKey:o.id}]).map(f=>({name:f.name,active:f.id===data.activeFloors?.[o.id],items:cloneDocumentValue(data.plans[f.planKey]||[]),settings:cloneDocumentValue(data.planSettings?.[f.planKey]||{})})):null}));
  pasteSequence=0;refreshCopyButtons();toast(`已复制 ${objects.length} 个对象，Ctrl+V 粘贴`);
}
function pasteObjects(){
  if(!objectClipboard?.length){toast('请先使用 Ctrl+C 复制对象');return}
  if(page&&objectClipboard.some(entry=>entry.object.type==='workshop')){toast('车间请粘贴到总平图');return}
  if(!page&&objectClipboard.some(entry=>entry.object.type.endsWith('axis'))){toast('轴线请粘贴到车间楼层内');return}
  roomTextEditor?.blur();finishSelectionGesture(true);finishWallGesture(true);finishGesture(true);cancelSketch();checkpoint();
  const source=objectClipboard.map(entry=>entry.object),bounds=selectionBounds(source);
  pasteSequence++;let dx=10*pasteSequence,dy=dx;
  if(bounds&&(bounds.x+bounds.w<camera.x||bounds.x>camera.x+camera.w||bounds.y+bounds.h<camera.y||bounds.y>camera.y+camera.h)){
    dx=camera.x+camera.w/2-(bounds.x+bounds.w/2)+10*(pasteSequence-1);dy=camera.y+camera.h/2-(bounds.y+bounds.h/2)+10*(pasteSequence-1);
  }
  const copies=objectClipboard.map(entry=>{
    const o=cloneDocumentValue(entry.object);o.id=uid();o.x+=dx;o.y+=dy;
    if(entry.floors){
      data.floorCatalog??={};data.activeFloors??={};data.planSettings??={};
      data.floorCatalog[o.id]=entry.floors.map((floor,index)=>{const id=index===0?o.id:uid();data.plans[id]=floor.items.map(child=>({...cloneDocumentValue(child),id:uid()}));data.planSettings[id]=cloneDocumentValue(floor.settings||{});if(floor.active)data.activeFloors[o.id]=id;return{id,name:floor.name,planKey:id}});
      data.activeFloors[o.id]??=data.floorCatalog[o.id][0].id;
    }
    return o;
  });
  items().push(...copies);selectionIds=new Set(copies.map(o=>o.id));selected=copies.at(-1).id;tool='select';save();render();toast(`已粘贴 ${copies.length} 个对象`);
}
const copyButton=document.createElement('button');copyButton.id='copyobjects';copyButton.textContent='复制';copyButton.title='Ctrl+C 复制所选对象';copyButton.onclick=copyObjects;
const pasteButton=document.createElement('button');pasteButton.id='pasteobjects';pasteButton.textContent='粘贴';pasteButton.title='Ctrl+V 粘贴到当前图纸';pasteButton.onclick=pasteObjects;
$('.headeractions').insertBefore(copyButton,$('#import'));$('.headeractions').insertBefore(pasteButton,$('#import'));
function refreshCopyButtons(){copyButton.disabled=!selectedObjects().length;pasteButton.disabled=!objectClipboard?.length}
document.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey)||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;
  if(e.key.toLowerCase()==='c'){e.preventDefault();e.stopImmediatePropagation();copyObjects()}
  if(e.key.toLowerCase()==='v'){e.preventDefault();e.stopImmediatePropagation();pasteObjects()}
},true);
function editingText(target){return /INPUT|TEXTAREA|SELECT/.test(target?.tagName)||target?.isContentEditable}
document.addEventListener('copy',e=>{
  if(editingText(e.target)||!selectedObjects().length)return;
  copyObjects();
  if(e.clipboardData){e.clipboardData.setData('text/plain',JSON.stringify({kind:'plant-atlas-objects',version:1,entries:objectClipboard}));e.preventDefault()}
});
document.addEventListener('paste',e=>{
  if(editingText(e.target))return;
  const text=e.clipboardData?.getData('text/plain');
  if(text&&text.length<=5000000){try{
    const payload=JSON.parse(text);
    if(payload.kind==='plant-atlas-objects'&&payload.version===1&&Array.isArray(payload.entries)&&payload.entries.length>0&&payload.entries.length<=1000&&payload.entries.every(entry=>valid(entry.object)&&(!entry.floors||(Array.isArray(entry.floors)&&entry.floors.length<=100&&entry.floors.every(f=>typeof f.name==='string'&&Array.isArray(f.items)&&f.items.every(valid)))))){
      objectClipboard=cloneDocumentValue(payload.entries);pasteSequence=0;
    }
  }catch{}}
  if(objectClipboard){e.preventDefault();pasteObjects()}
});
const clipboardProps=props;props=function(){clipboardProps();refreshCopyButtons()};

const defaultsDialog=document.createElement('dialog');defaultsDialog.id='roomdefaults';
defaultsDialog.innerHTML='<form><div class="dialoghead"><h2>机房默认尺寸</h2><button type="button" id="closeroomdefaults" aria-label="关闭默认尺寸设置">×</button></div><p>仅用于之后新建的机房，已有机房尺寸不变。</p><div class="propgrid"><label>默认宽度（m）<input id="defaultroomwidth" aria-label="机房默认宽度（米）" type="number" min="0.1" max="100000" step="0.1" required></label><label>默认高度（m）<input id="defaultroomheight" aria-label="机房默认高度（米）" type="number" min="0.1" max="100000" step="0.1" required></label></div><div class="dialogactions"><button type="button" id="cancelroomdefaults">取消</button><button type="submit">保存默认尺寸</button></div></form>';
document.body.append(defaultsDialog);
for(const id of ['closeroomdefaults','cancelroomdefaults'])document.getElementById(id).onclick=()=>defaultsDialog.close();
defaultsDialog.querySelector('form').onsubmit=e=>{e.preventDefault();if(!defaultsDialog.querySelector('form').reportValidity())return;checkpoint();data.preferences??={};data.preferences.roomDefaultWidth=Number($('#defaultroomwidth').value);data.preferences.roomDefaultHeight=Number($('#defaultroomheight').value);save();defaultsDialog.close();toast(`新机房默认尺寸：${roomDefaultSize('w')} m × ${roomDefaultSize('h')} m`)};
function openRoomDefaults(){$('#defaultroomwidth').value=roomDefaultSize('w');$('#defaultroomheight').value=roomDefaultSize('h');defaultsDialog.showModal()}
const defaultsRender=render;render=function(){defaultsRender();const button=document.createElement('button');button.id='roomdefaultsbutton';button.textContent='机房默认尺寸';button.onclick=openRoomDefaults;$('#tools').append(button);refreshCopyButtons()};
render();

