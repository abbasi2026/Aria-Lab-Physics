import { SceneDocument, createBlankScene } from '../../../packages/editor-core/src/index.mjs';
import { ComponentCatalog, domainLabelsFa } from '../../../packages/component-library/src/index.mjs';
import { SceneRuntime } from '../../../packages/scene-runtime/src/index.mjs';
import { svgPolyline } from '../../../packages/graph-engine/src/index.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const fa = value => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 3 }).format(value);
const domainIcons = { mechanics: '↗', circuits: 'ϟ', optics: '◒', waves: '≈', presentation: '▣' };
const preferred = ['circuits.battery','circuits.resistor','circuits.pushmake','circuits.filament-lamp','circuits.ammeter','circuits.voltmeter','mechanics.ball','mechanics.block','mechanics.spring','optics.ray-box','optics.convex-lens','optics.concave-lens','optics.plane-mirror','optics.screen','waves.point-source'];
let catalog, canonicalParts = [], doc, runtime = null, activeDomain = 'all', mode = 'select', pendingPort = null, activeBottomTab = 'measure', raf = 0;
const camera = { scale: 60 };
function cameraOrigin() { const r = $('#workspace').getBoundingClientRect(); return { x: r.width / 2, y: r.height * 0.68 }; }
function worldToScreen(position) { const o = cameraOrigin(); return { x: o.x + position.x * camera.scale, y: o.y - position.y * camera.scale }; }
function screenToWorld(position) { const o = cameraOrigin(); return { x: (position.x - o.x) / camera.scale, y: (o.y - position.y) / camera.scale }; }


async function boot() {
  const [canonical, registry] = await Promise.all([fetch('/datasets/parts/canonical-parts.json').then(r => r.json()), fetch('/datasets/parts/registry.json').then(r => r.json())]);
  canonicalParts = canonical; catalog = new ComponentCatalog(canonical);
  const initial = createBlankScene({ id: 'aria.scene.stage4', title: 'New Scene', titleFa: 'صحنه جدید', domain: 'mixed' });
  doc = new SceneDocument(initial); doc.subscribe(() => { renderScene(); renderInspector(); renderBottom(); syncRuntime(false); });
  bindUI(); renderDomains(registry.domains); renderParts(); renderScene(); renderInspector(); renderBottom(); syncRuntime(true); animate();
}

function bindUI() {
  $('#part-search').addEventListener('input', renderParts);
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
  $$('.bottom-tab').forEach(btn => btn.onclick = () => { activeBottomTab = btn.dataset.tab; $$('.bottom-tab').forEach(b => b.classList.toggle('active', b === btn)); renderBottom(); });
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName; if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doc.redo() : doc.undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); doc.redo(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') removeSelected();
    else if (e.code === 'Space') { e.preventDefault(); runtime?.toggle(); updateRunUI(); }
  });
}

function renderDomains(counts = null) {
  const stats = counts ?? Object.fromEntries(catalog.domains().map(x => [x.id, x.count]));
  $('#domain-tabs').innerHTML = [{ id: 'all', label: 'همه', count: catalog.parts.length }, ...catalog.domains().map(x => ({ id: x.id, label: domainLabelsFa[x.id] ?? x.id, count: stats[x.id] ?? x.count }))]
    .map(item => `<button class="domain-tab ${activeDomain === item.id ? 'active' : ''}" data-domain="${item.id}">${item.label} · ${fa(item.count)}</button>`).join('');
  $$('.domain-tab').forEach(btn => btn.onclick = () => { activeDomain = btn.dataset.domain; renderDomains(stats); renderParts(); });
}

