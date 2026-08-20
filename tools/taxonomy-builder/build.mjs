import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const palette = read('datasets/parts/palette.json').entries;
const parts = read('datasets/parts/canonical-parts.json');
const experiments = read('content/library/crocodile-605-index.json');
const byPart = new Map(parts.map(p => [p.id, p]));

const branchIcon = name => {
  const n = String(name).toLowerCase();
  if (/electronic|circuit/.test(n)) return 'circuit';
  if (/analog/.test(n)) return 'waveform';
  if (/digital/.test(n)) return 'logic';
  if (/power|suppl/.test(n)) return 'battery';
  if (/switch/.test(n)) return 'switch';
  if (/input/.test(n)) return 'input';
  if (/output|light/.test(n)) return 'output';
  if (/passive/.test(n)) return 'resistor';
  if (/semiconductor/.test(n)) return 'diode';
  if (/integrated/.test(n)) return 'chip';
  if (/meter|measurement/.test(n)) return 'meter';
  if (/motion|force/.test(n)) return 'motion';
  if (/mechanism/.test(n)) return 'gear';
  if (/ground/.test(n)) return 'ground';
  if (/slope/.test(n)) return 'slope';
  if (/ball/.test(n)) return 'ball';
  if (/block/.test(n)) return 'block';
  if (/optic/.test(n)) return 'optics';
  if (/ray/.test(n)) return 'ray';
  if (/source/.test(n)) return 'source';
  if (/lens/.test(n)) return 'lens';
  if (/mirror|reflect/.test(n)) return 'mirror';
  if (/transparent/.test(n)) return 'glass';
  if (/opaque|obstacle/.test(n)) return 'obstacle';
  if (/presentation/.test(n)) return 'presentation';
  if (/wave/.test(n)) return 'waves';
  if (/slit/.test(n)) return 'slit';
  if (/tutorial/.test(n)) return 'book';
  if (/energy/.test(n)) return 'energy';
  return 'folder';
};

const partIcon = part => {
  const s = `${part.id} ${part.name} ${part.source?.legacyClass ?? ''} ${part.rendering?.legacyIconHint ?? ''}`.toLowerCase();
  const rules = [
    [/battery|voltage rail|vslide|power/, 'battery'], [/resistor|thermistor|ldr|potentiometer/, 'resistor'],
    [/capacitor/, 'capacitor'], [/inductor|coil/, 'inductor'], [/transformer/, 'transformer'],
    [/diode|zener|thyristor/, 'diode'], [/transistor|mosfet|fet/, 'transistor'], [/opamp|555|counter|decoder|flip|logic|gate|nand|nor|xor|chip/, 'chip'],
    [/switch|relay|pushmake|pushbreak|spst|spdt|dpdt|dpst/, 'switch'], [/lamp|led|bulb|light/, 'lamp'],
    [/ammeter/, 'ammeter'], [/voltmeter/, 'voltmeter'], [/meter|probe/, 'meter'], [/speaker|sound|buzzer/, 'speaker'],
    [/motor/, 'motor'], [/generator/, 'generator'], [/spring/, 'spring'], [/pulley/, 'pulley'], [/gear/, 'gear'],
    [/ball/, 'ball'], [/block|cube|brick/, 'block'], [/ground|floor/, 'ground'], [/slope|ramp/, 'slope'], [/force|arrow/, 'force'],
    [/ray/, 'ray'], [/lens/, 'lens'], [/mirror/, 'mirror'], [/prism|glass|transparent|water/, 'glass'], [/screen/, 'screen'],
    [/wave.*source|point-source|source/, 'source'], [/slit/, 'slit'], [/reflector/, 'mirror'], [/obstacle/, 'obstacle'],
    [/ruler/, 'ruler'], [/protractor/, 'protractor'], [/graph|trace|axis/, 'graph'], [/text|label/, 'text'], [/image|picture/, 'image'],
  ];
  return rules.find(([re]) => re.test(s))?.[1] ?? branchIcon(part.categories?.[0]?.path ?? part.domain);
};

function node(title, titleFa, pathEn) {
  return { id: `branch:${pathEn}`, title, titleFa, path: pathEn, iconKey: branchIcon(title), count: 0, children: [], entries: [] };
}
const roots = [];
const rootMap = new Map();
for (const entry of palette) {
  const en = entry.categoryPath.split(' > ');
  const fa = entry.categoryPathFa.split(' ← ');
  let list = roots, prefix = [], parentMap = rootMap;
  for (let i=0;i<en.length;i++) {
    prefix.push(en[i]); const key = prefix.join(' > ');
    let n = parentMap.get(key);
    if (!n) {
      n = node(en[i], fa[i] ?? en[i], key); list.push(n); parentMap.set(key, n);
      n._map = new Map();
    }
    n.count += 1;
    if (i === en.length - 1) {
      const part = byPart.get(entry.canonicalPartId);
      n.entries.push({ ...entry, iconKey: partIcon(part ?? entry), domain: part?.domain ?? null, solverStatus: part?.solver?.status ?? null });
    }
    list = n.children; parentMap = n._map;
  }
}
function clean(n) { delete n._map; n.children.forEach(clean); }
roots.forEach(clean);

const experimentLabelsFa = {
  'Circuits':'مدارها', 'Describing Motion':'توصیف حرکت', 'Electrical Energy':'انرژی الکتریکی',
  'Energy and Motion':'انرژی و حرکت', 'Force and Acceleration':'نیرو و شتاب', 'Optics':'اپتیک', 'Tutorials':'آموزش‌ها', 'Waves':'موج‌ها'
};
const categoryOrder = ['Circuits','Describing Motion','Electrical Energy','Energy and Motion','Force and Acceleration','Optics','Tutorials','Waves'];
const expGroups = new Map(categoryOrder.map(x => [x, []]));
for (const item of experiments) (expGroups.get(item.category) ?? expGroups.set(item.category, []).get(item.category)).push(item);
const experimentCategories = [...expGroups.entries()].map(([title, items]) => ({
  id:`experiment:${title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`, title, titleFa:experimentLabelsFa[title] ?? title,
  iconKey:branchIcon(title), count:items.length,
  items:items.sort((a,b)=>String(a.title).localeCompare(String(b.title))).map(item=>({id:item.id,title:item.title,titleFa:item.titleFa,iconKey:branchIcon(title),source:item.source,status:item.status,legacy:item.legacy,domain:item.domain}))
}));

const topics = experimentCategories.map(c => ({ id:`topic:${c.id.split(':')[1]}`, title:c.title, titleFa:c.titleFa, iconKey:c.iconKey, experimentCount:c.count,
  experimentIds:c.items.map(x=>x.id) }));

const taxonomy = {
  schemaVersion:'1.0.0', stage:8, source:'Crocodile Physics 605 clean-room taxonomy', generatedAt:new Date().toISOString(),
  stats:{ canonicalParts:parts.length, paletteEntries:palette.length, partBranches:roots.length, partLeafPaths:new Set(palette.map(x=>x.categoryPath)).size, experimentCategories:experimentCategories.length, legacyExperiments:experiments.length },
  parts:{ roots }, experiments:{ categories:experimentCategories }, topics:{ categories:topics }
};
fs.writeFileSync(path.join(root,'datasets/navigation/crocodile-taxonomy.json'), JSON.stringify(taxonomy,null,2));
console.log(`Taxonomy: ${taxonomy.stats.canonicalParts} parts, ${taxonomy.stats.paletteEntries} placements, ${taxonomy.stats.partLeafPaths} leaf paths, ${taxonomy.stats.legacyExperiments} experiments.`);
