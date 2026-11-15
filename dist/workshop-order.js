// Directory ordering is independent of the drawing's stacking order.
function orderedWorkshops(){
  const workshops=data.items.filter(o=>o.type==='workshop');
  const byId=new Map(workshops.map(o=>[o.id,o]));
  const ordered=[];
  for(const id of Array.isArray(data.workshopOrder)?data.workshopOrder:[]){if(byId.has(id)){ordered.push(byId.get(id));byId.delete(id)}}
  return ordered.concat(workshops.filter(o=>byId.has(o.id)));
}
function moveWorkshopInDirectory(id,direction){
  const order=orderedWorkshops().map(o=>o.id),from=order.indexOf(id),to=from+direction;
  if(from<0||to<0||to>=order.length)return;
  checkpoint();[order[from],order[to]]=[order[to],order[from]];
  data.workshopOrder=order;save();render();
  Array.from($('#tree').children).find(row=>row.dataset.orderId===id)?.querySelector('button[data-direction="'+direction+'"]')?.focus();
}
function renderWorkshopDirectory(){
  const workshops=orderedWorkshops();$('#tree').replaceChildren();
  workshops.forEach((workshop,index)=>{
    const row=document.createElement('div');row.className='workshop-row';row.dataset.orderId=workshop.id;
    const link=document.createElement('button');link.className='treeitem';link.classList.toggle('active',workshop.id===page);
    link.dataset.page=workshop.id;link.textContent='⌑　'+workshop.name;link.title=workshop.name;
    if(workshop.id===page)link.setAttribute('aria-current','page');
    link.onclick=()=>changePage(workshop.id);row.append(link);
    const actions=document.createElement('div');actions.className='workshop-order-actions';
    for(const [direction,label,symbol,disabled] of [[-1,'上移','↑',index===0],[1,'下移','↓',index===workshops.length-1]]){
      const button=document.createElement('button');button.textContent=symbol;button.title=label;button.setAttribute('aria-label',label+'车间 '+workshop.name);
      button.dataset.direction=direction;button.disabled=disabled;button.onclick=()=>moveWorkshopInDirectory(workshop.id,direction);actions.append(button);
    }
    row.append(actions);$('#tree').append(row);
  });
}
const workshopOrderRender=render;
render=function(){workshopOrderRender();renderWorkshopDirectory()};
renderWorkshopDirectory();