function renderParts() {
  const query = $('#part-search').value; let parts = catalog.list({ domain: activeDomain === 'all' ? null : activeDomain, query });
  if (!query && activeDomain === 'all') parts.sort((a,b) => (preferred.indexOf(a.id) < 0 ? 999 : preferred.indexOf(a.id)) - (preferred.indexOf(b.id) < 0 ? 999 : preferred.indexOf(b.id)) || a.nameFa.localeCompare(b.nameFa, 'fa'));
  $('#catalog-count').textContent = `${fa(parts.length)} قطعه از ${fa(catalog.parts.length)}`;
  $('#part-list').innerHTML = parts.slice(0, 203).map(part => `<div class="part-card" draggable="true" data-part-id="${part.id}"><div class="part-icon">${domainIcons[part.domain] ?? '•'}</div><div class="part-meta"><strong>${escapeHtml(part.nameFa || part.name)}</strong><span>${escapeHtml(part.name)}</span></div><span class="port-count">${fa(part.ports?.length ?? 0)}</span></div>`).join('');
  $$('.part-card').forEach(card => { card.ondragstart = e => { e.dataTransfer.setData('application/x-aria-part', card.dataset.partId); e.dataTransfer.effectAllowed = 'copy'; }; card.ondblclick = () => addPartAtCenter(card.dataset.partId); });
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
  el.innerHTML = `<div class="scene-part-icon">${domainIcons[definition?.domain] ?? '•'}</div><div class="scene-part-name">${escapeHtml(definition?.nameFa ?? part.partId)}</div>`;
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
  const root=$('#inspector'); if(doc.selection.type!=='part'){root.className='inspector-empty';root.innerHTML='<div>یک قطعه را انتخاب کنید تا تنظیمات آن نمایش داده شود.</div>';$('#selection-subtitle').textContent='هیچ قطعه‌ای انتخاب نشده';return;}
  const scene=doc.snapshot(), part=scene.parts.find(p=>p.instanceId===doc.selection.id), def=catalog.get(part?.partId); if(!part)return;
  $('#selection-subtitle').textContent=part.instanceId; root.className='';
  const editable=def?.properties?.filter(p=>p.editable).slice(0,80)??[];
  root.innerHTML=`<section class="inspector-section"><div class="part-summary"><div class="part-icon">${domainIcons[def?.domain]??'•'}</div><div><strong>${escapeHtml(def?.nameFa??part.partId)}</strong><span>${escapeHtml(part.partId)}</span></div></div></section><section class="inspector-section"><h3>Transform</h3>${numberField('X','transform-x',part.transform.position.x,'m')}${numberField('Y','transform-y',part.transform.position.y,'m')}${numberField('چرخش','transform-rotation',part.transform.rotation??0,'°')}</section><section class="inspector-section"><h3>Properties · ${fa(editable.length)}</h3>${editable.length?editable.map(p=>propertyField(p,part.properties[p.key])).join(''):'<div class="inspector-empty">برای این قطعه Property قابل ویرایش ثبت نشده است.</div>'}</section>`;
  $('#transform-x').onchange=e=>doc.updateTransform(part.instanceId,{position:{x:Number(e.target.value)}}); $('#transform-y').onchange=e=>doc.updateTransform(part.instanceId,{position:{y:Number(e.target.value)}}); $('#transform-rotation').onchange=e=>doc.updateTransform(part.instanceId,{rotation:Number(e.target.value)});
  editable.forEach(prop=>{const input=document.querySelector(`[data-prop-key="${CSS.escape(prop.key)}"]`);if(!input)return;input.onchange=e=>{let value;if(prop.kind==='boolean')value=e.target.checked;else if(['number','integer'].includes(prop.kind))value=Number(e.target.value);else value=e.target.value;doc.updateProperties(part.instanceId,{[prop.key]:value});};});
}
function numberField(label,id,value,unit=''){return `<div class="property-row"><div class="property-label"><strong>${label}</strong><span>${unit}</span></div><input class="property-input" id="${id}" type="number" step="any" value="${Number(value)||0}" /></div>`;}
function propertyField(prop,value){const val=value??prop.default??'';const meta=[prop.quantity,prop.defaultUnit].filter(Boolean).join(' · ');if(prop.kind==='boolean')return `<div class="property-row"><div class="property-label"><strong>${escapeHtml(prop.label)}</strong><span>${escapeHtml(meta)}</span></div><input class="property-input" data-prop-key="${escapeAttr(prop.key)}" type="checkbox" ${val?'checked':''}/></div>`;return `<div class="property-row"><div class="property-label"><strong title="${escapeAttr(prop.key)}">${escapeHtml(prop.label)}</strong><span>${escapeHtml(meta)}</span></div><input class="property-input" data-prop-key="${escapeAttr(prop.key)}" type="${['number','integer'].includes(prop.kind)?'number':'text'}" ${['number','integer'].includes(prop.kind)?'step="any"':''} value="${escapeAttr(val)}" /></div>`;}

