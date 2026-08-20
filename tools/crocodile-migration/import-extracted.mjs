import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { importExtractedLegacy } from '../../packages/crocodile-importer/src/index.mjs';
import { validateExperimentDefinition } from '../../packages/experiment-runtime/src/index.mjs';

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  console.error('Usage: node tools/crocodile-migration/import-extracted.mjs <extracted.json> <output.json|output-dir>');
  process.exit(2);
}
const input=JSON.parse(await readFile(resolve(inputArg),'utf8'));
const records=Array.isArray(input)?input:[input];
const experiments=records.map(importExtractedLegacy);
for (const experiment of experiments) {
  const result=validateExperimentDefinition(experiment); if(!result.valid) throw new Error(`${experiment.id}: ${result.errors.join(' | ')}`);
}
if(experiments.length===1 && outputArg.endsWith('.json')) {
  const output=resolve(outputArg); await mkdir(dirname(output),{recursive:true}); await writeFile(output,JSON.stringify(experiments[0],null,2)+'\n'); console.log(`Imported 1 extracted experiment -> ${output}`);
} else {
  const dir=resolve(outputArg); await mkdir(dir,{recursive:true}); const index=[];
  for(const experiment of experiments){const name=`${experiment.id.replace(/[^a-zA-Z0-9._-]/g,'-')}.json`;await writeFile(resolve(dir,name),JSON.stringify(experiment,null,2)+'\n');index.push({id:experiment.id,title:experiment.title,titleFa:experiment.titleFa,domain:experiment.domain[0],path:name,status:experiment.metadata.migration.status});}
  await writeFile(resolve(dir,'index.json'),JSON.stringify(index,null,2)+'\n'); console.log(`Imported ${experiments.length} extracted experiments -> ${dir}`);
}
