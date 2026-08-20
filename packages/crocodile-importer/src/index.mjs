import { createExperimentDefinition } from '../../experiment-runtime/src/index.mjs';

const clone = value => structuredClone(value);
export function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  const input = String(text).replace(/^\uFEFF/, '');
  for (let i=0;i<input.length;i++) { const c=input[i]; if (quoted) { if (c==='"' && input[i+1]==='"') { field+='"'; i++; } else if (c==='"') quoted=false; else field+=c; }
    else if (c==='"') quoted=true; else if (c===',') { row.push(field); field=''; } else if (c==='\n') { row.push(field.replace(/\r$/,'')); rows.push(row); row=[]; field=''; } else field+=c; }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift() ?? [];
  return rows.filter(r=>r.some(x=>x!=='')).map(r => Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
export function mapLegacyCategory(category='') {
  const c=String(category).toLowerCase();
  if(c.includes('circuit')||c.includes('electrical')) return 'circuits';
  if(c.includes('optic')) return 'optics';
  if(c.includes('wave')) return 'waves';
  if(c.includes('motion')||c.includes('force')||c.includes('energy')) return 'mechanics';
  return 'mixed';
}
function slug(value='legacy') { return String(value).normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,90) || 'legacy'; }
function blankScene(id, domain) { return { schemaVersion:'1.0.0', id:`scene.${id}`, title:'Legacy migration draft', titleFa:'پیش‌نویس مهاجرت', domain, parts:[], connections:[], probes:[], simulation:{dt:1/120,timeScale:1,gravity:{x:0,y:-9.81}} }; }
export function importLegacyMetadata(row) {
  const domain=mapLegacyCategory(row.category), id=`legacy.crocodile.${slug(row.category)}.${slug(row.title)}`;
  const experiment=createExperimentDefinition({ id, title: row.title || 'Untitled legacy experiment', titleFa: row.title || 'آزمایش قدیمی', domain:[domain], scene:blankScene(id,domain) });
  experiment.summary = row.intro ?? ''; experiment.summaryFa = '';
  experiment.assistant.enabled = true;
  experiment.metadata = { ...experiment.metadata, authoringVersion:'stage7', source:'Crocodile Physics 605', legacy:{ category:row.category, file:row.file, fileSize:Number(row.file_size||0), sceneCount:Number(row.scene_count||0), partCount:Number(row.part_count||0), instructionPageCount:Number(row.instruction_page_count||0), topClasses:row.top_classes||'', intro:row.intro||'' }, migration:{ status:'metadata-only', warnings:['Original CXP scene and instruction page bodies are not present in this snapshot; no content was fabricated.'] } };
  return experiment;
}
export function importExtractedLegacy(extracted) {
  const base=importLegacyMetadata({ category:extracted.category, title:extracted.title, file:extracted.sourceFile, intro:extracted.intro, part_count:extracted.parts?.length??0, instruction_page_count:extracted.instructionPages?.length??0 });
  if (extracted.scene?.schemaVersion==='1.0.0') base.scene=clone(extracted.scene);
  if (Array.isArray(extracted.instructionPages)) base.guide.steps=extracted.instructionPages.filter(p=>p?.text||p?.textFa).map((p,i)=>({ id:p.id??`legacy-step-${i+1}`, title:p.title??'', titleFa:p.titleFa??'', instruction:p.text??'', instructionFa:p.textFa??'', whyFa:'', checks:[], hints:[] }));
  base.metadata.migration.status = extracted.scene ? (base.guide.steps.length?'scene-and-guide-imported':'scene-imported') : (base.guide.steps.length?'guide-imported':'metadata-only');
  return base;
}
export function legacyRowToLibraryEntry(row) {
  const draft=importLegacyMetadata(row); return { id:draft.id, version:1, title:row.title, titleFa:row.title, domain:draft.domain[0], category:row.category, source:'crocodile-605', status:'migration-draft', legacy:clone(draft.metadata.legacy), tags:['legacy','migration'], draft };
}
