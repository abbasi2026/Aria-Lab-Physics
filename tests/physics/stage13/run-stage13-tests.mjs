import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SceneRuntime } from '../../../packages/scene-runtime/src/index.mjs';
import { DigitalCircuit, digitalPartKind, digitalVirtualPorts } from '../../../packages/digital-engine/src/index.mjs';
import { buildExecutionFrame, executableCapability } from '../../../packages/execution-runtime/src/index.mjs';

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const defs=read('datasets/parts/canonical-parts.json');
let count=0;
const test=(name,fn)=>{try{fn();console.log(`PASS ${name}`);count++;}catch(error){console.error(`FAIL ${name}`);throw error;}};
const tr=()=>({position:{x:0,y:0},rotation:0,scale:{x:1,y:1}});
const part=(instanceId,partId,properties={})=>({instanceId,partId,transform:tr(),properties});
const conn=(id,a,ap,b,bp)=>({id,kind:'electrical',from:{instanceId:a,portId:ap},to:{instanceId:b,portId:bp}});
const scene=(parts,connections,probes=[])=>({schemaVersion:'1.0.0',id:'stage13.test',titleFa:'تست دیجیتال حالت‌دار',domain:'circuits',simulation:{dt:.1,circuitMode:'digital'},parts,connections,probes});
const runtime=s=>new SceneRuntime(s,{partDefinitions:defs});

function dScene(){return scene([
  part('d','circuits.latching-logic-input',{value:true}),part('clk','circuits.latching-logic-input',{value:false}),part('ff','circuits.7474'),part('q','circuits.logic-output')
],[conn('d','d','port-1','ff','d'),conn('clk','clk','port-1','ff','clk'),conn('q','ff','q','q','port-1')],[{id:'q-probe',instanceId:'q',quantity:'logic'}]);}

test('all Stage 13 ICs expose virtual terminals and stateful kinds',()=>{
  const ids=['circuits.7474','circuits.7473','circuits.4027','circuits.4043-without-enable','circuits.4017','circuits.4518','circuits.4026','circuits.4511','circuits.4028'];
  for(const id of ids){assert.ok(digitalVirtualPorts(id).length>=4,id);assert.ok(digitalPartKind(id),id);assert.equal(executableCapability(id).supported,true,id);}
});

test('7474 D flip-flop samples D only on rising clock edge and then holds',()=>{
  const r=runtime(dScene()); r.step(1); assert.equal(r.snapshot().state.parts.ff.q,false);
  r.setPartProperties('clk',{value:true}); r.step(1); assert.equal(r.snapshot().state.parts.ff.q,true);
  r.setPartProperties('d',{value:false}); r.step(1); assert.equal(r.snapshot().state.parts.ff.q,true,'must hold while clock stays high');
  r.setPartProperties('clk',{value:false}); r.step(1); r.setPartProperties('clk',{value:true}); r.step(1); assert.equal(r.snapshot().state.parts.ff.q,false);
});

test('state memory survives runtime reconstruction when explicitly restored',()=>{
  const r=runtime(dScene());r.step(1);r.setPartProperties('clk',{value:true});r.step(1);assert.equal(r.snapshot().state.parts.ff.q,true);
  const memory=r.snapshot().state.memory;
  const nextScene=dScene();nextScene.parts.find(p=>p.instanceId==='d').properties.value=false;nextScene.parts.find(p=>p.instanceId==='clk').properties.value=true;
  const next=runtime(nextScene);next.adapter.restoreMemory(memory);next.step(1);assert.equal(next.snapshot().state.parts.ff.q,true,'restored prevClock prevents a false edge');
  next.setPartProperties('clk',{value:false});next.step(1);next.setPartProperties('clk',{value:true});next.step(1);assert.equal(next.snapshot().state.parts.ff.q,false);
});

test('7473 JK flip-flop toggles when J and K are both one',()=>{
  const s=scene([part('j','circuits.latching-logic-input',{value:true}),part('k','circuits.latching-logic-input',{value:true}),part('clk','circuits.latching-logic-input',{value:false}),part('ff','circuits.7473')],[conn('j','j','port-1','ff','j'),conn('k','k','port-1','ff','k'),conn('clk','clk','port-1','ff','clk')]);
  const r=runtime(s);r.step(1);r.setPartProperties('clk',{value:true});r.step(1);assert.equal(r.snapshot().state.parts.ff.q,true);r.setPartProperties('clk',{value:false});r.step(1);r.setPartProperties('clk',{value:true});r.step(1);assert.equal(r.snapshot().state.parts.ff.q,false);
});

test('4027 asynchronous set/reset override JK clock state',()=>{
  const s=scene([part('j','circuits.latching-logic-input',{value:false}),part('k','circuits.latching-logic-input',{value:false}),part('clk','circuits.latching-logic-input',{value:false}),part('set','circuits.latching-logic-input',{value:true}),part('reset','circuits.latching-logic-input',{value:false}),part('ff','circuits.4027')],[conn('j','j','port-1','ff','j'),conn('k','k','port-1','ff','k'),conn('clk','clk','port-1','ff','clk'),conn('set','set','port-1','ff','set'),conn('reset','reset','port-1','ff','reset')]);
  const r=runtime(s);r.step(1);assert.equal(r.snapshot().state.parts.ff.q,true);r.setPartProperties('set',{value:false});r.setPartProperties('reset',{value:true});r.step(1);assert.equal(r.snapshot().state.parts.ff.q,false);
});

