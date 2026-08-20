# Stage 14 — Active Analog Execution

Stage 14 extends Aria Lab Physics with executable active analog and multi-terminal circuit components.

## Scientific runtime additions
- MNA voltage-controlled voltage source (VCVS) for finite-gain op-amp feedback circuits.
- BJT NPN/PNP piecewise active-region model with VBE threshold, base current and beta-controlled collector current.
- N/P MOSFET threshold + channel-resistance switching model.
- SPDT and DPDT relay coil/contact model with pickup current.
- Stateful thyristor latch with gate threshold and holding-current release.
- Explicit multi-terminal `partPortNodes` mapping in SceneRuntime.

## Executable Crocodile parts in this stage
- circuits.npn
- circuits.pnp
- circuits.mosfetn
- circuits.mosfetp
- circuits.opamp-741
- circuits.opamp-324
- circuits.spdt-relay
- circuits.dpdt-relay
- circuits.thyristor

## Student execution UI
- Live BJT collector current readout.
- MOSFET gate state readout.
- Op-amp output voltage readout.
- Relay energized/free state.
- Thyristor latch state.
- On-board voltage slider for `vslide` sources.

## Current scientific boundary
Stage 14 models DC active circuits. Mixed active-device + capacitor/inductor transient networks are rejected explicitly instead of producing fake physics. Full nonlinear SPICE-class BJT/MOSFET transient models, op-amp saturation/slew-rate and relay contact bounce remain future work.
