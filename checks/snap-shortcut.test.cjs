const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/keyboard-motion.js','utf8');let checked=true,saves=0;
const box={get checked(){return checked},set checked(value){checked=value}};
const ctx={snap:true,data:{preferences:{}},$:()=>box,indicateSnap:()=>{},clearPreview:()=>{},save:()=>saves++,toast:()=>{}};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('function toggleSnapMode'),source.indexOf("$('#snap').closest")),ctx);
ctx.toggleSnapMode();assert.equal(ctx.snap,false);assert.equal(checked,false);assert.equal(ctx.data.preferences.snap,false);
ctx.toggleSnapMode();assert.equal(ctx.snap,true);assert.equal(checked,true);assert.equal(ctx.data.preferences.snap,true);assert.equal(saves,2);
console.log('Snap shortcut synchronizes mode, checkbox and persisted preference.');
