// View preferences travel with JSON backups; workshop references stay independent.
data.preferences ??= {};
snap = data.preferences.snap !== false;
$('#snap').checked = snap;
$('#snap').onchange = e => {
  snap = e.target.checked;
  data.preferences ??= {};
  data.preferences.snap = snap;
  save();
};

const diagramFont = () => {
  const size = Number(data.preferences?.fontSize);
  return Number.isFinite(size) && size >= 8 && size <= 48 ? size : 12;
};
function objectFont(o) {
  const value = Number(o?.fontSize);
  return Number.isFinite(value) && value >= 8 && value <= 48 ? value : diagramFont();
}
function fontMode(o) {
  if (o?.fontMode === 'scale' || o?.fontMode === 'fixed') return o.fontMode;
  return data.preferences?.fontMode === 'scale' ? 'scale' : 'fixed';
}
function fontWorldScale(o) {
  return fontMode(o) === 'scale' ? 1 : camera.w / Math.max(1, svg.getBoundingClientRect().width);
}
function formatDiagramText() {
  const scale = camera.w / Math.max(1, svg.getBoundingClientRect().width);
  const index = new Map(items().map(o => [o.id, o]));
  for (const group of $('#objects').children) {
    const o = index.get(group.dataset.id);
    if (!o) continue;
    const texts = [...group.querySelectorAll('text')];
    texts.filter(t => t.textContent.includes('双击进入车间')).forEach(t => t.remove());
    const text = texts[0];
    if (!text) continue;
    const size = objectFont(o);
    const textScale = fontWorldScale(o);
    text.setAttribute('font-size', size * textScale);
    text.textContent = o.name;
    if (o.type.endsWith('axis')) {
      const circle = group.querySelector('circle');
      if (circle) circle.setAttribute('r', Math.max(13 * scale, size * .7 * textScale));
      const y = Number(circle?.getAttribute('cy') || 0);
      text.setAttribute('y', y + size * .34 * textScale);
    } else {
      text.setAttribute('x', o.x + o.w / 2);
      text.setAttribute('y', o.y + o.h / 2 + size * .34 * textScale);
    }
  }
  $('#workshopboundary text')?.setAttribute('font-size', diagramFont() * fontWorldScale());
}

let fontControl = document.createElement('label');
fontControl.className = 'fontcontrol';
fontControl.innerHTML = '<span>文字</span><input id="diagramfont" aria-label="图纸文字大小" type="number" min="8" max="48" step="1"><span>px</span>';
$('.viewtools').prepend(fontControl);
$('#diagramfont').value = diagramFont();
$('#diagramfont').onfocus = checkpoint;
$('#diagramfont').oninput = e => {
  const value = Number(e.target.value);
  if (!Number.isFinite(value) || value < 8 || value > 48) return;
  data.preferences ??= {};
  data.preferences.fontSize = value;
  formatDiagramText();
  drawAxisIntersections();
  save();
};
$('#diagramfont').onchange = flushSave;
const modeControl = document.createElement('label');
modeControl.className = 'fontmodecontrol';
modeControl.innerHTML = '<select id="diagramfontmode" aria-label="全局文字缩放模式"><option value="fixed">文字固定大小</option><option value="scale">文字随图缩放</option></select>';
fontControl.after(modeControl);
$('#diagramfontmode').onchange = e => {
  checkpoint(); data.preferences ??= {}; data.preferences.fontMode = e.target.value;
  formatDiagramText(); drawAxisIntersections(); props(); save();
};

function referenceState() {
  return data.planSettings?.[planKey()] || {};
}
function updateReference(changes) {
  if (!page) return;
  checkpoint();
  data.planSettings ??= {};
  data.planSettings[planKey()] = {...referenceState(), ...changes};
  save();
  render();
}
const originalBoundary = workshopBoundary;
workshopBoundary = function() {
  if (referenceState().boundaryHidden || referenceState().boundaryDeleted) {
    $('#workshopboundary')?.remove();
    return;
  }
  originalBoundary();
};
const referenceFit = fitCanvas;
fitCanvas = function() {
  if (page && (referenceState().boundaryHidden || referenceState().boundaryDeleted)) boundaryFit();
  else referenceFit();
};
$('#fit').onclick = () => fitCanvas();

