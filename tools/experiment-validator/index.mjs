import fs from 'node:fs';
import path from 'node:path';
import { validateExperimentDefinition } from '../../packages/experiment-runtime/src/index.mjs';

const root = process.cwd();
const experimentDir = path.join(root, 'content', 'experiments');

function collectJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJson(full);
    return entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json' ? [full] : [];
  });
}

function validateLegacy(data, file) {
  const issues = [];
  for (const required of ['id', 'title', 'domain', 'scene']) if (!(required in data)) issues.push(`missing ${required}`);
  if (!Array.isArray(data.domain) || data.domain.length === 0) issues.push('domain must be a non-empty array');
  if (!data.scene || !Array.isArray(data.scene.parts)) issues.push('scene.parts must be an array');
  return issues.map(issue => `${file}: ${issue}`);
}

const files = collectJson(experimentDir);
let errors = 0;
let legacyCount = 0;
let v2Count = 0;
for (const full of files) {
  const file = path.relative(experimentDir, full);
  try {
    const data = JSON.parse(fs.readFileSync(full, 'utf8'));
    const issues = data.schemaVersion === '2.0.0'
      ? (v2Count++, validateExperimentDefinition(data).errors.map(issue => `${file}: ${issue}`))
      : (legacyCount++, validateLegacy(data, file));
    for (const issue of issues) { console.error(issue); errors += 1; }
  } catch (error) {
    console.error(`${file}: ${error.message}`);
    errors += 1;
  }
}

if (errors) process.exit(1);
console.log(`Validated ${files.length} experiment file(s): ${legacyCount} legacy + ${v2Count} v2.`);
