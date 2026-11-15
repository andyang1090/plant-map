// World coordinates use metres: 5 drawing pixels represent 5 metres.
function axisSpacing(){const n=Number(data.preferences?.axisSpacing);return Number.isFinite(n)&&n>0?n:15}
const spacingLabel=document.createElement('label');
spacingLabel.className='fontcontrol';
spacingLabel.id='axisspacingcontrol';
spacingLabel.innerHTML='轴距 <input id="axisspacing" aria-label="默认轴线间距（米）" type="number" min="0.01" step="0.01"> m';
$('.viewtools').prepend(spacingLabel);
$('#axisspacing').value=axisSpacing();
$('#axisspacing').onfocus=checkpoint;
$('#axisspacing').oninput=e=>{const value=Number(e.target.value);if(!Number.isFinite(value)||value<=0)return;data.preferences??={};data.preferences.axisSpacing=value;save()};
$('#axisspacing').onchange=flushSave;
const freeAxis=smartAxis;
smartAxis=function(e){
  if(e.altKey)return freeAxis(e);
  const p=rawPoint(e),h=tool==='haxis';
  const raw=h?p.y:p.x;
  const candidates=items().filter(o=>o.type===tool&&!o.hidden);
  const previous=candidates.reduce((nearest,o)=>!nearest||Math.abs((h?o.y:o.x)-raw)<Math.abs((h?nearest.y:nearest.x)-raw)?o:nearest,null);
  let value=raw;
  if(previous){const origin=h?previous.y:previous.x;const steps=raw<origin?-1:1;value=Math.round((origin+steps*axisSpacing())*100)/100}
  else value=Math.round(raw*100)/100;
  return{x:h?p.x:value,y:h?value:p.y,value,h,reference:previous?.name,spacing:previous?axisSpacing():null};
};
const spacingRender=render;
render=function(){spacingRender();spacingLabel.style.display=page?'':'none';$('#axisspacing').value=axisSpacing();$('#hint').nextElementSibling.title='图纸比例：1 px = 1 m；缩放只改变屏幕显示比例'};
const spacingTool=setTool;
setTool=function(t){spacingTool(t);if(t.endsWith('axis'))$('#hint').textContent=`轴距 ${axisSpacing()} m · 以鼠标最近的同向轴线为准 · Alt 自由定位 · 1 px = 1 m`};
const spacingOpen=openAxes;
openAxes=function(){spacingOpen();$('#hgap').value=axisSpacing();$('#vgap').value=axisSpacing();axisEstimate()};
axisDialog.querySelectorAll('label').forEach(label=>{if(label.firstChild?.nodeType===3)label.firstChild.textContent=label.firstChild.textContent.replace('（px）','（m）')});
const spacingEstimate=axisEstimate;
axisEstimate=function(){spacingEstimate();$('#axisestimate').textContent=$('#axisestimate').textContent.replace(' px',' m')};
function metricStatus(){const status=$('#hint').nextElementSibling;status.textContent=status.textContent.replace(/\bpx\b/g,'m')}
const metricWorld=updateWorld;updateWorld=function(){metricWorld();metricStatus()};
svg.addEventListener('pointermove',metricStatus);
const metricProps=props;props=function(){metricProps();$('#properties').querySelectorAll('label.field,p').forEach(n=>{if(!n.querySelector('input,select'))n.textContent=n.textContent.replace('轴线位置（px）','轴线位置（m）')})};
render();metricStatus();


