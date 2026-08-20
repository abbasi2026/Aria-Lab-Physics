import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SceneRuntime } from '../../../packages/scene-runtime/src/index.mjs';
import { buildExecutionFrame, executableCapability, isInteractiveSwitch } from '../../../packages/execution-runtime/src/index.mjs';

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const defs=read('datasets/parts/canonical-parts.json');
let count=0;
const test=(name,fn)=>{try{fn();console.log(`PASS ${name}`);count++;}catch(e){console.error(`FAIL ${name}`);throw e;}};
const runtimeFor=experiment=>new SceneRuntime(experiment.scene,{partDefinitions:defs});
const hasPersian=s=>/[\u0600-\u06FF]/u.test(String(s??''));

test('all 203 canonical part display names are Persian',()=>{
  assert.equal(defs.length,203); for(const p of defs) assert.ok(hasPersian(p.nameFa),`${p.id} missing Persian name`);
});
test('all 209 Crocodile experiment display titles contain Persian script',()=>{
  const items=read('content/library/crocodile-605-index.json'); assert.equal(items.length,209);
  for(const x of items) assert.ok(hasPersian(x.titleFa),`${x.id} not Persian: ${x.titleFa}`);
});
test('Stage 9 ships four executable guided experiments',()=>{const idx=read('content/experiments/stage9/index.json');assert.equal(idx.length,4);assert.ok(idx.every(x=>x.executionMode===true));});
test('convex lens bundle converges at physical focal point',()=>{
  const e=read('content/experiments/stage9/lens-focus.json'),r=runtimeFor(e); r.step(1); const s=r.snapshot();
  assert.equal(s.domain,'optics'); assert.ok(s.state.rays.length>=3); assert.ok(s.state.focus); assert.ok(Math.abs(s.state.focus.x-2)<0.08,`focus x=${s.state.focus.x}`); assert.ok(Math.abs(s.state.focus.y)<0.08,`focus y=${s.state.focus.y}`);
  const f=buildExecutionFrame(e.scene,s); assert.equal(f.overlays.rays.length,s.state.rays.length); assert.ok(f.overlays.focus);
});
test('SPST open circuit keeps lamp dark',()=>{
  const e=read('content/experiments/stage9/switch-lamp.json'),r=runtimeFor(e),s=r.step(1); const i=Math.abs(s.state.branchCurrents.lamp??0);assert.ok(i<1e-9,`open current=${i}`); const f=buildExecutionFrame(e.scene,s);assert.ok((f.parts.lamp.intensity??0)<1e-6);
});
test('SPST closed circuit drives lamp at about 0.2 A',()=>{
  const e=read('content/experiments/stage9/switch-lamp.json');e.scene.parts.find(p=>p.instanceId==='switch').properties.closed=true; const r=runtimeFor(e),s=r.step(1);const i=Math.abs(s.state.branchCurrents.lamp);assert.ok(Math.abs(i-.2)<1e-5,`closed current=${i}`);const f=buildExecutionFrame(e.scene,s);assert.ok(f.parts.lamp.intensity>.95);assert.equal(f.parts.switch.closed,true);
});
test('Crocodile pictorial SPST is touch-interactive',()=>{assert.equal(isInteractiveSwitch('circuits.pictorial-spst'),true);assert.equal(executableCapability('circuits.pictorial-spst').kind,'switch');});
test('mechanics execution moves and transfers velocity in collision',()=>{
  const e=read('content/experiments/stage9/ball-collision.json'),r=runtimeFor(e);r.step(220);const s=r.snapshot();const b=s.state.bodies.find(x=>x.id==='ball-b');assert.ok(b.position.x>1.2);assert.ok(b.velocity.x>1.5,`v=${b.velocity.x}`);const f=buildExecutionFrame(e.scene,s);assert.equal(f.parts['ball-b'].active,true);
});
test('wave execution produces nonzero field energy',()=>{
  const e=read('content/experiments/stage9/wave-interference.json'),r=runtimeFor(e);r.step(30);const s=r.snapshot();assert.ok(s.state.energy>0);const f=buildExecutionFrame(e.scene,s);assert.equal(f.overlays.wave.width,41);assert.equal(f.overlays.wave.height,31);assert.ok(f.overlays.wave.values.some(v=>Math.abs(v)>1e-8));
});
test('unsupported parts are explicitly marked instead of faking physics',()=>{const c=executableCapability('circuits.7400');assert.equal(c.supported,false);assert.match(c.labelFa,/در حال توسعه/);});
console.log(`\nStage 9: ${count} tests passed.`);
