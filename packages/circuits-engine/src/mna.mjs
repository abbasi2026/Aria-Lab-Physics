const OPEN_RESISTANCE = 1e15;
const CLOSED_RESISTANCE = 1e-9;

function gaussianSolve(matrix, rhs, eps = 1e-12) {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < eps) throw new Error('Circuit matrix is singular or floating');
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const p = a[col][col];
    for (let c = col; c <= n; c += 1) a[col][c] /= p;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = a[r][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c += 1) a[r][c] -= factor * a[col][c];
    }
  }
  return a.map(row => row[n]);
}

function normalizeNode(node) {
  if (node === 0 || node === '0' || node === 'gnd' || node === 'ground') return '0';
  return String(node);
}

export class CircuitNetwork {
  constructor() { this.components = []; }
  resistor(id, from, to, resistance) {
    if (!(resistance > 0)) throw new Error('resistance must be > 0');
    this.components.push({ id, type: 'resistor', from: normalizeNode(from), to: normalizeNode(to), resistance }); return this;
  }
  voltageSource(id, from, to, voltage) {
    if (!Number.isFinite(voltage)) throw new Error('voltage must be finite');
    this.components.push({ id, type: 'voltageSource', from: normalizeNode(from), to: normalizeNode(to), voltage }); return this;
  }
  currentSource(id, from, to, current) {
    if (!Number.isFinite(current)) throw new Error('current must be finite');
    this.components.push({ id, type: 'currentSource', from: normalizeNode(from), to: normalizeNode(to), current }); return this;
  }
  switch(id, from, to, closed, { onResistance = CLOSED_RESISTANCE, offResistance = OPEN_RESISTANCE } = {}) {
    return this.resistor(id, from, to, closed ? onResistance : offResistance);
  }
  lamp(id, from, to, { resistance }) { return this.resistor(id, from, to, resistance); }
  solveDC() { return solveDCNetwork(this.components); }
}

export function solveDCNetwork(components) {
  const nodes = new Set(['0']);
  for (const c of components) { nodes.add(normalizeNode(c.from)); nodes.add(normalizeNode(c.to)); }
  const nonGround = [...nodes].filter(n => n !== '0').sort();
  const nodeIndex = new Map(nonGround.map((n, i) => [n, i]));
  const voltageSources = components.filter(c => c.type === 'voltageSource');
  const n = nonGround.length;
  const m = voltageSources.length;
  const size = n + m;
  if (size === 0) return { nodeVoltages: { '0': 0 }, branchCurrents: {}, voltageSourceCurrents: {} };
  const A = Array.from({ length: size }, () => Array(size).fill(0));
  const z = Array(size).fill(0);
  const idx = node => node === '0' ? null : nodeIndex.get(node);

  for (const c of components) {
    const a = idx(normalizeNode(c.from));
    const b = idx(normalizeNode(c.to));
    if (c.type === 'resistor') {
      if (!(c.resistance > 0)) throw new Error(`Invalid resistance for ${c.id}`);
      const g = 1 / c.resistance;
      if (a !== null) A[a][a] += g;
      if (b !== null) A[b][b] += g;
      if (a !== null && b !== null) { A[a][b] -= g; A[b][a] -= g; }
    } else if (c.type === 'currentSource') {
      // Positive current is defined from `from` to `to`.
      if (a !== null) z[a] -= c.current;
      if (b !== null) z[b] += c.current;
    }
  }

  voltageSources.forEach((c, k) => {
    const row = n + k;
    const a = idx(normalizeNode(c.from));
    const b = idx(normalizeNode(c.to));
    if (a !== null) { A[a][row] += 1; A[row][a] += 1; }
    if (b !== null) { A[b][row] -= 1; A[row][b] -= 1; }
    z[row] = c.voltage;
  });

  const x = gaussianSolve(A, z);
  const nodeVoltages = { '0': 0 };
  nonGround.forEach((node, i) => { nodeVoltages[node] = x[i]; });
  const voltageSourceCurrents = {};
  voltageSources.forEach((c, k) => { voltageSourceCurrents[c.id] = x[n + k]; });
  const branchCurrents = {};
  const v = node => nodeVoltages[normalizeNode(node)] ?? 0;
  for (const c of components) {
    if (c.type === 'resistor') branchCurrents[c.id] = (v(c.from) - v(c.to)) / c.resistance;
    else if (c.type === 'currentSource') branchCurrents[c.id] = c.current;
    else if (c.type === 'voltageSource') branchCurrents[c.id] = voltageSourceCurrents[c.id];
  }
  return { nodeVoltages, branchCurrents, voltageSourceCurrents, matrix: A, rhs: z };
}
