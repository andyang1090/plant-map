// Phone and tablet layout: drawers, pinch zoom, and touch stand-ins for keys.
// Mouse behavior on a wide screen is left to the existing handlers.
// mobile-view-only: below 960px or a coarse pointer, the map is a viewer.
const mobileQuery = window.matchMedia('(max-width: 960px)');
const coarseQuery = window.matchMedia('(pointer: coarse)');
function mobileLayout() { return mobileQuery.matches; }
function touchChrome() { return mobileLayout() || coarseQuery.matches; }
function mobileViewOnly() { return touchChrome(); }

let pinching = false, pinch = null;
const pointers = new Map(), suppress = new Set();
const siteNav = document.querySelector('#sitenav');
const propPanel = document.querySelector('#proppanel');
const navToggle = document.querySelector('#navtoggle');
const propsToggle = document.querySelector('#propstoggle');
const editorBackdrop = document.querySelector('#editorbackdrop');
const canvasWrap = document.querySelector('.canvaswrap');

function syncInert() {
  const mobile = mobileLayout();
  if (siteNav) siteNav.toggleAttribute('inert', mobile && !siteNav.classList.contains('is-open'));
  if (propPanel) propPanel.toggleAttribute('inert', mobile && !propPanel.classList.contains('is-open'));
}
function sheetOpen() {
  return !!(siteNav?.classList.contains('is-open') || propPanel?.classList.contains('is-open'));
}
function refreshBackdrop() {
  if (editorBackdrop) editorBackdrop.hidden = !(mobileLayout() && sheetOpen());
}
function setNavOpen(open) {
  if (!siteNav) return;
  const show = !!open && mobileLayout();
  siteNav.classList.toggle('is-open', show);
  navToggle?.setAttribute('aria-expanded', show ? 'true' : 'false');
  navToggle?.setAttribute('aria-label', show ? '关闭目录' : '打开目录');
  refreshBackdrop();
  syncInert();
  if (show) siteNav.querySelector('button')?.focus();
  else if (mobileLayout() && siteNav.contains(document.activeElement)) navToggle?.focus();
}
function setPropsOpen(open) {
  if (!propPanel) return;
  const show = !!open && mobileLayout();
  propPanel.classList.toggle('is-open', show);
  propsToggle?.setAttribute('aria-expanded', show ? 'true' : 'false');
  propsToggle?.setAttribute('aria-label', show ? '关闭属性' : '打开属性');
  refreshBackdrop();
  syncInert();
  if (!show && mobileLayout() && propPanel.contains(document.activeElement)) propsToggle?.focus();
}
window.__plantCloseMobileSheets = function() {
  if (!mobileLayout()) return false;
  const homeOpen = document.querySelector('#officenav')?.classList.contains('is-open');
  const editorOpen = sheetOpen();
  if (!homeOpen && !editorOpen) return false;
  if (homeOpen && typeof window.__setHomeNav === 'function') window.__setHomeNav(false);
  setNavOpen(false);
  setPropsOpen(false);
  return true;
};

function guardGesture(name) {
  const previous = window[name];
  if (typeof previous !== 'function') return;
  window[name] = function(cancel) {
    if (pinching) return;
    return previous(cancel);
  };
}
guardGesture('finishGesture');
guardGesture('finishSelectionGesture');
guardGesture('finishWallGesture');
function cancelSingleFinger() {
  const flag = pinching;
  pinching = false;
  try { window.finishSelectionGesture?.(true); } catch {}
  try { window.finishWallGesture?.(true); } catch {}
  try { window.finishGesture?.(true); } catch {}
  pinching = flag;
}

