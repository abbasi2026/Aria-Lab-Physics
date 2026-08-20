import { SceneDocument, createBlankScene } from '../../../packages/editor-core/src/index.mjs';
import { ComponentCatalog, domainLabelsFa } from '../../../packages/component-library/src/index.mjs';
import { SceneRuntime } from '../../../packages/scene-runtime/src/index.mjs';
import { svgPolyline } from '../../../packages/graph-engine/src/index.mjs';
import { ExperimentAuthoringDocument, GuidedExperimentSession, ExperimentCoach, validateExperimentDefinition } from '../../../packages/experiment-runtime/src/index.mjs';
import { GroundedAIClient } from '../../../packages/ai-coach/src/index.mjs';
import { ExperimentLibrary } from '../../../packages/experiment-library/src/index.mjs';
import { importLegacyMetadata } from '../../../packages/crocodile-importer/src/index.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const fa = value => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 3 }).format(value);
const domainIcons = { mechanics: 'motion', circuits: 'circuit', optics: 'optics', waves: 'waves', presentation: 'presentation' };
let catalog, canonicalParts = [], taxonomy = null, paletteEntries = [], partIconById = new Map(), doc, runtime = null, mode = 'select', pendingPort = null, activeBottomTab = 'measure', raf = 0;
let experimentLibrary = [], legacyLibrary = [], libraryManager = null, activeExperiment = null, experimentAuthor = null, experimentSession = null;
let aiStatus = { enabled: false, provider: 'gemini', model: null }, lastAIAnswer = null;
const aiClient = new GroundedAIClient();
const libraryFilter = { query: '', source: 'all', domain: 'all' };
const browserState = { mode: 'parts', query: '', expanded: new Set(['branch:Electronics','branch:Motion & Forces','branch:Optics','branch:Waves']), selectedPath: null };
const camera = { scale: 60 };
function cameraOrigin() { const r = $('#workspace').getBoundingClientRect(); return { x: r.width / 2, y: r.height * 0.68 }; }
function worldToScreen(position) { const o = cameraOrigin(); return { x: o.x + position.x * camera.scale, y: o.y - position.y * camera.scale }; }
function screenToWorld(position) { const o = cameraOrigin(); return { x: (position.x - o.x) / camera.scale, y: (o.y - position.y) / camera.scale }; }

const ICONS = {
  folder:'<path d="M3 7.5h7l2-2h9v13H3z"/><path d="M3 7.5V5h7l2 2.5"/>',
  circuit:'<path d="M4 5h5v4H4zM15 15h5v4h-5z"/><path d="M9 7h4v10h2M13 12h5V9"/><circle cx="18" cy="7" r="2"/>',
  waveform:'<path d="M3 12h3l2-6 4 12 3-9 2 3h4"/>', logic:'<path d="M4 6h7a6 6 0 0 1 0 12H4z"/><path d="M2 9h2M2 15h2M17 12h4"/>',
  battery:'<path d="M8 5v14M16 8v8M4 12h4M16 12h4"/><path d="M6 7h4M14 10h4"/>',
  switch:'<circle cx="6" cy="15" r="2"/><circle cx="18" cy="15" r="2"/><path d="M8 14l8-6M16 15h2"/>',
  input:'<path d="M4 12h12M12 8l4 4-4 4"/><rect x="17" y="6" width="4" height="12" rx="1"/>', output:'<path d="M20 12H8M12 8l-4 4 4 4"/><rect x="3" y="6" width="4" height="12" rx="1"/>',
  resistor:'<path d="M3 12h3l2-4 3 8 3-8 3 8 2-4h2"/>', capacitor:'<path d="M3 12h7M10 6v12M14 6v12M14 12h7"/>',
  inductor:'<path d="M3 12h3c0-5 4-5 4 0 0-5 4-5 4 0 0-5 4-5 4 0h3"/>', transformer:'<path d="M6 6c-4 0-4 4 0 4-4 0-4 4 0 4-4 0-4 4 0 4M18 6c4 0 4 4 0 4 4 0 4 4 0 4 4 0 4 4 0 4M11 5v14M13 5v14"/>',
  diode:'<path d="M3 12h5l6-5v10l-6-5M14 7v10M14 12h7"/>', transistor:'<circle cx="12" cy="12" r="8"/><path d="M5 12h5M10 7v10M10 9l6-3M10 15l6 3"/>', chip:'<rect x="6" y="5" width="12" height="14" rx="2"/><path d="M3 8h3M3 12h3M3 16h3M18 8h3M18 12h3M18 16h3"/>',
  lamp:'<circle cx="12" cy="10" r="5"/><path d="M9 15v4h6v-4M9 10h6M12 5V2M5 4l2 2M19 4l-2 2"/>', ammeter:'<circle cx="12" cy="12" r="8"/><path d="M8 16l4-9 4 9M10 13h4"/>', voltmeter:'<circle cx="12" cy="12" r="8"/><path d="M8 8l4 9 4-9"/>', meter:'<path d="M4 17a8 8 0 0 1 16 0"/><path d="M12 17l4-7M6 19h12"/>', speaker:'<path d="M4 10h4l5-4v12l-5-4H4zM16 9c2 2 2 4 0 6M18 7c4 3 4 7 0 10"/>',
  motion:'<circle cx="6" cy="17" r="2"/><path d="M6 15l5-8 4 5 5-7M17 5h3v3"/>', gear:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  ground:'<path d="M3 16h18M5 16l3-5h8l3 5"/><path d="M8 11V8h8v3"/>', slope:'<path d="M4 18h16L20 6z"/><circle cx="13" cy="10" r="2"/>', ball:'<circle cx="12" cy="12" r="8"/><path d="M6 8c3 3 9 3 12 0M6 16c3-3 9-3 12 0"/>', block:'<rect x="5" y="6" width="14" height="12" rx="1"/><path d="M9 6v12M15 6v12"/>',
  spring:'<path d="M3 12h3l2-4 3 8 3-8 3 8 2-4h2"/>', pulley:'<circle cx="12" cy="8" r="5"/><path d="M7 8v11M17 8v11M7 19h4M17 19h-4"/>', force:'<path d="M3 18L19 5M14 5h5v5"/>', motor:'<circle cx="12" cy="12" r="8"/><path d="M8 16V8l4 5 4-5v8"/>', generator:'<circle cx="12" cy="12" r="8"/><path d="M8 12c2-5 6-5 8 0s6 5 8 0"/>',
  optics:'<path d="M3 12c5-6 13-6 18 0-5 6-13 6-18 0z"/><circle cx="12" cy="12" r="3"/>', ray:'<path d="M3 17L19 7M14 7h5v5"/><path d="M5 5l2 2M10 3v3"/>', lens:'<path d="M9 3c4 4 4 14 0 18M15 3c-4 4-4 14 0 18"/>', mirror:'<path d="M7 3h10v18H7zM10 5l4 4M10 11l4 4"/>', glass:'<path d="M7 3h10l3 18H4z"/><path d="M8 10h8"/>', screen:'<rect x="5" y="4" width="14" height="12" rx="1"/><path d="M12 16v4M8 20h8"/>',
  waves:'<path d="M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0"/>', source:'<circle cx="7" cy="12" r="2"/><path d="M11 8c4 2 4 6 0 8M14 5c7 4 7 10 0 14"/>', slit:'<path d="M8 3v7M8 14v7M16 3v7M16 14v7"/><path d="M3 12h18"/>', obstacle:'<rect x="9" y="3" width="6" height="18" rx="1"/>',
  presentation:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M7 15l3-3 3 2 4-5"/>', ruler:'<path d="M4 8h16v8H4z"/><path d="M7 8v3M10 8v2M13 8v3M16 8v2"/>', protractor:'<path d="M4 17a8 8 0 0 1 16 0z"/><path d="M12 17v-6M8 17l2-5M16 17l-2-5"/>', graph:'<path d="M4 4v16h16"/><path d="M7 16l4-5 3 2 5-7"/>', text:'<path d="M5 5h14M12 5v14M8 19h8"/>', image:'<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 17l4-4 3 2 3-4 2 6"/>',
  book:'<path d="M4 5c4-1 6 0 8 2v12c-2-2-4-3-8-2zM20 5c-4-1-6 0-8 2v12c2-2 4-3 8-2z"/>', energy:'<path d="M13 2L6 13h6l-1 9 7-12h-6z"/>'
};
function iconSvg(key='folder', cls='') { return `<svg class="nav-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key] ?? ICONS.folder}</svg>`; }

