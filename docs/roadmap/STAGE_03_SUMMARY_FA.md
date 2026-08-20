# Stage 3 — Interactive Simulation Engines

## خروجی

### Circuits
- Modified Nodal Analysis برای شبکه DC چندگرهی
- Resistor / independent voltage source / independent current source
- Switch با مقاومت حالت باز/بسته
- استخراج ولتاژ گره و جریان شاخه
- تشخیص ماتریس singular/floating

### Mechanics 2D
- World2D و Body2D
- گرانش و force accumulation
- Semi-implicit Euler
- برخورد Circle–Circle و AABB–AABB
- restitution و impulse friction
- floor contact
- spring + damping

### Optics
- Ray/Segment intersection
- Reflection vector
- Vector Snell refraction
- total internal reflection
- Plane mirror / refractive interface / screen
- مدل paraxial برای thin lens
- چند برخورد متوالی Ray Scene

### Waves
- FDTD موج 1D
- FDTD موج 2D
- کنترل CFL برای پایداری عددی
- fixed/reflective boundary در 1D
- obstacle mask در 2D
- source injection و sampling

### Scene Contract
- Scene Schema v1
- چهار Reference Scene برای مدار، مکانیک، اپتیک و موج

## چیزی که هنوز ادعا نمی‌کنیم

- SPICE کامل، AC phasor، diode/transistor nonlinear Newton iteration
- rigid body چرخشی با SAT polygon و joint solver کامل
- عدسی ضخیم/سطوح منحنی دقیق و polarization
- absorbing boundary حرفه‌ای، heterogeneous media و GPU wave solver
- Scene Compiler و drag/drop Editor

این محدودیت‌ها باید در Stage 4/5 به‌صورت صریح حل شوند؛ مخفی کردن آن‌ها پشت UI قابل قبول نیست.
