import { buildAssistantContext } from '../../experiment-runtime/src/index.mjs';

const clone = value => structuredClone(value);
const MAX_EVIDENCE = 8;

function finite(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }
function summarizeArray(values, max = 12) {
  if (!Array.isArray(values)) return values;
  if (values.length <= max) return clone(values);
  const numeric = values.filter(Number.isFinite);
  return {
    kind: 'array-summary', count: values.length,
    min: numeric.length ? Math.min(...numeric) : null,
    max: numeric.length ? Math.max(...numeric) : null,
    sample: clone(values.slice(0, max)),
  };
}

export function summarizeRuntimeEvidence(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const out = clone(snapshot);
  if (out.state?.values) out.state.values = summarizeArray(out.state.values);
  if (out.state?.grid) out.state.grid = summarizeArray(out.state.grid);
  if (out.state?.bodies && out.state.bodies.length > 30) out.state.bodies = out.state.bodies.slice(0, 30);
  if (out.state?.path && out.state.path.length > 40) out.state.path = out.state.path.slice(0, 40);
  return out;
}

export function createGroundedContext(experiment, session, options = {}) {
  const context = buildAssistantContext(experiment, session, options);
  if (context.evidence?.runtime) context.evidence.runtime = summarizeRuntimeEvidence(context.evidence.runtime);
  if (context.evidence?.scene?.parts?.length > 80) context.evidence.scene.parts = context.evidence.scene.parts.slice(0, 80);
  if (context.evidence?.scene?.connections?.length > 120) context.evidence.scene.connections = context.evidence.scene.connections.slice(0, 120);
  return context;
}

export function buildCoachRequest({ experiment, session, questionFa = 'برای مرحله فعلی راهنمایی کن.' } = {}) {
  if (!experiment) throw new Error('experiment is required');
  const context = createGroundedContext(experiment, session, { includeScene: true, includeRuntime: true });
  return {
    task: 'grounded-physics-coach',
    questionFa: String(questionFa).slice(0, 2000),
    context,
    responseContract: {
      answerFa: 'string',
      nextActionFa: 'string|null',
      evidence: 'array of short evidence labels grounded in context',
      confidence: 'number 0..1',
    },
  };
}

export function buildExperimentDraftRequest({ experiment, scene, intentFa = '' } = {}) {
  if (!experiment || !scene) throw new Error('experiment and scene are required');
  return {
    task: 'experiment-guide-draft',
    intentFa: String(intentFa).slice(0, 3000),
    experiment: {
      id: experiment.id, titleFa: experiment.titleFa, summaryFa: experiment.summaryFa,
      domain: clone(experiment.domain), learningObjectives: clone(experiment.learningObjectives ?? []),
      assistant: { conceptNotes: clone(experiment.assistant?.conceptNotes ?? []), guardrails: clone(experiment.assistant?.guardrails ?? []) },
    },
    scene: {
      schemaVersion: scene.schemaVersion, id: scene.id, domain: scene.domain,
      parts: clone((scene.parts ?? []).slice(0, 80)), connections: clone((scene.connections ?? []).slice(0, 120)),
      probes: clone((scene.probes ?? []).slice(0, 30)), simulation: clone(scene.simulation ?? {}),
    },
    allowedCheckTypes: ['part-exists','connection-exists','property-range','property-equals','simulation-time','measurement-range','measurement-sample-count','measurement-peak-absolute-min','runtime-no-error','scene-domain'],
    responseContract: {
      summaryFa: 'string', learningObjectives: 'string[]',
      steps: 'array of {id,titleFa,instructionFa,whyFa,checks[],hints:[{textFa}]}',
      assessmentRules: 'array of {id,weight,check}',
    },
  };
}

function cleanEvidence(evidence) {
  if (!Array.isArray(evidence)) return [];
  return evidence.slice(0, MAX_EVIDENCE).map(item => typeof item === 'string' ? item.slice(0, 300) : JSON.stringify(item).slice(0, 300));
}

