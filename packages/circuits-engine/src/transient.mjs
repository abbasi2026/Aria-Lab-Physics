import { solveDCNetwork } from './mna.mjs';

const DEFAULT_DIODE = Object.freeze({ saturationCurrent: 1e-12, ideality: 1, thermalVoltage: 0.02585 });
const MIN_CONDUCTANCE = 1e-12;
const MAX_EXPONENT = 40;

const normalizeNode = node => (node === 0 || node === '0' || node === 'gnd' || node === 'ground') ? '0' : String(node);
const valueAt = (value, time) => typeof value === 'function' ? Number(value(time)) : Number(value);
const voltageAt = (result, from, to) => (result.nodeVoltages?.[normalizeNode(from)] ?? 0) - (result.nodeVoltages?.[normalizeNode(to)] ?? 0);

function diodeModel(voltage, spec) {
  const saturationCurrent = Number(spec.saturationCurrent ?? DEFAULT_DIODE.saturationCurrent);
  const ideality = Number(spec.ideality ?? DEFAULT_DIODE.ideality);
  const thermalVoltage = Number(spec.thermalVoltage ?? DEFAULT_DIODE.thermalVoltage);
  if (!(saturationCurrent > 0 && ideality > 0 && thermalVoltage > 0)) throw new Error('invalid diode parameters');
  const vt = ideality * thermalVoltage;
  const exponent = Math.max(-MAX_EXPONENT, Math.min(MAX_EXPONENT, voltage / vt));
  const exp = Math.exp(exponent);
  const current = saturationCurrent * (exp - 1);
  const conductance = Math.max(MIN_CONDUCTANCE, saturationCurrent * exp / vt);
  const equivalentCurrent = current - conductance * voltage;
  return { current, conductance, equivalentCurrent };
}

export class TransientCircuit {
  constructor({ dt = 1e-4, maxIterations = 40, tolerance = 1e-8 } = {}) {
    if (!(dt > 0 && maxIterations >= 1 && tolerance > 0)) throw new Error('invalid transient solver options');
    this.dt = dt;
    this.maxIterations = maxIterations;
    this.tolerance = tolerance;
    this.components = [];
    this.time = 0;
    this.state = { capacitorVoltages: {}, inductorCurrents: {}, nodeVoltages: { '0': 0 } };
    this.lastResult = { nodeVoltages: { '0': 0 }, branchCurrents: {} };
  }

  resistor(id, from, to, resistance) {
    if (!(resistance > 0)) throw new Error('resistance must be > 0');
    this.components.push({ id, type: 'resistor', from: normalizeNode(from), to: normalizeNode(to), resistance: Number(resistance) }); return this;
  }
  voltageSource(id, from, to, voltage) {
    this.components.push({ id, type: 'voltageSource', from: normalizeNode(from), to: normalizeNode(to), voltage }); return this;
  }
  currentSource(id, from, to, current) {
    this.components.push({ id, type: 'currentSource', from: normalizeNode(from), to: normalizeNode(to), current }); return this;
  }
  capacitor(id, from, to, capacitance, { initialVoltage = 0 } = {}) {
    if (!(capacitance > 0)) throw new Error('capacitance must be > 0');
    this.components.push({ id, type: 'capacitor', from: normalizeNode(from), to: normalizeNode(to), capacitance: Number(capacitance), initialVoltage: Number(initialVoltage) });
    this.state.capacitorVoltages[id] = Number(initialVoltage);
    return this;
  }
  inductor(id, from, to, inductance, { initialCurrent = 0 } = {}) {
    if (!(inductance > 0)) throw new Error('inductance must be > 0');
    this.components.push({ id, type: 'inductor', from: normalizeNode(from), to: normalizeNode(to), inductance: Number(inductance), initialCurrent: Number(initialCurrent) });
    this.state.inductorCurrents[id] = Number(initialCurrent);
    return this;
  }
  diode(id, from, to, options = {}) {
    this.components.push({ id, type: 'diode', from: normalizeNode(from), to: normalizeNode(to), ...DEFAULT_DIODE, ...options }); return this;
  }
  led(id, from, to, { forwardVoltage = 2, onResistance = 20, offResistance = 1e9 } = {}) {
    if (!(forwardVoltage >= 0 && onResistance > 0 && offResistance > 0)) throw new Error('invalid LED parameters');
    this.components.push({ id, type: 'pwlDiode', from: normalizeNode(from), to: normalizeNode(to), forwardVoltage, onResistance, offResistance }); return this;
  }

  reset() {
    this.time = 0;
    this.state.nodeVoltages = { '0': 0 };
    for (const c of this.components) {
      if (c.type === 'capacitor') this.state.capacitorVoltages[c.id] = Number(c.initialVoltage ?? this.state.capacitorVoltages[c.id] ?? 0);
      if (c.type === 'inductor') this.state.inductorCurrents[c.id] = Number(c.initialCurrent ?? this.state.inductorCurrents[c.id] ?? 0);
    }
    this.lastResult = { nodeVoltages: { '0': 0 }, branchCurrents: {} };
  }

