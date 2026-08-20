import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CircuitNetwork } from '../../../packages/circuits-engine/src/mna.mjs';
import { ActiveCircuitNetwork } from '../../../packages/active-circuits-engine/src/index.mjs';
import { SceneRuntime } from '../../../packages/scene-runtime/src/index.mjs';
import { buildExecutionFrame, executableCapability } from '../../../packages/execution-runtime/src/index.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const defs=read('datasets/parts/canonical-parts.json');
let count=0; const test=(name,fn)=>{fn();count++;console.log(`PASS ${name}`)};
const runFile=(name,steps=2)=>{const e=read(`content/experiments/stage14/${name}`);const runtime=new SceneRuntime(e.scene,{partDefinitions:defs});const snapshot=runtime.step(steps);return {e,runtime,snapshot,frame:buildExecutionFrame(e.scene,snapshot)}};

// 1 VCVS / opamp primitive
test('MNA VCVS supports closed-loop op-amp gain',()=>{const n=new CircuitNetwork();n.voltageSource('vin','vp','0',1).resistor('rg','vm','0',1000).resistor('rf','out','vm',1000).vcvs('op','out','0','vp','vm',1e5);const r=n.solveDC();assert.ok(Math.abs(r.nodeVoltages.out-2)<1e-3,r.nodeVoltages.out)});
// 2 NPN
test('NPN produces collector current from base drive',()=>{const {snapshot,frame}=runFile('npn-switch.json');const ic=snapshot.state.branchCurrents.q;assert.ok(ic>0.0014&&ic<0.0016,ic);assert.match(frame.parts.q.display,/Ic=/);assert.equal(frame.parts.q.active,true)});
// 3 PNP
test('PNP high-side device sources current when base is pulled down',()=>{const {snapshot}=runFile('pnp-high-side.json');const ic=snapshot.state.branchCurrents.q;assert.ok(ic<-.0034&&ic>-.0036,ic);assert.ok(snapshot.state.nodeVoltages.c>.34)});
// 4 NMOS live gate control
test('NMOS turns on above threshold and off below threshold',()=>{const {runtime,snapshot}=runFile('nmos-gate.json');assert.ok(Math.abs(snapshot.state.branchCurrents.m)<1e-7);runtime.setPartProperties('gate',{voltage:5});const on=runtime.step(1);assert.ok(on.state.branchCurrents.m>.049&&on.state.branchCurrents.m<.051,on.state.branchCurrents.m);assert.equal(on.state.activeStates.m.on,true)});
// 5 PMOS primitive
test('PMOS uses source-to-gate threshold polarity',()=>{const n=new ActiveCircuitNetwork();n.voltageSource('vcc','s','0',5).voltageSource('g','g','0',0).resistor('load','d','0',100).mosfet('m',{drain:'d',gate:'g',source:'s',type:'p',threshold:2,onResistance:.5});const r=n.solve();assert.ok(Math.abs(r.branchCurrents.m)>.049);assert.equal(r.activeStates.m.on,true)});
// 6 opamp scene
test('741 non-inverting amplifier gives approximately gain two',()=>{const {snapshot,frame}=runFile('opamp-noninverting.json');assert.ok(Math.abs(snapshot.state.nodeVoltages.out-2)<1e-3);assert.match(frame.parts.op.display,/Vo=2\.000 V/)});
// 7 relay on/off
test('SPDT relay coil moves contact and controls lamp current',()=>{const {runtime,snapshot,frame}=runFile('relay-spdt.json');assert.equal(snapshot.state.activeStates.relay.energized,true);assert.ok(snapshot.state.branchCurrents.lamp>.099);assert.equal(frame.parts.relay.active,true);runtime.setPartProperties('coil',{voltage:0});const off=runtime.step(2);assert.equal(off.state.activeStates.relay.energized,false);assert.ok(Math.abs(off.state.branchCurrents.lamp)<1e-8)});
// 8 DPDT primitive
test('DPDT relay changes two poles together',()=>{const n=new ActiveCircuitNetwork();n.voltageSource('coil','cp','0',6).voltageSource('v1','v1','0',5).voltageSource('v2','v2','0',3).relayDPDT('r',{coil1:'cp',coil2:'0',coilResistance:120,pickupCurrent:.03,poles:[{com:'v1',no:'a',nc:'b'},{com:'v2',no:'c',nc:'d'}]}).resistor('la','a','0',100).resistor('lc','c','0',100).resistor('lb','b','0',1e6).resistor('ld','d','0',1e6);const r=n.solve();assert.equal(r.activeStates.r.energized,true);assert.ok(r.branchCurrents.la>.049);assert.ok(r.branchCurrents.lc>.029)});
// 9 thyristor latching
test('thyristor latches after gate pulse and releases after anode current interruption',()=>{const {runtime,snapshot}=runFile('thyristor-latch.json');assert.equal(snapshot.state.activeStates.scr.latched,true);runtime.setPartProperties('gate',{voltage:0});let r=runtime.step(1);assert.equal(r.state.activeStates.scr.latched,true);runtime.setPartProperties('sw',{closed:false,on:false});runtime.step(1);r=runtime.step(1);assert.equal(r.state.activeStates.scr.latched,false)});
// 10 part port map
test('multi-terminal part port nodes remain explicit and measurable',()=>{const {snapshot}=runFile('npn-switch.json');assert.deepEqual(snapshot.state.partPortNodes.q,{collector:'c',base:'b',emitter:'0'})});
// 11 capabilities
test('active analog parts are executable capabilities',()=>{for(const id of ['circuits.npn','circuits.pnp','circuits.mosfetn','circuits.mosfetp','circuits.opamp-741','circuits.opamp-324','circuits.spdt-relay','circuits.dpdt-relay','circuits.thyristor'])assert.equal(executableCapability(id).supported,true,id)});
// 12 experiment inventory
test('Stage 14 ships six executable active-analog experiments',()=>{const index=read('content/experiments/stage14/index.json');assert.equal(index.length,6);assert.ok(index.every(x=>x.stage===14&&x.executionMode===true))});

console.log(`\nStage 14: ${count} tests passed.`);
