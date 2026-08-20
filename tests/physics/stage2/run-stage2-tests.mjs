import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { convert, SimulationClock, nearlyEqual } from '../../../packages/physics-core/src/index.mjs';
import * as mech from '../../../packages/mechanics-engine/src/index.mjs';
import * as circuits from '../../../packages/circuits-engine/src/index.mjs';
import * as optics from '../../../packages/optics-engine/src/index.mjs';
import * as waves from '../../../packages/waves-engine/src/index.mjs';
import { ExperimentRuntime } from '../../../packages/experiment-runtime/src/index.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

function close(actual, expected, tolerance = 1e-9, label = '') {
  assert.ok(nearlyEqual(actual, expected, tolerance), `${label}: expected ${expected}, got ${actual}`);
}

// Physics core
close(convert(100, 'cm', 'm'), 1, 1e-12, 'cm->m');
close(convert(1, 'kHz', 'Hz'), 1000, 1e-12, 'kHz->Hz');
close(convert(180, 'deg', 'rad'), Math.PI, 1e-12, 'deg->rad');
const clock = new SimulationClock({ dt: 0.01 });
let ticks = 0; clock.runFor(1, () => ticks += 1);
assert.equal(ticks, 100); close(clock.time, 1, 1e-12, 'clock');

// Runtime solvers mapped to the 12 golden experiments.
const runtime = new ExperimentRuntime({ solvers: {
  'reference.ohms-law': ({ V, R }) => ({ I: circuits.ohmsLaw({ voltage: V, resistance: R }).current }),
  'reference.current-voltage-resistor': ({ V, R }) => ({ I: circuits.ohmsLaw({ voltage: V, resistance: R }).current }),
  'reference.newtons-second-law': ({ m, F }) => ({ a: mech.accelerationFromForce({ mass: m, force: F }) }),
  'reference.conservation-of-momentum': ({ m1, u1, m2, u2 }) => ({ p: mech.momentum({ mass: m1, velocity: u1 }) + mech.momentum({ mass: m2, velocity: u2 }) }),
  'reference.distance-time-slope': ({ dx, dt }) => ({ v: mech.velocityFromDistanceTime({ distance: dx, time: dt }) }),
  'reference.reflection-angle': ({ incidenceDeg }) => ({ reflectionDeg: optics.reflectionAngle({ incidenceDeg }).reflectionDeg }),
  'reference.snells-law': ({ n1, n2, incidenceDeg }) => ({ refractionDeg: optics.snellRefraction({ n1, n2, incidenceDeg }).refractionDeg }),
  'reference.thin-lens': ({ f, u }) => ({ v: optics.thinLens({ focalLength: f, objectDistance: u }).imageDistance }),
  'reference.wave-interference': ({ a1, a2, phase1, phase2 }) => ({ amplitude: waves.twoSourceInterference({ amplitude1: a1, amplitude2: a2, phase1, phase2 }).amplitude }),
  'reference.single-slit-diffraction': ({ a, wavelength, order }) => ({ angleDeg: waves.singleSlitMinimum({ slitWidth: a, wavelength, order }).angleDeg }),
  'reference.doppler-source': ({ f, v, vs }) => ({ fObs: waves.dopplerMovingSource({ emittedFrequency: f, waveSpeed: v, sourceVelocity: vs }) }),
  'reference.wave-speed': ({ f, wavelength }) => ({ v: waves.waveSpeed({ frequency: f, wavelength }) }),
} });

// Execute golden cases declared in content files where direct field mapping is available.
const refs = JSON.parse(fs.readFileSync(path.join(root, 'tests/physics/golden/reference-experiments.json'), 'utf8'));
let declaredCases = 0;
for (const ref of refs) {
  const exp = JSON.parse(fs.readFileSync(path.join(root, ref.file), 'utf8'));
  for (const c of exp.assessment?.goldenCases ?? []) {
    declaredCases += 1;
    const out = runtime.run(ref.id, normalizeInputs(ref.id, c.inputs));
    for (const [key, expected] of Object.entries(normalizeExpected(ref.id, c.expect))) {
      if (typeof expected === 'number') close(out[key], expected, c.tolerance ?? 1e-9, `${ref.id}.${key}`);
    }
  }
}

