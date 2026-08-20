import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  EXPERIMENT_SCHEMA_VERSION,
  createExperimentDefinition,
  validateExperimentDefinition,
  ExperimentAuthoringDocument,
  GuidedExperimentSession,
  evaluateCheck,
  evaluateAssessment,
  buildAssistantContext,
  ExperimentCoach,
} from '../../../packages/experiment-runtime/src/index.mjs';
import { SceneRuntime } from '../../../packages/scene-runtime/src/index.mjs';

const root = process.cwd();
const canonicalParts = JSON.parse(fs.readFileSync(path.join(root, 'datasets/parts/canonical-parts.json'), 'utf8'));
const sampleDir = path.join(root, 'content/experiments/stage6');
const sampleFiles = fs.readdirSync(sampleDir).filter(name => name.endsWith('.json') && name !== 'index.json').sort();
let passed = 0;
const test = (name, fn) => {
  try { fn(); console.log(`✓ ${name}`); passed += 1; }
  catch (error) { console.error(`✗ ${name}`); throw error; }
};

function blankScene() {
  return { schemaVersion:'1.0.0', id:'s', title:'s', titleFa:'s', domain:'circuits', simulation:{dt:0.01}, parts:[], connections:[], probes:[], metadata:{} };
}

function fakeRuntime({ time = 0, samples = {}, error = null } = {}) {
  return {
    clock: { time },
    recorder: { get(id) { return structuredClone(samples[id] ?? []); } },
    snapshot() { return { time, state: error ? { error } : {} }; },
  };
}