  step(dt = this.dt) {
    if (!(dt > 0)) throw new Error('dt must be > 0');
    const nextTime = this.time + dt;
    const previousCap = { ...this.state.capacitorVoltages };
    const previousInd = { ...this.state.inductorCurrents };
    let guess = { ...(this.state.nodeVoltages ?? { '0': 0 }) };
    let solved = null;
    let converged = false;

    for (let iteration = 0; iteration < this.maxIterations; iteration += 1) {
      const linear = [];
      for (const c of this.components) {
        if (c.type === 'resistor') linear.push({ ...c });
        else if (c.type === 'voltageSource') linear.push({ ...c, voltage: valueAt(c.voltage, nextTime) });
        else if (c.type === 'currentSource') linear.push({ ...c, current: valueAt(c.current, nextTime) });
        else if (c.type === 'capacitor') {
          const conductance = c.capacitance / dt;
          linear.push({ id: `${c.id}::g`, type: 'resistor', from: c.from, to: c.to, resistance: 1 / conductance });
          linear.push({ id: `${c.id}::history`, type: 'currentSource', from: c.from, to: c.to, current: -conductance * (previousCap[c.id] ?? 0) });
        } else if (c.type === 'inductor') {
          const conductance = dt / c.inductance;
          linear.push({ id: `${c.id}::g`, type: 'resistor', from: c.from, to: c.to, resistance: 1 / conductance });
          linear.push({ id: `${c.id}::history`, type: 'currentSource', from: c.from, to: c.to, current: previousInd[c.id] ?? 0 });
        } else if (c.type === 'diode') {
          const vd = (guess[c.from] ?? 0) - (guess[c.to] ?? 0);
          const model = diodeModel(vd, c);
          linear.push({ id: `${c.id}::g`, type: 'resistor', from: c.from, to: c.to, resistance: 1 / model.conductance });
          linear.push({ id: `${c.id}::eq`, type: 'currentSource', from: c.from, to: c.to, current: model.equivalentCurrent });
        } else if (c.type === 'pwlDiode') {
          const vd = (guess[c.from] ?? 0) - (guess[c.to] ?? 0);
          const on = vd >= c.forwardVoltage;
          const resistance = on ? c.onResistance : c.offResistance;
          const equivalentCurrent = on ? -c.forwardVoltage / resistance : 0;
          linear.push({ id: `${c.id}::g`, type: 'resistor', from: c.from, to: c.to, resistance });
          if (equivalentCurrent) linear.push({ id: `${c.id}::eq`, type: 'currentSource', from: c.from, to: c.to, current: equivalentCurrent });
        }
      }

      solved = solveDCNetwork(linear);
      let delta = 0;
      const keys = new Set([...Object.keys(guess), ...Object.keys(solved.nodeVoltages)]);
      for (const key of keys) delta = Math.max(delta, Math.abs((solved.nodeVoltages[key] ?? 0) - (guess[key] ?? 0)));
      if (delta <= this.tolerance) { guess = solved.nodeVoltages; converged = true; break; }
      const relaxation = Math.min(1, 0.25 / Math.max(delta, this.tolerance));
      const relaxed = {};
      for (const key of keys) relaxed[key] = (guess[key] ?? 0) + relaxation * ((solved.nodeVoltages[key] ?? 0) - (guess[key] ?? 0));
      guess = relaxed;
    }

    const hasDiode = this.components.some(c => c.type === 'diode');
    if (hasDiode && !converged) throw new Error(`Transient diode solve did not converge in ${this.maxIterations} iterations`);

    const branchCurrents = {};
    for (const c of this.components) {
      const v = voltageAt(solved, c.from, c.to);
      if (c.type === 'resistor') branchCurrents[c.id] = v / c.resistance;
      else if (c.type === 'voltageSource') branchCurrents[c.id] = solved.branchCurrents[c.id];
      else if (c.type === 'currentSource') branchCurrents[c.id] = valueAt(c.current, nextTime);
      else if (c.type === 'capacitor') {
        branchCurrents[c.id] = c.capacitance * (v - (previousCap[c.id] ?? 0)) / dt;
        this.state.capacitorVoltages[c.id] = v;
      } else if (c.type === 'inductor') {
        const current = (previousInd[c.id] ?? 0) + dt / c.inductance * v;
        branchCurrents[c.id] = current;
        this.state.inductorCurrents[c.id] = current;
      } else if (c.type === 'diode') branchCurrents[c.id] = diodeModel(v, c).current;
      else if (c.type === 'pwlDiode') branchCurrents[c.id] = v >= c.forwardVoltage ? (v - c.forwardVoltage) / c.onResistance : v / c.offResistance;
    }

    this.time = nextTime;
    this.state.nodeVoltages = { ...solved.nodeVoltages };
    this.lastResult = {
      time: this.time,
      nodeVoltages: { ...solved.nodeVoltages },
      branchCurrents,
      capacitorVoltages: { ...this.state.capacitorVoltages },
      inductorCurrents: { ...this.state.inductorCurrents },
      converged: !hasDiode || converged
    };
    return this.lastResult;
  }

  runFor(seconds, dt = this.dt) {
    if (!(seconds >= 0)) throw new Error('seconds must be >= 0');
    const steps = Math.round(seconds / dt);
    for (let i = 0; i < steps; i += 1) this.step(dt);
    return this.lastResult;
  }
}

export { diodeModel };
