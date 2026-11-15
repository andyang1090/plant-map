const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/canvas-history.js','utf8');

function boot(){
  const historyStack=[{state:null,url:'http://127.0.0.1/plant-map/'}];
  let historyIndex=0,popHandler=null,microtasks=[];
  const flush=()=>{while(microtasks.length)microtasks.shift()()};
  const body={classList:{_set:new Set(['project-home-open']),contains(c){return this._set.has(c)},add(c){this._set.add(c)},remove(c){this._set.delete(c)}}};
  const session=new Map([['plant-atlas-project-mode','editor']]);
  let page=null;
  const data={
    items:[{id:'w1',type:'workshop',name:'车间A'},{id:'w2',type:'workshop',name:'车间B'}],
    floorCatalog:{w1:[{id:'w1',name:'1F',planKey:'w1'}],w2:[{id:'w2',name:'1F',planKey:'w2'}]},
    activeFloors:{w1:'w1',w2:'w2'},
  };
  const created=[];
  const ctx={
    uid:()=>'session-1',
    crypto:{randomUUID:()=>'session-1'},
    data,
    get page(){return page},
    set page(v){page=v},
    camera:{x:0,y:0,w:1200,h:760},
    svg:{getBoundingClientRect:()=>({width:1200,height:760})},
    document:{
      body,
      querySelector:()=>null,
      createElement:()=>{const el={textContent:'',setAttribute(){},onclick:null,disabled:false,title:''};created.push(el);return el},
    },
    window:{
      history:{
        get state(){return historyStack[historyIndex].state},
        replaceState(state,_,url){historyStack[historyIndex]={state,url:url||historyStack[historyIndex].url}},
        pushState(state,_,url){historyStack.splice(historyIndex+1);historyStack.push({state,url:url||historyStack[historyIndex].url});historyIndex=historyStack.length-1},
        go(delta){
          const next=historyIndex+delta;if(next<0||next>=historyStack.length)return;
          historyIndex=next;popHandler?.({state:historyStack[historyIndex].state});flush();
        },
      },
      addEventListener(type,fn){if(type==='popstate')popHandler=fn},
    },
    sessionStorage:{getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,String(v))},
    queueMicrotask:fn=>microtasks.push(fn),
    $:sel=>sel==='.headeractions'?{prepend(){}}:sel==='#editor-root'?{hidden:false}:sel==='#projecthome'?{hidden:true}:null,
    changePage(id){page=id},
    switchFloor(){},
    currentFloor(){return page?data.floorCatalog[page][0]:null},
    ensureWorkshopFloors(){},
    settleFloorGestures(){},
    flushSave(){},
    applyCamera(){},
    render(){},
    showProjectHome(){session.set('plant-atlas-project-mode','home');body.classList.add('project-home-open')},
    projectHome:{hidden:true},
    roomTextEditor:null,
    console,
  };
  // Mirror browser globals: classic scripts read window.history via global history in browsers,
  // but in vm we expose them on the context root.
  ctx.history=ctx.window.history;
  ctx.addEventListener=(...a)=>ctx.window.addEventListener(...a);
  vm.createContext(ctx);
  vm.runInContext(source,ctx);
  return {
    run:code=>vm.runInContext(code,ctx),
    session,
    body,
    get page(){return page},
  };
}

const env=boot();
assert.equal(env.run('canvasHistoryEntries.length'),2,'Editor boot keeps portal + canvas entries');
assert.equal(env.run('canvasHistoryEntries[0].home'),true);
assert.equal(env.run('canvasHistoryEntries[1].home'),false,'Editor entry must not be marked as home');
assert.equal(env.run('canvasHistoryIndex'),1);
assert.equal(env.run('canvasLocation().home'),false,'sessionStorage editor mode wins over leftover portal class');

env.run('changePage("w1")');
assert.equal(env.run('canvasHistoryEntries.length'),3);
assert.equal(env.run('canvasHistoryEntries[2].workshop'),'w1');
assert.equal(env.page,'w1');

env.run('changePage("w2")');
assert.equal(env.page,'w2');
assert.equal(env.run('canvasHistoryIndex'),3);

env.run('travelCanvas(-1)');
assert.equal(env.page,'w1','Back returns to previous workshop, not project home');
assert.equal(env.session.get('plant-atlas-project-mode'),'editor');
assert.equal(env.run('canvasHistoryIndex'),2);

env.run('travelCanvas(-1)');
assert.equal(env.page,null,'Second back returns to site plan');
assert.equal(env.run('canvasHistoryEntries[canvasHistoryIndex].home'),false);
assert.equal(env.session.get('plant-atlas-project-mode'),'editor');

env.run('travelCanvas(1)');
assert.equal(env.page,'w1','Forward restores workshop');

env.run('travelCanvas(-1);travelCanvas(-1);travelCanvas(-1)');
assert.equal(env.session.get('plant-atlas-project-mode'),'home','Further back reaches project home');
assert.equal(env.body.classList.contains('project-home-open'),true);

console.log('Canvas history init, workshop back/forward and home false-positive guard passed.');
