import { assertFinite } from '../../physics-core/src/math.mjs';

export function accelerationFromForce({ force, mass }) {
  assertFinite('force', force); assertFinite('mass', mass);
  if (!(mass > 0)) throw new Error('mass must be > 0');
  return force / mass;
}

export function momentum({ mass, velocity }) {
  if (!(mass >= 0)) throw new Error('mass must be >= 0');
  return mass * velocity;
}

export function velocityFromDistanceTime({ distance, time }) {
  if (!(time > 0)) throw new Error('time must be > 0');
  return distance / time;
}

export function springForce({ k, extension }) {
  if (!(k >= 0)) throw new Error('k must be >= 0');
  return -k * extension;
}

export function kineticFriction({ muK, normalForce, velocity = 0 }) {
  if (muK < 0 || normalForce < 0) throw new Error('muK and normalForce must be >= 0');
  if (velocity === 0) return 0;
  return -Math.sign(velocity) * muK * normalForce;
}

export function integrateBody1D(state, { dt, force = 0, gravity = 0, drag = 0 } = {}) {
  if (!(dt > 0)) throw new Error('dt must be > 0');
  const { mass, position, velocity } = state;
  if (!(mass > 0)) throw new Error('mass must be > 0');
  const dragForce = -drag * velocity;
  const acceleration = (force + mass * gravity + dragForce) / mass;
  // Semi-implicit Euler: deterministic and stable enough for the MVP.
  const nextVelocity = velocity + acceleration * dt;
  const nextPosition = position + nextVelocity * dt;
  return { ...state, position: nextPosition, velocity: nextVelocity, acceleration };
}

export function oneDimensionalCollision({ m1, u1, m2, u2, restitution = 1 }) {
  if (!(m1 > 0 && m2 > 0)) throw new Error('masses must be > 0');
  if (restitution < 0 || restitution > 1) throw new Error('restitution must be in [0,1]');
  const v1 = (m1 * u1 + m2 * u2 - m2 * restitution * (u1 - u2)) / (m1 + m2);
  const v2 = (m1 * u1 + m2 * u2 + m1 * restitution * (u1 - u2)) / (m1 + m2);
  return { v1, v2 };
}

export * from './world2d.mjs';
