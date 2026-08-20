import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import {
  createExperimentDefinition, validateExperimentDefinition, ExperimentAuthoringDocument,
  GuidedExperimentSession, evaluateAssessment,
} from '../../../packages/experiment-runtime/src/index.mjs';
import {
  parseCsv, mapLegacyCategory, importLegacyMetadata, importExtractedLegacy, legacyRowToLibraryEntry,
} from '../../../packages/crocodile-importer/src/index.mjs';
import { ExperimentLibrary } from '../../../packages/experiment-library/src/index.mjs';
import {
  summarizeRuntimeEvidence, createGroundedContext, buildCoachRequest, validateCoachResponse,
  validateExperimentDraftResponse, GroundedAIClient, AI_SYSTEM_GUARDRAILS,
} from '../../../packages/ai-coach/src/index.mjs';

const root=process.cwd(); let passed=0;
async function test(name,fn){try{await fn();console.log(`✓ ${name}`);passed++;}catch(error){console.error(`✗ ${name}`);throw error;}}
function blankScene(domain='circuits'){return {schemaVersion:'1.0.0',id:'stage7.scene',title:'s',titleFa:'صحنه',domain,parts:[],connections:[],probes:[],simulation:{dt:.01},metadata:{}};}
function experimentWithStep(){const e=createExperimentDefinition({id:'stage7.e',titleFa:'آزمایش',domain:['circuits'],scene:blankScene()});e.guide.steps=[{id:'s1',instructionFa:'اجرا کنید',checks:[{type:'simulation-time',min:1}],hints:[{textFa:'راهنما'}]}];return e;}
function fakeRuntime(){return {clock:{time:.5},recorder:{get(){return[];}},snapshot(){return {time:.5,domain:'waves',state:{values:Array.from({length:200},(_,i)=>Math.sin(i)),bodies:[]}};}};}

const csvText=fs.readFileSync(path.join(root,'datasets/legacy/crocodile-physics-605/experiments_summary.csv'),'utf8');
const legacyRows=parseCsv(csvText);
const legacyIndex=JSON.parse(fs.readFileSync(path.join(root,'content/library/crocodile-605-index.json'),'utf8'));
const guidedIndex=JSON.parse(fs.readFileSync(path.join(root,'content/experiments/stage6/index.json'),'utf8'));

