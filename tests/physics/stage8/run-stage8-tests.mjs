import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const taxonomy = read('datasets/navigation/crocodile-taxonomy.json');
const palette = read('datasets/parts/palette.json').entries;
const canonical = read('datasets/parts/canonical-parts.json');
const legacy = read('content/library/crocodile-605-index.json');

let tests = 0;
const test=(name,fn)=>{fn();tests++;console.log(`✓ ${name}`)};
function walk(nodes,out=[]){for(const n of nodes){out.push(n);walk(n.children??[],out);}return out;}

const branches = walk(taxonomy.parts.roots);
const leaves = branches.flatMap(b=>b.entries??[]);

test('taxonomy preserves Crocodile canonical part and palette counts',()=>{
  assert.equal(taxonomy.stats.canonicalParts,203); assert.equal(canonical.length,203);
  assert.equal(taxonomy.stats.paletteEntries,206); assert.equal(palette.length,206);
});
test('taxonomy has exact five Crocodile top-level part branches',()=>{
  assert.deepEqual(taxonomy.parts.roots.map(x=>x.title),['Electronics','Motion & Forces','Optics','Presentation','Waves']);
});
test('taxonomy preserves all 39 leaf category paths',()=>{
  assert.equal(taxonomy.stats.partLeafPaths,39);
  assert.equal(new Set(palette.map(x=>x.categoryPath)).size,39);
});
test('every palette placement is represented exactly once in tree leaves',()=>{
  assert.equal(leaves.length,206);
  assert.deepEqual(new Set(leaves.map(x=>x.id)),new Set(palette.map(x=>x.id)));
});
test('every branch has Persian title, icon, path and count',()=>{
  for(const b of branches){assert.ok(b.titleFa);assert.ok(b.iconKey);assert.ok(b.path);assert.ok(Number.isInteger(b.count)&&b.count>0);}
});
test('every component leaf has its own icon metadata',()=>{
  for(const e of leaves){assert.ok(e.canonicalPartId);assert.ok(e.nameFa);assert.ok(e.iconKey);assert.ok(e.legacyClass);}
});
test('Crocodile experiment categories are preserved exactly',()=>{
  const expected=['Circuits','Describing Motion','Electrical Energy','Energy and Motion','Force and Acceleration','Optics','Tutorials','Waves'];
  assert.deepEqual(taxonomy.experiments.categories.map(x=>x.title),expected);
  assert.equal(taxonomy.experiments.categories.reduce((s,x)=>s+x.count,0),209);
  assert.equal(legacy.length,209);
});
test('topics use the same eight Crocodile categories',()=>{
  assert.deepEqual(taxonomy.topics.categories.map(x=>x.title),taxonomy.experiments.categories.map(x=>x.title));
  for(const topic of taxonomy.topics.categories){assert.ok(topic.titleFa);assert.ok(topic.iconKey);assert.ok(topic.experimentCount>0);}
});
test('Electronics branch retains original nested hierarchy',()=>{
  const electronics=taxonomy.parts.roots[0];
  assert.deepEqual(electronics.children.map(x=>x.title),['Analog','Pictorial','Digital']);
  const analog=electronics.children.find(x=>x.title==='Analog');
  assert.ok(analog.children.find(x=>x.title==='Power Supplies'));
  assert.ok(analog.children.find(x=>x.title==='Passive Components'));
});
test('Motion & Forces retains three-level material branches',()=>{
  const motion=taxonomy.parts.roots.find(x=>x.title==='Motion & Forces').children.find(x=>x.title==='Motion');
  assert.ok(motion.children.find(x=>x.title==='Grounds'));
  assert.ok(motion.children.find(x=>x.title==='Slopes'));
  assert.ok(motion.children.find(x=>x.title==='Balls'));
  assert.ok(motion.children.find(x=>x.title==='Blocks'));
});

console.log(`Stage 8 taxonomy/UI data tests: ${tests} passed.`);
