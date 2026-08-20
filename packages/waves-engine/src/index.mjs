import { clamp, degToRad, radToDeg } from '../../physics-core/src/math.mjs';

export function waveSpeed({ frequency, wavelength }) {
  if (!(frequency >= 0 && wavelength >= 0)) throw new Error('frequency and wavelength must be >= 0');
  return frequency * wavelength;
}

export function twoSourceInterference({ amplitude1, amplitude2, phase1 = 0, phase2 = 0 }) {
  const x = amplitude1 * Math.cos(phase1) + amplitude2 * Math.cos(phase2);
  const y = amplitude1 * Math.sin(phase1) + amplitude2 * Math.sin(phase2);
  return { amplitude: Math.hypot(x, y), phase: Math.atan2(y, x) };
}

export function singleSlitMinimum({ slitWidth, wavelength, order = 1 }) {
  if (!(slitWidth > 0 && wavelength >= 0 && order >= 0)) throw new Error('invalid diffraction parameters');
  const s = order * wavelength / slitWidth;
  if (s > 1) return { exists: false, angleDeg: null };
  return { exists: true, angleDeg: radToDeg(Math.asin(clamp(s, -1, 1))) };
}

export function dopplerMovingSource({ emittedFrequency, waveSpeed: v, sourceVelocity }) {
  if (!(emittedFrequency >= 0 && v > 0)) throw new Error('frequency >= 0 and wave speed > 0 required');
  if (sourceVelocity >= v) throw new Error('sourceVelocity must be less than wave speed for this model');
  return emittedFrequency * v / (v - sourceVelocity);
}

export function sinusoid({ amplitude = 1, frequency, time, phase = 0 }) {
  return amplitude * Math.sin(2 * Math.PI * frequency * time + phase);
}

export * from './wave-grid.mjs';
