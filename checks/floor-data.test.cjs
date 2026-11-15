const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {randomUUID} = require('node:crypto');
const source = fs.readFileSync('dist/app.js', 'utf8');
const helpers = vm.runInNewContext(source.slice(0, source.indexOf('function sample()')) + `
let data; let page=null;
({setData:value=>data=value,setPage:value=>page=value,
planKey,workshopHasContent,copyWorkshopPlans,removeWorkshopPlans,validFloorData});
`, {crypto:{randomUUID}});

const fixture = {
  items:[{id:'workshop',type:'workshop'}, {id:'copy',type:'workshop'}],
  plans:{workshop:[{id:'old-cabinet',type:'cabinet',points:[[0,0],[1,1]]}],
    upper:[{id:'upper-note',type:'note',name:'二层备注'}]},
  planSettings:{workshop:{axes:false},upper:{axes:true}},
};
helpers.setData(fixture); helpers.setPage('workshop');
assert.equal(helpers.planKey(), 'workshop', 'Old data opens its existing plan');
assert.equal(helpers.workshopHasContent('workshop'), true);
assert.equal(helpers.validFloorData(fixture), true, 'Legacy backups remain valid');

fixture.floorCatalog={workshop:[
  {id:'ground',name:'1F',planKey:'workshop'},
  {id:'upper',name:'2F',planKey:'upper'},
]};
fixture.activeFloors={workshop:'upper'};
assert.equal(helpers.planKey(), 'upper');
helpers.copyWorkshopPlans('workshop','copy');
assert.equal(fixture.floorCatalog.copy.length,2,'Copy keeps every floor');
const copiedGround=fixture.floorCatalog.copy[0].planKey;
const copiedUpper=fixture.floorCatalog.copy[1].planKey;
assert.notEqual(copiedGround,'workshop');
assert.notEqual(copiedUpper,'upper');
assert.equal(fixture.plans[copiedUpper][0].name,'二层备注');
assert.notEqual(fixture.plans[copiedUpper][0].id,'upper-note');
fixture.plans[copiedGround][0].points[0][0]=42;
assert.equal(fixture.plans.workshop[0].points[0][0],0,'Copied geometry is independent');
assert.equal(fixture.planSettings[copiedGround].axes,false);
assert.equal(helpers.validFloorData(fixture),true);

helpers.removeWorkshopPlans('copy');
assert.equal(fixture.plans[copiedGround],undefined);
assert.equal(fixture.plans[copiedUpper],undefined);
assert.equal(fixture.floorCatalog.copy,undefined);
assert.equal(fixture.activeFloors.copy,undefined);
assert.equal(fixture.planSettings[copiedUpper],undefined);
assert.equal(fixture.plans.upper[0].name,'二层备注','Deleting a copy preserves original floors');

fixture.floorCatalog.workshop.shift(); delete fixture.plans.workshop;
assert.equal(helpers.planKey(),'upper','Remaining floor works after the original floor is deleted');
assert.equal(helpers.workshopHasContent('workshop'),true);
fixture.floorCatalog.workshop.push({id:'duplicate',name:'3F',planKey:'upper'});
assert.equal(helpers.validFloorData(fixture),false,'Reject shared plan keys in imported floor data');
console.log('Floor migration, isolation, duplication, deletion and backup validation passed.');
