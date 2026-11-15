const distanceBox=document.createElement('div');distanceBox.id='axisdistancebox';
distanceBox.innerHTML='<label for="drawingaxisdistance">轴距（m）</label><input id="drawingaxisdistance" aria-label="绘制轴线间距（米）" type="number" min="0.01" step="0.01"><small>输入即生效 · Enter 返回画布 · Alt 自由定位</small>';
$('.canvaswrap').append(distanceBox);
function commitAxisDistance(input){const value=Math.round(Number(input.value)*100)/100;if(!Number.isFinite(value)||value<=0){toast('请输入大于 0 的轴距');input.focus();return}if(axisSpacing()!==value)checkpoint();data.preferences??={};data.preferences.axisSpacing=value;$('#axisspacing').value=value;$('#drawingaxisdistance').value=value;flushSave();clearPreview();svg.setAttribute('tabindex','0');svg.focus();$('#hint').textContent=`已确认轴距 ${value} m · 以鼠标最近的同向轴线为准 · Alt 自由定位`;toast(`轴距已设为 ${value} m`)}
function liveAxisDistance(input){const value=Math.round(Number(input.value)*100)/100;if(!Number.isFinite(value)||value<=0)return;data.preferences??={};data.preferences.axisSpacing=value;const other=input.id==='axisspacing'?$('#drawingaxisdistance'):$('#axisspacing');other.value=value;save();clearPreview();$('#hint').textContent=`轴距 ${value} m 已生效 · 以鼠标最近的同向轴线为准 · Alt 自由定位`}
for(const input of [$('#axisspacing'),$('#drawingaxisdistance')]){input.onfocus=checkpoint;input.oninput=()=>liveAxisDistance(input)}
$('#axisspacing').onchange=()=>commitAxisDistance($('#axisspacing'));
for(const input of [$('#drawingaxisdistance'),$('#axisspacing')])input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();commitAxisDistance(input)}if(e.key==='Escape'){e.preventDefault();input.value=axisSpacing();svg.focus()}};
const distanceTool=setTool;setTool=function(t){const previous=tool;distanceTool(t);const active=t==='haxis'||t==='vaxis';distanceBox.hidden=!active;if(active){$('#drawingaxisdistance').value=axisSpacing();if(previous!==t){$('#drawingaxisdistance').focus();$('#drawingaxisdistance').select()}}};
document.addEventListener('keydown',e=>{if(!tool.endsWith('axis')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable||e.ctrlKey||e.metaKey||e.altKey)return;if(/^[0-9.]$/.test(e.key)){e.preventDefault();$('#drawingaxisdistance').value=e.key;$('#drawingaxisdistance').focus()}},true);
distanceBox.hidden=true;