// Additional engine behavior tests beyond the legacy-derived goldens.
const coll = mech.oneDimensionalCollision({ m1: 1, u1: 2, m2: 1, u2: 0, restitution: 1 });
close(coll.v1, 0, 1e-12, 'elastic collision v1'); close(coll.v2, 2, 1e-12, 'elastic collision v2');
const body = mech.integrateBody1D({ mass: 2, position: 0, velocity: 0 }, { dt: 0.5, force: 4 });
close(body.acceleration, 2, 1e-12, 'integrator acceleration'); close(body.velocity, 1, 1e-12, 'integrator velocity');
close(circuits.seriesResistance([10, 20, 30]), 60, 1e-12, 'series R');
close(circuits.parallelResistance([100, 100]), 50, 1e-12, 'parallel R');
const rc = circuits.rcCharging({ supplyVoltage: 10, resistance: 1000, capacitance: 0.001, time: 1 });
close(rc.capacitorVoltage, 10 * (1 - Math.exp(-1)), 1e-12, 'RC charge');
const tir = optics.snellRefraction({ n1: 1.5, n2: 1, incidenceDeg: 60 }); assert.equal(tir.totalInternalReflection, true);
const interference = waves.twoSourceInterference({ amplitude1: 1, amplitude2: 1, phase1: 0, phase2: Math.PI });
close(interference.amplitude, 0, 1e-12, 'destructive interference');

console.log(`PASS Stage 2 scientific tests`);
console.log(`Golden experiments: ${refs.length}`);
console.log(`Declared golden cases executed: ${declaredCases}`);
console.log(`Runtime measurements captured: ${runtime.measurements.length}`);

function normalizeInputs(id, i) {
  switch (id) {
    case 'reference.ohms-law':
    case 'reference.current-voltage-resistor': return { V: i.V ?? i.voltage, R: i.R ?? i.resistance };
    case 'reference.conservation-of-momentum': return { m1: i.m1, u1: i.u1, m2: i.m2, u2: i.u2 };
    case 'reference.distance-time-slope': return { dx: i.dx ?? i.distance ?? (i.x1 - i.x0), dt: i.dt ?? i.time ?? (i.t1 - i.t0) };
    case 'reference.reflection-angle': return { incidenceDeg: i.incidenceDeg ?? i.incidence_deg ?? i.theta_i ?? i.incidence };
    case 'reference.snells-law': return { n1: i.n1, n2: i.n2, incidenceDeg: i.incidenceDeg ?? i.theta1_deg ?? i.theta1 };
    case 'reference.thin-lens': return { f: i.f, u: i.u };
    case 'reference.wave-interference': return { a1: i.a1 ?? i.A1, a2: i.a2 ?? i.A2, phase1: i.phase1 ?? 0, phase2: i.phase2 ?? ((i.phase_diff_deg ?? 0) * Math.PI / 180) };
    case 'reference.single-slit-diffraction': return { a: i.a, wavelength: i.wavelength ?? i.lambda, order: i.order ?? i.m ?? 1 };
    case 'reference.doppler-source': return { f: i.f, v: i.v, vs: i.vs ?? i.v_s };
    case 'reference.wave-speed': return { f: i.f, wavelength: i.wavelength ?? i.lambda };
    default: return i;
  }
}

function normalizeExpected(id, e) {
  if (id === 'reference.conservation-of-momentum') return { p: e.p ?? e.p_total ?? e.p_before ?? e.totalMomentum };
  if (id === 'reference.reflection-angle') return { reflectionDeg: e.reflectionDeg ?? e.reflection_deg ?? e.theta_r ?? e.reflection };
  if (id === 'reference.snells-law') return { refractionDeg: e.refractionDeg ?? e.theta2_deg ?? e.theta2 };
  if (id === 'reference.thin-lens') return { v: e.v };
  if (id === 'reference.wave-interference') return { amplitude: e.amplitude ?? e.A_resultant ?? e.A };
  if (id === 'reference.single-slit-diffraction') return { angleDeg: e.angleDeg ?? e.theta_deg ?? e.theta };
  if (id === 'reference.doppler-source') return { fObs: e.fObs ?? e.f_obs };
  return e;
}
