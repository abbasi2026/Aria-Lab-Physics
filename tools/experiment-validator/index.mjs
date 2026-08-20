import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const experimentDir = path.join(root, 'content', 'experiments');

function collectJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJson(full);
    return entry.isFile() && entry.name.endsWith('.json') ? [full] : [];
  });
}

const files = collectJson(experimentDir);
let errors = 0;
for (const full of files) {
  const file = path.relative(experimentDir, full);
  try {
    const data = JSON.parse(fs.readFileSync(full, 'utf8'));
    for (const required of ['id', 'title', 'domain', 'scene']) {
      if (!(required in data)) {
        console.error(`${file}: missing ${required}`);
        errors += 1;
      }
    }
    if (!Array.isArray(data.domain) || data.domain.length === 0) {
      console.error(`${file}: domain must be a non-empty array`);
      errors += 1;
    }
    if (!data.scene || !Array.isArray(data.scene.parts)) {
      console.error(`${file}: scene.parts must be an array`);
      errors += 1;
    }
  } catch (error) {
    console.error(`${file}: ${error.message}`);
    errors += 1;
  }
}

if (errors) process.exit(1);
console.log(`Validated ${files.length} experiment file(s).`);
