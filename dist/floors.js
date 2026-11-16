// Keep old plan arrays in place: their first floor uses the existing workshop key.
const floorViews = new Map();
function ensureWorkshopFloors(id) {
  data.floorCatalog ??= {};
  data.activeFloors ??= {};
  let changed = false;
  if (!Array.isArray(data.floorCatalog[id]) || !data.floorCatalog[id].length) {
    data.floorCatalog[id] = [{id, name:'1F', planKey:id}];
    changed = true;
  }
  const floors = data.floorCatalog[id];
  for (const floor of floors) {
    if (!Array.isArray(data.plans[floor.planKey])) {
      data.plans[floor.planKey] = [];
      changed = true;
    }
  }
  if (!floors.some(f => f.id === data.activeFloors[id])) {
    data.activeFloors[id] = floors[0].id;
    changed = true;
  }
  return changed;
}
function currentFloor() {
  return data.floorCatalog?.[page]?.find(f => f.id === data.activeFloors?.[page]);
}
function settleFloorGestures() {
  finishSelectionGesture(true);
  finishWallGesture(true);
  finishGesture(true);
  cancelSketch();
  selectionIds.clear(); selected = null; wallVertex = null; tool = 'select';
}
function switchFloor(id) {
  if (!page) return;
  const target = data.floorCatalog[page].find(f => f.id === id);
  if (!target || currentFloor()?.id === id) return;
  settleFloorGestures();
  floorViews.set(planKey(), {...camera});
  data.activeFloors[page] = id;
  flushSave();
  render();
  if (floorViews.has(target.planKey)) {
    camera = {...floorViews.get(target.planKey)};
    const rect = svg.getBoundingClientRect();
    camera.h = camera.w * rect.height / rect.width;
    applyCamera();
  } else fitCanvas();
  refreshFloorDialog();
}

const floorDialog = document.createElement('dialog');
floorDialog.id = 'floordialog';
floorDialog.innerHTML = '<form method="dialog"><div class="dialoghead"><h2>管理楼层</h2><button value="close" aria-label="关闭楼层管理">×</button></div><p>每层独立保存机房、机柜、墙体、轴线和备注。</p><div id="floorlist"></div><div class="addfloor"><label>新楼层名称<input id="newfloorname" aria-label="新楼层名称" maxlength="40" required></label><button type="button" id="addfloor">新增楼层</button></div><div class="dialogactions"><button value="close">完成</button></div></form>';
document.body.append(floorDialog);

function floorNameValid(name, excluding) {
  if (!name || name.length > 40) {toast('楼层名称应为 1–40 个字符'); return false;}
  if (data.floorCatalog[page].some(f => f.id !== excluding && f.name === name)) {
    toast('该车间已存在同名楼层'); return false;
  }
  return true;
}
function nextFloorName() {
  const names = new Set(data.floorCatalog[page].map(f => f.name));
  for (let n = 1; n <= 101; n++) if (!names.has(`${n}F`)) return `${n}F`;
  return '新楼层';
}
function refreshFloorDialog() {
  if (!page) return;
  const floors = data.floorCatalog[page];
  $('#floorlist').replaceChildren();
  for (const floor of floors) {
    const row = document.createElement('div');
    row.className = 'floorrow';
    const input = document.createElement('input');
    input.value = floor.name; input.maxLength = 40;
    input.setAttribute('aria-label', `楼层 ${floor.name} 名称`);
    const rename = () => {
      const name = input.value.trim();
      if (!floorNameValid(name, floor.id)) {input.value = floor.name; return;}
      checkpoint(); floor.name = name; save(); render(); refreshFloorDialog();
    };
    input.onchange = rename;
    const renameButton = document.createElement('button');
    renameButton.type = 'button'; renameButton.textContent = '保存名称';
    renameButton.setAttribute('aria-label', `保存楼层名称 ${floor.name}`);
    renameButton.onclick = rename;
    const visit = document.createElement('button');
    visit.type = 'button'; visit.textContent = currentFloor()?.id === floor.id ? '当前楼层' : '切换';
    visit.disabled = currentFloor()?.id === floor.id;
    visit.onclick = () => switchFloor(floor.id);
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'removefloor'; remove.textContent = '删除';
    remove.setAttribute('aria-label', `删除楼层 ${floor.name}`);
    remove.disabled = floors.length <= 1;
    remove.onclick = () => {
      const count = (data.plans[floor.planKey] || []).length;
      if (count && !confirm(`删除 ${floor.name} 及其中 ${count} 个对象？可使用撤销恢复。`)) return;
      settleFloorGestures(); checkpoint();
      const catalog = data.floorCatalog[page];
      catalog.splice(catalog.indexOf(floor), 1);
      delete data.plans[floor.planKey];
      if (data.planSettings) delete data.planSettings[floor.planKey];
      floorViews.delete(floor.planKey);
      if (data.activeFloors[page] === floor.id) data.activeFloors[page] = catalog[0].id;
      save(); render(); fitCanvas(); refreshFloorDialog();
      if (typeof syncCurrentDrawingLink === 'function') syncCurrentDrawingLink();
    };
    const count = document.createElement('small');
    count.textContent = `${(data.plans[floor.planKey] || []).length} 个对象`;
    row.append(input, count, renameButton, visit, remove); $('#floorlist').append(row);
  }
  $('#newfloorname').value = nextFloorName();
  $('#addfloor').disabled = floors.length >= 100;
}
$('#addfloor').onclick = () => {
  if (!page || data.floorCatalog[page].length >= 100) return;
  const name = $('#newfloorname').value.trim();
  if (!floorNameValid(name)) return;
  settleFloorGestures(); checkpoint();
  const id = uid();
  data.floorCatalog[page].push({id, name, planKey:id});
  data.plans[id] = [];
  switchFloor(id);
  toast(`已新增 ${name}`);
};