async function boot() {
  const [canonical, palette, nav, experiments, legacy, status] = await Promise.all([
    fetch('/datasets/parts/canonical-parts.json').then(r => r.json()),
    fetch('/datasets/parts/palette.json').then(r => r.json()),
    fetch('/datasets/navigation/crocodile-taxonomy.json').then(r => r.json()),
    fetch('/content/experiments/stage6/index.json').then(r => r.ok ? r.json() : []).catch(() => []),
    fetch('/content/library/crocodile-605-index.json').then(r => r.ok ? r.json() : []).catch(() => []),
    fetch('/api/ai/status').then(r => r.ok ? r.json() : ({ enabled:false, provider:'gemini', model:null })).catch(() => ({ enabled:false, provider:'gemini', model:null })),
  ]);
  canonicalParts = canonical; paletteEntries = palette.entries ?? []; taxonomy = nav; catalog = new ComponentCatalog(canonical);
  partIconById = new Map(); (function collect(nodes){for(const n of nodes){for(const e of n.entries??[])if(!partIconById.has(e.canonicalPartId))partIconById.set(e.canonicalPartId,e.iconKey);collect(n.children??[]);}})(taxonomy.parts.roots); experimentLibrary = experiments; legacyLibrary = legacy; aiStatus = status;
  const guidedEntries = experiments.map(item => ({ ...item, source:'aria', status:'ready', version:1, tags:['guided'] }));
  const localEntries = loadStoredLibrary();
  libraryManager = new ExperimentLibrary([...guidedEntries, ...legacy, ...localEntries]);
  const initial = createBlankScene({ id: 'aria.scene.stage8', title: 'New Scene', titleFa: 'صحنه جدید', domain: 'mixed' });
  doc = new SceneDocument(initial); doc.subscribe(() => { renderScene(); renderInspector(); renderBottom(); syncRuntime(false); });
  bindUI(); renderAIStatus(); renderExperimentSelector(); renderBrowser(); renderScene(); renderInspector(); renderBottom(); syncRuntime(true); animate();
}

function renderAIStatus(){ const el=$('#ai-status'); if(!el)return; el.textContent=aiStatus.enabled?`AI · ${aiStatus.model||'Gemini'}`:'AI غیرفعال'; el.classList.toggle('enabled',Boolean(aiStatus.enabled)); el.title=aiStatus.enabled?'Gemini API سمت سرور فعال است.':'برای فعال‌سازی، GEMINI_API_KEY و GEMINI_MODEL را روی سرور تنظیم کنید.'; }
function loadStoredLibrary(){ try{return JSON.parse(localStorage.getItem('aria-lab.experiment-library.v1')||'[]');}catch{return [];} }
function persistStoredLibrary(){ if(!libraryManager)return; const items=libraryManager.list({source:'local',limit:1000}); localStorage.setItem('aria-lab.experiment-library.v1',JSON.stringify(items)); }

function bindUI() {
  $('#part-search').addEventListener('input', e => { browserState.query=e.target.value; renderBrowser(); });
  $$('.browser-mode').forEach(btn => btn.onclick = () => { browserState.mode=btn.dataset.browser; browserState.query=''; $('#part-search').value=''; renderBrowser(); });
  $('#toggle-library')?.addEventListener('click',()=>document.body.classList.toggle('library-collapsed'));
  $('#toggle-inspector')?.addEventListener('click',()=>document.body.classList.toggle('inspector-collapsed'));
  $('#mobile-bottom')?.addEventListener('click',()=>document.body.classList.toggle('bottom-collapsed')); $('#bottom-collapse')?.addEventListener('click',()=>document.body.classList.toggle('bottom-collapsed'));
  $('#mobile-library')?.addEventListener('click',()=>document.body.classList.toggle('mobile-library-open'));
  $('#mobile-inspector')?.addEventListener('click',()=>document.body.classList.toggle('mobile-inspector-open'));
  $('#close-library')?.addEventListener('click',()=>document.body.classList.remove('mobile-library-open'));
  $('#close-inspector')?.addEventListener('click',()=>document.body.classList.remove('mobile-inspector-open'));
  $('#workspace').addEventListener('dragover', e => e.preventDefault());
  $('#workspace').addEventListener('drop', onPaletteDrop);
  $('#workspace').addEventListener('click', e => { if (e.target === $('#workspace') || e.target.classList.contains('workspace-grid')) doc.clearSelection(); });
  $('#workspace').addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); camera.scale = Math.max(25, Math.min(140, camera.scale * (e.deltaY < 0 ? 1.1 : 0.9))); $('#zoom-label').textContent = `${Math.round(camera.scale / 60 * 100)}٪`; renderScene(); }, { passive: false });
  window.addEventListener('resize', () => renderScene());
  $('#undo').onclick = () => doc.undo(); $('#redo').onclick = () => doc.redo();
  $('#new-scene').onclick = () => { if (confirm('صحنه فعلی پاک شود؟')) doc.replaceScene(createBlankScene({ id: `aria.scene.${Date.now()}`, titleFa: 'صحنه جدید', domain: 'mixed' })); };
  $('#scene-title').addEventListener('change', e => { const scene = doc.snapshot(); scene.titleFa = e.target.value; doc.replaceScene(scene, { clearHistory: false }); });
  $('#select-mode').onclick = () => setMode('select'); $('#wire-mode').onclick = () => setMode('wire');
  $('#delete-selected').onclick = removeSelected;
  $('#run-toggle').onclick = () => { runtime?.toggle(); updateRunUI(); };
  $('#step').onclick = () => { runtime?.step(1); renderRuntimeOverlay(); renderBottom(); };
  $('#reset').onclick = () => { syncRuntime(true); renderScene(); renderBottom(); };
  $('#export-scene').onclick = exportScene; $('#import-scene').onclick = () => $('#import-file').click(); $('#import-file').onchange = importScene;
  $('#experiment-select').onchange = e => { if (e.target.value) loadExperiment(e.target.value); };
  $$('.bottom-tab').forEach(btn => btn.onclick = () => { activeBottomTab = btn.dataset.tab; $$('.bottom-tab').forEach(b => b.classList.toggle('active', b === btn)); renderBottom(); });
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName; if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doc.redo() : doc.undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); doc.redo(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') removeSelected();
    else if (e.code === 'Space') { e.preventDefault(); runtime?.toggle(); updateRunUI(); }
    else if (e.key.toLowerCase()==='b') document.body.classList.toggle('library-collapsed');
    else if (e.key.toLowerCase()==='i') document.body.classList.toggle('inspector-collapsed');
  });
}