function enlargeHandles() {
  const cam = window.__plantCamera;
  if (!touchChrome() || !cam) return;
  const rect = svg.getBoundingClientRect();
  if (!rect.width) return;
  const px = cam.w / rect.width;
  svg.querySelectorAll('[data-resize]').forEach(node => {
    const width = Number(node.getAttribute('width')) || 12;
    const height = Number(node.getAttribute('height')) || 12;
    const size = 40 * px;
    const cx = Number(node.getAttribute('x')) + width / 2;
    const cy = Number(node.getAttribute('y')) + height / 2;
    node.setAttribute('x', cx - size / 2);
    node.setAttribute('y', cy - size / 2);
    node.setAttribute('width', size);
    node.setAttribute('height', size);
  });
  svg.querySelectorAll('[data-wall-vertex]').forEach(node => node.setAttribute('r', 16 * px));
  svg.querySelectorAll('[data-wall-insert]').forEach(node => {
    const width = Number(node.getAttribute('width')) || 8;
    const height = Number(node.getAttribute('height')) || 8;
    const size = 28 * px;
    const cx = Number(node.getAttribute('x')) + width / 2;
    const cy = Number(node.getAttribute('y')) + height / 2;
    node.setAttribute('x', cx - size / 2);
    node.setAttribute('y', cy - size / 2);
    node.setAttribute('width', size);
    node.setAttribute('height', size);
  });
  svg.querySelectorAll('g[data-type$="axis"] line').forEach(node => {
    if (node.getAttribute('stroke') === 'transparent') node.setAttribute('stroke-width', 44 * px);
  });
}

function viewOnlyHint() {
  return page ? '拖动平移 · 双指缩放 · 从目录切换图纸' : '拖动平移 · 双指缩放 · 点按车间进入图纸';
}
function updateTouchDock() {
  const dock = document.querySelector('#touchdock');
  if (mobileViewOnly()) {
    if (dock) dock.hidden = true;
    propsToggle?.classList.remove('has-selection');
    const hint = document.querySelector('#hint');
    if (hint) hint.textContent = viewOnlyHint();
    return;
  }
  if (!dock) return;
  const sketching = tool === 'wall' || tool === 'polyworkshop';
  const multi = typeof selectionIds !== 'undefined' && selectionIds.size > 1;
  let object = null;
  try { object = typeof sel === 'function' ? sel() : null; } catch { object = null; }
  const selectedSomething = !sketching && (multi || !!object);
  const show = {
    touchprops: selectedSomething,
    touchenter: !sketching && !multi && object?.type === 'workshop',
    touchrename: !sketching && !multi && !!object && (object.type === 'room' || object.type?.endsWith('axis')),
    touchdelete: selectedSomething,
    touchdone: sketching,
    touchundopoint: sketching,
    touchcancel: sketching || tool !== 'select' || selectedSomething
  };
  const any = touchChrome() && Object.values(show).some(Boolean);
  dock.hidden = !any;
  for (const [id, on] of Object.entries(show)) {
    const button = document.getElementById(id);
    if (button) button.hidden = !on;
  }
  propsToggle?.classList.toggle('has-selection', selectedSomething);
  const hint = document.querySelector('#hint');
  if (!hint || !mobileLayout()) return;
  if (sketching) hint.textContent = (tool === 'wall' ? '墙体：' : '车间轮廓：') + '逐点点按 · 点「完成」结束 · 点「取消」退出';
  else if (tool === 'pan') hint.textContent = '单指拖动平移画布 · 双指缩放 · 点「取消」返回选择';
  else if (tool === 'select' && !multi) hint.textContent = '点按选择 · 拖动移动 · 空白处单指平移 · 双指缩放';
}

const mobileDraw = draw;
draw = function() {
  if (mobileViewOnly()) {
    selected = null;
    try { selectionIds.clear(); } catch {}
  }
  mobileDraw();
  enlargeHandles();
};
const mobileRender = render;
render = function() { mobileRender(); enlargeHandles(); updateTouchDock(); };
const mobileSetTool = setTool;
setTool = function(toolName) {
  if (mobileViewOnly() && toolName !== 'select') toolName = 'select';
  mobileSetTool(toolName);
  updateTouchDock();
};
const viewOnlySetSelection = setSelection;
setSelection = function(ids) {
  if (mobileViewOnly()) return viewOnlySetSelection([]);
  return viewOnlySetSelection(ids);
};
const viewOnlyDeleteSelection = deleteSelection;
deleteSelection = function() {
  if (mobileViewOnly()) return;
  return viewOnlyDeleteSelection();
};
const mobileProps = props;
props = function() { mobileProps(); updateTouchDock(); };
const mobileChangePage = changePage;
changePage = function(id) { mobileChangePage(id); setNavOpen(false); updateTouchDock(); };

