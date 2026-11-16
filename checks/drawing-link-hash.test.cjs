const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/project-storage.js','utf8');
const memory=new Map();
function boot(){
  const ctx={
    localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},
    crypto:{randomUUID:()=>'project-hash'},
    window:{addEventListener(){}},
    document:{body:null},
    location:{pathname:'/plant-map/',search:'',hash:''}
  };
  vm.createContext(ctx);vm.runInContext(source,ctx);return ctx;
}
const ctx=boot();
const parsed=value=>JSON.parse(JSON.stringify(ctx.parsePlantHash(value)));
assert.deepEqual(parsed(''),{kind:'empty'});
assert.deepEqual(parsed('#/'),{kind:'home'});
assert.equal(parsed('#home').kind,'anchor');
assert.equal(parsed('#sitefold').id,'sitefold');
assert.equal(parsed('#tree').id,'tree');
assert.equal(parsed('#/home').kind,'legacy-site');
assert.equal(parsed('#/site').kind,'legacy-site');
assert.deepEqual(parsed('#/p/proj-1/site'),{kind:'site',projectId:'proj-1'});
assert.deepEqual(parsed('#/p/proj-1/w/shop-2'),{kind:'workshop',projectId:'proj-1',workshopId:'shop-2',floorId:null});
assert.deepEqual(parsed('#/p/proj-1/w/shop-2/f/floor-3'),{kind:'workshop',projectId:'proj-1',workshopId:'shop-2',floorId:'floor-3'});
assert.deepEqual(parsed('#/01%20%E8%A3%85%E9%85%8D%E8%BD%A6%E9%97%B4/1F'),{kind:'legacy',workshopName:'01 装配车间',floorName:'1F'});
assert.equal(ctx.parsePlantHash('#/p').kind,'other');
assert.equal(ctx.plantDrawingHash({home:true},'proj-1'),'#/');
assert.equal(ctx.plantDrawingHash({workshop:null,floor:null},'proj-1'),'#/p/proj-1/site');
assert.equal(ctx.plantDrawingHash({workshop:'shop-2',floor:'floor-3'},'proj-1'),'#/p/proj-1/w/shop-2/f/floor-3');
assert.equal(ctx.plantDrawingHash({workshop:'shop-2',floor:null},'proj-1'),'#/p/proj-1/w/shop-2');
assert.equal(ctx.plantHashIsAnchor('#home'),true);
assert.equal(ctx.plantHashIsAnchor('#/p/proj-1/site'),false);
console.log('drawing link hash parser passed');