test('schema version is v2', () => assert.equal(EXPERIMENT_SCHEMA_VERSION, '2.0.0'));
test('createExperimentDefinition creates valid v2 package', () => {
  const e = createExperimentDefinition({ id:'e1', titleFa:'آزمایش', domain:['circuits'], scene:blankScene() });
  assert.equal(validateExperimentDefinition(e).valid, true);
});
test('validation catches duplicate step ids', () => {
  const e = createExperimentDefinition({ id:'e2', titleFa:'آزمایش', domain:['circuits'], scene:blankScene() });
  e.guide.steps = [{id:'x',instructionFa:'الف'},{id:'x',instructionFa:'ب'}];
  assert.equal(validateExperimentDefinition(e).valid, false);
});
test('authoring document supports add/update/undo/redo', () => {
  const e = createExperimentDefinition({ id:'e3', titleFa:'آزمایش', domain:['circuits'], scene:blankScene() });
  const doc = new ExperimentAuthoringDocument(e);
  doc.addStep({ id:'one', instructionFa:'مرحله یک' });
  doc.updateStep('one', { instructionFa:'مرحله اصلاح‌شده' });
  assert.equal(doc.snapshot().guide.steps[0].instructionFa, 'مرحله اصلاح‌شده');
  doc.undo(); assert.equal(doc.snapshot().guide.steps[0].instructionFa, 'مرحله یک');
  doc.redo(); assert.equal(doc.snapshot().guide.steps[0].instructionFa, 'مرحله اصلاح‌شده');
});
test('part-exists and property-range checks use real scene evidence', () => {
  const scene=blankScene(); scene.parts.push({instanceId:'r1',partId:'circuits.resistor',transform:{position:{x:0,y:0}},properties:{resistance:1000}});
  assert.equal(evaluateCheck({type:'part-exists',partId:'circuits.resistor'}, {scene}).passed, true);
  assert.equal(evaluateCheck({type:'property-range',instanceId:'r1',property:'resistance',min:999,max:1001}, {scene}).passed, true);
});
test('connection-exists check validates topology', () => {
  const scene=blankScene(); scene.parts=[{instanceId:'a',partId:'x',transform:{position:{x:0,y:0}},properties:{}},{instanceId:'b',partId:'y',transform:{position:{x:1,y:0}},properties:{}}];
  scene.connections=[{id:'c',kind:'mechanical',from:{instanceId:'a'},to:{instanceId:'b'},properties:{}}];
  assert.equal(evaluateCheck({type:'connection-exists',kind:'mechanical'}, {scene}).passed, true);
});
test('simulation and measurement checks use runtime evidence', () => {
  const runtime=fakeRuntime({time:2,samples:{p:[{time:2,value:4.9}]}});
  assert.equal(evaluateCheck({type:'simulation-time',min:1},{scene:blankScene(),runtime}).passed,true);
  assert.equal(evaluateCheck({type:'measurement-range',measurementId:'p',min:4.8,max:5},{scene:blankScene(),runtime}).passed,true);
  assert.equal(evaluateCheck({type:'measurement-sample-count',measurementId:'p',min:1},{scene:blankScene(),runtime}).passed,true);
});
test('peak measurement check scans recorded series', () => {
  const runtime=fakeRuntime({samples:{p:[{time:0,value:0},{time:1,value:-0.4},{time:2,value:0.1}]}});
  assert.equal(evaluateCheck({type:'measurement-peak-absolute-min',measurementId:'p',min:0.3},{scene:blankScene(),runtime}).passed,true);
});
test('runtime-no-error catches solver errors', () => {
  assert.equal(evaluateCheck({type:'runtime-no-error'},{scene:blankScene(),runtime:fakeRuntime()}).passed,true);
  assert.equal(evaluateCheck({type:'runtime-no-error'},{scene:blankScene(),runtime:fakeRuntime({error:'bad'})}).passed,false);
});
test('guided session blocks advance until checks pass', () => {
  const e=createExperimentDefinition({id:'e4',titleFa:'آزمایش',domain:['circuits'],scene:blankScene()});
  e.guide.steps=[{id:'s1',instructionFa:'اجرا',checks:[{type:'simulation-time',min:1}],hints:[{textFa:'اجرا کنید'}]}];
  let runtime=fakeRuntime({time:0});
  const session=new GuidedExperimentSession(e,{runtimeProvider:()=>runtime}); session.start();
  assert.equal(session.advance().advanced,false);
  runtime=fakeRuntime({time:1}); assert.equal(session.advance().advanced,true);
});
test('guided session returns progressive hints', () => {
  const e=createExperimentDefinition({id:'e5',titleFa:'آزمایش',domain:['circuits'],scene:blankScene()});
  e.guide.steps=[{id:'s1',instructionFa:'کار',checks:[],hints:[{textFa:'راهنمای ۱'},{textFa:'راهنمای ۲'}]}];
  const session=new GuidedExperimentSession(e);
  assert.equal(session.getHint().textFa,'راهنمای ۱'); assert.equal(session.getHint().textFa,'راهنمای ۲');
});
test('weighted assessment computes pass ratio', () => {
  const e=createExperimentDefinition({id:'e6',titleFa:'آزمایش',domain:['circuits'],scene:blankScene()});
  e.assessment={passThreshold:.6,rules:[{id:'a',type:'simulation-time',min:1,weight:2},{id:'b',type:'simulation-time',min:10,weight:1}]};
  const r=evaluateAssessment(e,{scene:blankScene(),runtime:fakeRuntime({time:2})});
  assert.equal(r.passed,true); assert.equal(r.percent,67);
});
test('assistant context is grounded in experiment and runtime evidence', () => {
  const e=createExperimentDefinition({id:'e7',titleFa:'آزمایش',domain:['circuits'],scene:blankScene()});
  e.guide.steps=[{id:'s1',instructionFa:'اجرا',checks:[]}];
  const runtime=fakeRuntime({time:1}); const session=new GuidedExperimentSession(e,{runtimeProvider:()=>runtime});
  const ctx=buildAssistantContext(e,session); assert.equal(ctx.experiment.id,'e7'); assert.equal(ctx.evidence.runtime.time,1); assert.ok(Array.isArray(ctx.guardrails));
});
test('deterministic coach diagnoses incomplete current step', () => {
  const e=createExperimentDefinition({id:'e8',titleFa:'آزمایش',domain:['circuits'],scene:blankScene()});
  e.guide.steps=[{id:'s1',instructionFa:'اجرا',checks:[{type:'simulation-time',min:1}],hints:[{textFa:'زمان را جلو ببرید'}]}];
  const session=new GuidedExperimentSession(e,{runtimeProvider:()=>fakeRuntime({time:0})});
  const d=new ExperimentCoach(e,session).diagnose(); assert.equal(d.status,'needs-action'); assert.equal(d.messageFa,'زمان را جلو ببرید');
});
test('all Stage 6 authored experiments validate', () => {
  assert.equal(sampleFiles.length,4);
  for (const file of sampleFiles) {
    const e=JSON.parse(fs.readFileSync(path.join(sampleDir,file),'utf8'));
    const validation=validateExperimentDefinition(e); assert.equal(validation.valid,true,`${file}: ${validation.errors.join('; ')}`);
  }
});
test('RC guided experiment reaches expected capacitor voltage', () => {
  const e=JSON.parse(fs.readFileSync(path.join(sampleDir,'rc-charge-guided.json'),'utf8'));
  const runtime=new SceneRuntime(e.scene,{partDefinitions:canonicalParts}); runtime.step(60);
  const samples=runtime.recorder.get('capacitor-voltage'); assert.ok(samples.length>=60); assert.ok(samples.at(-1).value>4.8);
  const session=new GuidedExperimentSession(e,{sceneProvider:()=>e.scene,runtimeProvider:()=>runtime}); session.currentStepIndex=3;
  assert.equal(session.evaluateStep().complete,true);
});
test('rotational guided experiment records positive angular velocity', () => {
  const e=JSON.parse(fs.readFileSync(path.join(sampleDir,'rotational-guided.json'),'utf8'));
  const runtime=new SceneRuntime(e.scene,{partDefinitions:canonicalParts}); runtime.step(110);
  assert.ok(runtime.recorder.get('omega').at(-1).value>0.1);
});
test('spherical refraction guided experiment sees entry and exit interactions', () => {
  const e=JSON.parse(fs.readFileSync(path.join(sampleDir,'spherical-refraction-guided.json'),'utf8'));
  const runtime=new SceneRuntime(e.scene,{partDefinitions:canonicalParts}); runtime.step(1);
  const value=runtime.recorder.get('interactions').at(-1).value; assert.ok(value>=2,`interaction count ${value}`);
});
test('heterogeneous wave guided experiment records signal in slow region', () => {
  const e=JSON.parse(fs.readFileSync(path.join(sampleDir,'heterogeneous-wave-guided.json'),'utf8'));
  const runtime=new SceneRuntime(e.scene,{partDefinitions:canonicalParts}); runtime.step(140);
  const samples=runtime.recorder.get('right-probe'); assert.ok(samples.length>=100); assert.ok(Math.max(...samples.map(x=>Math.abs(x.value)))>1e-6);
});

console.log(`Stage 6: ${passed} tests passed.`);