function onCanvasTouch(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return false;
  if (target.closest('input, textarea, select, button, a, .touchdock, .properties, .nav, .toolbar, header, .heading')) return false;
  return !!target.closest('.canvaswrap, #canvas');
}
function measurePointers() {
  const pts = [...pointers.values()];
  const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  return {dist, mid:{x:(pts[0].x + pts[1].x) / 2, y:(pts[0].y + pts[1].y) / 2}};
}
function applyPinch() {
  if (!pinch || pointers.size < 2 || typeof zoomAt !== 'function') return;
  const next = measurePointers();
  if (next.dist >= 12 && pinch.dist >= 12) {
    const factor = pinch.dist / next.dist;
    if (Number.isFinite(factor) && Math.abs(factor - 1) > 0.002) {
      try { zoomAt(factor, {clientX:next.mid.x, clientY:next.mid.y}); } catch {}
    }
  }
  const cam = window.__plantCamera;
  const rect = svg.getBoundingClientRect();
  if (cam && rect.width > 0 && rect.height > 0) {
    cam.x -= (next.mid.x - pinch.mid.x) * cam.w / rect.width;
    cam.y -= (next.mid.y - pinch.mid.y) * cam.h / rect.height;
    try { applyCamera(); } catch {}
  }
  pinch = {dist:Math.max(next.dist, 1), mid:next.mid};
}

