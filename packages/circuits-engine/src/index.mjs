export function ohmsLaw({ voltage, current, resistance }) {
  const supplied = [voltage, current, resistance].filter(v => v !== undefined).length;
  if (supplied !== 2) throw new Error('Provide exactly two of voltage, current, resistance');
  if (voltage === undefined) return { voltage: current * resistance, current, resistance };
  if (current === undefined) {
    if (resistance === 0) throw new Error('Ideal zero resistance requires a network solver');
    return { voltage, current: voltage / resistance, resistance };
  }
  if (current === 0) throw new Error('Cannot infer resistance from zero current');
  return { voltage, current, resistance: voltage / current };
}

export function seriesResistance(resistances) {
  if (!resistances.length) return 0;
  if (resistances.some(r => r < 0)) throw new Error('resistance must be >= 0');
  return resistances.reduce((a, b) => a + b, 0);
}

export function parallelResistance(resistances) {
  if (!resistances.length) return Infinity;
  if (resistances.some(r => r < 0)) throw new Error('resistance must be >= 0');
  if (resistances.some(r => r === 0)) return 0;
  return 1 / resistances.reduce((sum, r) => sum + 1 / r, 0);
}

export function rcCharging({ supplyVoltage, resistance, capacitance, time, initialVoltage = 0 }) {
  if (!(resistance > 0 && capacitance > 0 && time >= 0)) throw new Error('R,C > 0 and time >= 0 required');
  const tau = resistance * capacitance;
  const capacitorVoltage = supplyVoltage + (initialVoltage - supplyVoltage) * Math.exp(-time / tau);
  const current = (supplyVoltage - initialVoltage) / resistance * Math.exp(-time / tau);
  return { capacitorVoltage, current, tau };
}

export function rlCurrentRise({ supplyVoltage, resistance, inductance, time, initialCurrent = 0 }) {
  if (!(resistance > 0 && inductance > 0 && time >= 0)) throw new Error('R,L > 0 and time >= 0 required');
  const tau = inductance / resistance;
  const steady = supplyVoltage / resistance;
  const current = steady + (initialCurrent - steady) * Math.exp(-time / tau);
  return { current, tau, steadyCurrent: steady };
}

export * from './mna.mjs';
