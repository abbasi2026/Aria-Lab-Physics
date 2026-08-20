import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SceneDocument, createBlankScene, validateSceneShape } from '../../../packages/editor-core/src/index.mjs';
import { ComponentCatalog } from '../../../packages/component-library/src/index.mjs';
import { ProbeRecorder } from '../../../packages/measurement-engine/src/index.mjs';
import { seriesBounds, downsample, svgPolyline } from '../../../packages/graph-engine/src/index.mjs';
import { SceneRuntime } from '../../../packages/scene-runtime/src/index.mjs';

let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
const canonical = JSON.parse(await readFile(new URL('../../../datasets/parts/canonical-parts.json', import.meta.url), 'utf8'));

await test('blank scene validates', () => assert.equal(validateSceneShape(createBlankScene()), true));
await test('editor add/update/remove and undo redo', () => {
  const doc = new SceneDocument(createBlankScene());
  const id = doc.addPart({ partId: 'mechanics.ball', position: { x: 10, y: 20 }, properties: { mass: 2 } });
  assert.equal(doc.snapshot().parts.length, 1); doc.updateTransform(id, { position: { x: 30 } }); assert.equal(doc.snapshot().parts[0].transform.position.x, 30);
  doc.updateProperties(id, { mass: 3 }); assert.equal(doc.snapshot().parts[0].properties.mass, 3); assert.equal(doc.undo(), true); assert.equal(doc.snapshot().parts[0].properties.mass, 2); assert.equal(doc.redo(), true); assert.equal(doc.snapshot().parts[0].properties.mass, 3);
  doc.removePart(id); assert.equal(doc.snapshot().parts.length, 0);
});
await test('connections cascade when part removed', () => {
  const doc = new SceneDocument(createBlankScene()); const a=doc.addPart({partId:'circuits.battery'}),b=doc.addPart({partId:'circuits.resistor'}); doc.addConnection({kind:'electrical',from:{instanceId:a,portId:'positive'},to:{instanceId:b,portId:'a'}}); assert.equal(doc.snapshot().connections.length,1);doc.removePart(a);assert.equal(doc.snapshot().connections.length,0);
});
await test('component catalog exposes all 203 canonical parts', () => { const c=new ComponentCatalog(canonical); assert.equal(c.parts.length,203); assert.ok(c.get('circuits.battery')); assert.equal(c.list({domain:'circuits'}).length,93); assert.ok(Object.keys(c.defaultProperties('circuits.battery')).length>0); assert.equal(c.displayPorts('circuits.resistor').length,2); });
await test('measurement recorder bounded series and csv', () => { const r=new ProbeRecorder({maxSamples:3});for(let i=0;i<5;i++)r.record('x',i,i*2);assert.equal(r.get('x').length,3);assert.match(r.toCSV('x'),/time,value/); });
await test('graph engine bounds/downsample/polyline', () => { const p=Array.from({length:1000},(_,i)=>({time:i,value:Math.sin(i)})); assert.equal(downsample(p,100).length,100);assert.ok(seriesBounds(p).maxX===999);assert.ok(svgPolyline(p,600,120).includes(',')); });

await test('mechanics scene runtime advances 2D body', () => {
  const scene={...createBlankScene({domain:'mechanics'}),simulation:{dt:0.01,timeScale:1,gravity:{x:0,y:-10}},parts:[{instanceId:'ball',partId:'mechanics.ball',transform:{position:{x:0,y:10}},properties:{mass:1,radius:.5,velocityX:1}}],connections:[],probes:[{id:'y',instanceId:'ball',quantity:'position-y'}]};
  const r=new SceneRuntime(scene); r.step(10); const body=r.snapshot().state.bodies[0]; assert.ok(body.position.x>0);assert.ok(body.position.y<10);assert.equal(r.recorder.get('y').length,10);
});
await test('circuits scene runtime solves voltage divider', () => {
  const scene={...createBlankScene({domain:'circuits'}),simulation:{dt:.001,timeScale:1},parts:[
    {instanceId:'v1',partId:'circuits.battery',transform:{position:{x:0,y:0}},properties:{voltage:10,nodeA:'n1',nodeB:'0'}},
    {instanceId:'r1',partId:'circuits.resistor',transform:{position:{x:1,y:0}},properties:{resistance:1000,nodeA:'n1',nodeB:'n2'}},
    {instanceId:'r2',partId:'circuits.resistor',transform:{position:{x:2,y:0}},properties:{resistance:1000,nodeA:'n2',nodeB:'0'}}],connections:[],probes:[{id:'mid',quantity:'voltage',node:'n2'}]};
  const r=new SceneRuntime(scene);r.step();assert.ok(Math.abs(r.snapshot().state.nodeVoltages.n2-5)<1e-9);assert.ok(Math.abs(r.recorder.get('mid')[0].value-5)<1e-9);
});

