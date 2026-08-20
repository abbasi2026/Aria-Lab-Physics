const clone = value => structuredClone(value);
const nowIso = () => new Date().toISOString();

export function createBlankScene({ id = 'scene.untitled', title = 'Untitled scene', titleFa = 'صحنه بدون عنوان', domain = 'mixed' } = {}) {
  return {
    schemaVersion: '1.0.0',
    id,
    title,
    titleFa,
    domain,
    simulation: { dt: 1 / 120, timeScale: 1, gravity: { x: 0, y: -9.81 } },
    parts: [],
    connections: [],
    probes: [],
    metadata: { createdAt: nowIso(), updatedAt: nowIso(), editorVersion: 'stage4' },
  };
}

function assertScene(scene) {
  if (!scene || scene.schemaVersion !== '1.0.0') throw new Error('Unsupported or missing scene schemaVersion');
  if (!Array.isArray(scene.parts) || !Array.isArray(scene.connections)) throw new Error('Scene parts/connections must be arrays');
  const ids = new Set();
  for (const part of scene.parts) {
    if (!part.instanceId || !part.partId) throw new Error('Each part requires instanceId and partId');
    if (ids.has(part.instanceId)) throw new Error(`Duplicate instanceId: ${part.instanceId}`);
    ids.add(part.instanceId);
    if (!part.transform?.position || !Number.isFinite(part.transform.position.x) || !Number.isFinite(part.transform.position.y)) {
      throw new Error(`Invalid transform for ${part.instanceId}`);
    }
  }
  for (const connection of scene.connections) {
    if (!connection.id || !connection.kind || !connection.from?.instanceId || !connection.to?.instanceId) throw new Error('Invalid connection');
    if (!ids.has(connection.from.instanceId) || !ids.has(connection.to.instanceId)) throw new Error(`Connection ${connection.id} references missing part`);
  }
  return true;
}

export class SceneDocument {
  constructor(scene = createBlankScene(), { historyLimit = 100 } = {}) {
    assertScene(scene);
    this.scene = clone(scene);
    this.historyLimit = historyLimit;
    this.undoStack = [];
    this.redoStack = [];
    this.listeners = new Set();
    this.selection = { type: null, id: null };
    this.counters = new Map();
  }

  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(event) { for (const fn of this.listeners) fn({ event, scene: this.snapshot(), selection: { ...this.selection } }); }
  snapshot() { return clone(this.scene); }
  toJSON(space = 2) { return JSON.stringify(this.scene, null, space); }

