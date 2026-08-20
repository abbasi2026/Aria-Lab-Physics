import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = 4199;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['tools/dev-server/index.mjs'], {
  cwd: new URL('../..', import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});

let stderr = '';
child.stderr.on('data', chunk => { stderr += chunk; });

async function waitForServer(timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${base}/`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Dev server did not become ready. ${stderr}`);
}

async function expectAsset(path, expectedType, contains) {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, `${path} must return 200`);
  assert.match(response.headers.get('content-type') ?? '', expectedType, `${path} content-type`);
  const text = await response.text();
  if (contains) assert.match(text, contains, `${path} expected content`);
  return text;
}

try {
  await waitForServer();
  const html = await expectAsset('/', /text\/html/, /آزمایشگاه فیزیک آریا/);
  assert.match(html, /\/apps\/web\/styles\.css/);
  assert.match(html, /\/apps\/web\/src\/main\.js/);
  await expectAsset('/apps/web/styles.css', /text\/css/, /\.app-shell/);
  await expectAsset('/apps/web/src/main.js', /text\/javascript/, /SceneRuntime/);
  const parts = await expectAsset('/datasets/parts/canonical-parts.json', /application\/json/, /circuits\.battery/);
  assert.equal(JSON.parse(parts).length, 203);
  const missing = await fetch(`${base}/definitely-missing.asset`);
  assert.equal(missing.status, 404);
  console.log('Web smoke: 6 checks passed.');
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 1000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}