export function validateCoachResponse(value) {
  if (!value || typeof value !== 'object') throw new Error('AI coach response must be an object.');
  if (typeof value.answerFa !== 'string' || !value.answerFa.trim()) throw new Error('AI coach response requires answerFa.');
  return {
    answerFa: value.answerFa.trim().slice(0, 5000),
    nextActionFa: typeof value.nextActionFa === 'string' ? value.nextActionFa.trim().slice(0, 1200) : null,
    evidence: cleanEvidence(value.evidence),
    confidence: Math.max(0, Math.min(1, finite(value.confidence) ?? 0.5)),
  };
}

export const ALLOWED_CHECK_TYPES = new Set(['part-exists','connection-exists','property-range','property-equals','simulation-time','measurement-range','measurement-sample-count','measurement-peak-absolute-min','runtime-no-error','scene-domain']);
function safeChecks(checks) {
  if (!Array.isArray(checks)) return [];
  return checks.slice(0, 12).map(check => {
    if (!check || !ALLOWED_CHECK_TYPES.has(check.type)) throw new Error(`Unsupported AI-generated check type: ${check?.type ?? 'missing'}`);
    return clone(check);
  });
}
export function validateExperimentDraftResponse(value) {
  if (!value || typeof value !== 'object') throw new Error('AI experiment draft must be an object.');
  const steps = Array.isArray(value.steps) ? value.steps.slice(0, 30).map((step, index) => ({
    id: String(step.id || `step-${index + 1}`).replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80),
    titleFa: String(step.titleFa ?? '').slice(0, 300),
    instructionFa: String(step.instructionFa ?? '').slice(0, 2000),
    whyFa: String(step.whyFa ?? '').slice(0, 1500),
    checks: safeChecks(step.checks),
    hints: Array.isArray(step.hints) ? step.hints.slice(0, 6).map(h => ({ textFa: String(h?.textFa ?? h ?? '').slice(0, 1000) })) : [],
  })) : [];
  if (!steps.length) throw new Error('AI experiment draft requires at least one step.');
  return {
    summaryFa: String(value.summaryFa ?? '').slice(0, 3000),
    learningObjectives: Array.isArray(value.learningObjectives) ? value.learningObjectives.slice(0, 12).map(x => String(x).slice(0, 500)) : [],
    steps,
    assessmentRules: Array.isArray(value.assessmentRules) ? value.assessmentRules.slice(0, 20).map((rule, index) => { const check = rule?.check ?? rule; if (!ALLOWED_CHECK_TYPES.has(check?.type)) throw new Error(`Unsupported AI assessment check type: ${check?.type ?? 'missing'}`); return { id: rule.id ?? `ai-rule-${index + 1}`, weight: Number(rule.weight ?? 1), check: clone(check) }; }) : [],
  };
}

export class GroundedAIClient {
  constructor({ coachEndpoint = '/api/ai/coach', draftEndpoint = '/api/ai/experiment-draft', fetchImpl = globalThis.fetch } = {}) {
    if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');
    this.coachEndpoint = coachEndpoint; this.draftEndpoint = draftEndpoint; this.fetch = fetchImpl;
  }
  async #post(url, payload) {
    const response = await this.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    let data = null; try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) { const error = new Error(data?.message ?? data?.error ?? `AI HTTP ${response.status}`); error.code = data?.code ?? data?.error ?? 'AI_REQUEST_FAILED'; error.status = response.status; throw error; }
    return data;
  }
  async coach(args) { return validateCoachResponse(await this.#post(this.coachEndpoint, buildCoachRequest(args))); }
  async draft(args) { return validateExperimentDraftResponse(await this.#post(this.draftEndpoint, buildExperimentDraftRequest(args))); }
}

export const AI_SYSTEM_GUARDRAILS = [
  'Use only evidence included in the request context.',
  'Never invent measurements, part states, connections, or completed steps.',
  'If evidence is insufficient, say so explicitly in Persian.',
  'Keep numerical claims tied to supplied runtime or measurement evidence.',
  'Return only the requested JSON object without markdown fences.',
];