function browserPlaceholder(){return browserState.mode==='parts'?'جست‌وجوی قطعه یا شاخه…':browserState.mode==='experiments'?'جست‌وجوی آزمایش…':'جست‌وجوی مبحث…';}
function renderBrowser(){
  if(!taxonomy)return;
  $$('.browser-mode').forEach(btn=>btn.classList.toggle('active',btn.dataset.browser===browserState.mode));
  $('#part-search').placeholder=browserPlaceholder();
  const count = browserState.mode==='parts' ? `${fa(taxonomy.stats.canonicalParts)} قطعه · ${fa(taxonomy.stats.partLeafPaths)} زیرشاخه` : browserState.mode==='experiments' ? `${fa(taxonomy.stats.legacyExperiments + experimentLibrary.length)} آزمایش` : `${fa(taxonomy.stats.experimentCategories)} مبحث اصلی`;
  $('#catalog-count').textContent=count;
  $('#browser-breadcrumb').textContent=browserState.mode==='parts'?'Crocodile Parts Library':browserState.mode==='experiments'?'Crocodile Experiments':'Crocodile Physics Topics';
  if(browserState.mode==='parts') renderPartTree(); else if(browserState.mode==='experiments') renderExperimentTree(); else renderTopicTree();
}
function normalized(value){return String(value??'').toLocaleLowerCase('fa');}
function filterPartNode(node,q){
  if(!q)return node;
  const own=normalized(`${node.title} ${node.titleFa} ${node.path}`).includes(q);
  if(own)return node;
  const children=node.children.map(x=>filterPartNode(x,q)).filter(Boolean);
  const entries=node.entries.filter(e=>normalized(`${e.name} ${e.nameFa} ${e.canonicalPartId} ${e.legacyClass}`).includes(q));
  return children.length||entries.length?{...node,children,entries}:null;
}
function renderPartNode(node,depth=0){
  const q=normalized(browserState.query.trim()), open=q||browserState.expanded.has(node.id);
  const childrenHtml=open?node.children.map(x=>renderPartNode(x,depth+1)).join(''):'';
  const entriesHtml=open?node.entries.map(entry=>`<button class="tree-leaf part-leaf" draggable="true" data-part-id="${escapeAttr(entry.canonicalPartId)}" title="${escapeAttr(entry.name)} · ${escapeAttr(entry.legacyClass)}"><span class="leaf-icon">${iconSvg(entry.iconKey)}</span><span class="leaf-copy"><strong>${escapeHtml(entry.nameFa||entry.name)}</strong><small>${escapeHtml(entry.name)}</small></span><span class="leaf-add" aria-hidden="true">＋</span></button>`).join(''):'';
  return `<div class="tree-node depth-${depth}"><button class="tree-branch ${open?'open':''}" data-branch-id="${escapeAttr(node.id)}" data-path="${escapeAttr(node.path)}"><span class="branch-chevron">‹</span><span class="branch-icon">${iconSvg(node.iconKey)}</span><span class="branch-copy"><strong>${escapeHtml(node.titleFa)}</strong><small>${escapeHtml(node.title)}</small></span><span class="branch-count">${fa(node.count)}</span></button>${open?`<div class="tree-children">${childrenHtml}${entriesHtml}</div>`:''}</div>`;
}
function renderPartTree(){
  const q=normalized(browserState.query.trim()); const nodes=taxonomy.parts.roots.map(n=>filterPartNode(n,q)).filter(Boolean);
  $('#part-list').innerHTML=`<div class="taxonomy-note"><span>${iconSvg('folder')}</span><div><strong>ساختار اصلی Crocodile 605</strong><small>شاخه‌ها و زیرشاخه‌ها از دیتاست مرجع استخراج شده‌اند.</small></div></div>${nodes.map(n=>renderPartNode(n)).join('')||'<div class="browser-empty">قطعه‌ای پیدا نشد.</div>'}`;
  $$('.tree-branch').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.branchId;browserState.selectedPath=btn.dataset.path;if(browserState.expanded.has(id))browserState.expanded.delete(id);else browserState.expanded.add(id);renderBrowser();});
  $$('.part-leaf').forEach(card=>{card.ondragstart=e=>{e.dataTransfer.setData('application/x-aria-part',card.dataset.partId);e.dataTransfer.effectAllowed='copy';};card.ondblclick=()=>addPartAtCenter(card.dataset.partId);card.onclick=e=>{if(e.detail===1)toast('برای افزودن سریع دوبار کلیک کنید یا قطعه را بکشید.');};});
}
function guidedCategory(item){ return ({circuits:'Circuits',mechanics:'Force and Acceleration',optics:'Optics',waves:'Waves'})[item.domain] ?? 'Tutorials'; }
function renderExperimentTree(){
  const q=normalized(browserState.query.trim());
  const guidedBy=new Map(); for(const x of experimentLibrary){const c=guidedCategory(x);if(!guidedBy.has(c))guidedBy.set(c,[]);guidedBy.get(c).push(x);}
  const html=taxonomy.experiments.categories.map(cat=>{
    const legacy=cat.items.filter(x=>!q||normalized(`${x.title} ${x.titleFa}`).includes(q)); const guided=(guidedBy.get(cat.title)??[]).filter(x=>!q||normalized(`${x.titleFa} ${x.id}`).includes(q));
    if(q&&!legacy.length&&!guided.length&&!normalized(`${cat.title} ${cat.titleFa}`).includes(q))return '';
    const id=`expbranch:${cat.title}`,open=q||browserState.expanded.has(id);
    return `<div class="tree-node"><button class="tree-branch ${open?'open':''}" data-exp-branch="${escapeAttr(id)}"><span class="branch-chevron">‹</span><span class="branch-icon">${iconSvg(cat.iconKey)}</span><span class="branch-copy"><strong>${escapeHtml(cat.titleFa)}</strong><small>${escapeHtml(cat.title)}</small></span><span class="branch-count">${fa(cat.count+guided.length)}</span></button>${open?`<div class="tree-children">${guided.map(x=>`<button class="tree-leaf experiment-leaf ready" data-path="${escapeAttr(x.path)}"><span class="leaf-icon">${iconSvg(cat.iconKey)}</span><span class="leaf-copy"><strong>${escapeHtml(x.titleFa)}</strong><small>آزمایش راهنمای آریا</small></span><span class="status-dot ready"></span></button>`).join('')}${legacy.map(x=>`<button class="tree-leaf experiment-leaf legacy" data-id="${escapeAttr(x.id)}"><span class="leaf-icon">${iconSvg(cat.iconKey)}</span><span class="leaf-copy"><strong>${escapeHtml(x.titleFa||x.title)}</strong><small>${escapeHtml(x.title)}</small></span><span class="status-dot migration" title="Migration Draft"></span></button>`).join('')}</div>`:''}</div>`;
  }).join('');
  $('#part-list').innerHTML=`<div class="taxonomy-note"><span>${iconSvg('book')}</span><div><strong>آزمایش‌های Crocodile 605</strong><small>۸ شاخه اصلی · آزمایش‌های آریا در همان شاخه موضوعی نمایش داده می‌شوند.</small></div></div>${html||'<div class="browser-empty">آزمایشی پیدا نشد.</div>'}`;
  $$('[data-exp-branch]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.expBranch;browserState.expanded.has(id)?browserState.expanded.delete(id):browserState.expanded.add(id);renderBrowser();});
  $$('.experiment-leaf.ready').forEach(btn=>btn.onclick=()=>loadExperiment(btn.dataset.path));
  $$('.experiment-leaf.legacy').forEach(btn=>btn.onclick=()=>openLibraryEntry(btn.dataset.id));
}
const TOPIC_DESCRIPTIONS={
  'Circuits':'مدارهای الکتریکی و الکترونیکی، منابع، قطعات و اندازه‌گیری', 'Describing Motion':'توصیف موقعیت، سرعت و نمودارهای حرکت',
  'Electrical Energy':'انرژی، توان و انتقال انرژی الکتریکی', 'Energy and Motion':'کار، انرژی جنبشی و پتانسیل و حرکت',
  'Force and Acceleration':'نیرو، شتاب، جرم و قوانین حرکت', 'Optics':'پرتو، بازتاب، شکست، عدسی و تشکیل تصویر',
  'Tutorials':'آموزش کار با محیط آزمایشگاه و ابزارها', 'Waves':'موج‌های یک‌بعدی و دوبعدی، تداخل و پراش'
};
function renderTopicTree(){
  const q=normalized(browserState.query.trim());
  const cats=taxonomy.topics.categories.filter(c=>!q||normalized(`${c.title} ${c.titleFa} ${TOPIC_DESCRIPTIONS[c.title]}`).includes(q));
  $('#part-list').innerHTML=`<div class="topic-grid">${cats.map(cat=>`<article class="topic-card" data-topic="${escapeAttr(cat.title)}"><div class="topic-icon">${iconSvg(cat.iconKey)}</div><div class="topic-copy"><strong>${escapeHtml(cat.titleFa)}</strong><span>${escapeHtml(cat.title)}</span><p>${escapeHtml(TOPIC_DESCRIPTIONS[cat.title]??'')}</p></div><footer><span>${fa(cat.experimentCount)} آزمایش مرجع</span><button>مشاهده آزمایش‌ها</button></footer></article>`).join('')||'<div class="browser-empty">مبحثی پیدا نشد.</div>'}</div>`;
  $$('.topic-card').forEach(card=>card.onclick=()=>{browserState.mode='experiments';browserState.query='';$('#part-search').value='';const id=`expbranch:${card.dataset.topic}`;browserState.expanded.add(id);renderBrowser();requestAnimationFrame(()=>document.querySelector(`[data-exp-branch="${CSS.escape(id)}"]`)?.scrollIntoView({block:'center'}));});
}
function onPaletteDrop(e) {
  e.preventDefault(); const partId = e.dataTransfer.getData('application/x-aria-part'); if (!partId) return;
  const rect = $('#workspace').getBoundingClientRect(); addPart(partId, screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top }));
}
function addPartAtCenter(partId) { addPart(partId, { x: (Math.random()-.5)*2, y: 1 + (Math.random()-.5)*1.5 }); }
function addPart(partId, position) {
  const properties = catalog.defaultProperties(partId); const before = doc.snapshot(); doc.addPart({ partId, position, properties });
  const def = catalog.get(partId); if (def) { const after = doc.snapshot(); const domains = new Set(after.parts.map(p => catalog.get(p.partId)?.domain).filter(Boolean)); const nextDomain = domains.size === 1 ? [...domains][0] : 'mixed'; if (after.domain !== nextDomain) { after.domain = nextDomain; doc.replaceScene(after, { clearHistory: false }); } }
  toast('قطعه به صحنه اضافه شد');
}

