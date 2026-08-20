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
    this.measurements.push({ id, inputs: structuredClone(inputs), output: structuredClone(output) });
    return output;
  }

  clearMeasurements() { this.measurements = []; }
}
