const UNIT_DEFS = {
  m: { dimension: 'length', factor: 1 },
  cm: { dimension: 'length', factor: 1e-2 },
  mm: { dimension: 'length', factor: 1e-3 },
  km: { dimension: 'length', factor: 1e3 },
  s: { dimension: 'time', factor: 1 },
  ms: { dimension: 'time', factor: 1e-3 },
  min: { dimension: 'time', factor: 60 },
  kg: { dimension: 'mass', factor: 1 },
  g: { dimension: 'mass', factor: 1e-3 },
  N: { dimension: 'force', factor: 1 },
  V: { dimension: 'voltage', factor: 1 },
  mV: { dimension: 'voltage', factor: 1e-3 },
  A: { dimension: 'current', factor: 1 },
  mA: { dimension: 'current', factor: 1e-3 },
  ohm: { dimension: 'resistance', factor: 1 },
  kohm: { dimension: 'resistance', factor: 1e3 },
  F: { dimension: 'capacitance', factor: 1 },
  uF: { dimension: 'capacitance', factor: 1e-6 },
  H: { dimension: 'inductance', factor: 1 },
  Hz: { dimension: 'frequency', factor: 1 },
  kHz: { dimension: 'frequency', factor: 1e3 },
  rad: { dimension: 'angle', factor: 1 },
  deg: { dimension: 'angle', factor: Math.PI / 180 },
  'm/s': { dimension: 'speed', factor: 1 },
  'm/s^2': { dimension: 'acceleration', factor: 1 },
  J: { dimension: 'energy', factor: 1 },
  W: { dimension: 'power', factor: 1 },
};

export function unitDefinition(unit) {
  const def = UNIT_DEFS[unit];
  if (!def) throw new Error(`Unknown unit: ${unit}`);
  return def;
}

export function convert(value, from, to) {
  if (from === to) return value;
  const a = unitDefinition(from);
  const b = unitDefinition(to);
  if (a.dimension !== b.dimension) {
    throw new Error(`Incompatible units: ${from} -> ${to}`);
  }
  return value * a.factor / b.factor;
}

export function toSI(value, unit) {
  const def = unitDefinition(unit);
  return value * def.factor;
}

export function fromSI(value, unit) {
  const def = unitDefinition(unit);
  return value / def.factor;
}

export function listUnits() {
  return Object.keys(UNIT_DEFS);
}
