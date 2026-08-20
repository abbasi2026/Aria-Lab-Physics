import { SimulationClock } from '../../physics-core/src/clock.mjs';
import { World2D } from '../../mechanics-engine/src/world2d.mjs';
import { CircuitNetwork } from '../../circuits-engine/src/mna.mjs';
import { RayScene } from '../../optics-engine/src/ray-scene.mjs';
import { WaveGrid2D } from '../../waves-engine/src/wave-grid.mjs';
import { ProbeRecorder } from '../../measurement-engine/src/index.mjs';

const clone = value => structuredClone(value);
const alias = id => String(id).toLowerCase();

export class SceneRuntime {
  constructor(scene, { maxSamples = 5000, partDefinitions = [] } = {}) {
    this.original = clone(scene);
    this.scene = clone(scene);
    this.clock = new SimulationClock({ dt: scene.simulation?.dt ?? 1 / 120 });
    this.recorder = new ProbeRecorder({ maxSamples });
    this.status = 'paused';
    this.frame = null;
    this.partDefinitions = partDefinitions;
    this.adapter = createDomainAdapter(this.scene, { partDefinitions });
    this.listeners = new Set();
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type) { for (const fn of this.listeners) fn({ type, status: this.status, time: this.clock.time, frame: this.snapshot() }); }
  play() { this.status = 'running'; this.emit('play'); }
  pause() { this.status = 'paused'; this.emit('pause'); }
  toggle() { this.status === 'running' ? this.pause() : this.play(); }
  step(count = 1) {
    for (let i = 0; i < count; i++) {
      this.frame = this.adapter.step(this.clock.dt, this.clock.time);
      this.clock.step();
      this.#recordProbes();
    }
    this.emit('step'); return this.snapshot();
  }
  tick() { if (this.status === 'running') return this.step(1); return this.snapshot(); }
  reset(scene = this.original) {
    this.scene = clone(scene); this.original = clone(scene); this.clock = new SimulationClock({ dt: scene.simulation?.dt ?? 1 / 120 }); this.recorder.clear(); this.adapter = createDomainAdapter(this.scene, { partDefinitions: this.partDefinitions }); this.frame = null; this.status = 'paused'; this.emit('reset');
  }
  snapshot() { return { time: this.clock.time, status: this.status, domain: this.scene.domain, state: clone(this.frame ?? this.adapter.snapshot()) }; }
  #recordProbes() {
    for (const probe of this.scene.probes ?? []) {
      const value = this.adapter.measure(probe);
      if (Number.isFinite(value)) this.recorder.record(probe.id ?? probe.quantity, this.clock.time, value);
    }
  }
}

function createDomainAdapter(scene, options = {}) {
  if (scene.domain === 'mechanics') return mechanicsAdapter(scene);
  if (scene.domain === 'circuits') return circuitsAdapter(scene, options);
  if (scene.domain === 'optics') return opticsAdapter(scene);
  if (scene.domain === 'waves') return wavesAdapter(scene);
  return genericAdapter(scene);
}

function genericAdapter(scene) {
  let snapshot = { parts: clone(scene.parts) };
  return { step: () => snapshot, snapshot: () => snapshot, measure: () => null };
}

function mechanicsAdapter(scene) {
  const sim = scene.simulation ?? {};
  const world = new World2D({ gravity: sim.gravity ?? { x: 0, y: -9.81 }, dt: sim.dt ?? 1 / 120, floorY: sim.floorY ?? null });
  for (const part of scene.parts) {
    const id = alias(part.partId); const p = part.properties ?? {}; const position = part.transform.position;
    if (id.includes('ball')) world.addBody({ id: part.instanceId, mass: p.mass ?? 1, position, velocity: { x: p.velocityX ?? 0, y: p.velocityY ?? 0 }, shape: { type: 'circle', radius: p.radius ?? 0.5 }, restitution: p.restitution ?? p.elasticity ?? 0.6, friction: p.friction ?? p['kinetic-friction'] ?? 0.2, staticBody: p.staticBody ?? false });
    else if (id.includes('block') || id.includes('ground')) world.addBody({ id: part.instanceId, mass: p.mass ?? 1, position, velocity: { x: p.velocityX ?? 0, y: p.velocityY ?? 0 }, shape: { type: 'box', width: p.width ?? 1, height: p.height ?? 1 }, restitution: p.restitution ?? 0.4, friction: p.friction ?? 0.3, staticBody: id.includes('ground') || p.staticBody === true });
  }
  for (const c of scene.connections ?? []) if (c.kind === 'mechanical' && c.properties?.type === 'spring') world.addSpring({ id: c.id, a: c.from.instanceId, b: c.to.instanceId, restLength: c.properties.restLength ?? 1, stiffness: c.properties.stiffness ?? 10, damping: c.properties.damping ?? 0.2 });
  const state = () => ({ bodies: world.snapshot() });
  return {
    step: dt => { world.step(dt); return state(); }, snapshot: state,
    measure(probe) { const body = world.bodies.find(b => b.id === probe.instanceId); if (!body) return null; if (probe.quantity === 'position-x') return body.position.x; if (probe.quantity === 'position-y') return body.position.y; if (probe.quantity === 'velocity-x') return body.velocity.x; if (probe.quantity === 'velocity-y') return body.velocity.y; if (probe.quantity === 'speed') return Math.hypot(body.velocity.x, body.velocity.y); if (probe.quantity === 'momentum') return Number.isFinite(body.mass) ? body.mass * Math.hypot(body.velocity.x, body.velocity.y) : null; return null; }
  };
}

