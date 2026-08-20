export function seriesBounds(points) {
  if (!points.length) return { minX: 0, maxX: 1, minY: -1, maxY: 1 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.time ?? p.x); maxX = Math.max(maxX, p.time ?? p.x); minY = Math.min(minY, p.value ?? p.y); maxY = Math.max(maxY, p.value ?? p.y); }
  if (minX === maxX) { minX -= 0.5; maxX += 0.5; } if (minY === maxY) { minY -= 0.5; maxY += 0.5; }
  return { minX, maxX, minY, maxY };
}
export function downsample(points, maxPoints = 600) {
  if (points.length <= maxPoints) return [...points];
  const step = (points.length - 1) / (maxPoints - 1); const out = [];
  for (let i = 0; i < maxPoints; i++) out.push(points[Math.round(i * step)]);
  return out;
}
export function svgPolyline(points, width, height, padding = 12) {
  if (!points.length) return '';
  const b = seriesBounds(points); const sx = x => padding + ((x - b.minX) / (b.maxX - b.minX)) * (width - 2 * padding); const sy = y => height - padding - ((y - b.minY) / (b.maxY - b.minY)) * (height - 2 * padding);
  return downsample(points).map(p => `${sx(p.time ?? p.x).toFixed(2)},${sy(p.value ?? p.y).toFixed(2)}`).join(' ');
}
