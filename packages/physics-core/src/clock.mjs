export class SimulationClock {
  constructor({ dt = 1 / 120, time = 0 } = {}) {
    if (!(dt > 0)) throw new Error('dt must be > 0');
    this.dt = dt;
    this.time = time;
    this.steps = 0;
  }

  step(fn, count = 1) {
    if (!Number.isInteger(count) || count < 0) throw new Error('count must be a non-negative integer');
    for (let i = 0; i < count; i += 1) {
      fn?.(this.dt, this.time);
      this.time += this.dt;
      this.steps += 1;
    }
    return this.time;
  }

  runFor(duration, fn) {
    if (duration < 0) throw new Error('duration must be >= 0');
    const count = Math.round(duration / this.dt);
    return this.step(fn, count);
  }

  reset(time = 0) {
    this.time = time;
    this.steps = 0;
  }
}