function renderScene() {
  const scene = doc.snapshot(); const layer = $('#part-layer'); layer.innerHTML = '';
  $('#empty-state').style.display = scene.parts.length ? 'none' : 'flex'; $('#part-count').textContent = `${fa(scene.parts.length)} قطعه`; $('#connection-count').textContent = `${fa(scene.connections.length)} اتصال`;
  $('#scene-title').value = scene.titleFa || scene.title || ''; $('#scene-domain-badge').textContent = domainLabelsFa[scene.domain] ?? scene.domain;
  for (const part of scene.parts) layer.appendChild(createPartElement(part));
  renderConnections(); renderRuntimeOverlay();
}

function createPartElement(part) {
  const definition = catalog.get(part.partId); const screen = worldToScreen(part.transform.position); const el = document.createElement('div'); el.className = `scene-part ${doc.selection.type === 'part' && doc.selection.id === part.instanceId ? 'selected' : ''}`; el.dataset.instanceId = part.instanceId; el.style.left = `${screen.x}px`; el.style.top = `${screen.y}px`; el.style.rotate = `${part.transform.rotation ?? 0}deg`; 
  el.innerHTML = `<div class="scene-part-icon">${iconSvg(partIconById.get(part.partId) ?? domainIcons[definition?.domain] ?? 'folder')}</div><div class="scene-part-name">${escapeHtml(definition?.nameFa ?? part.partId)}</div>`;
  el.onclick = e => { e.stopPropagation(); if (mode === 'select') doc.selectPart(part.instanceId); };
  bindPartDrag(el, part);
  const ports = definition ? catalog.displayPorts(definition.id) : []; ports.forEach((port, i) => { const dot = document.createElement('span'); dot.className = 'port'; dot.dataset.instanceId = part.instanceId; dot.dataset.portId = port.id; dot.dataset.side = i % 2 ? 'right' : 'left'; dot.style.top = `${20 + (i % Math.max(1,Math.ceil(ports.length/2))) * 18}px`; dot.title = port.id; dot.onclick = e => { e.stopPropagation(); onPortClick(dot, definition, port); }; el.appendChild(dot); });
  return el;
}

function bindPartDrag(el, part) {
  let start = null, originScreen = null;
  el.addEventListener('pointerdown', e => { if (mode !== 'select' || e.target.classList.contains('port')) return; e.preventDefault(); el.setPointerCapture(e.pointerId); start = { x:e.clientX,y:e.clientY }; originScreen = worldToScreen(part.transform.position); doc.selectPart(part.instanceId); });
  el.addEventListener('pointermove', e => { if (!start) return; const screen = { x: originScreen.x + e.clientX-start.x, y: originScreen.y + e.clientY-start.y }; el.style.left = `${screen.x}px`; el.style.top = `${screen.y}px`; renderConnectionsLive(part.instanceId, screen); });
  el.addEventListener('pointerup', e => { if (!start) return; const screen = { x: originScreen.x + e.clientX-start.x, y: originScreen.y + e.clientY-start.y }; start = null; doc.updateTransform(part.instanceId, { position: screenToWorld(screen) }); });
}

function onPortClick(dot, definition, port) {
  if (mode !== 'wire') { doc.selectPart(dot.dataset.instanceId); return; }
  const endpoint = { instanceId: dot.dataset.instanceId, portId: dot.dataset.portId };
  if (!pendingPort) { pendingPort = { endpoint, dot, kind: portKindToConnection(port.kind) }; dot.classList.add('pending'); toast('درگاه دوم اتصال را انتخاب کنید'); return; }
  if (pendingPort.endpoint.instanceId === endpoint.instanceId && pendingPort.endpoint.portId === endpoint.portId) { clearPendingPort(); return; }
  const kind = pendingPort.kind === portKindToConnection(port.kind) ? pendingPort.kind : 'binding'; doc.addConnection({ kind, from: pendingPort.endpoint, to: endpoint }); clearPendingPort(); toast('اتصال ایجاد شد');
}
function clearPendingPort() { pendingPort?.dot?.classList.remove('pending'); pendingPort = null; }
function portKindToConnection(kind='') { if (kind.startsWith('electrical')) return 'electrical'; if (kind.startsWith('mechanical')) return 'mechanical'; if (kind.startsWith('optical')) return 'optical'; if (kind.startsWith('wave')) return 'wave'; return 'binding'; }
function setMode(next) { mode = next; clearPendingPort(); $('#select-mode').classList.toggle('active', mode==='select'); $('#wire-mode').classList.toggle('active', mode==='wire'); }

function endpointPosition(endpoint) { const partEl = document.querySelector(`.scene-part[data-instance-id="${CSS.escape(endpoint.instanceId)}"]`); if (!partEl) return null; const portEl = partEl.querySelector(`.port[data-port-id="${CSS.escape(endpoint.portId ?? '')}"]`); const w = $('#workspace').getBoundingClientRect(); const r = (portEl ?? partEl).getBoundingClientRect(); return { x: r.left + r.width/2 - w.left, y:r.top+r.height/2-w.top }; }
function renderConnections() { const svg = $('#connection-layer'); const scene=doc.snapshot(); svg.innerHTML = scene.connections.map(c => { const a=endpointPosition(c.from),b=endpointPosition(c.to); if(!a||!b)return ''; const dx=Math.max(40,Math.abs(b.x-a.x)*.45); return `<path class="connection-line ${doc.selection.type==='connection'&&doc.selection.id===c.id?'selected':''}" data-id="${c.id}" d="M ${a.x} ${a.y} C ${a.x+dx} ${a.y}, ${b.x-dx} ${b.y}, ${b.x} ${b.y}"/>`; }).join(''); }
function renderConnectionsLive(instanceId, screen) { const el=document.querySelector(`.scene-part[data-instance-id="${CSS.escape(instanceId)}"]`); if(el){el.style.left=`${screen.x}px`;el.style.top=`${screen.y}px`;} renderConnections(); }

