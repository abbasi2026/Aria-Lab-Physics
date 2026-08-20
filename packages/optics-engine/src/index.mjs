import { clamp, degToRad, radToDeg } from '../../physics-core/src/math.mjs';

export function reflectionAngle({ incidenceDeg }) {
  return { reflectionDeg: incidenceDeg };
}

export function snellRefraction({ n1, n2, incidenceDeg }) {
  if (!(n1 > 0 && n2 > 0)) throw new Error('refractive indices must be > 0');
  const s = n1 / n2 * Math.sin(degToRad(incidenceDeg));
  if (Math.abs(s) > 1) {
    return { totalInternalReflection: true, refractionDeg: null };
  }
  return { totalInternalReflection: false, refractionDeg: radToDeg(Math.asin(clamp(s, -1, 1))) };
}

export function thinLens({ focalLength, objectDistance }) {
  if (focalLength === 0 || objectDistance === 0) throw new Error('focalLength and objectDistance cannot be zero');
  const denom = 1 / focalLength - 1 / objectDistance;
  const imageDistance = Math.abs(denom) < 1e-15 ? Infinity : 1 / denom;
  const magnification = Number.isFinite(imageDistance) ? -imageDistance / objectDistance : -Infinity;
  return { imageDistance, magnification };
}

export function criticalAngle({ nFrom, nTo }) {
  if (!(nFrom > nTo && nTo > 0)) return null;
  return radToDeg(Math.asin(nTo / nFrom));
}

export * from './ray-scene.mjs';