function logicalPorts(definition) {
  const ports = definition?.ports ?? [];
  const seen = new Set(), out = [];
  for (const port of ports) {
    if (port.kind !== 'electrical-terminal') continue;
    const role = String(port.legacyRole ?? port.id).split(',').map(x => x.trim()).filter(Boolean).sort().join(',');
    if (seen.has(role)) continue; seen.add(role); out.push(port);
  }
  return out;
}

function circuitsAdapter(scene, { partDefinitions = [] } = {}) {
  let result = { nodeVoltages: { 0: 0 }, branchCurrents: {} };
  const defs = new Map(partDefinitions.map(d => [d.id, d]));
  const parent = new Map();
  const key = (instanceId, portId) => `${instanceId}:${portId}`;
  const find = x => { if (!parent.has(x)) parent.set(x, x); const p = parent.get(x); if (p !== x) parent.set(x, find(p)); return parent.get(x); };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };
  for (const part of scene.parts) for (const port of logicalPorts(defs.get(part.partId))) find(key(part.instanceId, port.id));
  for (const c of scene.connections ?? []) if (c.kind === 'electrical' && c.from.portId && c.to.portId) union(key(c.from.instanceId, c.from.portId), key(c.to.instanceId, c.to.portId));
  let groundRoot = null;
  for (const part of scene.parts) {
    const id = alias(part.partId), ports = logicalPorts(defs.get(part.partId));
    if (id.includes('battery') || id.includes('voltage-source')) {
      const neg = ports.find(p => /negative|minus|t2/i.test(p.id)) ?? ports[1]; if (neg) { groundRoot = find(key(part.instanceId, neg.id)); break; }
    }
  }
  const roots = [...new Set([...parent.keys()].map(find))]; if (!groundRoot && roots.length) groundRoot = roots[0];
  const nodeNames = new Map(); let nodeCounter = 1; if (groundRoot) nodeNames.set(groundRoot, '0');
  for (const root of roots) if (!nodeNames.has(root)) nodeNames.set(root, `n${nodeCounter++}`);
  const nodeFor = (part, index, fallback) => { const ports = logicalPorts(defs.get(part.partId)); const port = ports[index]; return port ? nodeNames.get(find(key(part.instanceId, port.id))) : (part.properties?.[fallback] ?? null); };
  const solve = () => {
    const net = new CircuitNetwork();
    for (const part of scene.parts) {
      const id = alias(part.partId), p = part.properties ?? {}; const a = nodeFor(part, 0, 'nodeA') ?? p.from ?? '0'; const b = nodeFor(part, 1, 'nodeB') ?? p.to ?? part.instanceId;
      if (id.includes('resistor')) net.resistor(part.instanceId, a, b, Number(p.resistance ?? 1000));
      else if (id.includes('battery') || id.includes('voltage-source')) net.voltageSource(part.instanceId, a, b, Number(p.voltage ?? 9));
      else if (id.includes('current-source')) net.currentSource(part.instanceId, a, b, Number(p.current ?? 0.001));
      else if (id.includes('switch') || id.includes('pushmake') || id.includes('pushbreak')) net.switch(part.instanceId, a, b, p.closed ?? p.on ?? !id.includes('pushbreak'));
      else if (id.includes('lamp')) net.lamp(part.instanceId, a, b, { resistance: Number(p.resistance ?? 100) });
      else if (id.includes('ammeter')) net.resistor(part.instanceId, a, b, Number(p.resistance ?? 1e-6));
      else if (id.includes('voltmeter')) net.resistor(part.instanceId, a, b, Number(p.resistance ?? 1e9));
    }
    result = net.solveDC(); return result;
  };
  try { solve(); } catch (error) { result = { error: error.message, nodeVoltages: { 0: 0 }, branchCurrents: {} }; }
  return { step: () => { try { return solve(); } catch (error) { return result = { error: error.message, nodeVoltages: { 0: 0 }, branchCurrents: {} }; } }, snapshot: () => result,
    measure(probe) { if (probe.quantity === 'voltage') return result.nodeVoltages?.[probe.node ?? probe.instanceId] ?? null; if (probe.quantity === 'current') return result.branchCurrents?.[probe.instanceId] ?? null; return null; } };
}