function renderInspector() {
  const root=$('#inspector');
  if(doc.selection.type!=='part'){
    const scene=doc.snapshot(), sim=scene.simulation??{}, gravity=sim.gravity??{x:0,y:-9.81}; root.className=''; $('#selection-subtitle').textContent='تنظیمات صحنه';
    root.innerHTML=`<section class="inspector-section"><div class="part-summary scene-summary"><div class="part-icon">${iconSvg(domainIcons[scene.domain]??'presentation')}</div><div><strong>${escapeHtml(scene.titleFa||scene.title||'صحنه جدید')}</strong><span>${escapeHtml(scene.id)} · ${escapeHtml(domainLabelsFa[scene.domain]??scene.domain)}</span></div></div></section><section class="inspector-section scene-stats"><h3>خلاصه صحنه</h3><div class="scene-stat-grid"><div><strong>${fa(scene.parts.length)}</strong><span>قطعه</span></div><div><strong>${fa(scene.connections.length)}</strong><span>اتصال</span></div><div><strong>${fa(scene.probes?.length??0)}</strong><span>Probe</span></div></div></section><section class="inspector-section"><h3>Simulation</h3>${numberField('گام زمانی','scene-dt',sim.dt??1/120,'s')}${numberField('سرعت زمان','scene-timescale',sim.timeScale??1,'×')}${numberField('گرانش X','scene-gravity-x',gravity.x??0,'m/s²')}${numberField('گرانش Y','scene-gravity-y',gravity.y??-9.81,'m/s²')}</section><section class="inspector-section inspector-tip"><h3>راهنمای سریع</h3><p>از کتابخانه Crocodile قطعه را بکشید، دوبار کلیک کنید یا برای اتصال پورت‌ها حالت «اتصال» را فعال کنید.</p></section>`;
    const updateSim=patch=>{const next=doc.snapshot();next.simulation={...(next.simulation??{}),...patch};doc.replaceScene(next,{clearHistory:false});};
    $('#scene-dt').onchange=e=>updateSim({dt:Math.max(1e-6,Number(e.target.value)||1/120)});
    $('#scene-timescale').onchange=e=>updateSim({timeScale:Math.max(0,Number(e.target.value)||1)});
    $('#scene-gravity-x').onchange=e=>updateSim({gravity:{...(doc.snapshot().simulation?.gravity??gravity),x:Number(e.target.value)||0}});
    $('#scene-gravity-y').onchange=e=>updateSim({gravity:{...(doc.snapshot().simulation?.gravity??gravity),y:Number(e.target.value)||0}});
    return;
  }
  const scene=doc.snapshot(), part=scene.parts.find(p=>p.instanceId===doc.selection.id), def=catalog.get(part?.partId); if(!part)return;
  $('#selection-subtitle').textContent=part.instanceId; root.className='';
  const editable=catalog.propertyDescriptors(part.partId, part.properties).slice(0,80);
  root.innerHTML=`<section class="inspector-section"><div class="part-summary"><div class="part-icon">${iconSvg(partIconById.get(part.partId) ?? domainIcons[def?.domain] ?? 'folder')}</div><div><strong>${escapeHtml(def?.nameFa??part.partId)}</strong><span>${escapeHtml(part.partId)}</span></div></div></section><section class="inspector-section"><h3>Transform</h3>${numberField('X','transform-x',part.transform.position.x,'m')}${numberField('Y','transform-y',part.transform.position.y,'m')}${numberField('چرخش','transform-rotation',part.transform.rotation??0,'°')}</section><section class="inspector-section"><h3>Properties · ${fa(editable.length)}</h3>${editable.length?editable.map(p=>propertyField(p,part.properties[p.key])).join(''):'<div class="inspector-empty">برای این قطعه Property قابل ویرایش ثبت نشده است.</div>'}</section>`;
  $('#transform-x').onchange=e=>doc.updateTransform(part.instanceId,{position:{x:Number(e.target.value)}}); $('#transform-y').onchange=e=>doc.updateTransform(part.instanceId,{position:{y:Number(e.target.value)}}); $('#transform-rotation').onchange=e=>doc.updateTransform(part.instanceId,{rotation:Number(e.target.value)});
  editable.forEach(prop=>{const input=document.querySelector(`[data-prop-key="${CSS.escape(prop.key)}"]`);if(!input)return;input.onchange=e=>{let value;if(prop.kind==='boolean')value=e.target.checked;else if(['number','integer'].includes(prop.kind))value=Number(e.target.value);else value=e.target.value;doc.updateProperties(part.instanceId,{[prop.key]:value});};});
}
function numberField(label,id,value,unit=''){return `<div class="property-row"><div class="property-label"><strong>${label}</strong><span>${unit}</span></div><input class="property-input" id="${id}" type="number" step="any" value="${Number(value)||0}" /></div>`;}
function propertyField(prop,value){const val=value??prop.default??'';const meta=[prop.quantity,prop.defaultUnit].filter(Boolean).join(' · ');if(prop.kind==='boolean')return `<div class="property-row"><div class="property-label"><strong>${escapeHtml(prop.label)}</strong><span>${escapeHtml(meta)}</span></div><input class="property-input" data-prop-key="${escapeAttr(prop.key)}" type="checkbox" ${val?'checked':''}/></div>`;return `<div class="property-row"><div class="property-label"><strong title="${escapeAttr(prop.key)}">${escapeHtml(prop.label)}</strong><span>${escapeHtml(meta)}</span></div><input class="property-input" data-prop-key="${escapeAttr(prop.key)}" type="${['number','integer'].includes(prop.kind)?'number':'text'}" ${['number','integer'].includes(prop.kind)?'step="any"':''} value="${escapeAttr(val)}" /></div>`;}

function syncRuntime(force=false){if(!force&&runtime?.status==='running')return;runtime=new SceneRuntime(doc.snapshot(), { partDefinitions: canonicalParts });updateRunUI();}
function animate(){cancelAnimationFrame(raf);const loop=()=>{if(runtime?.status==='running'){runtime.step(1);renderRuntimeOverlay();renderBottom(false);}updateRunUI();raf=requestAnimationFrame(loop);};raf=requestAnimationFrame(loop);}
function updateRunUI(){const running=runtime?.status==='running';$('#run-icon').textContent=running?'Ⅱ':'▶';$('#run-label').textContent=running?'توقف':'اجرا';$('#runtime-time').textContent=`t = ${(runtime?.clock.time??0).toFixed(3)} s`;}
function renderRuntimeOverlay(){const snap=runtime?.snapshot();if(!snap)return;$('#runtime-time').textContent=`t = ${snap.time.toFixed(3)} s`;if(snap.domain==='mechanics'){for(const b of snap.state.bodies??[]){const el=document.querySelector(`.scene-part[data-instance-id="${CSS.escape(b.id)}"]`);if(el){const screen=worldToScreen(b.position);el.style.left=`${screen.x}px`;el.style.top=`${screen.y}px`;if(Number.isFinite(b.angle))el.style.rotate=`${b.angle*180/Math.PI}deg`;el.classList.toggle('running',runtime.status==='running');}}renderConnections();}}

function renderBottom(){
  const root=$('#bottom-content');
  if(activeBottomTab==='scene-json'){root.innerHTML=`<pre class="json-view">${escapeHtml(doc.toJSON(2))}</pre>`;return;}
  if(activeBottomTab==='guide'){renderExperimentGuide(root);return;}
  if(activeBottomTab==='author'){renderExperimentAuthoring(root);return;}
  if(activeBottomTab==='library'){renderExperimentLibrary(root);return;}
  if(activeBottomTab==='graph'){const probe=runtime?.recorder.list()[0];const points=probe?runtime.recorder.get(probe):[];const poly=svgPolyline(points,900,120,10);root.innerHTML=`<svg class="graph-svg" viewBox="0 0 900 120" preserveAspectRatio="none"><polyline class="graph-line" points="${poly}"/></svg><div style="font-size:10px;color:#7892a8;margin-top:5px">${probe?escapeHtml(probe):'برای نمایش نمودار، Probe به صحنه اضافه کنید.'}</div>`;return;}
  const snap=runtime?.snapshot();const cards=[];cards.push(['زمان',`${(snap?.time??0).toFixed(3)} s`],['دامنه',domainLabelsFa[snap?.domain]??snap?.domain??'—'],['وضعیت',runtime?.status==='running'?'در حال اجرا':'متوقف']);if(snap?.state?.error)cards.push(['خطای Solver',snap.state.error]);if(snap?.domain==='circuits'){for(const [node,v] of Object.entries(snap.state.nodeVoltages??{}).slice(0,6))cards.push([`V(${node})`,`${Number(v).toPrecision(4)} V`]);}if(snap?.domain==='optics')cards.push(['تعامل‌های پرتو',String(Math.max(0,(snap.state.path?.length??1)-1))]);root.innerHTML=`<div class="measure-grid">${cards.map(([a,b])=>`<div class="measure-card"><span>${escapeHtml(a)}</span><strong>${escapeHtml(b)}</strong></div>`).join('')}</div>`;
}