  #checkpoint(label) {
    this.undoStack.push({ label, scene: this.snapshot(), selection: { ...this.selection } });
    if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
    this.redoStack = [];
  }
  #touch() {
    this.scene.metadata = { ...(this.scene.metadata ?? {}), updatedAt: nowIso(), editorVersion: 'stage4' };
  }
  #mutate(label, fn) {
    this.#checkpoint(label);
    fn();
    this.#touch();
    assertScene(this.scene);
    this.emit(label);
    return this;
  }
  makeInstanceId(partId = 'part') {
    const stem = String(partId).split('.').pop().replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'part';
    const next = (this.counters.get(stem) ?? 0) + 1;
    this.counters.set(stem, next);
    let candidate = `${stem}-${next}`;
    while (this.scene.parts.some(part => part.instanceId === candidate)) {
      const n = (this.counters.get(stem) ?? next) + 1;
      this.counters.set(stem, n); candidate = `${stem}-${n}`;
    }
    return candidate;
  }
  addPart({ partId, instanceId = null, position = { x: 0, y: 0 }, rotation = 0, scale = { x: 1, y: 1 }, properties = {} }) {
    if (!partId) throw new Error('partId is required');
    const id = instanceId ?? this.makeInstanceId(partId);
    if (this.scene.parts.some(part => part.instanceId === id)) throw new Error(`Duplicate instanceId: ${id}`);
    this.#mutate('add-part', () => this.scene.parts.push({ instanceId: id, partId, transform: { position: { ...position }, rotation, scale: { ...scale } }, properties: clone(properties) }));
    this.selectPart(id);
    return id;
  }
  removePart(instanceId) {
    if (!this.scene.parts.some(p => p.instanceId === instanceId)) return false;
    this.#mutate('remove-part', () => {
      this.scene.parts = this.scene.parts.filter(p => p.instanceId !== instanceId);
      this.scene.connections = this.scene.connections.filter(c => c.from.instanceId !== instanceId && c.to.instanceId !== instanceId);
      this.scene.probes = (this.scene.probes ?? []).filter(p => p.instanceId !== instanceId);
      if (this.selection.type === 'part' && this.selection.id === instanceId) this.selection = { type: null, id: null };
    });
    return true;
  }
  updateTransform(instanceId, patch) {
    const part = this.scene.parts.find(p => p.instanceId === instanceId); if (!part) throw new Error(`Unknown part ${instanceId}`);
    return this.#mutate('update-transform', () => {
      if (patch.position) part.transform.position = { ...part.transform.position, ...patch.position };
      if (patch.rotation !== undefined) part.transform.rotation = patch.rotation;
      if (patch.scale) part.transform.scale = { ...(part.transform.scale ?? { x: 1, y: 1 }), ...patch.scale };
    });
  }
  updateProperties(instanceId, patch) {
    const part = this.scene.parts.find(p => p.instanceId === instanceId); if (!part) throw new Error(`Unknown part ${instanceId}`);
    return this.#mutate('update-properties', () => { part.properties = { ...part.properties, ...clone(patch) }; });
  }
  addConnection({ id = null, kind, from, to, properties = {} }) {
    if (!kind || !from?.instanceId || !to?.instanceId) throw new Error('kind/from/to required');
    const generated = id ?? `connection-${this.scene.connections.length + 1}`;
    if (this.scene.connections.some(c => c.id === generated)) throw new Error(`Duplicate connection id ${generated}`);
    this.#mutate('add-connection', () => this.scene.connections.push({ id: generated, kind, from: clone(from), to: clone(to), properties: clone(properties) }));
    this.selection = { type: 'connection', id: generated }; this.emit('select-connection');
    return generated;
  }
  removeConnection(id) {
    if (!this.scene.connections.some(c => c.id === id)) return false;
    this.#mutate('remove-connection', () => { this.scene.connections = this.scene.connections.filter(c => c.id !== id); });
    return true;
  }
  addProbe(probe) { return this.#mutate('add-probe', () => { this.scene.probes ??= []; this.scene.probes.push(clone(probe)); }); }
  updateSimulation(patch) { return this.#mutate('update-simulation', () => { this.scene.simulation = { ...this.scene.simulation, ...clone(patch) }; }); }
  selectPart(id) { this.selection = id ? { type: 'part', id } : { type: null, id: null }; this.emit('select-part'); }
  selectConnection(id) { this.selection = id ? { type: 'connection', id } : { type: null, id: null }; this.emit('select-connection'); }
  clearSelection() { this.selection = { type: null, id: null }; this.emit('clear-selection'); }
  undo() {
    const entry = this.undoStack.pop(); if (!entry) return false;
    this.redoStack.push({ label: entry.label, scene: this.snapshot(), selection: { ...this.selection } });
    this.scene = entry.scene; this.selection = entry.selection; this.emit('undo'); return true;
  }
  redo() {
    const entry = this.redoStack.pop(); if (!entry) return false;
    this.undoStack.push({ label: entry.label, scene: this.snapshot(), selection: { ...this.selection } });
    this.scene = entry.scene; this.selection = entry.selection; this.emit('redo'); return true;
  }
  replaceScene(scene, { clearHistory = true } = {}) {
    assertScene(scene);
    if (!clearHistory) this.#checkpoint('replace-scene');
    this.scene = clone(scene); this.selection = { type: null, id: null };
    if (clearHistory) { this.undoStack = []; this.redoStack = []; }
    this.emit('replace-scene'); return this;
  }
}

export { assertScene as validateSceneShape };
