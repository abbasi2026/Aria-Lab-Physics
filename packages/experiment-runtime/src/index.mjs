const clone = value => structuredClone(value);
const nowIso = () => new Date().toISOString();

export class ExperimentRuntime {
  constructor({ solvers = {} } = {}) {
    this.solvers = new Map(Object.entries(solvers));
    this.measurements = [];
  }

  register(id, solver) {
    if (this.solvers.has(id)) throw new Error(`Solver already registered: ${id}`);
    this.solvers.set(id, solver);
  }

  run(id, inputs) {
    const solver = this.solvers.get(id);
    if (!solver) throw new Error(`Unknown experiment solver: ${id}`);
    const output = solver(inputs);
    this.measurements.push({ id, inputs: clone(inputs), output: clone(output) });
    return output;
  }

  clearMeasurements() { this.measurements = []; }
}

export const EXPERIMENT_SCHEMA_VERSION = '2.0.0';

export function createExperimentDefinition({
  id = 'experiment.untitled',
  version = 1,
  title = 'Untitled experiment',
  titleFa = 'آزمایش بدون عنوان',
  domain = ['mixed'],
  scene = null,
} = {}) {
  return {
    schemaVersion: EXPERIMENT_SCHEMA_VERSION,
    id,
    version,
    title,
    titleFa,
    domain: Array.isArray(domain) ? domain : [domain],
    summary: '',
    summaryFa: '',
    learningObjectives: [],
    prerequisites: [],
    scene: scene ? clone(scene) : null,
    guide: { mode: 'guided', steps: [] },
    measurements: [],
    expectedResults: [],
    assessment: { passThreshold: 0.7, rules: [] },
    assistant: {
      enabled: true,
      mode: 'grounded-coach',
      conceptNotes: [],
      guardrails: ['Do not invent measurements.', 'Use only experiment, scene and runtime evidence.'],
    },
    metadata: { createdAt: nowIso(), updatedAt: nowIso(), authoringVersion: 'stage7' },
  };
}

export function validateExperimentDefinition(experiment) {
  const errors = [];
  if (!experiment || typeof experiment !== 'object') return { valid: false, errors: ['Experiment must be an object.'] };
  if (experiment.schemaVersion !== EXPERIMENT_SCHEMA_VERSION) errors.push(`Unsupported schemaVersion: ${experiment.schemaVersion ?? 'missing'}`);
  if (!experiment.id) errors.push('Experiment id is required.');
  if (!experiment.title && !experiment.titleFa) errors.push('Experiment title/titleFa is required.');
  if (!Array.isArray(experiment.domain) || experiment.domain.length === 0) errors.push('Experiment domain must be a non-empty array.');
  if (!experiment.scene || experiment.scene.schemaVersion !== '1.0.0') errors.push('Experiment scene must be Scene Model v1.');
  const steps = experiment.guide?.steps;
  if (!Array.isArray(steps)) errors.push('guide.steps must be an array.');
  else {
    const ids = new Set();
    for (const [index, step] of steps.entries()) {
      if (!step.id) errors.push(`guide.steps[${index}] requires id.`);
      else if (ids.has(step.id)) errors.push(`Duplicate step id: ${step.id}`);
      else ids.add(step.id);
      if (!step.instruction && !step.instructionFa) errors.push(`Step ${step.id ?? index} requires instruction/instructionFa.`);
      if (step.checks !== undefined && !Array.isArray(step.checks)) errors.push(`Step ${step.id ?? index} checks must be an array.`);
    }
  }
  const measurementIds = new Set();
  for (const [index, measurement] of (experiment.measurements ?? []).entries()) {
    if (!measurement.id) errors.push(`measurements[${index}] requires id.`);
    else if (measurementIds.has(measurement.id)) errors.push(`Duplicate measurement id: ${measurement.id}`);
    else measurementIds.add(measurement.id);
    if (!measurement.probe?.quantity) errors.push(`Measurement ${measurement.id ?? index} requires probe.quantity.`);
  }
  for (const rule of experiment.assessment?.rules ?? []) {
    if (!rule.id) errors.push('Assessment rule requires id.');
    const check = rule.check ?? rule;
    if (!check.type) errors.push(`Assessment rule ${rule.id ?? '?'} requires type.`);
    if (check.measurementId && !measurementIds.has(check.measurementId)) errors.push(`Assessment rule ${rule.id} references unknown measurement ${check.measurementId}.`);
  }
  return { valid: errors.length === 0, errors };
}

