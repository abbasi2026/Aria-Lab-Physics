import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SceneRuntime } from '../../../packages/scene-runtime/src/index.mjs';
import { buildExecutionFrame, executableCapability } from '../../../packages/execution-runtime/src/index.mjs';

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const defs=read('datasets/parts/canonical-parts.json');
let count=0;
const test=(name,fn)=>{try{fn();console.log(`PASS ${name}`);count++;}catch(error){console.error(`FAIL ${name}`);throw error;}};
const runFile=(file,steps=1)=>{const experiment=read(file);const runtime=new SceneRuntime(experiment.scene,{partDefinitions:defs});const snapshot=runtime.step(steps);return {experiment,runtime,snapshot,frame:buildExecutionFrame(experiment.scene,snapshot)};};
const tr=(x=0,y=0)=>({position:{x,y},rotation:0,scale:{x:1,y:1}});
const part=(instanceId,partId,nodeA,nodeB,properties={})=>({instanceId,partId,transform:tr(),properties:{nodeA,nodeB,...properties}});
const scene=parts=>({schemaVersion:'1.0.0',id:'stage11.test',titleFa:'آزمون',domain:'circuits',simulation:{dt:1e-4,timeScale:1,gravity:{x:0,y:0}},parts,connections:[],probes:[]});

// 1
test('LED has real forward-drop current and visible intensity',()=>{
  const {snapshot,frame}=runFile('content/experiments/stage11/led-series.json',5);
  const current=snapshot.state.branchCurrents.led;
  assert.ok(current>0.017&&current<0.020,`I=${current}`);
  assert.ok(frame.parts.led.intensity>0.8&&frame.parts.led.intensity<=1);
  assert.match(frame.parts.led.display,/mA/);
});

// 2
test('voltmeter reads actual voltage across its own nodes',()=>{
  const {snapshot,frame}=runFile('content/experiments/stage11/voltage-divider-meter.json');
  assert.ok(Math.abs(frame.parts.vm.value-3)<1e-5,`V=${frame.parts.vm.value}`);
  assert.match(frame.parts.vm.display,/3\.000 V/);
  assert.ok(snapshot.state.partNodes.vm);
});

// 3
test('ammeter reports real series current with negligible burden',()=>{
  const s=scene([part('bat','circuits.battery','n1','0',{voltage:6}),part('am','circuits.ammeter','n1','n2'),part('r','circuits.resistor','n2','0',{resistance:30})]);
  const runtime=new SceneRuntime(s,{partDefinitions:defs});const snap=runtime.step(1);const frame=buildExecutionFrame(s,snap);
  assert.ok(Math.abs(snap.state.branchCurrents.am-0.2)<1e-5,`I=${snap.state.branchCurrents.am}`);
  assert.match(frame.parts.am.display,/0\.200 A/);
});

// 4
test('variable resistor changes motor current and visual speed',()=>{
  const low=runFile('content/experiments/stage11/motor-variable-resistor.json');
  const lowI=low.snapshot.state.branchCurrents.motor;
  const highScene=structuredClone(low.experiment.scene);highScene.parts.find(p=>p.instanceId==='vr').properties.resistance=970;
  const runtime=new SceneRuntime(highScene,{partDefinitions:defs});const snap=runtime.step(1);const frame=buildExecutionFrame(highScene,snap);const highI=snap.state.branchCurrents.motor;
  assert.ok(lowI>0.039&&lowI<0.041,`low=${lowI}`);
  assert.ok(highI<0.007,`high=${highI}`);
  assert.ok(low.frame.parts.motor.speed>frame.parts.motor.speed);
});

// 5
test('LDR changes circuit current with light level',()=>{
  const make=light=>scene([part('bat','circuits.battery','n1','0',{voltage:5}),part('ldr','circuits.ldr','n1','0',{lightLevel:light})]);
  const dark=new SceneRuntime(make(0),{partDefinitions:defs}).step(1).state.branchCurrents.ldr;
  const bright=new SceneRuntime(make(1),{partDefinitions:defs}).step(1).state.branchCurrents.ldr;
  assert.ok(bright>dark*50,`dark=${dark}, bright=${bright}`);
});

// 6
test('NTC thermistor current rises with temperature',()=>{
  const make=temp=>scene([part('bat','circuits.battery','n1','0',{voltage:5}),part('th','circuits.thermistor','n1','0',{temperature:temp,r0:1000,beta:3500})]);
  const cold=new SceneRuntime(make(0),{partDefinitions:defs}).step(1).state.branchCurrents.th;
  const hot=new SceneRuntime(make(75),{partDefinitions:defs}).step(1).state.branchCurrents.th;
  assert.ok(hot>cold*5,`cold=${cold}, hot=${hot}`);
});

// 7
test('buzzer activation is derived from real solver current',()=>{
  const s=scene([part('bat','circuits.battery','n1','0',{voltage:6}),part('buzz','circuits.buzzer','n1','0',{resistance:60,nominalCurrent:.1})]);
  const runtime=new SceneRuntime(s,{partDefinitions:defs});const snap=runtime.step(1);const frame=buildExecutionFrame(s,snap);
  assert.ok(Math.abs(snap.state.branchCurrents.buzz-.1)<1e-8);
  assert.ok(frame.parts.buzz.soundLevel>.99);
});

// 8
test('DC fuse detects overload then opens the circuit',()=>{
  const {snapshot,frame}=runFile('content/experiments/stage11/fuse-overload.json',2);
  assert.ok(snapshot.state.blownFuses.includes('fuse'));
  assert.ok(Math.abs(snapshot.state.branchCurrents.fuse)<1e-9,`I=${snapshot.state.branchCurrents.fuse}`);
  assert.equal(frame.parts.fuse.blown,true);
});

// 9
test('transient fuse opens on the step after overload',()=>{
  const s=scene([part('bat','circuits.battery','n1','0',{voltage:5}),part('f','circuits.fuse','n1','n2',{rating:.01}),part('led','circuits.red-led','n2','0',{forwardVoltage:1.9})]);
  const runtime=new SceneRuntime(s,{partDefinitions:defs});const first=runtime.step(1);const second=runtime.step(1);
  assert.ok(first.state.blownFuses.includes('f'));
  assert.ok(Math.abs(second.state.branchCurrents.f)<1e-9,`I2=${second.state.branchCurrents.f}`);
});

// 10
test('RC live meter follows transient charging solution',()=>{
  const {snapshot,frame}=runFile('content/experiments/stage11/rc-live-meter.json',1000);
  const v=frame.parts.vm.value;
  const analytical=5*(1-Math.exp(-1));
  assert.ok(Math.abs(v-analytical)<.03,`V=${v}, expected=${analytical}`);
  assert.ok(snapshot.time>.099&&snapshot.time<.101);
});

// 11
test('Stage 11 ships five executable circuit experiments and capabilities',()=>{
  const index=read('content/experiments/stage11/index.json');assert.equal(index.length,5);assert.ok(index.every(e=>e.executionMode&&e.stage===11));
  for(const id of ['circuits.red-led','circuits.pictorial-motor','circuits.buzzer','circuits.fuse','circuits.ammeter','circuits.voltmeter','circuits.vresistor','circuits.ldr','circuits.thermistor','circuits.capacitor','circuits.inductor']) assert.equal(executableCapability(id).supported,true,id);
});

console.log(`\nStage 11: ${count} tests passed.`);
