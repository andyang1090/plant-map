const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const editor=fs.readFileSync('dist/editor.js','utf8');
const context={point:null,rawPoint:e=>({x:e.x,y:e.y}),align:v=>Math.round(v/50)*50};
vm.createContext(context);vm.runInContext(editor.slice(editor.indexOf('point=e=>'),editor.indexOf('function paintObject')),context);
assert.equal(context.point({x:12.34,y:56.78,altKey:true}).x,12.34);
assert.equal(context.point({x:12.34,y:56.78}).x,0);
const objects=[
  {type:'haxis',x:0,y:100,w:600},
  {type:'haxis',x:50,y:200,w:600},
  {type:'vaxis',x:100,y:0,h:600},
  {type:'vaxis',x:300,y:80,h:600}
];
const app=fs.readFileSync('dist/app.js','utf8'),axis=fs.readFileSync('dist/axis-length.js','utf8');
const data={planSettings:{}};
const ctx={page:'workshop',data,planKey:()=>'floor1',items:()=>objects};vm.createContext(ctx);
vm.runInContext(app.slice(app.indexOf('const DEFAULT_AXIS_LENGTH'),app.indexOf('function workshopKeys')),ctx);
vm.runInContext(axis.slice(axis.indexOf('function alignAxisGroup'),axis.indexOf('const lengthStretch')),ctx);
assert.equal(ctx.DEFAULT_AXIS_LENGTH,600);
assert.equal(ctx.configuredAxisLength('haxis'),600);
assert.equal(ctx.applyAxisLength('haxis',800),true);
assert.equal(objects[0].w,800);assert.equal(objects[1].w,800);
assert.equal(objects[0].x,objects[1].x);
assert.equal(objects[0].x,-200);
assert.equal(objects[2].h,600);assert.equal(objects[3].h,600);
assert.equal(objects[2].y,objects[3].y);
assert.equal(objects[2].y,-150);
objects.push({type:'haxis',x:999,y:250,w:10});ctx.syncAxisLengths();
assert.equal(objects[4].w,800);assert.equal(objects[4].x,objects[0].x);
assert.equal(ctx.axisSpanContains({type:'haxis',x:objects[0].x},objects[0].x+800,0),true);
assert.equal(ctx.axisSpanContains({type:'haxis',x:objects[0].x},objects[0].x+801,0),false);
ctx.planKey=()=>'floor2';assert.equal(ctx.configuredAxisLength('haxis'),600);
console.log('Shared-start axis alignment, default 600 m, and per-floor isolation passed.');
