export const EPSILON = 1e-12;
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const degToRad = deg => deg * Math.PI / 180;
export const radToDeg = rad => rad * 180 / Math.PI;
export const nearlyEqual = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance;
export const assertFinite = (name, value) => {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
};
