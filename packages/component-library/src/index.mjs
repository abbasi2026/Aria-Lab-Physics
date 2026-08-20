const DOMAIN_ORDER = ['mechanics', 'circuits', 'optics', 'waves', 'presentation'];

export class ComponentCatalog {
  constructor(parts = []) {
    this.parts = [...parts];
    this.byId = new Map(parts.map(part => [part.id, part]));
  }
  get(id) { return this.byId.get(id) ?? null; }
  list({ domain = null, query = '', family = null } = {}) {
    const q = query.trim().toLocaleLowerCase('fa');
    return this.parts.filter(part => {
      if (domain && part.domain !== domain) return false;
      if (family && part.family !== family && part.solver?.family !== family) return false;
      if (!q) return true;
      return [part.id, part.name, part.nameFa, part.family, ...(part.categories ?? []).flatMap(c => [c.path, c.pathFa])]
        .filter(Boolean).some(value => String(value).toLocaleLowerCase('fa').includes(q));
    });
  }
  domains() {
    const counts = Object.fromEntries(DOMAIN_ORDER.map(domain => [domain, 0]));
    for (const part of this.parts) counts[part.domain] = (counts[part.domain] ?? 0) + 1;
    return Object.entries(counts).filter(([, count]) => count > 0).map(([id, count]) => ({ id, count }));
  }
  defaultProperties(id) {
    const part = this.get(id); if (!part) return {};
    return Object.fromEntries((part.properties ?? []).filter(p => p.editable && p.default !== undefined).map(p => [p.key, structuredClone(p.default)]));
  }
  editableProperties(id) { return (this.get(id)?.properties ?? []).filter(p => p.editable); }
  propertyDescriptors(id, values = {}) {
    const canonical = this.editableProperties(id);
    const known = new Set(canonical.map(p => p.key));
    const inferred = Object.entries(values).filter(([key]) => !known.has(key)).map(([key, value]) => ({
      key, label: key, kind: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string',
      role: 'scene-extension', editable: true, observable: false, source: 'scene'
    }));
    return [...canonical, ...inferred];
  }
  ports(id) { return this.get(id)?.ports ?? []; }
  displayPorts(id) {
    const ports = this.ports(id);
    const seen = new Set();
    const out = [];
    for (const port of ports) {
      const role = String(port.legacyRole ?? port.id).split(',').map(x => x.trim()).filter(Boolean).sort().join(',');
      const key = `${port.kind}:${role}`;
      if (seen.has(key)) continue;
      seen.add(key); out.push(port);
    }
    return out;
  }
}

export const domainLabelsFa = {
  mechanics: 'مکانیک', circuits: 'مدارها', optics: 'اپتیک', waves: 'موج', presentation: 'ابزار', mixed: 'ترکیبی'
};
