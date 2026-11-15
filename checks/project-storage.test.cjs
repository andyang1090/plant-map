const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/project-storage.js','utf8'),memory=new Map();
const legacy=JSON.stringify({version:1,items:[{id:'old-room',type:'room'}],plans:{workshop:[{id:'old-wall',type:'wall'}]}});
memory.set('plant-atlas-v1',legacy);let ids=0;
function boot(){const ctx={localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},crypto:{randomUUID:()=>`project-${++ids}`},window:{addEventListener:()=>{}},document:{body:null}};vm.createContext(ctx);vm.runInContext(source,ctx);return ctx}
const first=boot();assert.equal(first.readProjectDiagram(),legacy,'Migrate existing diagram without changing content');
assert.equal(memory.get('plant-atlas-v1'),legacy,'Keep the legacy migration backup');
let library=JSON.parse(memory.get('plant-atlas-projects-v1'));const originalId=library.activeId;
library.projects.push({id:'other',name:'第二项目'});library.activeId='other';memory.set('plant-atlas-projects-v1',JSON.stringify(library));
memory.set('plant-atlas-project:other',JSON.stringify({version:1,items:[],plans:{}}));
const second=boot();second.persistProjectDiagram({version:1,items:[{id:'new-room'}],plans:{}});
assert.equal(memory.get(`plant-atlas-project:${originalId}`),legacy,'Editing another project preserves the original');
assert.equal(JSON.parse(second.readProjectDiagram()).items[0].id,'new-room');
first.persistProjectDiagram({version:1,items:[{id:'changed-old'}],plans:{}});
assert.equal(JSON.parse(memory.get('plant-atlas-project:other')).items[0].id,'new-room','Tabs keep saving to their own project');
assert.equal(JSON.parse(memory.get('plant-atlas-projects-v1')).projects.find(p=>p.id==='other').name,'第二项目');
assert.equal(memory.get('plant-atlas-v1'),legacy);
console.log('Legacy migration, project isolation, per-tab saving and original backup preservation passed.');