const floorRender = render;
render = function() {
  let changed = false;
  for (const workshop of data.items.filter(o => o.type === 'workshop')) {
    changed = ensureWorkshopFloors(workshop.id) || changed;
  }
  floorRender();
  $('#floorcontrols')?.remove();
  if (page) {
    const floor = currentFloor();
    const controls = document.createElement('div'); controls.id = 'floorcontrols';
    const tabs = document.createElement('div'); tabs.id = 'floortabs';
    tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '切换楼层');
    const floors = data.floorCatalog[page];
    for (const [index, item] of floors.entries()) {
      const tab = document.createElement('button');
      tab.type = 'button'; tab.id = `floor-tab-${item.id}`; tab.textContent = item.name;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(item.id === floor.id));
      tab.setAttribute('aria-controls', 'floorpanel');
      tab.tabIndex = item.id === floor.id ? 0 : -1;
      tab.title = `切换到 ${item.name}`;
      tab.onclick = () => switchFloor(item.id);
      tab.onkeydown = e => {
        let next;
        if (e.key === 'ArrowRight') next = (index + 1) % floors.length;
        if (e.key === 'ArrowLeft') next = (index + floors.length - 1) % floors.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = floors.length - 1;
        if (next === undefined) return;
        e.preventDefault(); switchFloor(floors[next].id);
        document.getElementById(`floor-tab-${floors[next].id}`)?.focus();
      };
      tabs.append(tab);
    }
    const manage = document.createElement('button');
    manage.type = 'button'; manage.textContent = '管理楼层'; manage.id = 'managefloors';
    manage.onclick = () => {refreshFloorDialog(); floorDialog.showModal();};
    controls.append(tabs, manage);
    $('.heading>div:first-child').append(controls);
    $('.drawing').id = 'floorpanel';
    $('.drawing').setAttribute('role', 'tabpanel');
    $('.drawing').setAttribute('aria-labelledby', `floor-tab-${floor.id}`);
    tabs.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
    $('#crumb').textContent += ` / ${floor.name}`;
    $('#title').title = `${data.items.find(o => o.id === page)?.name} · ${floor.name}`;
    // The workshop counter is not useful inside a floor: show its floor count.
    const first = $('#stats .stat');
    first.querySelector('small').textContent = '楼层数量';
    first.querySelector('strong').textContent = data.floorCatalog[page].length;
  } else {
    $('.drawing').removeAttribute('role');
    $('.drawing').removeAttribute('aria-labelledby');
  }
  if (changed) save();
};

const floorImport = $('#file').onchange;
$('#file').onchange = async e => {
  settleFloorGestures(); floorViews.clear();
  if (floorDialog.open) floorDialog.close();
  await floorImport(e);
};
render();