function renderExperimentSelector(){
  const select=$('#experiment-select'); if(!select)return;
  select.innerHTML=`<option value="">آزمایش‌های راهنما · ${fa(experimentLibrary.length)}</option>`+experimentLibrary.map(item=>`<option value="${escapeAttr(item.path)}">${escapeHtml(item.titleFa)} · ${escapeHtml(domainLabelsFa[item.domain]??item.domain)}</option>`).join('');
}

async function loadExperiment(path){
  try{
    const experiment=await fetch(path).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();});
    activateExperiment(experiment, 'guide'); toast(`آزمایش «${experiment.titleFa||experiment.title}» بارگذاری شد`);
  }catch(error){toast(`خطای آزمایش: ${error.message}`);console.error(error);}
}
function activateExperiment(experiment, tab='guide'){
  const validation=validateExperimentDefinition(experiment); if(!validation.valid)throw new Error(validation.errors.join(' | '));
  activeExperiment=experiment; experimentAuthor=new ExperimentAuthoringDocument(experiment); lastAIAnswer=null;
  doc.replaceScene(experiment.scene); syncRuntime(true);
  experimentSession=new GuidedExperimentSession(activeExperiment,{sceneProvider:()=>doc.snapshot(),runtimeProvider:()=>runtime}); experimentSession.start();
  activeBottomTab=tab; $$('.bottom-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab)); renderBottom();
}

function renderExperimentGuide(root){
  if(!activeExperiment||!experimentSession){root.innerHTML='<div class="experiment-empty">از منوی «آزمایش‌های راهنما» یا کتابخانه، یک آزمایش را انتخاب کنید.</div>';return;}
  const step=experimentSession.currentStep(), evaluation=experimentSession.evaluateStep(), progress=experimentSession.progress();
  const checks=(evaluation.results??[]).map(result=>`<div class="guide-check ${result.passed?'pass':'pending'}"><span>${result.passed?'✓':'○'}</span><div><strong>${escapeHtml(result.messageFa)}</strong><small>${escapeHtml(result.type)}${result.actual!==null&&result.actual!==undefined?` · ${escapeHtml(String(typeof result.actual==='number'?Number(result.actual).toPrecision(4):result.actual))}`:''}</small></div></div>`).join('');
  const aiCard=lastAIAnswer?`<div class="ai-answer ${lastAIAnswer.fallback?'fallback':''}"><header><b>${lastAIAnswer.fallback?'راهنمای قطعی':'دستیار هوشمند'}</b><span>${lastAIAnswer.confidence!==undefined?`اطمینان ${fa(Math.round(lastAIAnswer.confidence*100))}٪`:''}</span></header><p>${escapeHtml(lastAIAnswer.answerFa||lastAIAnswer.messageFa||'')}</p>${lastAIAnswer.nextActionFa?`<aside>${escapeHtml(lastAIAnswer.nextActionFa)}</aside>`:''}${lastAIAnswer.evidence?.length?`<small>شواهد: ${lastAIAnswer.evidence.map(escapeHtml).join(' · ')}</small>`:''}</div>`:'';
  root.innerHTML=`<div class="guide-shell"><div class="guide-head"><div><strong>${escapeHtml(activeExperiment.titleFa||activeExperiment.title)}</strong><span>${escapeHtml(activeExperiment.summaryFa||activeExperiment.summary||'')}</span></div><div class="guide-progress"><b>${fa(progress.completed)}/${fa(progress.total)}</b><i><u style="width:${Math.round(progress.ratio*100)}%"></u></i></div></div>${step?`<div class="guide-step"><div class="step-index">مرحله ${fa(experimentSession.currentStepIndex+1)}</div><h3>${escapeHtml(step.titleFa||step.title||step.id)}</h3><p>${escapeHtml(step.instructionFa||step.instruction||'')}</p>${step.whyFa?`<aside>${escapeHtml(step.whyFa)}</aside>`:''}<div class="guide-checks">${checks||'<div class="guide-check pass"><span>✓</span><div><strong>این مرحله شرط خودکار ندارد.</strong></div></div>'}</div></div>`:'<div class="experiment-empty">راهنما به پایان رسیده است.</div>'}${aiCard}<div class="ai-question"><input id="guide-ai-question" placeholder="سؤال علمی درباره همین مرحله…"/><button id="guide-ai" class="ghost-btn">AI راهنما</button></div><div class="guide-actions"><button id="guide-prev" class="ghost-btn">مرحله قبل</button><button id="guide-hint" class="ghost-btn">راهنمایی قطعی</button><button id="guide-assess" class="ghost-btn">ارزیابی</button><button id="guide-next" class="run-btn">مرحله بعد</button></div></div>`;
  $('#guide-prev').onclick=()=>{experimentSession.previous();lastAIAnswer=null;renderBottom();};
  $('#guide-hint').onclick=()=>{const diagnosis=new ExperimentCoach(activeExperiment,experimentSession).diagnose();lastAIAnswer={fallback:true,answerFa:diagnosis.messageFa,evidence:(diagnosis.failedChecks??[]).map(x=>x.type)};renderBottom();};
  $('#guide-ai').onclick=()=>askAICoach($('#guide-ai-question').value||'برای مرحله فعلی یک راهنمایی علمی و مبتنی بر شواهد بده.');
  $('#guide-assess').onclick=()=>{const result=experimentSession.assess();toast(`ارزیابی علمی: ${fa(result.percent)}٪ · ${result.passed?'موفق':'نیازمند تکمیل'}`);};
  $('#guide-next').onclick=()=>{const result=experimentSession.advance();if(!result.advanced){toast('ابتدا شرط‌های این مرحله را کامل کنید.');}lastAIAnswer=null;renderBottom();};
}

async function askAICoach(questionFa){
  if(!activeExperiment||!experimentSession)return; lastAIAnswer={answerFa:'در حال بررسی شواهد آزمایش…',evidence:[]};renderBottom();
  try{lastAIAnswer=await aiClient.coach({experiment:activeExperiment,session:experimentSession,questionFa});}
  catch(error){const diagnosis=new ExperimentCoach(activeExperiment,experimentSession).diagnose();lastAIAnswer={fallback:true,answerFa:`${diagnosis.messageFa}${error.code==='AI_NOT_CONFIGURED'?' — AI سرور هنوز پیکربندی نشده است.':''}`,evidence:(diagnosis.failedChecks??[]).map(x=>x.type)};}
  renderBottom();
}

const checkTypes=[['runtime-no-error','بدون خطای Solver'],['part-exists','وجود قطعه'],['connection-exists','وجود اتصال'],['property-range','بازه Property'],['property-equals','برابری Property'],['simulation-time','زمان شبیه‌سازی'],['measurement-range','بازه اندازه‌گیری'],['measurement-sample-count','تعداد نمونه'],['measurement-peak-absolute-min','کمینه پیک مطلق'],['scene-domain','دامنه صحنه']];
function checkField(stepId,index,name,label,value,type='text') { return `<label>${label}<input class="rule-field" data-step="${escapeAttr(stepId)}" data-check="${index}" data-field="${name}" type="${type}" ${type==='number'?'step="any"':''} value="${escapeAttr(value??'')}"/></label>`; }
function renderCheckEditor(step,check,index){
  const sid=step.id; let fields='';
  if(check.type==='part-exists') fields=checkField(sid,index,'partId','Part ID',check.partId)+checkField(sid,index,'instanceId','Instance',check.instanceId)+checkField(sid,index,'count','تعداد',check.count??1,'number');
  else if(check.type==='connection-exists') fields=checkField(sid,index,'kind','نوع اتصال',check.kind)+checkField(sid,index,'fromInstanceId','از',check.fromInstanceId)+checkField(sid,index,'toInstanceId','به',check.toInstanceId)+checkField(sid,index,'count','تعداد',check.count??1,'number');
  else if(check.type==='property-range') fields=checkField(sid,index,'instanceId','Instance',check.instanceId)+checkField(sid,index,'property','Property',check.property)+checkField(sid,index,'min','کمینه',check.min,'number')+checkField(sid,index,'max','بیشینه',check.max,'number');
  else if(check.type==='property-equals') fields=checkField(sid,index,'instanceId','Instance',check.instanceId)+checkField(sid,index,'property','Property',check.property)+checkField(sid,index,'value','مقدار',check.value);
  else if(check.type==='simulation-time') fields=checkField(sid,index,'min','حداقل زمان (s)',check.min??0,'number');
  else if(['measurement-range'].includes(check.type)) fields=checkField(sid,index,'measurementId','Measurement ID',check.measurementId)+checkField(sid,index,'min','کمینه',check.min,'number')+checkField(sid,index,'max','بیشینه',check.max,'number');
  else if(['measurement-sample-count','measurement-peak-absolute-min'].includes(check.type)) fields=checkField(sid,index,'measurementId','Measurement ID',check.measurementId)+checkField(sid,index,'min','حداقل',check.min??1,'number');
  else if(check.type==='scene-domain') fields=`<label>دامنه<select class="rule-field" data-step="${escapeAttr(sid)}" data-check="${index}" data-field="value">${['circuits','mechanics','optics','waves','mixed'].map(d=>`<option value="${d}" ${check.value===d?'selected':''}>${domainLabelsFa[d]??d}</option>`).join('')}</select></label>`;
  return `<div class="rule-card"><header><select class="rule-type" data-step="${escapeAttr(sid)}" data-check="${index}">${checkTypes.map(([id,label])=>`<option value="${id}" ${check.type===id?'selected':''}>${label}</option>`).join('')}</select><button class="rule-remove" data-step="${escapeAttr(sid)}" data-check="${index}">×</button></header><div class="rule-fields">${fields}</div>${checkField(sid,index,'failureFa','پیام در صورت ناقص بودن',check.failureFa||'')}</div>`;
}
function renderHintEditor(step,hint,index){const text=typeof hint==='string'?hint:hint?.textFa??'';return `<div class="hint-row"><input class="hint-field" data-step="${escapeAttr(step.id)}" data-hint="${index}" value="${escapeAttr(text)}" placeholder="متن راهنمایی"/><button class="hint-remove" data-step="${escapeAttr(step.id)}" data-hint="${index}">×</button></div>`;}

function renderExperimentAuthoring(root){
  if(!experimentAuthor){root.innerHTML='<div class="experiment-empty">از کتابخانه یک آزمایش را باز کنید یا یک Migration Draft بسازید.</div>';return;}
  const e=experimentAuthor.snapshot(), steps=e.guide?.steps??[];
  root.innerHTML=`<div class="author-shell"><div class="author-meta"><label>عنوان فارسی<input id="author-title" value="${escapeAttr(e.titleFa||'')}" /></label><label>شناسه<input id="author-id" value="${escapeAttr(e.id)}" /></label><label class="wide">شرح علمی<textarea id="author-summary">${escapeHtml(e.summaryFa||'')}</textarea></label></div><div class="ai-author-row"><input id="author-ai-intent" placeholder="هدف آموزشی برای تولید راهنما با AI…"/><button id="author-ai-draft" class="ghost-btn" ${aiStatus.enabled?'':'title="AI سرور پیکربندی نشده"'}>AI ساخت راهنما</button></div><div class="author-toolbar"><strong>Rule / Step Builder · ${fa(steps.length)} مرحله</strong><div><button id="author-sync-scene" class="ghost-btn">ثبت صحنه فعلی</button><button id="author-save-library" class="ghost-btn">ذخیره در کتابخانه</button><button id="author-add-step" class="ghost-btn">＋ مرحله</button><button id="author-export" class="run-btn">خروجی Experiment JSON</button></div></div><div class="author-steps">${steps.map((step,index)=>`<article class="author-step" data-step-id="${escapeAttr(step.id)}"><header><b>${fa(index+1)} · ${escapeHtml(step.id)}</b><div><button class="author-move" data-dir="-1" data-step-id="${escapeAttr(step.id)}">↑</button><button class="author-move" data-dir="1" data-step-id="${escapeAttr(step.id)}">↓</button><button class="author-remove" data-step-id="${escapeAttr(step.id)}">حذف</button></div></header><input class="author-step-title" data-step-id="${escapeAttr(step.id)}" value="${escapeAttr(step.titleFa||'')}" placeholder="عنوان مرحله"/><textarea class="author-step-instruction" data-step-id="${escapeAttr(step.id)}" placeholder="دستور مرحله">${escapeHtml(step.instructionFa||'')}</textarea><textarea class="author-step-why" data-step-id="${escapeAttr(step.id)}" placeholder="چرا این مرحله مهم است؟">${escapeHtml(step.whyFa||'')}</textarea><section class="rule-builder"><div class="mini-head"><b>شرط‌های خودکار · ${fa(step.checks?.length??0)}</b><button class="author-add-check" data-step-id="${escapeAttr(step.id)}">＋ شرط</button></div>${(step.checks??[]).map((check,i)=>renderCheckEditor(step,check,i)).join('')}</section><section class="hint-builder"><div class="mini-head"><b>راهنمایی‌ها · ${fa(step.hints?.length??0)}</b><button class="author-add-hint" data-step-id="${escapeAttr(step.id)}">＋ راهنما</button></div>${(step.hints??[]).map((hint,i)=>renderHintEditor(step,hint,i)).join('')}</section></article>`).join('')}</div></div>`;
  bindAuthoringEvents(steps);
}

function bindAuthoringEvents(steps){
  $('#author-title').onchange=e=>{experimentAuthor.updateMetadata({titleFa:e.target.value});refreshActiveExperiment();};
  $('#author-id').onchange=e=>{experimentAuthor.updateMetadata({id:e.target.value});refreshActiveExperiment();};
  $('#author-summary').onchange=e=>{experimentAuthor.updateMetadata({summaryFa:e.target.value});refreshActiveExperiment();};
  $$('.author-step-title').forEach(input=>input.onchange=e=>{experimentAuthor.updateStep(input.dataset.stepId,{titleFa:e.target.value});refreshActiveExperiment();});
  $$('.author-step-instruction').forEach(input=>input.onchange=e=>{experimentAuthor.updateStep(input.dataset.stepId,{instructionFa:e.target.value});refreshActiveExperiment();});
  $$('.author-step-why').forEach(input=>input.onchange=e=>{experimentAuthor.updateStep(input.dataset.stepId,{whyFa:e.target.value});refreshActiveExperiment();});
  $$('.author-remove').forEach(btn=>btn.onclick=()=>{experimentAuthor.removeStep(btn.dataset.stepId);refreshActiveExperiment();renderBottom();});
  $$('.author-move').forEach(btn=>btn.onclick=()=>{const idx=steps.findIndex(x=>x.id===btn.dataset.stepId);experimentAuthor.moveStep(btn.dataset.stepId,idx+Number(btn.dataset.dir));refreshActiveExperiment();renderBottom();});
  $$('.author-add-check').forEach(btn=>btn.onclick=()=>{experimentAuthor.addCheck(btn.dataset.stepId,{type:'runtime-no-error'});refreshActiveExperiment();renderBottom();});
  $$('.author-add-hint').forEach(btn=>btn.onclick=()=>{experimentAuthor.addHint(btn.dataset.stepId,{textFa:'راهنمایی جدید'});refreshActiveExperiment();renderBottom();});
  $$('.rule-remove').forEach(btn=>btn.onclick=()=>{experimentAuthor.removeCheck(btn.dataset.step,Number(btn.dataset.check));refreshActiveExperiment();renderBottom();});
  $$('.hint-remove').forEach(btn=>btn.onclick=()=>{experimentAuthor.removeHint(btn.dataset.step,Number(btn.dataset.hint));refreshActiveExperiment();renderBottom();});
  $$('.rule-type').forEach(sel=>sel.onchange=()=>replaceCheck(sel.dataset.step,Number(sel.dataset.check),{id:`check-${Number(sel.dataset.check)+1}`,type:sel.value,failureFa:'شرط مرحله هنوز کامل نشده است.'}));
  $$('.rule-field').forEach(input=>input.onchange=()=>updateCheckField(input));
  $$('.hint-field').forEach(input=>input.onchange=()=>{experimentAuthor.updateHint(input.dataset.step,Number(input.dataset.hint),{textFa:input.value});refreshActiveExperiment();});
  $('#author-add-step').onclick=()=>{experimentAuthor.addStep({instructionFa:'دستور این مرحله را بنویسید.'});refreshActiveExperiment();renderBottom();};
  $('#author-sync-scene').onclick=()=>{experimentAuthor.setScene(doc.snapshot());refreshActiveExperiment();toast('صحنه فعلی در بسته آزمایش ثبت شد.');};
  $('#author-save-library').onclick=saveExperimentToLibrary;
  $('#author-export').onclick=exportExperimentPackage;
  $('#author-ai-draft').onclick=generateAIDraft;
}
function replaceCheck(stepId,index,check){const e=experimentAuthor.snapshot(),step=e.guide.steps.find(x=>x.id===stepId),checks=structuredClone(step.checks??[]);checks[index]=check;experimentAuthor.updateStep(stepId,{checks});refreshActiveExperiment();renderBottom();}
function updateCheckField(input){const e=experimentAuthor.snapshot(),step=e.guide.steps.find(x=>x.id===input.dataset.step),index=Number(input.dataset.check),check=structuredClone(step.checks[index]);let value=input.value;if(input.type==='number')value=value===''?undefined:Number(value);check[input.dataset.field]=value;replaceCheck(input.dataset.step,index,check);}

async function generateAIDraft(){
  if(!experimentAuthor)return; if(!aiStatus.enabled){toast('AI سرور پیکربندی نشده است. GEMINI_API_KEY و GEMINI_MODEL را تنظیم کنید.');return;}
  const intentFa=$('#author-ai-intent').value.trim(); toast('در حال تولید پیش‌نویس راهنما…');
  try{const draft=await aiClient.draft({experiment:experimentAuthor.snapshot(),scene:doc.snapshot(),intentFa});experimentAuthor.applyAIDraft(draft);refreshActiveExperiment();renderBottom();toast('پیش‌نویس AI اعمال شد؛ شرط‌ها را بازبینی کنید.');}
  catch(error){toast(`خطای AI: ${error.message}`);console.error(error);}
}

function renderExperimentLibrary(root){
  if(!libraryManager){root.innerHTML='<div class="experiment-empty">کتابخانه آماده نیست.</div>';return;}
  const stats=libraryManager.stats(), items=libraryManager.list({query:libraryFilter.query,source:libraryFilter.source==='all'?null:libraryFilter.source,domain:libraryFilter.domain==='all'?null:libraryFilter.domain,limit:80});
  root.innerHTML=`<div class="library-shell"><div class="library-head"><div><strong>کتابخانه آزمایش‌ها · ${fa(stats.total)}</strong><span>${fa(stats.bySource.aria??0)} آریا · ${fa(stats.bySource['crocodile-605']??0)} مهاجرت Crocodile · ${fa(stats.bySource.local??0)} محلی</span></div><div class="library-filters"><input id="library-search" value="${escapeAttr(libraryFilter.query)}" placeholder="جست‌وجو در آزمایش‌ها…"/><select id="library-source"><option value="all">همه منابع</option><option value="aria" ${libraryFilter.source==='aria'?'selected':''}>آریا</option><option value="crocodile-605" ${libraryFilter.source==='crocodile-605'?'selected':''}>Crocodile 605</option><option value="local" ${libraryFilter.source==='local'?'selected':''}>کتابخانه من</option></select><select id="library-domain"><option value="all">همه دامنه‌ها</option>${['circuits','mechanics','optics','waves','mixed'].map(d=>`<option value="${d}" ${libraryFilter.domain===d?'selected':''}>${domainLabelsFa[d]??d}</option>`).join('')}</select></div></div><div class="library-list">${items.map(item=>`<article class="library-item"><div><b>${escapeHtml(item.titleFa||item.title||item.id)}</b><span>${escapeHtml(domainLabelsFa[item.domain]??item.domain??'')} · ${item.source==='crocodile-605'?'Crocodile 605':item.source==='local'?'کتابخانه من':'Aria'} · ${escapeHtml(item.status)}</span>${item.legacy?.intro?`<small>${escapeHtml(item.legacy.intro.slice(0,180))}</small>`:''}</div><div class="library-actions"><button class="library-open ${item.source==='crocodile-605'?'ghost-btn':'run-btn'}" data-id="${escapeAttr(item.id)}">${item.source==='crocodile-605'?'ساخت پیش‌نویس مهاجرت':'باز کردن'}</button>${item.source==='local'?`<button class="library-delete" data-id="${escapeAttr(item.id)}">حذف</button>`:''}</div></article>`).join('')||'<div class="experiment-empty">نتیجه‌ای پیدا نشد.</div>'}</div></div>`;
  $('#library-search').oninput=e=>{libraryFilter.query=e.target.value;renderExperimentLibrary(root);}; $('#library-source').onchange=e=>{libraryFilter.source=e.target.value;renderExperimentLibrary(root);}; $('#library-domain').onchange=e=>{libraryFilter.domain=e.target.value;renderExperimentLibrary(root);};
  $$('.library-open').forEach(btn=>btn.onclick=()=>openLibraryEntry(btn.dataset.id));
  $$('.library-delete').forEach(btn=>btn.onclick=()=>{libraryManager.remove(btn.dataset.id);persistStoredLibrary();renderExperimentLibrary(root);toast('از کتابخانه محلی حذف شد.');});
}
async function openLibraryEntry(id){
  const item=libraryManager.get(id); if(!item)return;
  if(item.source==='aria'&&item.path)return loadExperiment(item.path);
  if(item.source==='local'&&item.experiment){activateExperiment(item.experiment,'author');toast('آزمایش از کتابخانه محلی باز شد.');return;}
  if(item.source==='crocodile-605'){
    const l=item.legacy??{}; const draft=importLegacyMetadata({category:l.category,title:item.title,file:l.file,file_size:l.fileSize,scene_count:l.sceneCount,part_count:l.partCount,instruction_page_count:l.instructionPageCount,top_classes:l.topClasses,intro:l.intro});
    activateExperiment(draft,'author'); toast('Migration Draft ساخته شد؛ محتوای غایب جعل نشده است.');
  }
}

function saveExperimentToLibrary(){
  if(!experimentAuthor||!libraryManager)return; const data=experimentAuthor.snapshot(); data.scene=doc.snapshot();
  const validation=validateExperimentDefinition(data); if(!validation.valid){toast(`خطای ساختار: ${validation.errors[0]}`);return;}
  libraryManager.upsert({id:data.id,version:data.version??1,title:data.title,titleFa:data.titleFa,domain:data.domain?.[0]??data.scene.domain,source:'local',status:'draft',tags:['authored','local'],experiment:data});
  persistStoredLibrary(); toast('آزمایش در کتابخانه محلی ذخیره شد.');
}

function refreshActiveExperiment(){
  if(!experimentAuthor)return; activeExperiment=experimentAuthor.snapshot();
  experimentSession=new GuidedExperimentSession(activeExperiment,{sceneProvider:()=>doc.snapshot(),runtimeProvider:()=>runtime}); experimentSession.start();
}

function exportExperimentPackage(){
  if(!experimentAuthor)return; const data=experimentAuthor.snapshot(); data.scene=doc.snapshot();
  const validation=validateExperimentDefinition(data); if(!validation.valid){toast(`خطای ساختار: ${validation.errors[0]}`);return;}
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${data.id}.json`;a.click();URL.revokeObjectURL(url);toast('Experiment Package ذخیره شد');
}

function removeSelected(){if(doc.selection.type==='part')doc.removePart(doc.selection.id);else if(doc.selection.type==='connection')doc.removeConnection(doc.selection.id);}
function exportScene(){const blob=new Blob([doc.toJSON(2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${doc.snapshot().id}.json`;a.click();URL.revokeObjectURL(url);toast('Scene JSON ذخیره شد');}
async function importScene(e){const file=e.target.files?.[0];if(!file)return;try{doc.replaceScene(JSON.parse(await file.text()));toast('صحنه وارد شد');}catch(err){toast(`خطا: ${err.message}`);}e.target.value='';}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2200);}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}function escapeAttr(value=''){return escapeHtml(value).replace(/`/g,'&#96;');}

boot().catch(error=>{console.error(error);document.body.innerHTML=`<pre style="padding:30px;color:#ff9eaa">${escapeHtml(error.stack||error.message)}</pre>`;});