let viewPan = null;
window.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' || !onCanvasTouch(event)) return;
  pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
  if (pointers.size < 2 || pinching) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  cancelSingleFinger();
  viewPan = null;
  pinching = true;
  for (const id of pointers.keys()) {
    try { if (svg.hasPointerCapture(id)) svg.releasePointerCapture(id); } catch {}
  }
  pinch = measurePointers();
}, true);
window.addEventListener('pointermove', event => {
  if (viewPan && viewPan.id === event.pointerId) {
    const slop = event.pointerType === 'touch' ? 12 : 4;
    if (Math.hypot(event.clientX - viewPan.x, event.clientY - viewPan.y) > slop) viewPan.moved = true;
  }
  if (pointers.has(event.pointerId)) pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
  if (suppress.has(event.pointerId) || pinching) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pinching) applyPinch();
  }
}, true);
function workshopAt(event) {
  if (page || typeof rawPoint !== 'function') return null;
  const p = rawPoint(event);
  return [...items()].reverse().find(o => o.type === 'workshop' && (typeof inWorkshop === 'function' ? inWorkshop(o, p) : p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h)) || null;
}
function finishViewTap(event) {
  if (!viewPan || viewPan.id !== event.pointerId) return;
  const tap = event.type === 'pointerup' && mobileViewOnly() && !viewPan.moved && !pinching && event.button === 0;
  const point = tap ? {clientX:event.clientX, clientY:event.clientY, altKey:event.altKey} : null;
  viewPan = null;
  if (!point) return;
  setTimeout(() => {
    if (!mobileViewOnly() || page) return;
    try {
      const workshop = workshopAt(point);
      if (workshop) changePage(workshop.id);
    } catch {}
  }, 0);
}
window.addEventListener('pointerdown', event => {
  if (!mobileViewOnly() || pinching || pointers.size >= 2) return;
  if (event.button !== 0 && event.button !== 1) return;
  if (!(event.target instanceof Element) || !event.target.closest('#canvas')) return;
  event.preventDefault();
  event.stopPropagation();
  const cam = window.__plantCamera;
  if (!cam) return;
  drag = {mode:'pan', client:{x:event.clientX, y:event.clientY}, camera:{...cam}, pointer:event.pointerId};
  try { svg.setPointerCapture(event.pointerId); } catch {}
  viewPan = {id:event.pointerId, x:event.clientX, y:event.clientY, moved:event.button !== 0};
}, true);
for (const type of ['click', 'dblclick', 'contextmenu']) {
  window.addEventListener(type, event => {
    if (!mobileViewOnly() || !(event.target instanceof Element) || !event.target.closest('#canvas')) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);
}
function releasePointer(event) {
  finishViewTap(event);
  if (!pointers.has(event.pointerId) && !suppress.has(event.pointerId)) return;
  const swallowed = pinching || suppress.has(event.pointerId);
  pointers.delete(event.pointerId);
  if (pinching && pointers.size < 2) {
    pinching = false;
    pinch = null;
    for (const id of pointers.keys()) suppress.add(id);
  }
  suppress.delete(event.pointerId);
  if (swallowed) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}
window.addEventListener('pointerup', releasePointer, true);
window.addEventListener('pointercancel', releasePointer, true);

if (canvasWrap) {
  canvasWrap.addEventListener('touchstart', event => {
    if (event.touches.length >= 2) event.preventDefault();
  }, {passive:false});
  canvasWrap.addEventListener('touchmove', event => {
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, button, a, .touchdock')) return;
    event.preventDefault();
  }, {passive:false});
  canvasWrap.addEventListener('gesturestart', event => event.preventDefault(), {passive:false});
}

function keystroke(key) {
  const event = new KeyboardEvent('keydown', {key, bubbles:true, cancelable:true});
  if (key === 'Escape') window.dispatchEvent(event);
  else document.dispatchEvent(event);
}
document.querySelector('#touchprops')?.addEventListener('click', () => setPropsOpen(true));
document.querySelector('#touchenter')?.addEventListener('click', () => {
  const enter = document.querySelector('#enter');
  if (enter) enter.click();
  else if (sel()?.type === 'workshop') changePage(sel().id);
});
document.querySelector('#touchrename')?.addEventListener('click', () => {
  setPropsOpen(true);
  const input = document.querySelector('#properties [data-k="name"]');
  input?.focus();
  input?.select?.();
});
document.querySelector('#touchdelete')?.addEventListener('click', () => {
  (document.querySelector('#deleteselection') || document.querySelector('#delete'))?.click();
});
document.querySelector('#touchdone')?.addEventListener('click', () => keystroke('Enter'));
document.querySelector('#touchundopoint')?.addEventListener('click', () => keystroke('Backspace'));
document.querySelector('#touchcancel')?.addEventListener('click', () => {
  setNavOpen(false);
  setPropsOpen(false);
  keystroke('Escape');
});
navToggle?.addEventListener('click', () => setNavOpen(!siteNav?.classList.contains('is-open')));
propsToggle?.addEventListener('click', () => setPropsOpen(!propPanel?.classList.contains('is-open')));
document.querySelector('#propsclose')?.addEventListener('click', () => setPropsOpen(false));
editorBackdrop?.addEventListener('click', () => { setNavOpen(false); setPropsOpen(false); });
function lockIdentity(on) {
  for (const el of [document.querySelector('.brand b'), document.querySelector('#sitename')]) {
    if (!el) continue;
    el.contentEditable = on ? 'false' : 'true';
    if (on) el.removeAttribute('role');
    else el.setAttribute('role', 'textbox');
  }
}
function syncMobileViewOnly() {
  const on = mobileViewOnly();
  document.body.classList.toggle('mobile-view-only', on);
  const badge = document.querySelector('.heading .badge');
  if (badge) badge.textContent = on ? '● 查看模式' : '● 编辑模式';
  svg?.setAttribute('aria-label', on ? '厂区平面图' : '可编辑厂区平面图');
  lockIdentity(on);
  if (!on) { updateTouchDock(); return; }
  try { cancelSketch(); } catch {}
  try { roomTextEditor?.cancelEdit(); } catch {}
  try { axisTextEditor?.cancelEdit(); } catch {}
  try { finishSelectionGesture(true); } catch {}
  try { finishWallGesture(true); } catch {}
  try { finishGesture(true); } catch {}
  selected = null;
  try { selectionIds.clear(); } catch {}
  document.querySelectorAll('dialog[open]').forEach(dialog => { try { dialog.close(); } catch {} });
  setPropsOpen(false);
  if (tool !== 'select') setTool('select');
  try { draw(); } catch {}
  updateTouchDock();
}
mobileQuery.addEventListener('change', () => {
  if (!mobileLayout()) { setNavOpen(false); setPropsOpen(false); }
  syncInert();
  syncMobileViewOnly();
});
coarseQuery.addEventListener('change', syncMobileViewOnly);

syncInert();
syncMobileViewOnly();
function frameMobileSite(){
  if(!mobileLayout()||page||typeof fitCanvas!=='function')return;
  fitCanvas();
}
requestAnimationFrame(frameMobileSite);
let mobileOrientation=window.innerWidth>window.innerHeight;
window.addEventListener('resize',()=>{
  const next=window.innerWidth>window.innerHeight;
  const turned=next!==mobileOrientation;
  mobileOrientation=next;
  if(turned)frameMobileSite();
});