function syncRuntime(force=false){if(!force&&runtime?.status==='running')return;runtime=new SceneRuntime(doc.snapshot(), { partDefinitions: canonicalParts });updateRunUI();}
function animate(){cancelAnimationFrame(raf);const loop=()=>{if(runtime?.status==='running'){runtime.step(1);renderRuntimeOverlay();renderBottom(false);}updateRunUI();raf=requestAnimationFrame(loop);};raf=requestAnimationFrame(loop);}
function updateRunUI(){const running=runtime?.status==='running';$('#run-icon').textContent=running?'Ⅱ':'▶';$('#run-label').textContent=running?'توقف':'اجرا';$('#runtime-time').textContent=`t = ${(runtime?.clock.time??0).toFixed(3)} s`;}
function renderRuntimeOverlay(){const snap=runtime?.snapshot();if(!snap)return;$('#runtime-time').textContent=`t = ${snap.time.toFixed(3)} s`;if(snap.domain==='mechanics'){for(const b of snap.state.bodies??[]){const el=document.querySelector(`.scene-part[data-instance-id="${CSS.escape(b.id)}"]`);if(el){const screen=worldToScreen(b.position);el.style.left=`${screen.x}px`;el.style.top=`${screen.y}px`;el.classList.toggle('running',runtime.status==='running');}}renderConnections();}}

function renderBottom(){const root=$('#bottom-content');if(activeBottomTab==='scene-json'){root.innerHTML=`<pre class="json-view">${escapeHtml(doc.toJSON(2))}</pre>`;return;}if(activeBottomTab==='graph'){const probe=runtime?.recorder.list()[0];const points=probe?runtime.recorder.get(probe):[];const poly=svgPolyline(points,900,120,10);root.innerHTML=`<svg class="graph-svg" viewBox="0 0 900 120" preserveAspectRatio="none"><polyline class="graph-line" points="${poly}"/></svg><div style="font-size:10px;color:#7892a8;margin-top:5px">${probe?escapeHtml(probe):'برای نمایش نمودار، Probe به صحنه اضافه کنید.'}</div>`;return;}const snap=runtime?.snapshot();const cards=[];cards.push(['زمان',`${(snap?.time??0).toFixed(3)} s`],['دامنه',domainLabelsFa[snap?.domain]??snap?.domain??'—'],['وضعیت',runtime?.status==='running'?'در حال اجرا':'متوقف']);if(snap?.state?.error)cards.push(['خطای Solver',snap.state.error]);if(snap?.domain==='circuits'){for(const [node,v] of Object.entries(snap.state.nodeVoltages??{}).slice(0,6))cards.push([`V(${node})`,`${Number(v).toPrecision(4)} V`]);}if(snap?.domain==='optics')cards.push(['تعامل‌های پرتو',String(Math.max(0,(snap.state.path?.length??1)-1))]);root.innerHTML=`<div class="measure-grid">${cards.map(([a,b])=>`<div class="measure-card"><span>${escapeHtml(a)}</span><strong>${escapeHtml(b)}</strong></div>`).join('')}</div>`;}

function removeSelected(){if(doc.selection.type==='part')doc.removePart(doc.selection.id);else if(doc.selection.type==='connection')doc.removeConnection(doc.selection.id);}
function exportScene(){const blob=new Blob([doc.toJSON(2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${doc.snapshot().id}.json`;a.click();URL.revokeObjectURL(url);toast('Scene JSON ذخیره شد');}
async function importScene(e){const file=e.target.files?.[0];if(!file)return;try{doc.replaceScene(JSON.parse(await file.text()));toast('صحنه وارد شد');}catch(err){toast(`خطا: ${err.message}`);}e.target.value='';}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800);}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}function escapeAttr(value=''){return escapeHtml(value).replace(/`/g,'&#96;');}

boot().catch(error=>{console.error(error);document.body.innerHTML=`<pre style="padding:30px;color:#ff9eaa">${escapeHtml(error.stack||error.message)}</pre>`;});
