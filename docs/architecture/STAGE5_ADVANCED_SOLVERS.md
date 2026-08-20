# Stage 5 — Advanced Physics Solvers

Stage 5 extends the Stage 3/4 interactive runtime with higher-fidelity numerical models while preserving Scene Model v1 and deterministic stepping.

## 1. Circuits — transient/nonlinear MNA

Added `TransientCircuit` with backward-Euler companion models:

- Resistor
- Time-dependent voltage/current sources
- Capacitor: `G = C / dt` with history current
- Inductor: `G = dt / L` with history current
- Shockley diode solved by damped Newton iteration

The runtime automatically selects the transient solver when a scene contains capacitor, inductor, or diode parts. DC-only scenes continue to use the Stage 3 MNA solver.

Scientific guardrails:

- explicit timestep; no hidden timestep mutation
- nonlinear convergence failure is surfaced as an error
- capacitor voltage and inductor current are state variables
- branch currents are reconstructed for original components

Current limitation: transistor/BJT/MOSFET, AC phasor analysis and adaptive timestep are not yet implemented.

## 2. Mechanics — rotation and constraints

`Body2D` now includes:

- angle / angular velocity
- torque / angular acceleration
- inertia for circle and rectangular body
- force-at-point torque
- distance joints with iterative position/velocity correction

Scene Runtime supports persistent `forceX`, `forceY`, `torque` scene properties and mechanical connections with `properties.type = "distance-joint"`.

Current limitation: collision impulses are still translational; rotational contact impulse, polygon SAT, hinges, gears and pulley constraints remain future work.

## 3. Optics — spherical surfaces

`RayScene` now supports:

- ray-circle intersection
- spherical refractive interfaces (`nInside`, `nOutside`)
- spherical mirrors
- entry/exit refraction and total internal reflection

Current limitation: this is geometric ray optics; thick-lens material stacks, dispersion by wavelength, polarization and wave optics remain separate future work.

## 4. Waves — heterogeneous media and absorbing layers

`WaveGrid1D/2D` now support:

- per-cell wave-speed maps
- rectangular wave-speed regions
- CFL validation using maximum local wave speed
- absorbing sponge layers
- reflective/fixed boundaries
- obstacles
- 2D field energy measurement

Scene Runtime supports `aria.waves.medium-region`, `aria.waves.obstacle`, absorbing boundary properties, and an `energy` probe.

Current limitation: absorbing layers are sponge damping, not full PML; anisotropic media and GPU compute are not yet implemented.

## 5. Editor integration

Canonical Stage 1 properties remain untouched. Stage 5 adds Scene Extension property descriptors for properties present in Scene JSON but not in the canonical Crocodile-derived schema. This allows advanced Aria-native properties such as torque and absorbing-layer settings to be edited without contaminating the 203-part canonical dataset.

## 6. Reference scenes

- `content/scenes/stage5/circuit-rc-transient.json`
- `content/scenes/stage5/mechanics-rotational-joint.json`
- `content/scenes/stage5/optics-spherical-interface.json`
- `content/scenes/stage5/waves-heterogeneous-absorbing.json`

## 7. Verification

Stage 5 adds 13 numerical/runtime tests and remains subject to the complete Stage 2–5 regression suite plus web smoke tests.