await test('Crocodile CSV parser recovers all 209 experiments',()=>assert.equal(legacyRows.length,209));
await test('legacy category mapping covers main physics domains',()=>{assert.equal(mapLegacyCategory('Circuits'),'circuits');assert.equal(mapLegacyCategory('Optics'),'optics');assert.equal(mapLegacyCategory('Waves'),'waves');assert.equal(mapLegacyCategory('Force and Acceleration'),'mechanics');});
await test('generated legacy library has 209 unique migration entries',()=>{assert.equal(legacyIndex.length,209);assert.equal(new Set(legacyIndex.map(x=>x.id)).size,209);assert.ok(legacyIndex.every(x=>x.status==='migration-draft'));});
await test('metadata-only Crocodile import never fabricates steps or scene parts',()=>{const e=importLegacyMetadata(legacyRows.find(x=>Number(x.instruction_page_count)>0));assert.equal(validateExperimentDefinition(e).valid,true);assert.equal(e.guide.steps.length,0);assert.equal(e.scene.parts.length,0);assert.equal(e.metadata.migration.status,'metadata-only');assert.match(e.metadata.migration.warnings[0],/not present/i);});
await test('extracted legacy import preserves supplied instruction text exactly',()=>{const e=importExtractedLegacy({category:'Optics',title:'Legacy ray',sourceFile:'Optics/Legacy ray.cxp',instructionPages:[{id:'p1',text:'Move the ray source.'},{id:'p2',textFa:'زاویه را اندازه بگیرید.'}]});assert.equal(e.guide.steps.length,2);assert.equal(e.guide.steps[0].instruction,'Move the ray source.');assert.equal(e.guide.steps[1].instructionFa,'زاویه را اندازه بگیرید.');assert.equal(e.metadata.migration.status,'guide-imported');});
await test('legacy row converts to searchable library entry',()=>{const item=legacyRowToLibraryEntry(legacyRows[0]);assert.equal(item.source,'crocodile-605');assert.equal(item.status,'migration-draft');assert.ok(item.draft.metadata.legacy.file);});
await test('experiment library combines Aria and Crocodile catalogs',()=>{const lib=new ExperimentLibrary([...guidedIndex.map(x=>({...x,source:'aria',status:'ready'})),...legacyIndex]);assert.equal(lib.stats().total,213);assert.equal(lib.stats().bySource.aria,4);assert.equal(lib.stats().bySource['crocodile-605'],209);});
await test('library search and filters are deterministic',()=>{const lib=new ExperimentLibrary(legacyIndex);assert.ok(lib.list({query:'Ohm'}).some(x=>/ohm/i.test(x.title)));assert.ok(lib.list({domain:'optics'}).every(x=>x.domain==='optics'));});
await test('library rejects version regression',()=>{const lib=new ExperimentLibrary([{id:'e',version:2,titleFa:'دو'}]);assert.throws(()=>lib.upsert({id:'e',version:1,titleFa:'یک'}),/older version/);});
await test('visual rule authoring API adds, updates and removes checks',()=>{const doc=new ExperimentAuthoringDocument(experimentWithStep());doc.addCheck('s1',{type:'part-exists',partId:'circuits.resistor'});assert.equal(doc.snapshot().guide.steps[0].checks.length,2);doc.updateCheck('s1',1,{count:2});assert.equal(doc.snapshot().guide.steps[0].checks[1].count,2);doc.removeCheck('s1',1);assert.equal(doc.snapshot().guide.steps[0].checks.length,1);});
await test('visual hint authoring API adds and edits hints',()=>{const doc=new ExperimentAuthoringDocument(experimentWithStep());doc.addHint('s1',{textFa:'راهنمای دوم'});doc.updateHint('s1',1,{textFa:'اصلاح'});assert.equal(doc.snapshot().guide.steps[0].hints[1].textFa,'اصلاح');doc.removeHint('s1',1);assert.equal(doc.snapshot().guide.steps[0].hints.length,1);});
await test('AI draft patch can replace steps while remaining valid',()=>{const doc=new ExperimentAuthoringDocument(experimentWithStep());doc.applyAIDraft({summaryFa:'شرح',learningObjectives:['هدف'],steps:[{id:'ai-1',instructionFa:'مرحله AI',checks:[{type:'runtime-no-error'}],hints:[]}],assessmentRules:[{id:'r1',weight:1,check:{type:'simulation-time',min:0}}]});const e=doc.snapshot();assert.equal(e.guide.steps[0].id,'ai-1');assert.equal(validateExperimentDefinition(e).valid,true);});
await test('nested assessment rule generated by AI is evaluated',()=>{const e=experimentWithStep();e.assessment={passThreshold:1,rules:[{id:'r',weight:1,check:{type:'simulation-time',min:.2}}]};assert.equal(evaluateAssessment(e,{scene:e.scene,runtime:fakeRuntime()}).passed,true);});
await test('runtime evidence compression removes oversized field arrays',()=>{const s=summarizeRuntimeEvidence(fakeRuntime().snapshot());assert.equal(s.state.values.kind,'array-summary');assert.equal(s.state.values.count,200);assert.equal(s.state.values.sample.length,12);});
await test('grounded context carries current step and compressed evidence',()=>{const e=experimentWithStep(),runtime=fakeRuntime(),session=new GuidedExperimentSession(e,{runtimeProvider:()=>runtime});session.start();const c=createGroundedContext(e,session);assert.equal(c.currentStep.id,'s1');assert.equal(c.evidence.runtime.state.values.kind,'array-summary');});
await test('coach request is grounded and question length bounded',()=>{const e=experimentWithStep(),session=new GuidedExperimentSession(e,{runtimeProvider:fakeRuntime});const req=buildCoachRequest({experiment:e,session,questionFa:'الف'.repeat(3000)});assert.equal(req.task,'grounded-physics-coach');assert.equal(req.questionFa.length,2000);assert.ok(req.context.guardrails.length>0);});
await test('coach response validation bounds evidence and confidence',()=>{const r=validateCoachResponse({answerFa:' پاسخ ',nextActionFa:'بعدی',evidence:Array.from({length:20},(_,i)=>`e${i}`),confidence:5});assert.equal(r.answerFa,'پاسخ');assert.equal(r.evidence.length,8);assert.equal(r.confidence,1);});
await test('coach response rejects unstructured output',()=>assert.throws(()=>validateCoachResponse({answer:'x'}),/answerFa/));
await test('AI client posts grounded request and validates result',async()=>{let seen=null;const client=new GroundedAIClient({fetchImpl:async(url,options)=>{seen={url,body:JSON.parse(options.body)};return{ok:true,status:200,json:async()=>({answerFa:'پاسخ علمی',evidence:['simulation-time'],confidence:.8})};}});const e=experimentWithStep(),session=new GuidedExperimentSession(e,{runtimeProvider:fakeRuntime});const r=await client.coach({experiment:e,session,questionFa:'چه کنم؟'});assert.equal(seen.url,'/api/ai/coach');assert.equal(seen.body.task,'grounded-physics-coach');assert.equal(r.confidence,.8);});
await test('AI experiment draft validator accepts supported rules and rejects unknown checks',()=>{const ok=validateExperimentDraftResponse({summaryFa:'شرح',steps:[{id:'s',instructionFa:'کار',checks:[{type:'runtime-no-error'}]}],assessmentRules:[{id:'a',check:{type:'simulation-time',min:1}}]});assert.equal(ok.steps.length,1);assert.throws(()=>validateExperimentDraftResponse({steps:[{id:'s',instructionFa:'کار',checks:[{type:'invented-check'}]}]}),/Unsupported/);});
await test('AI system guardrails explicitly prohibit invented measurements',()=>assert.ok(AI_SYSTEM_GUARDRAILS.some(x=>/invent measurements/i.test(x))));
await test('dev server proxies Gemini server-side without exposing API key', async()=>{
  let upstreamRequest=null;
  const upstream=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;upstreamRequest={url:req.url,key:req.headers['x-goog-api-key'],body:JSON.parse(body)};res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({answerFa:'پاسخ از مدل',nextActionFa:'گام بعد',evidence:['runtime'],confidence:.9})}]}}]}));});
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve)); const upstreamPort=upstream.address().port;
  const appPort=43000+Math.floor(Math.random()*1000); const child=spawn(process.execPath,['tools/dev-server/index.mjs'],{cwd:root,env:{...process.env,PORT:String(appPort),GEMINI_API_KEY:'test-secret',GEMINI_MODEL:'test-model',GEMINI_API_BASE:`http://127.0.0.1:${upstreamPort}/v1beta`},stdio:['ignore','pipe','pipe']});
  try{
    let ready=false;for(let i=0;i<50&&!ready;i++){try{ready=(await fetch(`http://127.0.0.1:${appPort}/api/ai/status`)).ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,50));}assert.equal(ready,true);
    const status=await fetch(`http://127.0.0.1:${appPort}/api/ai/status`).then(r=>r.json());assert.equal(status.enabled,true);assert.equal(status.model,'test-model');assert.equal(JSON.stringify(status).includes('test-secret'),false);
    const response=await fetch(`http://127.0.0.1:${appPort}/api/ai/coach`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:'grounded-physics-coach',context:{evidence:{}}})});assert.equal(response.status,200);const out=await response.json();assert.equal(out.answerFa,'پاسخ از مدل');assert.equal(upstreamRequest.key,'test-secret');assert.match(upstreamRequest.url,/test-model:generateContent/);assert.equal(JSON.stringify(upstreamRequest.body).includes('grounded-physics-coach'),true);
  } finally {child.kill('SIGTERM');upstream.close();}
});

console.log(`Stage 7: ${passed} tests passed.`);
