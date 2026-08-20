const clone = value => structuredClone(value);
function searchable(item) { return [item.id,item.title,item.titleFa,item.domain,item.category,item.source,item.status,...(item.tags??[])].filter(Boolean).join(' ').toLocaleLowerCase('fa'); }
export class ExperimentLibrary {
  constructor(entries = []) { this.entries = new Map(); for (const item of entries) this.upsert(item); }
  upsert(item) {
    if (!item?.id) throw new Error('Library entry id is required.');
    const next = { version: 1, status: 'ready', source: 'aria', tags: [], ...clone(item) };
    const current = this.entries.get(next.id);
    if (current && Number(next.version ?? 1) < Number(current.version ?? 1)) throw new Error(`Cannot replace ${next.id} with older version.`);
    this.entries.set(next.id, next); return clone(next);
  }
  remove(id) { return this.entries.delete(id); }
  get(id) { const item = this.entries.get(id); return item ? clone(item) : null; }
  list({ query = '', domain = null, source = null, status = null, limit = Infinity } = {}) {
    const q = String(query).trim().toLocaleLowerCase('fa');
    return [...this.entries.values()].filter(item => {
      if (domain && item.domain !== domain && !(Array.isArray(item.domain) && item.domain.includes(domain))) return false;
      if (source && item.source !== source) return false;
      if (status && item.status !== status) return false;
      return !q || searchable(item).includes(q);
    }).sort((a,b) => String(a.titleFa||a.title||a.id).localeCompare(String(b.titleFa||b.title||b.id), 'fa')).slice(0, limit).map(clone);
  }
  stats() {
    const bySource = {}, byDomain = {}, byStatus = {};
    for (const item of this.entries.values()) {
      bySource[item.source] = (bySource[item.source] ?? 0) + 1;
      const domains = Array.isArray(item.domain) ? item.domain : [item.domain]; for (const d of domains.filter(Boolean)) byDomain[d] = (byDomain[d] ?? 0) + 1;
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }
    return { total: this.entries.size, bySource, byDomain, byStatus };
  }
}
export function createLibraryEntryFromExperiment(experiment, path = null) {
  return { id: experiment.id, version: experiment.version ?? 1, title: experiment.title, titleFa: experiment.titleFa, domain: experiment.domain?.[0] ?? 'mixed', source: 'aria', status: 'ready', path, tags: ['guided'] };
}