export class ExperimentAuthoringDocument {
  constructor(experiment = createExperimentDefinition(), { historyLimit = 100 } = {}) {
    const result = validateExperimentDefinition(experiment);
    if (!result.valid) throw new Error(result.errors.join('\n'));
    this.experiment = clone(experiment);
    this.historyLimit = historyLimit;
    this.undoStack = [];
    this.redoStack = [];
    this.listeners = new Set();
  }
  snapshot() { return clone(this.experiment); }
  toJSON(space = 2) { return JSON.stringify(this.experiment, null, space); }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(event) { for (const listener of this.listeners) listener({ event, experiment: this.snapshot() }); }
  #touch() { this.experiment.metadata = { ...(this.experiment.metadata ?? {}), updatedAt: nowIso(), authoringVersion: 'stage7' }; }
  #mutate(label, fn) {
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
    this.redoStack = [];
    fn(); this.#touch();
    const result = validateExperimentDefinition(this.experiment);
    if (!result.valid) { this.experiment = this.undoStack.pop(); throw new Error(result.errors.join('\n')); }
    this.emit(label); return this;
  }
  updateMetadata(patch) { return this.#mutate('update-metadata', () => Object.assign(this.experiment, clone(patch))); }
  setScene(scene) { return this.#mutate('set-scene', () => { this.experiment.scene = clone(scene); }); }
  addStep(step = {}) {
    const id = step.id ?? `step-${(this.experiment.guide?.steps?.length ?? 0) + 1}`;
    return this.#mutate('add-step', () => {
      this.experiment.guide ??= { mode: 'guided', steps: [] };
      this.experiment.guide.steps.push({ id, title: '', titleFa: '', instruction: '', instructionFa: 'مرحله جدید', whyFa: '', checks: [], hints: [], ...clone(step), id });
    });
  }
  updateStep(id, patch) { return this.#mutate('update-step', () => { const step = this.experiment.guide.steps.find(x => x.id === id); if (!step) throw new Error(`Unknown step ${id}`); Object.assign(step, clone(patch)); }); }
  replaceSteps(steps) { return this.#mutate('replace-steps', () => { this.experiment.guide ??= { mode: 'guided', steps: [] }; this.experiment.guide.steps = clone(steps); }); }
  addCheck(stepId, check = {}) { return this.#mutate('add-check', () => { const step = this.experiment.guide.steps.find(x => x.id === stepId); if (!step) throw new Error(`Unknown step ${stepId}`); step.checks ??= []; step.checks.push({ id: check.id ?? `check-${step.checks.length + 1}`, type: 'runtime-no-error', failureFa: 'شرط مرحله هنوز کامل نشده است.', ...clone(check) }); }); }
  updateCheck(stepId, checkIndex, patch) { return this.#mutate('update-check', () => { const step = this.experiment.guide.steps.find(x => x.id === stepId); if (!step) throw new Error(`Unknown step ${stepId}`); if (!step.checks?.[checkIndex]) throw new Error(`Unknown check ${checkIndex} in ${stepId}`); Object.assign(step.checks[checkIndex], clone(patch)); }); }
  removeCheck(stepId, checkIndex) { return this.#mutate('remove-check', () => { const step = this.experiment.guide.steps.find(x => x.id === stepId); if (!step) throw new Error(`Unknown step ${stepId}`); step.checks.splice(checkIndex, 1); }); }
  addHint(stepId, hint = {}) { return this.#mutate('add-hint', () => { const step = this.experiment.guide.steps.find(x => x.id === stepId); if (!step) throw new Error(`Unknown step ${stepId}`); step.hints ??= []; step.hints.push(typeof hint === 'string' ? { textFa: hint } : { textFa: 'راهنمایی جدید', ...clone(hint) }); }); }
  updateHint(stepId, hintIndex, patch) { return this.#mutate('update-hint', () => { const step = this.experiment.guide.steps.find(x => x.id === stepId); if (!step) throw new Error(`Unknown step ${stepId}`); const current = step.hints?.[hintIndex]; if (!current) throw new Error(`Unknown hint ${hintIndex} in ${stepId}`); step.hints[hintIndex] = typeof current === 'string' ? { textFa: current, ...clone(patch) } : { ...current, ...clone(patch) }; }); }
  removeHint(stepId, hintIndex) { return this.#mutate('remove-hint', () => { const step = this.experiment.guide.steps.find(x => x.id === stepId); if (!step) throw new Error(`Unknown step ${stepId}`); step.hints.splice(hintIndex, 1); }); }
  applyAIDraft(patch) { return this.#mutate('apply-ai-draft', () => { if (patch.summaryFa !== undefined) this.experiment.summaryFa = patch.summaryFa; if (Array.isArray(patch.learningObjectives)) this.experiment.learningObjectives = clone(patch.learningObjectives); if (Array.isArray(patch.steps)) { this.experiment.guide ??= { mode: 'guided', steps: [] }; this.experiment.guide.steps = clone(patch.steps); } if (Array.isArray(patch.assessmentRules)) { this.experiment.assessment ??= { passThreshold: 0.7, rules: [] }; this.experiment.assessment.rules = clone(patch.assessmentRules); } }); }
  removeStep(id) { return this.#mutate('remove-step', () => { this.experiment.guide.steps = this.experiment.guide.steps.filter(x => x.id !== id); }); }
  moveStep(id, targetIndex) { return this.#mutate('move-step', () => { const steps = this.experiment.guide.steps; const index = steps.findIndex(x => x.id === id); if (index < 0) throw new Error(`Unknown step ${id}`); const [step] = steps.splice(index, 1); steps.splice(Math.max(0, Math.min(steps.length, targetIndex)), 0, step); }); }
  addMeasurement(measurement) { return this.#mutate('add-measurement', () => { this.experiment.measurements ??= []; this.experiment.measurements.push(clone(measurement)); }); }
  updateMeasurement(id, patch) { return this.#mutate('update-measurement', () => { const item = this.experiment.measurements.find(x => x.id === id); if (!item) throw new Error(`Unknown measurement ${id}`); Object.assign(item, clone(patch)); }); }
  undo() { const previous = this.undoStack.pop(); if (!previous) return false; this.redoStack.push(this.snapshot()); this.experiment = previous; this.emit('undo'); return true; }
  redo() { const next = this.redoStack.pop(); if (!next) return false; this.undoStack.push(this.snapshot()); this.experiment = next; this.emit('redo'); return true; }
}

function partMatches(part, check) {
  if (check.instanceId && part.instanceId !== check.instanceId) return false;
  if (check.partId && part.partId !== check.partId) return false;
  return true;
}

function latestMeasurement(runtime, id) {
  const series = runtime?.recorder?.get?.(id) ?? [];
  return series.length ? series[series.length - 1] : null;
}

function resolveValue(check, context) {
  const { scene, runtime } = context;
  if (check.source === 'simulation-time') return runtime?.clock?.time ?? 0;
  if (check.source === 'measurement') return latestMeasurement(runtime, check.measurementId)?.value ?? null;
  if (check.source === 'property') {
    const part = scene.parts.find(p => partMatches(p, check));
    return part?.properties?.[check.property] ?? null;
  }
  return null;
}

export function evaluateCheck(check, context) {
  const scene = context.scene ?? { parts: [], connections: [] };
  const runtime = context.runtime ?? null;
  let passed = false, actual = null;
  switch (check.type) {
    case 'part-exists': {
      actual = scene.parts.filter(part => partMatches(part, check)).length;
      passed = actual >= (check.count ?? 1); break;
    }
    case 'connection-exists': {
      const matches = scene.connections.filter(connection => {
        if (check.kind && connection.kind !== check.kind) return false;
        if (check.fromInstanceId && connection.from?.instanceId !== check.fromInstanceId) return false;
        if (check.toInstanceId && connection.to?.instanceId !== check.toInstanceId) return false;
        return true;
      });
      actual = matches.length; passed = actual >= (check.count ?? 1); break;
    }
    case 'property-range': {
      actual = resolveValue({ ...check, source: 'property' }, { scene, runtime });
      passed = Number.isFinite(Number(actual)) && (check.min === undefined || Number(actual) >= check.min) && (check.max === undefined || Number(actual) <= check.max); break;
    }
    case 'property-equals': {
      actual = resolveValue({ ...check, source: 'property' }, { scene, runtime });
      passed = actual === check.value || (typeof check.value === 'number' && Math.abs(Number(actual) - check.value) <= (check.tolerance ?? 1e-9)); break;
    }
    case 'simulation-time': {
      actual = runtime?.clock?.time ?? 0; passed = actual >= (check.min ?? 0); break;
    }
    case 'measurement-range': {
      actual = latestMeasurement(runtime, check.measurementId)?.value ?? null;
      passed = Number.isFinite(actual) && (check.min === undefined || actual >= check.min) && (check.max === undefined || actual <= check.max); break;
    }
    case 'measurement-absolute-min': {
      actual = latestMeasurement(runtime, check.measurementId)?.value ?? null;
      passed = Number.isFinite(actual) && Math.abs(actual) >= Number(check.min ?? 0); break;
    }
    case 'measurement-sample-count': {
      actual = runtime?.recorder?.get?.(check.measurementId)?.length ?? 0;
      passed = actual >= Number(check.min ?? 1); break;
    }
    case 'measurement-peak-absolute-min': {
      const values = (runtime?.recorder?.get?.(check.measurementId) ?? []).map(sample => Math.abs(sample.value));
      actual = values.length ? Math.max(...values) : null;
      passed = Number.isFinite(actual) && actual >= Number(check.min ?? 0); break;
    }
    case 'runtime-no-error': {
      actual = runtime?.snapshot?.()?.state?.error ?? null; passed = !actual; break;
    }
    case 'scene-domain': {
      actual = scene.domain; passed = Array.isArray(check.value) ? check.value.includes(actual) : actual === check.value; break;
    }
    default: throw new Error(`Unknown experiment check type: ${check.type}`);
  }
  return { id: check.id ?? null, type: check.type, passed, actual, messageFa: passed ? (check.successFa ?? 'انجام شد.') : (check.failureFa ?? 'هنوز شرط این مرحله کامل نشده است.') };
}

export class GuidedExperimentSession {
  constructor(experiment, { sceneProvider, runtimeProvider } = {}) {
    const validation = validateExperimentDefinition(experiment);
    if (!validation.valid) throw new Error(validation.errors.join('\n'));
    this.experiment = clone(experiment);
    this.sceneProvider = sceneProvider ?? (() => this.experiment.scene);
    this.runtimeProvider = runtimeProvider ?? (() => null);
    this.currentStepIndex = 0;
    this.completedSteps = new Set();
    this.hintUse = new Map();
    this.events = [];
    this.startedAt = null;
    this.finishedAt = null;
  }
  start() { this.startedAt ??= nowIso(); this.events.push({ type: 'start', at: nowIso() }); return this.state(); }
  reset() { this.currentStepIndex = 0; this.completedSteps.clear(); this.hintUse.clear(); this.events = []; this.startedAt = null; this.finishedAt = null; return this.state(); }
  steps() { return this.experiment.guide?.steps ?? []; }
  currentStep() { return this.steps()[this.currentStepIndex] ?? null; }
  context() { return { scene: clone(this.sceneProvider()), runtime: this.runtimeProvider() }; }
  evaluateStep(index = this.currentStepIndex) {
    const step = this.steps()[index];
    if (!step) return { complete: true, results: [] };
    const context = this.context();
    const results = (step.checks ?? []).map(check => evaluateCheck(check, context));
    const complete = results.every(result => result.passed);
    if (complete) this.completedSteps.add(step.id);
    return { stepId: step.id, complete, results };
  }
  advance({ force = false } = {}) {
    const evaluation = this.evaluateStep();
    if (!force && !evaluation.complete) return { advanced: false, evaluation, state: this.state() };
    const step = this.currentStep();
    if (step) this.completedSteps.add(step.id);
    if (this.currentStepIndex < this.steps().length - 1) this.currentStepIndex += 1;
    else this.finishedAt ??= nowIso();
    this.events.push({ type: 'advance', stepId: step?.id ?? null, at: nowIso(), forced: force });
    return { advanced: true, evaluation, state: this.state() };
  }
  previous() { if (this.currentStepIndex > 0) this.currentStepIndex -= 1; return this.state(); }
  getHint() {
    const step = this.currentStep(); if (!step) return null;
    const hints = step.hints ?? [];
    const used = this.hintUse.get(step.id) ?? 0;
    const hint = hints[Math.min(used, Math.max(0, hints.length - 1))] ?? null;
    if (hint) { this.hintUse.set(step.id, used + 1); this.events.push({ type: 'hint', stepId: step.id, at: nowIso(), index: used }); }
    return hint;
  }
  progress() {
    const total = this.steps().length;
    const completed = this.completedSteps.size;
    return { total, completed, ratio: total ? completed / total : 1 };
  }
  state() { return { currentStepIndex: this.currentStepIndex, currentStep: clone(this.currentStep()), completedSteps: [...this.completedSteps], progress: this.progress(), startedAt: this.startedAt, finishedAt: this.finishedAt }; }
  assess() { return evaluateAssessment(this.experiment, this.context()); }
}

export function evaluateAssessment(experiment, context) {
  const rules = experiment.assessment?.rules ?? [];
  let earned = 0, possible = 0;
  const results = rules.map(rule => {
    const weight = Number(rule.weight ?? 1); possible += weight;
    const check = rule.check ?? rule;
    const result = evaluateCheck(check, context);
    if (result.passed) earned += weight;
    return { ...result, ruleId: rule.id, weight };
  });
  const ratio = possible ? earned / possible : 1;
  const threshold = Number(experiment.assessment?.passThreshold ?? 0.7);
  return { passed: ratio >= threshold, ratio, percent: Math.round(ratio * 100), earned, possible, threshold, results };
}

export function buildAssistantContext(experiment, session, { includeScene = true, includeRuntime = true } = {}) {
  const step = session?.currentStep?.() ?? null;
  const evaluation = session?.evaluateStep?.() ?? null;
  const scene = session?.sceneProvider?.() ?? experiment.scene;
  const runtime = session?.runtimeProvider?.() ?? null;
  return {
    role: 'Aria Lab grounded physics coach',
    experiment: {
      id: experiment.id,
      title: experiment.title,
      titleFa: experiment.titleFa,
      summaryFa: experiment.summaryFa,
      learningObjectives: clone(experiment.learningObjectives ?? []),
      expectedResults: clone(experiment.expectedResults ?? []),
      conceptNotes: clone(experiment.assistant?.conceptNotes ?? []),
    },
    currentStep: step ? { id: step.id, titleFa: step.titleFa, instructionFa: step.instructionFa, whyFa: step.whyFa } : null,
    evidence: {
      evaluation: clone(evaluation),
      scene: includeScene ? clone(scene) : undefined,
      runtime: includeRuntime && runtime?.snapshot ? clone(runtime.snapshot()) : undefined,
    },
    guardrails: clone(experiment.assistant?.guardrails ?? []),
  };
}

export class ExperimentCoach {
  constructor(experiment, session) { this.experiment = experiment; this.session = session; }
  diagnose() {
    const step = this.session.currentStep();
    if (!step) return { status: 'finished', messageFa: 'همه مراحل راهنما به پایان رسیده است.' };
    const evaluation = this.session.evaluateStep();
    if (evaluation.complete) return { status: 'ready', messageFa: 'شرط‌های این مرحله کامل است؛ می‌توانید به مرحله بعد بروید.', evaluation };
    const failed = evaluation.results.filter(result => !result.passed);
    const hint = this.session.getHint();
    return {
      status: 'needs-action',
      messageFa: hint?.textFa ?? hint ?? failed[0]?.messageFa ?? 'شرط‌های مرحله را بررسی کنید.',
      failedChecks: failed,
      context: buildAssistantContext(this.experiment, this.session, { includeScene: false, includeRuntime: true }),
    };
  }
}
