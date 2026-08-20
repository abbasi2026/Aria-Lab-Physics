export class ProbeRecorder {
  constructor({ maxSamples = 5000 } = {}) { this.maxSamples = maxSamples; this.series = new Map(); }
  record(id, time, value, metadata = {}) {
    if (!id || !Number.isFinite(time) || !Number.isFinite(value)) return;
    const series = this.series.get(id) ?? []; series.push({ time, value, ...metadata });
    if (series.length > this.maxSamples) series.splice(0, series.length - this.maxSamples);
    this.series.set(id, series);
  }
  get(id) { return structuredClone(this.series.get(id) ?? []); }
  list() { return [...this.series.keys()]; }
  clear(id = null) { if (id) this.series.delete(id); else this.series.clear(); }
  toCSV(id) {
    const rows = this.series.get(id) ?? []; return ['time,value', ...rows.map(r => `${r.time},${r.value}`)].join('\n');
  }
}