function segmentFromPart(part, defaultLength = 4) {
  const p = part.properties ?? {}; const length = Number(p.length ?? p.height ?? defaultLength); const angle = (part.transform.rotation ?? 0) * Math.PI / 180; const dx = Math.cos(angle) * length / 2, dy = Math.sin(angle) * length / 2; const c = part.transform.position;
  return [{ x: c.x - dx, y: c.y - dy }, { x: c.x + dx, y: c.y + dy }];
}
function opticsAdapter(scene) {
  const rayScene = new RayScene(); let source = null; let path = [];
  for (const part of scene.parts) {
    const id = alias(part.partId); const p = part.properties ?? {};
    if (id.includes('ray-source') || id.endsWith('.ray') || id.includes('ray-box')) source = { origin: { ...part.transform.position }, direction: { x: Number(p.directionX ?? 1), y: Number(p.directionY ?? 0) } };
    else if (id.includes('mirror')) { const [a, b] = segmentFromPart(part); rayScene.addMirror(part.instanceId, a, b); }
    else if (id.includes('screen')) { const [a, b] = segmentFromPart(part); rayScene.addScreen(part.instanceId, a, b); }
    else if (id.includes('interface') || id.includes('transparent')) { const [a, b] = segmentFromPart(part); rayScene.addInterface(part.instanceId, a, b, { nLeft: Number(p.nLeft ?? p.refractiveIndex1 ?? 1), nRight: Number(p.nRight ?? p.refractiveIndex ?? 1.5) }); }
    else if (id.includes('lens')) rayScene.addThinLens(part.instanceId, { x: part.transform.position.x, yMin: part.transform.position.y - Number(p.height ?? 4) / 2, yMax: part.transform.position.y + Number(p.height ?? 4) / 2, focalLength: Number(p.focalLength ?? p['focal-length'] ?? 2) });
  }
  const trace = () => { path = source ? rayScene.trace(source, { maxInteractions: 30 }).path : []; return { path }; };
  trace();
  return { step: trace, snapshot: () => ({ path }), measure(probe) { if (probe.quantity === 'interaction-count') return Math.max(0, path.length - 1); return null; } };
}

function wavesAdapter(scene) {
  const space = scene.parts.find(p => alias(p.partId).includes('space')) ?? scene.parts[0]; const p = space?.properties ?? {}; const sim = scene.simulation ?? {};
  const width = Math.max(3, Math.round(Number(p.width ?? 41))), height = Math.max(3, Math.round(Number(p.height ?? 31))), dx = Number(p.dx ?? 1), waveSpeed = Number(sim.waveSpeed ?? p.waveSpeed ?? 1); const dt = Number(sim.dt ?? 0.25);
  const grid = new WaveGrid2D({ width, height, dx, dt, waveSpeed, damping: Number(p.damping ?? 0.002), boundary: p.boundary ?? 'fixed' });
  const sources = scene.parts.filter(x => alias(x.partId).includes('source')).map(source => ({ x: Math.max(1, Math.min(width - 2, Math.round(source.transform.position.x))), y: Math.max(1, Math.min(height - 2, Math.round(source.transform.position.y))), amplitude: Number(source.properties?.amplitude ?? 1), frequency: Number(source.properties?.frequency ?? 1) }));
  const step = () => { grid.step({ sources: sources.map(s => ({ x: s.x, y: s.y, value: t => s.amplitude * Math.sin(2 * Math.PI * s.frequency * t) })) }); return snapshot(); };
  const snapshot = () => ({ width, height, time: grid.time, values: Array.from(grid.current) });
  return { step, snapshot, measure(probe) { if (probe.quantity !== 'displacement') return null; const x = Math.max(0, Math.min(width - 1, Math.round(probe.x ?? width / 2))), y = Math.max(0, Math.min(height - 1, Math.round(probe.y ?? height / 2))); return grid.sample(x, y); } };
}