test('4043 RS latch supports set, hold, reset and reports invalid S=R=1',()=>{
  const s=scene([part('s','circuits.latching-logic-input',{value:true}),part('r','circuits.latching-logic-input',{value:false}),part('l','circuits.4043-without-enable')],[conn('s','s','port-1','l','s'),conn('r','r','port-1','l','r')]);
  const r=runtime(s);r.step(1);assert.equal(r.snapshot().state.parts.l.q,true);r.setPartProperties('s',{value:false});r.step(1);assert.equal(r.snapshot().state.parts.l.q,true);r.setPartProperties('r',{value:true});r.step(1);assert.equal(r.snapshot().state.parts.l.q,false);r.setPartProperties('s',{value:true});r.step(1);assert.equal(r.snapshot().state.parts.l.invalid,true);
});

test('4017 decade counter advances one-hot output and reset returns to zero',()=>{
  const s=scene([part('clk','circuits.latching-logic-input',{value:false}),part('reset','circuits.latching-logic-input',{value:false}),part('ctr','circuits.4017'),part('q1','circuits.logic-output')],[conn('clk','clk','port-1','ctr','clk'),conn('reset','reset','port-1','ctr','reset'),conn('q1','ctr','q1','q1','port-1')]);
  const r=runtime(s);r.step(1);assert.equal(r.snapshot().state.parts.ctr.count,0);r.setPartProperties('clk',{value:true});r.step(1);assert.equal(r.snapshot().state.parts.ctr.count,1);assert.equal(r.snapshot().state.parts.q1.value,true);r.setPartProperties('reset',{value:true});r.step(1);assert.equal(r.snapshot().state.parts.ctr.count,0);
});

test('4518 BCD counter exports the binary-coded count',()=>{
  const s=scene([part('clk','circuits.latching-logic-input',{value:false}),part('ctr','circuits.4518'),part('b0','circuits.logic-output'),part('b1','circuits.logic-output')],[conn('clk','clk','port-1','ctr','clk'),conn('b0','ctr','b0','b0','port-1'),conn('b1','ctr','b1','b1','port-1')]);
  const r=runtime(s);r.step(1);for(let n=0;n<3;n++){r.setPartProperties('clk',{value:true});r.step(1);r.setPartProperties('clk',{value:false});r.step(1);}assert.equal(r.snapshot().state.parts.ctr.count,3);assert.equal(r.snapshot().state.parts.b0.value,true);assert.equal(r.snapshot().state.parts.b1.value,true);
});

test('4026 counter/decoder produces a valid seven-segment digit',()=>{
  const s=scene([part('clk','circuits.latching-logic-input',{value:false}),part('ctr','circuits.4026')],[conn('clk','clk','port-1','ctr','clk')]);const r=runtime(s);r.step(1);r.setPartProperties('clk',{value:true});r.step(1);assert.equal(r.snapshot().state.parts.ctr.digit,1);const frame=buildExecutionFrame(s,r.snapshot());assert.equal(frame.parts.ctr.display,'1');
});

test('4511 converts BCD five into seven-segment pattern for digit 5',()=>{
  const bits=[true,false,true,false];const parts=bits.map((v,i)=>part('b'+i,'circuits.latching-logic-input',{value:v}));parts.push(part('dec','circuits.4511'));const connections=bits.map((_,i)=>conn('c'+i,'b'+i,'port-1','dec','b'+i));const r=runtime(scene(parts,connections));r.step(1);assert.equal(r.snapshot().state.parts.dec.digit,5);assert.deepEqual(r.snapshot().state.parts.dec.segments,{a:true,b:false,c:true,d:true,e:false,f:true,g:true});
});

test('4028 converts BCD five to one-hot Q5',()=>{
  const bits=[true,false,true,false];const parts=bits.map((v,i)=>part('b'+i,'circuits.latching-logic-input',{value:v}));parts.push(part('dec','circuits.4028'),part('q5','circuits.logic-output'));const connections=bits.map((_,i)=>conn('c'+i,'b'+i,'port-1','dec','b'+i));connections.push(conn('q5','dec','q5','q5','port-1'));const r=runtime(scene(parts,connections));r.step(1);assert.equal(r.snapshot().state.parts.dec.digit,5);assert.equal(r.snapshot().state.parts.q5.value,true);
});

test('stateful probes record Q, count and digit as numeric series',()=>{
  const e=read('content/experiments/stage13/4017-counter.json');const r=runtime(e.scene);r.step(1);r.setPartProperties('clk',{value:true});r.step(1);const series=r.recorder.get('count');assert.ok(series.length>=1);assert.equal(series.at(-1).value,1);
});

test('Stage 13 ships six validated executable stateful experiments',()=>{
  const idx=read('content/experiments/stage13/index.json');assert.equal(idx.length,6);assert.ok(idx.every(x=>x.stage===13&&x.executionMode&&x.statefulDigital));for(const item of idx){const e=read(item.path.replace(/^\//,''));assert.equal(e.metadata.stage,13);assert.equal(e.scene.simulation.circuitMode,'digital');}
});

console.log(`\nStage 13: ${count} tests passed.`);