await test('circuits runtime derives nodes from editor wiring', () => {
  const scene={...createBlankScene({domain:'circuits'}),simulation:{dt:.001,timeScale:1},parts:[
    {instanceId:'bat',partId:'circuits.battery',transform:{position:{x:0,y:0}},properties:{voltage:10}},
    {instanceId:'r1',partId:'circuits.resistor',transform:{position:{x:2,y:0}},properties:{resistance:1000}},
    {instanceId:'r2',partId:'circuits.resistor',transform:{position:{x:4,y:0}},properties:{resistance:1000}}],connections:[
      {id:'w1',kind:'electrical',from:{instanceId:'bat',portId:'positive'},to:{instanceId:'r1',portId:'t1'},properties:{}},
      {id:'w2',kind:'electrical',from:{instanceId:'r1',portId:'t2'},to:{instanceId:'r2',portId:'t1'},properties:{}},
      {id:'w3',kind:'electrical',from:{instanceId:'r2',portId:'t2'},to:{instanceId:'bat',portId:'negative'},properties:{}}],probes:[]};
  const r=new SceneRuntime(scene,{partDefinitions:canonical}); r.step(); const volts=Object.values(r.snapshot().state.nodeVoltages); assert.ok(volts.some(v=>Math.abs(v-5)<1e-9));
});

await test('optics scene runtime traces reflection to screen', () => {
  const scene={...createBlankScene({domain:'optics'}),simulation:{dt:.01,timeScale:1},parts:[
    {instanceId:'ray',partId:'optics.ray-source',transform:{position:{x:0,y:1},rotation:0},properties:{directionX:1,directionY:-1}},
    {instanceId:'mirror',partId:'optics.plane-mirror',transform:{position:{x:1,y:0},rotation:0},properties:{length:4}},
    {instanceId:'screen',partId:'optics.screen',transform:{position:{x:2,y:1},rotation:90},properties:{length:4}}],connections:[],probes:[]};
  const r=new SceneRuntime(scene);r.step();const events=r.snapshot().state.path.map(x=>x.event);assert.ok(events.includes('mirror'));assert.ok(events.includes('screen'));
});
await test('waves scene runtime advances stable 2D grid and records probe', () => {
  const scene={...createBlankScene({domain:'waves'}),simulation:{dt:.2,timeScale:1,waveSpeed:1},parts:[
    {instanceId:'space',partId:'waves.space-2d',transform:{position:{x:0,y:0}},properties:{width:11,height:11,dx:1,damping:.01}},
    {instanceId:'source',partId:'waves.point-source',transform:{position:{x:5,y:5}},properties:{amplitude:1,frequency:1}}],connections:[],probes:[{id:'center',quantity:'displacement',x:5,y:5}]};
  const r=new SceneRuntime(scene);r.step(8);assert.equal(r.recorder.get('center').length,8);assert.ok(r.snapshot().state.values.some(v=>Math.abs(v)>1e-8));
});
await test('waves runtime rejects unstable CFL instead of silently changing dt', () => {
  const scene={...createBlankScene({domain:'waves'}),simulation:{dt:1,timeScale:1,waveSpeed:2},parts:[{instanceId:'space',partId:'waves.space-2d',transform:{position:{x:0,y:0}},properties:{width:7,height:7,dx:1}}],connections:[],probes:[]};
  assert.throws(()=>new SceneRuntime(scene),/CFL unstable/);
});

console.log(`\nStage 4: ${passed} tests passed.`);
