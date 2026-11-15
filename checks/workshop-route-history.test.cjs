const assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('dist/workshop-route.js','utf8');
assert.match(source,/window\.history\.replaceState/,'Route sync must use window.history — app undo `history` array shadows the bare name');
assert.doesNotMatch(source,/(?<!window\.)history\.replaceState/,'Bare history.replaceState would throw and fall back to location.hash, breaking canvas forward/back');
console.log('Workshop route uses window.history.replaceState (no undo-array shadowing) passed.');
