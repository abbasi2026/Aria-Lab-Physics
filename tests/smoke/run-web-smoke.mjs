import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = 4199;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['tools/dev-server/index.mjs'], {
  cwd: new URL('../..', import.meta.url),
  env: { ...process.env, PORT: String(port), GEMINI_API_KEY: '', GEMINI_MODEL: '' },
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
  assert.match(html, /id=\"experiment-select\"/);
  assert.match(html, /data-tab=\"guide\"/);
  assert.match(html, /data-tab=\"author\"/);
  await expectAsset('/apps/web/styles.css', /text\/css/, /\.app-shell/);
  const main = await expectAsset('/apps/web/src/main.js', /text\/javascript/, /SceneRuntime/);
  assert.match(main, /GroundedAIClient/);
  assert.match(main, /Rule \/ Step Builder/);
  assert.match(main, /renderExperimentLibrary/);
  assert.match(main, /renderPartTree/);
  assert.match(main, /renderExperimentTree/);
  assert.match(main, /renderTopicTree/);
  assert.match(main, /iconSvg/);
  assert.match(main, /buildExecutionFrame/);
  assert.match(main, /toggleInteractivePart/);
  assert.match(main, /renderPhysicsLayer/);
  assert.match(main, /attachInlineExecutionControl/);
  assert.match(main, /stage11Experiments/);
  assert.match(main, /stage12Experiments/);
  assert.match(main, /stage13Experiments/);
  assert.match(main, /stage14Experiments/);
  assert.match(main, /toggleLogicInput/);
  await expectAsset('/content/experiments/stage13/index.json', /application\/json/, /stage13\.d-flipflop/);
  await expectAsset('/content/experiments/stage14/index.json', /application\/json/, /stage14\.npn-switch/);
  const parts = await expectAsset('/datasets/parts/canonical-parts.json', /application\/json/, /circuits\.battery/);
  assert.equal(JSON.parse(parts).length, 203);
  const taxonomy = await expectAsset('/datasets/navigation/crocodile-taxonomy.json', /application\/json/, /Crocodile Physics 605 clean-room taxonomy/);
  const nav = JSON.parse(taxonomy);
  assert.equal(nav.stats.canonicalParts, 203);
  assert.equal(nav.stats.paletteEntries, 206);
  assert.equal(nav.stats.partLeafPaths, 39);
  assert.equal(nav.stats.experimentCategories, 8);
  assert.equal(nav.stats.legacyExperiments, 209);
  const experimentIndex = await expectAsset('/content/experiments/stage6/index.json', /application\/json/, /stage6\.rc-charge-guided/);
  assert.equal(JSON.parse(experimentIndex).length, 4);
  await expectAsset('/content/experiments/stage6/rc-charge-guided.json', /application\/json/, /\"schemaVersion\": \"2.0.0\"/);
  const missing = await fetch(`${base}/definitely-missing.asset`);
  assert.equal(missing.status, 404);
  console.log('Web smoke: Stage 14 active analog + Stage 13 stateful digital + Stage 12 logic + Stage 11 circuits + Stage 10 optics passed.');
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 1000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}
