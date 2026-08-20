# Phase 2 — Scientific Solver Foundation

## ترتیب پیشنهادی

1. Physics Core: SI quantities, unit conversion, simulation clock, deterministic stepping.
2. Mechanics MVP: rigid body, gravity, friction, restitution, spring, force vectors.
3. Circuits MVP: ideal sources, resistor, switches, ammeter/voltmeter, capacitor/inductor transient baseline.
4. Optics MVP: ray, reflection, Snell refraction, thin lens/mirror primitives.
5. Waves MVP: sinusoidal source, 1D propagation, wavelength/frequency/speed, reflection/interference.
6. Experiment Runtime: scene graph, binding, measurements, graph traces and step guide.

## Gate خروج از Phase 2

- تمام Golden Experimentهای مرتبط پاس شوند.
- نتایج مستقل از UI باشند.
- واحدهای SI و تبدیل واحد تست شده باشند.
- timestep و tolerance مستند باشند.
- هیچ Solver از DLL یا کد اجرایی Crocodile استفاده نکند.