const intersections = node('g', {id:'axisintersections', 'pointer-events':'none'});
svg.append(intersections);
function drawAxisIntersections() {
  intersections.replaceChildren();
  if (!page || !data.axes) return;
  const axes = selectedObjects().filter(o => !o.hidden && o.type.endsWith('axis'));
  const scale = camera.w / Math.max(1, svg.getBoundingClientRect().width);
  const horizontal = axes.filter(o => o.type === 'haxis' && o.y >= camera.y && o.y <= camera.y+camera.h);
  const vertical = axes.filter(o => o.type === 'vaxis' && o.x >= camera.x && o.x <= camera.x+camera.w);
  for (const h of horizontal) for (const v of vertical) {if(!axisSpanContains(h,v.x,h.y)||!axisSpanContains(v,v.x,h.y))continue;
    const label = `${h.name}/${v.name}`;
    const size = Math.max(objectFont(h) * fontWorldScale(h), objectFont(v) * fontWorldScale(v));
    const x = v.x+7*scale, y = h.y-7*scale;
    const group = node('g', {'data-axis-cross':'', 'data-horizontal':h.id, 'data-vertical':v.id, 'pointer-events':'none'});
    const text = node('text', {x, y, fill:'#1d694d', 'font-size':size,
      'font-weight':600, 'paint-order':'stroke', stroke:'white', 'stroke-width':4*scale,
      'stroke-linejoin':'round', 'pointer-events':'none'}, label);
    group.append(node('circle', {cx:v.x, cy:h.y, r:3*scale, fill:'#237957', 'pointer-events':'none'}), text);
    intersections.append(group);
  }
  svg.append(intersections);
}

const optionsSelection = drawSelection;
drawSelection = function() {optionsSelection(); drawAxisIntersections();};
const optionsDraw = draw;
draw = function() {optionsDraw(); formatDiagramText();};
const optionsPaint = paintObject;
paintObject = function(o) {optionsPaint(o); formatDiagramText(); drawAxisIntersections();};
const optionsCamera = applyCamera;
applyCamera = function() {optionsCamera(); formatDiagramText(); drawAxisIntersections();};

const optionsProps = props;
props = function() {
  optionsProps();
  const objects = selectedObjects();
  if (!objects.length) return;
  const section = document.createElement('section');
  section.id = 'objectfontsection';
  section.innerHTML = '<label class="field" for="objectfont">'+(objects.length>1?'所选对象文字大小':'对象文字大小')+'（px）</label><div class="fontrow"><input id="objectfont" aria-label="对象文字大小" type="number" min="8" max="48" step="1"><button id="resetobjectfont" type="button">跟随全局</button></div>';
  const values = new Set(objects.map(objectFont));
  const input = section.querySelector('input');
  input.value = values.size === 1 ? objectFont(objects[0]) : '';
  input.placeholder = '多种大小';
  input.onfocus = checkpoint;
  input.oninput = () => {
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 8 || value > 48) return;
    objects.forEach(o => o.fontSize = value);
    formatDiagramText(); drawAxisIntersections(); save();
  };
  input.onchange = flushSave;
  section.querySelector('button').onclick = () => {
    checkpoint(); objects.forEach(o => {delete o.fontSize; delete o.fontMode;});
    if ($('#objectfontmode')) $('#objectfontmode').value = 'inherit';
    input.value = diagramFont(); formatDiagramText(); drawAxisIntersections(); save();
  };
  const modeLabel = document.createElement('label');
  modeLabel.className = 'field'; modeLabel.htmlFor = 'objectfontmode';
  modeLabel.textContent = '文字缩放方式';
  const mode = document.createElement('select');
  mode.id = 'objectfontmode'; mode.setAttribute('aria-label', '所选文字缩放方式');
  mode.innerHTML = '<option value="inherit">跟随全局设置</option><option value="fixed">固定屏幕大小</option><option value="scale">随地图放大缩小</option><option value="mixed" disabled>多种设置</option>';
  const modes = new Set(objects.map(o => ['scale','fixed'].includes(o.fontMode) ? o.fontMode : 'inherit'));
  mode.value = modes.size === 1 ? [...modes][0] : 'mixed';
  mode.onchange = () => {
    checkpoint();
    objects.forEach(o => {if (mode.value === 'inherit') delete o.fontMode; else o.fontMode = mode.value;});
    formatDiagramText(); drawAxisIntersections(); save();
  };
  section.append(modeLabel, mode);
  $('#properties').prepend(section);
};

function refreshViewControls() {
  $('#referencecontrols')?.remove();
  const workshop = data.items.find(o => o.id === page);
  if (workshop?.points?.length) {
    const state = referenceState(), controls = document.createElement('div');
    controls.id = 'referencecontrols';
    controls.innerHTML = `<label><input id="showreference" type="checkbox" ${!state.boundaryHidden&&!state.boundaryDeleted?'checked':''} ${state.boundaryDeleted?'disabled':''}>轮廓参考</label><button id="deletereference" type="button">${state.boundaryDeleted?'恢复参考':'删除参考'}</button>`;
    controls.querySelector('input').onchange = e => updateReference({boundaryHidden:!e.target.checked});
    controls.querySelector('button').onclick = () => updateReference({boundaryDeleted:!state.boundaryDeleted,boundaryHidden:false});
    $('.viewtools').prepend(controls);
  }
  snap = data.preferences?.snap !== false;
  $('#snap').checked = snap;
  $('#diagramfont').value = diagramFont();
  $('#diagramfontmode').value = fontMode();
}
const optionsRender = render;
render = function() {optionsRender(); refreshViewControls(); formatDiagramText(); drawAxisIntersections();};

// Reuse the heading row for counts instead of spending a separate row on cards.
$('.heading').insertBefore($('#stats'), $('.heading .badge'));
render();


