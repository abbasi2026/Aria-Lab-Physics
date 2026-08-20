# بازمهندسی و تحلیل جامع Crocodile Physics 605

> خروجی تحلیل ایستا و استخراج ساختاریافته از آرشیو ارائه‌شده. هیچ فایل اجرایی اجرا نشده و هیچ سازوکار مجوز/لایسنس دور زده نشده است.

## ۱. نتیجه کلیدی

Crocodile Physics 605 از نظر معماری آموزشی هنوز ارزش مطالعه بالایی دارد، اما از نظر فناوری اجرایی منسوخ است. قوت اصلی آن نه ظاهر برنامه، بلکه **مدل داده‌ی declarative** آن است: قطعات، Propertyها، Validatorها، واحدها، پنل تنظیمات، روابط، نمودارها و حتی مراحل آموزشی در XML تعریف شده‌اند. بنابراین برای محصول جدید باید «ایده‌ی مدل داده و جداسازی موتورهای دامنه» را حفظ کرد، نه کد و UI قدیمی را.

- فایل ZIP شامل ۲٬۸۳۸ ورودی و حدود ۷۲ MB داده‌ی بازشده است.
- 206 ورودی قطعه در Parts Library قابل مشاهده شناسایی شد.
- 808 کلاس تعریفی در فایل‌های دامنه و 4938 تعریف Property استخراج شد.
- 547 اتصال مستقیم بین کنترل‌های UI و Propertyهای مدل استخراج شد.
- 209 فایل آزمایش/نمونه CXP پیدا شد؛ 201 مورد در درخت Contents فهرست شده‌اند و ۸ فایل اضافی خارج از فهرست Contents وجود دارد.
- 63 آزمایش دارای راهنمای چندصفحه‌ای داخلی است؛ در مجموع 398 صفحه‌ی راهنما استخراج شد.
- فایل‌های `.cxp` XML هستند، نه فرمت باینری بسته؛ بنابراین مهاجرت داده‌ی آزمایش‌ها به JSON/DB جدید عملی است.

## ۲. فناوری و معماری اجرایی نسخه 605

- برنامه اصلی PE32 / x86 و ۳۲بیتی است.
- رابط کاربری بر پایه Qt 3.3.6 و فایل‌های Qt Designer UI نسخه 3.3 است.
- Runtimeهای MSVCP71/MSVCR71 نشان‌دهنده زنجیره Visual C++ 7.1 است.
- timestamp فایل اجرایی اصلی به سال 2006 برمی‌گردد.
- ماژول موج به GLU32 وابسته است و مسیرهای داخلی `glWaveSpaceOutput.cpp` نیز وجود رندر OpenGL در بخش موج را تأیید می‌کنند.
- DLLهای دامنه فقط ورودی‌های ماژولی `buildId` و `loadModule` را export می‌کنند؛ منطق اصلی داخل DLLها کامپایل شده و سورس C++ اصلی در ZIP وجود ندارد.
- با این حال رشته‌های Debug/source-path باقی مانده‌اند و نام حدود ۲۹۰ فایل C++ داخلی استخراج شده است؛ این نام‌ها معماری موتور را تا حد خوبی آشکار می‌کنند.

### موتورهای اصلی

| دامنه | شواهد معماری | برداشت مهندسی |
|---|---|---|
| Core/Editor | `cccore.dll`, `cceditor.dll`, Model/Node/Property/Document | هسته‌ی گراف شیء، Property system، scene و association |
| Electronics | `circuit.cpp`, `matrix.cpp`, `netMapper.cpp`, component models | حل شبکه مدار و مدل قطعات آنالوگ/دیجیتال |
| Motion | collision polygon/circle, contact manager, solving sets, fluid, force generators | موتور مکانیک دوبعدی، تماس/برخورد، اصطکاک، فنر، سیال، مکانیزم‌ها |
| Optics | raySegment, beamSegment, lens, mirrors, transparentObject | موتور اپتیک هندسی مبتنی بر پرتو/قطعه پرتو |
| Waves | 1D engine + `solver2D.cpp`, source history, obstacles + GL output | شبیه‌سازی موج ۱بعدی و ۲بعدی با فضای حل مستقل |
| Presentation | graph, trace, instructions, controls, associations | لایه‌ی ساخت رابط آزمایش، نمودار، کنترل و راهنما |
| Flowcharts | activation queue, AST, BASIC generator, read/set property | موتور اتوماسیون/منطق رویدادی برای کنترل آزمایش |

## ۳. مدل فایل CXP

هر CXP یک سند XML با نسخه‌های دامنه، مدل، sceneها و instanceهای قطعات است. Propertyها به صورت `p key=...` ذخیره می‌شوند. کنترل‌های presentation از مسیرهای XPath-مانند برای اتصال به Property قطعات استفاده می‌کنند؛ نمونه‌ی مفهومی: یک Number به Property جرم یک Block متصل می‌شود. این همان data binding آزمایش است.

ساختار مفهومی پیشنهادی برای مهاجرت:

```text
Document
  ├─ domainVersions
  ├─ simulationSettings (time, timeStep, maxTimeStep, paused)
  ├─ scenes[]
  │   ├─ parts[]
  │   ├─ links/pads/junctions[]
  │   └─ presentation controls[]
  ├─ associations[]
  └─ lesson/instructions[]
```

## ۴. پوشش موضوعی و تمام نمونه‌آزمایش‌ها

### Circuits — 51 فایل، 8 مورد راهنمای مرحله‌ای

- 555 Oscillator 2
- 555 monostable
- 555 oscillator 1
- AM Transmitter-Receiver
- Adder
- Basic circuits — راهنمای مرحله‌ای
- Beating soundwave
- Capacitor Discharging
- Charge and Voltage
- Counter - 0 to 9
- Counter - 0 to 99
- Current-voltage graphs — راهنمای مرحله‌ای
- Darlington Pair
- Decade Counter
- Dimmer Switch
- Doorbell
- Electronic Die
- Fire Alarm
- Fridge
- LDR and thermistor — راهنمای مرحله‌ای
- Landing Light
- Landing light 2
- Light Sensor 1
- Light Sensor 2
- Logic Gates
- Maze
- Noise
- Ohm's law — راهنمای مرحله‌ای
- Ohms Law
- Operational Amplifier - Saturation
- Operational Amplifier
- Overheating Alarm
- Parallel circuits — راهنمای مرحله‌ای
- Potential Divider
- Pressure Sensing Alarm 1
- Pressure Sensing Alarm 2
- Puzzle
- Relay
- Security System
- Series circuits (batteries) — راهنمای مرحله‌ای
- Series circuits (lamps) — راهنمای مرحله‌ای
- Series circuits (resistors) — راهنمای مرحله‌ای
- Thyristor Controlling Motor
- Torch - Batteries Correct
- Torch - Batteries Wrong
- Traffic Lights 1
- Traffic Lights 2
- Transistor
- Wheatstone Bridge
- x10 Inverting Amplifier
- x10 Non-Inverting Amplifier

### Describing Motion — 8 فایل، 3 مورد راهنمای مرحله‌ای

- Acceleration — راهنمای مرحله‌ای
- Distance-time graph 1
- Distance-time graph 2
- Distance-time graph 3
- Distance-time graphs — راهنمای مرحله‌ای
- Speed-time graph 1
- Speed-time graph 2
- Velocity-time graphs — راهنمای مرحله‌ای

### Electrical Energy — 13 فایل، 8 مورد راهنمای مرحله‌ای

- AC Rectifier 1
- AC Rectifier 2
- AC Rectifier 3
- Alternating and direct current — راهنمای مرحله‌ای
- Cost of energy — راهنمای مرحله‌ای
- Electrical power — راهنمای مرحله‌ای
- Electromechanics
- Fuses — راهنمای مرحله‌ای
- High power appliances — راهنمای مرحله‌ای
- Low power appliances — راهنمای مرحله‌ای
- Model car design
- Transformers — راهنمای مرحله‌ای
- Transforming energy — راهنمای مرحله‌ای

### Energy and Motion — 20 فایل، 7 مورد راهنمای مرحله‌ای

- Change in energy 1
- Change in energy 2
- Change in momentum — راهنمای مرحله‌ای
- Conservation of momentum — راهنمای مرحله‌ای
- Definition of momentum — راهنمای مرحله‌ای
- Elastic potential energy — راهنمای مرحله‌ای
- Energy changes
- Gravitational potential energy
- Hooke's Law
- Ideal elastic collision
- Ideal inelastic collision
- Kinetic energy (changing mass) — راهنمای مرحله‌ای
- Kinetic energy (changing speed) — راهنمای مرحله‌ای
- Kinetic energy
- Momentum in elastic collisions
- Momentum in inelastic collisions
- Momentum
- Semi-elastic collision
- Springs - energy
- Work done — راهنمای مرحله‌ای

### Force and Acceleration — 26 فایل، 9 مورد راهنمای مرحله‌ای

- Balanced forces
- Circular motion (changing mass) — راهنمای مرحله‌ای
- Circular motion (changing radius) — راهنمای مرحله‌ای
- Defining the Newton
- Forces on a vehicle
- Friction
- Gravity and weight
- Measuring g
- Moving sideways and downwards
- Moving up and down
- Newton's first law — راهنمای مرحله‌ای
- Newton's second law — راهنمای مرحله‌ای
- Newton's third law — راهنمای مرحله‌ای
- Pendulums - different amplitudes
- Pendulums - different lengths
- Pendulums - different masses
- Pendulums - velocity and displacement
- Resultant forces — راهنمای مرحله‌ای
- SHM
- Springs - displacement and velocity
- Springs - forces
- Springs - velocity and acceleration
- Toppling tractors — راهنمای مرحله‌ای
- Unequal forces — راهنمای مرحله‌ای
- Velocity changes
- Weight — راهنمای مرحله‌ای

### Optics — 55 فایل، 10 مورد راهنمای مرحله‌ای

- Angles of reflection — راهنمای مرحله‌ای
- Binoculars
- Box of Light
- Caustic Curve
- Colour Mixing
- Colours of Light
- Converging Lenses 1
- Converging Lenses 2
- Converging and Diverging Lenses
- Convex Mirror
- Convex and concave mirrors — راهنمای مرحله‌ای
- Determining f - Mirror Method
- Determining f - Ray Method
- Distant Object
- Diverging Lenses 1
- Diverging Lenses 2
- Eye
- Far or Long Sightedness
- Focal Point - Convering Lens
- Focal Point - Diverging Lens
- Galilean Telescope
- Lens Formula
- Lenses & Mirrors
- Lenses — راهنمای مرحله‌ای
- Light from Distant Objects
- Light from Nearby Objects
- Magnification — راهنمای مرحله‌ای
- Magnifying glass — راهنمای مرحله‌ای
- Microscope
- Mirrors and reflection — راهنمای مرحله‌ای
- Near or Short Sightedness
- Nearby Object
- Newtonian Reflecting Telescope
- Object - Between F and the Lens
- Object at 2F
- Object at F
- Object between F and 2F
- Object beyond 2F
- Periscopes — راهنمای مرحله‌ای
- Principle of Additivity
- Principle of Reversibility
- Prism
- Rainbow
- Reflecting Telescope
- Refracting Telescope
- Refraction — راهنمای مرحله‌ای
- Satellite Dish
- Shadows 1
- Shadows 2
- Solar eclipse
- Spectrometer
- Split Combine Ray
- Telescope (simple) — راهنمای مرحله‌ای
- Total Internal Reflection
- camera — راهنمای مرحله‌ای

### Waves — 27 فایل، 9 مورد راهنمای مرحله‌ای

- AM Radio
- Absorption of radiation — راهنمای مرحله‌ای
- Basic Wave Properties
- Diffraction around Hill
- Diffraction — راهنمای مرحله‌ای
- Doppler shift — راهنمای مرحله‌ای
- Electromagnetic spectrum — راهنمای مرحله‌ای
- Harmonic Frequency - Harmonic
- Harmonic Frequency - Tension
- Interference — راهنمای مرحله‌ای
- Jet plane sonic wake
- Loudness and pitch — راهنمای مرحله‌ای
- Measuring Distance
- Penetration of Gamma Rays
- Penetration of X-Rays
- Pulse Reflection
- Reflection Type
- Reflection and refraction — راهنمای مرحله‌ای
- Setting Node Position
- Simple Harmonic Motion 1
- Simple Harmonic Motion 2
- Simple Harmonic Motion 3
- Sound Waves in a Pipe
- Speed of Water Waves
- Speed of sound — راهنمای مرحله‌ای
- String Harmonics
- Ultrasound — راهنمای مرحله‌ای

### Tutorials — 9 فایل، 9 مورد راهنمای مرحله‌ای

- Drag and buoyancy — راهنمای مرحله‌ای
- Plotting a graph — راهنمای مرحله‌ای
- Setting up a motion experiment — راهنمای مرحله‌ای
- Setting up a simple circuit — راهنمای مرحله‌ای
- Setting up a simple ray diagram — راهنمای مرحله‌ای
- Setting up a waves experiment — راهنمای مرحله‌ای
- Using lesson kits — راهنمای مرحله‌ای
- Using parts — راهنمای مرحله‌ای
- Using presentation parts — راهنمای مرحله‌ای

### فایل‌های CXP خارج از Contents

- Energy and Motion/Kinetic energy.cxp
- Energy and Motion/Momentum.cxp
- Force and Acceleration/Gravity and weight.cxp
- Optics/Galilean Telescope.cxp
- Optics/Newtonian Reflecting Telescope.cxp
- Optics/Prism.cxp
- Optics/Reflecting Telescope.cxp
- Optics/Refracting Telescope.cxp

## ۵. Parts Library — گروه‌بندی کامل

### Electronics > Analog > Power Supplies (6)

- **Battery** — `electronics/battery` — تنظیمات UI: voltage
- **Variable voltage supply** — `electronics/vslide` — تنظیمات UI: voltage-max; voltage
- **Voltage rail** — `electronics/voltrail` — تنظیمات UI: voltage
- **Zero volt rail** — `electronics/vzero` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Ground** — `electronics/earth` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Constant current source** — `electronics/current` — تنظیمات UI: current

### Electronics > Analog > Switches (8)

- **SPST** — `electronics/spst` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Push-to-make switch** — `electronics/pushmake` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Push-to-break switch** — `electronics/pushbreak` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **SPDT** — `electronics/spdt` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **DPST** — `electronics/dpst` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **DPDT** — `electronics/dpdt` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **SPDT relay** — `electronics/spdt-relay` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **DPDT relay** — `electronics/dpdt-relay` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Electronics > Analog > Input Components (10)

- **Float switch** — `electronics/floatswitch` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Thermistor** — `electronics/thermistor` — تنظیمات UI: resistance; resistance-298K
- **LDR with Lamp** — `electronics/ldr-with-lamp` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **LDR and Lamp** — `electronics/ldr-and-lamp` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Light dependent resistor** — `electronics/ldr` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Photo-transistor with lamp** — `electronics/phototransistor` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Opto-isolator** — `electronics/optoisolator` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Variable resistor** — `electronics/vresistor` — تنظیمات UI: resistance-max; resistance
- **Potentiometer** — `electronics/potentiometer` — تنظیمات UI: resistance
- **Fuse** — `electronics/fuse` — تنظیمات UI: max-current

### Electronics > Analog > Passive Components (6)

- **Resistor** — `electronics/resistor` — تنظیمات UI: resistance
- **8 Resistors** — `electronics/8-resistors` — تنظیمات UI: resistance
- **Inductor** — `electronics/inductor` — تنظیمات UI: inductance
- **Capacitor** — `electronics/capacitor` — تنظیمات UI: capacitance; charge
- **Electrolytic capacitor** — `electronics/ecapacitor` — تنظیمات UI: capacitance; charge
- **Transformer** — `electronics/transformer` — تنظیمات UI: ratio

### Electronics > Analog > Discrete Semiconductors (7)

- **Diode** — `electronics/diode` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Zener** — `electronics/zener` — تنظیمات UI: user-zener-voltage
- **Thyristor** — `electronics/thyristor` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **N-Channel MOSFET** — `electronics/mosfetn` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **P-Channel MOSFET** — `electronics/mosfetp` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **NPN transistor** — `electronics/npn` — تنظیمات UI: gain
- **PNP transistor** — `electronics/pnp` — تنظیمات UI: gain

### Electronics > Analog > Integrated Circuits (5)

- **555 Timer** — `electronics/555-timer` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **324 Op-amp** — `electronics/opamp-324` — تنظیمات UI: positive-supply; negative-supply
- **741 Op-amp** — `electronics/opamp-741` — تنظیمات UI: positive-supply; negative-supply
- **Darlington driver** — `electronics/darlington-driver` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Half-H driver** — `electronics/half-h-driver` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Electronics > Analog > Signal Generators & Sound (3)

- **Signal generator** — `electronics/vpulse` — تنظیمات UI: amplitude; signal-type; frequency; phase-offset; amplitude-offset
- **Buzzer** — `electronics/buzzer` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Loudspeaker** — `electronics/loudspeaker` — تنظیمات UI: resistance

### Electronics > Analog > Light Outputs (6)

- **Signal Lamp** — `electronics/signal-lamp` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Filament Lamp** — `electronics/filament-lamp` — تنظیمات UI: power
- **Red LED** — `electronics/red-led` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Green LED** — `electronics/green-led` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Yellow LED** — `electronics/yellow-led` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Seven segment display** — `electronics/seven-segment-display` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Electronics > Analog > Meters (2)

- **Ammeter** — `electronics/ammeter` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Voltmeter** — `electronics/voltmeter` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Electronics > Pictorial (14)

- **Battery** — `electronics/pictorial-battery` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **9V battery** — `electronics/pictorial-battery-9v` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **1A Fuse** — `electronics/pictorial-fuse` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **SPST** — `electronics/pictorial-spst` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **SPDT** — `electronics/pictorial-spdt` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Push-to-make switch** — `electronics/pictorial-pushmake` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Variable resistor** — `electronics/pictorial-vresistor` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Resistor** — `electronics/pictorial-resistor` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Buzzer** — `electronics/pictorial-buzzer` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Filament Lamp** — `electronics/pictorial-filament-lamp` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Red LED** — `electronics/pictorial-red-led` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Green LED** — `electronics/pictorial-green-led` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Yellow LED** — `electronics/pictorial-yellow-led` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Motor** — `electronics/pictorial-motor` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Electronics > Digital > Logic Gates (9)

- **7414: Schmitt inverter** — `electronics/7414` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **7404: Inverter** — `electronics/7404` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **7408: AND gate** — `electronics/7408` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **7400: NAND gate** — `electronics/7400` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **7410: 3-input NAND gate** — `electronics/7410` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **7420: 4-input NAND gate** — `electronics/7420` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **7432: OR gate** — `electronics/7432` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **7402: NOR gate** — `electronics/7402` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **7486: Exclusive-OR gate** — `electronics/7486` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Electronics > Digital > Flip-flops (4)

- **4043: RS flip-flop** — `electronics/4043-without-enable` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **7474: D-type flip-flop** — `electronics/7474` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **4027: JK flip-flop (with set)** — `electronics/4027` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **7473: JK flip-flop (without set)** — `electronics/7473` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Electronics > Digital > Counters (3)

- **4518: Decade (÷10) counter** — `electronics/4518` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **4026: Decade counter and 7-segment decoder** — `electronics/4026` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **4017: Decoded (1-of-10) decade counter** — `electronics/4017` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Electronics > Digital > Decoders (2)

- **4028: BCD to decimal (1-of-10) decoder** — `electronics/4028` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **4511: BCD to 7-segment display decoder** — `electronics/4511` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Electronics > Digital > Inputs (5)

- **Clock** — `electronics/clock` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Latching logic input** — `electronics/latching-logic-input` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Push button logic input** — `electronics/push-button-logic-input` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Custom logic input** — `electronics/new-context-logic-input` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Target logic input** — `electronics/context-logic-input` — تنظیمات UI: Hide association control: hide-association-control

### Electronics > Digital > Outputs (3)

- **Logic indicator** — `electronics/logic-output` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Custom logic output** — `electronics/new-context-logic-output` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Target logic output** — `electronics/context-logic-output` — تنظیمات UI: Hide association control: hide-association-control

### Motion & Forces > Mechanisms (10)

- **Chain** — `motion/chain` — تنظیمات UI: front-facing
- **Constant speed motor** — `motion/motor` — تنظیمات UI: teeth [gear]; motor-angvel; front-facing
- **Flywheel** — `motion/flywheel-and-gear` — تنظیمات UI: front-facing; radius [flywheel]; mass-per-metre-squared [flywheel]; teeth [gear]
- **Gear** — `motion/double-gear` — تنظیمات UI: Display: user-top-gear-shown; teeth [top]; teeth [bottom]; front-facing
- **Generator** — `motion/connected-generator` — تنظیمات UI: RPM: angvel [gear]; teeth [gear]; angvel [gear]; front-facing
- **Electric motor** — `motion/connected-electric-motor` — تنظیمات UI: RPM: angvel [gear]; teeth [gear]; angvel [gear]; front-facing
- **Rack and pinion** — `motion/rack-and-pinion` — تنظیمات UI: Display: user-top-gear-shown; teeth [top]; teeth [bottom]; front-facing
- **Torque** — `motion/torque-application` — تنظیمات UI: torque-value
- **Microswitch** — `motion/connected-microswitch` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Solenoid** — `motion/connected-solenoid` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Motion & Forces > Motion (4)

- **Space** — `motion/space2` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Cart** — `motion/cart` — تنظیمات UI: user-mass; material; coefficient-of-restitution; drag-coefficient; block-height; block-width; block-depth; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Rod** — `motion/rod` — تنظیمات UI: natural-length; Show tension: tension-force-shown; Show force label: force-labels-shown
- **Spring** — `motion/spring` — تنظیمات UI: natural-length; units: spring-constant; extension; spring-constant; Show tension: tension-force-shown; Show force label: force-labels-shown

### Motion & Forces > Motion > Grounds (8)

- **Ideal elastic ground** — `motion/ideal-elastic-ground` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Ideal inelastic ground** — `motion/ideal-inelastic-ground` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Wooden ground** — `motion/wood-ground` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Metal ground** — `motion/metal-ground` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Rubber ground** — `motion/rubber-ground` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Glass ground** — `motion/glass-ground` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Ice ground** — `motion/ice-ground` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Concrete ground** — `motion/concrete-ground` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration

### Motion & Forces > Motion > Slopes (8)

- **Ideal elastic slope** — `motion/ideal-elastic-slope` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; Show angle on slope: display-slope-angle; slope-angle; Show angle controls: display-controls; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Ideal inelastic slope** — `motion/ideal-inelastic-slope` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; Show angle on slope: display-slope-angle; slope-angle; Show angle controls: display-controls; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Wooden slope** — `motion/wood-slope` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; Show angle on slope: display-slope-angle; slope-angle; Show angle controls: display-controls; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Metal slope** — `motion/metal-slope` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; Show angle on slope: display-slope-angle; slope-angle; Show angle controls: display-controls; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Rubber slope** — `motion/rubber-slope` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; Show angle on slope: display-slope-angle; slope-angle; Show angle controls: display-controls; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Glass slope** — `motion/glass-slope` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; Show angle on slope: display-slope-angle; slope-angle; Show angle controls: display-controls; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Ice slope** — `motion/ice-slope` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; Show angle on slope: display-slope-angle; slope-angle; Show angle controls: display-controls; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration
- **Concrete slope** — `motion/concrete-slope` — تنظیمات UI: Show forces: forces-shown; force-labels-shown; Gravity: gravity-force-shown; Contact: contact-force-shown; Show angle on slope: display-slope-angle; slope-angle; Show angle controls: display-controls; material; static-friction; dynamic-friction; coefficient-of-restitution; fascia; planet; gravitational-acceleration

### Motion & Forces > Motion > Balls (14)

- **Ideal elastic ball** — `motion/ideal-elastic-ball` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Ideal inelastic ball** — `motion/ideal-inelastic-ball` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Soccer ball** — `motion/soccer-ball` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Basketball** — `motion/basketball` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Cricket ball** — `motion/cricket-ball` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Golf ball** — `motion/golf-ball` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Tennis ball** — `motion/tennis-ball` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Billiard ball** — `motion/billiard-ball` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Wooden ball** — `motion/wood-ball2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Rubber ball** — `motion/rubber-ball2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Metal ball** — `motion/metal-ball2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Concrete ball** — `motion/concrete-ball2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Glass ball** — `motion/glass-ball2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Ice ball** — `motion/ice-ball2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; radius; drag-coefficient; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown

### Motion & Forces > Motion > Blocks (9)

- **Ideal elastic block** — `motion/ideal-elastic-block` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; drag-coefficient; block-height; block-width; block-depth; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Ideal inelastic block** — `motion/ideal-inelastic-block` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; drag-coefficient; block-height; block-width; block-depth; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Brick** — `motion/brick2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; drag-coefficient; block-height; block-width; block-depth; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Wooden block** — `motion/wood-block2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; drag-coefficient; block-height; block-width; block-depth; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Metal block** — `motion/metal-block2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; drag-coefficient; block-height; block-width; block-depth; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Rubber block** — `motion/rubber-block2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; drag-coefficient; block-height; block-width; block-depth; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Glass block** — `motion/glass-block2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; drag-coefficient; block-height; block-width; block-depth; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Ice block** — `motion/ice-block2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; drag-coefficient; block-height; block-width; block-depth; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown
- **Concrete block** — `motion/concrete-block2` — تنظیمات UI: user-mass; material; static-friction; dynamic-friction; coefficient-of-restitution; drag-coefficient; block-height; block-width; block-depth; control-mode; Lock position: lock-pos; image; Show forces: forces-shown; force-labels-shown; Weight: gravity-force-shown; Weight (resolved): resolved-gravity-force-shown; Contact: contact-force-shown; Friction: friction-force-shown; Driving force: constant-force-shown; Tension: tension-force-shown; Drag force: drag-force-shown; Buoyancy force: buoyancy-force-shown; Net force: net-force-shown

### Optics (1)

- **Optical Space** — `optics/opticalSpace2` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Optics > Ray Diagrams (4)

- **Near Object Marker** — `optics/nearAxisObject` — تنظیمات UI: optical-axis; image; Show picture: show-picture; Show Ray-point line on picture: show-raypoint-line; Show intensities/picture images: show-intensity-pic; Show intermediate images: show-intermediate-images; raystoeye-basicrays; raystoeye-movepoint; Restore Defaults: raystoeye-restore; raystoeye-coverage; Focal point: raystomirrors-focalpoint; Centre of curvature: raystomirrors-curvature; raystomirrors-coverage; Restore Defaults: raystomirrors-restore; Perpendicular: raystomirrors-perpendicular; raystomirrors-movepoint; raystomirrors-basicrays; raystolens-movepoint; raystolens-coverage; Perpendicular: raystolens-perpendicular; Restore Defaults: raystolens-restore; Focal point: raystolens-focalpoint; raystolens-basicrays
- **Far Object Marker** — `optics/farAxisObject` — تنظیمات UI: angularsize; image; Show picture: show-picture; Show Ray-point line on picture: show-raypoint-line; Show intensities/picture images: show-intensity-pic; Show intemediate images: show-intermediate-images; picture-size; raystoeye-basicrays; raystoeye-movepoint; Restore Defaults: raystoeye-restore; raystoeye-coverage; raystolens-basicrays; raystolens-coverage; raystolens-movepoint; Restore Defaults: raystolens-restore
- **Screen** — `optics/projection` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Eye** — `optics/eye` — تنظیمات UI: eye-showLineofSight; eye-looksright; eye-regionOfInterest; Show picture: show-picture; Invert Image: eye-invertImage

### Optics > Light Sources (3)

- **Diverging beam** — `optics/lamp` — تنظیمات UI: wavelength; color; spread
- **Parallel beam** — `optics/torch` — تنظیمات UI: torch-radius; wavelength; color
- **Ray box** — `optics/rayBox` — تنظیمات UI: raybox-separation; wavelength; color; raybox-noofrays

### Optics > Lenses (2)

- **Concave Lens** — `optics/concaveLens` — تنظیمات UI: flength; Show focal length: showflength
- **Convex Lens** — `optics/convexLens` — تنظیمات UI: flength; Show focal length: showflength

### Optics > Mirrors (4)

- **Plane Mirror** — `optics/planeMirror` — تنظیمات UI: Show normal: planeMirror-showNormal
- **Concave Mirror** — `optics/concaveMirror` — تنظیمات UI: radius; Show focal length: showFocalLength
- **Convex Mirror** — `optics/convexMirror` — تنظیمات UI: radius; Show focal length: showFocalLength
- **Parabolic Mirror** — `optics/parabolicMirror` — تنظیمات UI: Show focal length: showFocalLength; radius

### Optics > Transparent Objects (3)

- **Prism** — `optics/prism` — تنظیمات UI: material; refindex; Show Normal: shownormal
- **Transparent Block** — `optics/transparentBlock` — تنظیمات UI: Show Secondary Reflections: showsecreflection; Show Normal: shownormal; material; refindex
- **Semi-circular Block** — `optics/semicircularBlock` — تنظیمات UI: material; refindex; Show Normal: shownormal

### Optics > Opaque Objects (4)

- **Adjustable Slit** — `optics/adjustableSlit` — تنظیمات UI: Show Part: part-visible; adjustableslit-radius; Green: part-color
- **Opaque Ball** — `optics/opaqueBall` — تنظیمات UI: Show Part: part-visible; Black: part-color; opaqueball-radius
- **Opaque Block** — `optics/opaqueBlock` — تنظیمات UI: Show Part: part-visible; Black: part-color
- **Opaque Triangle** — `optics/opaqueTriangle` — تنظیمات UI: Show Part: part-visible; Black: part-color

### Optics > Measurement Tools (3)

- **Ruler** — `presentation/ruler` — تنظیمات UI: tic-gap; length; Show ticks:: show-tics; 0: length; 0: ratio; Black: colour
- **Protractor** — `presentation/protractor` — تنظیمات UI: angle; Fix: fix-angle; Black: colour
- **Marker** — `presentation/marker` — تنظیمات UI: display-mode; label-text; Show label?: show-label; Black: colour

### Presentation > Measurement Tools (3)

- **Ruler** — `presentation/ruler` — تنظیمات UI: tic-gap; length; Show ticks:: show-tics; 0: length; 0: ratio; Black: colour
- **Protractor** — `presentation/protractor` — تنظیمات UI: angle; Fix: fix-angle; Black: colour
- **Marker** — `presentation/marker` — تنظیمات UI: display-mode; label-text; Show label?: show-label; Black: colour

### Presentation (13)

- **Graph** — `presentation/graph` — تنظیمات UI: y-spacing [major-grid]; Major, every:: y-enabled [major-grid]; Minor: y-enabled [minor-grid]; y-unit-provider; y-max; y-min; Minor: x-enabled [minor-grid]; x-spacing [major-grid]; Major, every:: x-enabled [major-grid]; x-unit-provider; x-min; x-max; graph-mode; Black: stroke [minor-grid]; Black: stroke [major-grid]; Black: stroke [x-axis]; Black: stroke [y-axis]; max-datapoints; enabled; Black: stroke; line-style; line-weight; point-size
- **Text** — `presentation/text` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Instructions** — `presentation/instructions` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Picture** — `presentation/image` — تنظیمات UI: border-width; border-style; Black: border-color; image
- **Animation** — `presentation/advanced-animation` — تنظیمات UI: frame-rate; sequences; Play current animation:: looping; Clicking on animation:: play-mode
- **Button** — `presentation/button` — تنظیمات UI: Button Mode: latch-mode
- **Number** — `presentation/spinbox` — تنظیمات UI: Increment:: increment-type; increment-value; Units:: multiplier; unit-provider; min-max-unit-name; minimum-value; maximum-value; Black: text-colour; Display...: mode; label
- **Checkbox** — `presentation/checkbox` — تنظیمات UI: Display...: mode; label; Black: text-colour
- **Drop-down list** — `presentation/dropdown` — تنظیمات UI: Display...: mode; label; Black: text-colour
- **Edit box** — `presentation/editbox` — تنظیمات UI: text-width; Display...: mode; label; Black: text-colour
- **Pause** — `presentation/pause` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Reload** — `presentation/reload` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Part Tray** — `presentation/parttray/2d` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Waves > 1D (6)

- **Wave propagation space** — `waves/1d/wavespace/propagation` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Wave penetration space** — `waves/1d/wavespace/penetration` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Wave reflection space** — `waves/1d/wavespace/reflection` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Wave interference space** — `waves/1d/wavespace/interference` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Wave pinned space** — `waves/1d/wavespace/pinned` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Wave plucking space** — `waves/1d/wavespace/plucking` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Waves > 2D (3)

- **Electromagnetic wavespace** — `waves/em-wavespace2-holder` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Sound wavespace** — `waves/sound-wavespace2-holder` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Water wavespace** — `waves/water-wavespace2-holder` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Waves > 2D > Sources (3)

- **Point Source** — `waves/point-source` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Line Source** — `waves/line-source` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Moving Point Source** — `waves/moving-point-source` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Waves > 2D > Reflectors (1)

- **Plane Reflector** — `waves/plane-reflector` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Waves > 2D > Obstacles (4)

- **Block** — `waves/rect-obstacle` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Sloped block** — `waves/sloped-block-obstacle` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Triangle** — `waves/triangular-obstacle` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Circle** — `waves/circular-obstacle` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Waves > 2D > Slits (2)

- **Single Slit** — `waves/single-slit-obstacle` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده
- **Double Slit** — `waves/double-slit-obstacle` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

### Waves > 2D > Measurement (1)

- **Detector** — `waves/detector` — تنظیمات UI: بدون کنترل UI مستقیم استخراج‌شده

## ۶. Property system و تنظیمات

Propertyها فقط «تنظیمات قابل ویرایش» نیستند. چهار نقش اصلی دیده می‌شود:

1. Propertyهای ورودی/قابل ویرایش؛ مانند resistance، voltage، mass، material، friction، focal length، frequency.
2. Propertyهای computed؛ مانند acceleration، momentum، kinetic energy، power، torque، wave speed.
3. Propertyهای proxy؛ برای ارائه‌ی یک Property داخلی با نام/واحد مناسب به UI یا Association.
4. Propertyهای user-hidden؛ برای state داخلی، geometry، wiring و engine bookkeeping.

فایل `parts_settings_and_observables.csv` شامل ردیف‌های Property قابل مشاهده/قابل کنترل، validator، default و واحدها برای تمام قطعات است. این فایل باید منبع اصلی تبدیل به Schema جدید باشد.

### تنظیمات سطح Scene

#### electronics

- grid-size-enum (`grid-size-enum`) — default: `3`
- Auto-ID parts (`auto-id-mode`) — default: `true`
- Use IEC logic symbols (`option-view-normal-digital`) — default: `true`
- Use IEC analogue symbols (`option-view-normal-analogue`) — default: `true`
- Autorange meter (`option-meter-autorange`) — default: `true`
- Show circuit effects (`option-view-circuit-effects`) — default: `true`
- Current arrow direction (`option-view-current`) — default: `conventional`
- Show current arrows (`option-view-current-arrows`) — default: `true`
- Terminal effect (`option-terminal-effect`) — default: `Bar voltmeters`
- Show part values (`option-view-component-values`) — default: `true`
- Show controls (`option-view-component-controls`) — default: `true`
- Show part IDs (`option-view-part-ids`) — default: `false`
- option-view-part-ids-inited (`option-view-part-ids-inited`) — default: `false`
- Show junction as spot (`view-junction-as-spot`) — default: `true`
- Tick frequency (`tick-frequency`) — default: `20`
- Meter measures RMS (`option-meter-dc`) — default: `true`
- Indestructible parts (`option-indestructible`) — default: `false`
- Internal resistance (`option-internalres`) — default: `false`
- Number of meter samples (`meter-nsamples`) — default: `20`
- General logic supply voltage (`logic-supply-voltage`) — default: `5`
- logic-output-slope (`logic-output-slope`) — default: `50`
- 74HC series supply voltage (`74HC-supply-voltage`) — default: `5`
- 74HC series output slope (`74HC-output-slope`) — default: `50`
- 4000 series supply voltage (`4000-supply-voltage`) — default: `5`
- 4000 series output slope (`4000-output-slope`) — default: `500`
- Microcontroller supply voltage (`mcu-supply-voltage`) — default: `5`
- power-supplies (`power-supplies`) — default: ``
- digital-transmitter-state (`digital-transmitter-state`) — default: `false`
- meta-controlpane (`meta-controlpane`) — default: `electronics/ui/placeholder`

#### motion

- Show handles (`handles-shown`) — default: `true`
- Show torque arrows (`torques-displayed`) — default: `false`
- Auto-ID parts (`auto-id-mode`) — default: `false`
- default-scale (`default-scale`) — default: `500`
- origin-pos (`origin-pos`) — default: `-1,-1`
- Show origin (`origin-shown`) — default: `false`
- Origin fixed to ground (`origin-snaps-to-ground`) — default: `true`
- Material (`material`) — default: `Ideal elastic`
- Static friction (`static-friction`) — default: `0.0`
- Kinetic friction (`dynamic-friction`) — default: `0.0`
- Elasticity (`coefficient-of-restitution`) — default: `0.0`
- Fluid (`fluid`) — default: `Vacuum`
- Fluid density (`fluid-density`) — default: ``
- Weight force arrow colour (`gravity-force-color`) — default: `red`
- Weight (resolved) force arrow colour (`resolved-gravity-force-color`) — default: `grey`
- Net force arrow colour (`net-force-color`) — default: `black`
- Driving force arrow colour (`constant-force-color`) — default: `darkRed`
- Friction force arrow colour (`friction-force-color`) — default: `green`
- Contact force arrow colour (`contact-force-color`) — default: `blue`
- Tension force arrow colour (`tension-force-color`) — default: `purple`
- Drag force arrow colour (`drag-force-color`) — default: `yellow`
- Buoyancy force arrow colour (`buoyancy-force-color`) — default: `light sky blue`
- Show forces from centre (`forces-shown-from-centre`) — default: ``
- Force scale (`force-scale`) — default: `10.0`

#### flowcharts

- "Title" (`title`) — default: `Flowcharts`
- Speed (`speed`) — default: `Auto step`
- Fast timestep (`timestep-fast`) — default: `0.0005`
- Slow timestep (`timestep-slow`) — default: `0.2`
- Step Pressed (`step-pressed`) — default: `false`
- delay (`delay`) — default: `0`
- Parallel Execution (`parallel`) — default: `true`
- global-vars (`global-vars`) — default: `true`
- Variables (`variables`) — default: ``
- variables-init (`variables-init`) — default: ``
- vars-info (`vars-info`) — default: ``
- Reset values (`refresh-pressed`) — default: `false`
- Add scene variable (`add-var`) — default: `false`
- Aspect (`aspect`) — default: `Aspect`
- Aspect defined (`aspect-defined`) — default: `false`
- active-queue (`active-queue`) — default: ``
- timed-queue (`timed-queue`) — default: ``
- activQueue (`activQueue`) — default: ``
- timedQueue (`timedQueue`) — default: ``
- grid-size-enum (`grid-size-enum`) — default: `3`
- flowcharts (`flowcharts`) — default: ``
- export-options (`export-options`) — default: ``
- Precision (`numeric-precision`) — default: `2`
- domain-accepts-external-associations (`domain-accepts-external-associations`) — default: `false`
- Show/hide flowchart part labels (`show-tabs`) — default: `false`

#### optics

- auto-id-mode (`auto-id-mode`) — default: `false`

#### presentation

- label (`label`) — default: `Presentation`
- grid-size-enum (`grid-size-enum`) — default: `3`
- Space units to meters ratio (`default-scale`) — default: `500.0`

#### waves

- auto-id-mode (`auto-id-mode`) — default: `false`

## ۷. واحدها و اندازه‌گیری

هسته دارای ۳۳ Quantity و ۷۷ تعریف واحد است. Quantityهای کلیدی شامل length, area, volume, mass, time, temperature, current, angle, voltage, resistance, capacitance, energy, power, force, frequency, pressure, velocity, acceleration, angular velocity/acceleration, torque, moment of inertia, momentum, density, electric field amplitude, spring constant و flow rate هستند.

این بخش از طراحی قدیمی ارزش حفظ کردن دارد: هر Property عددی باید Quantity/Unit-aware باشد و تبدیل واحد مستقل از موتور فیزیک انجام شود.

## ۸. ویژگی‌های آموزشی استخراج‌شده

- راهنمای چندصفحه‌ای داخلی با Next/Previous و شمارنده صفحه.
- Highlight/Hotspot برای برجسته کردن قطعات مرتبط با هر مرحله.
- دکمه‌های Pause/Reload و کنترل‌های عددی/Checkbox/Dropdown/Editbox.
- Part Tray برای محدود کردن قطعاتی که دانش‌آموز اجازه دارد استفاده کند.
- Graph با traceهای Property، محدوده محور، grid، fit/zoom و حداکثر datapoint.
- Association بین کنترل‌ها و Propertyها؛ امکان ساخت آزمایش بدون کدنویسی مستقیم.
- Flowchart برای سناریوهای منطقی/رویدادی پیچیده‌تر.
- چند scene در یک سند؛ برخی فایل‌ها تا ۳ scene دارند.

## ۹. نقاط قوتی که باید حفظ شوند

- تعریف declarative قطعه و Property به جای hard-code کردن UI.
- جداسازی engineهای فیزیک از presentation.
- کتابخانه قطعات drag-and-drop و مدل کلاس/prototype.
- validator و units در سطح schema.
- data binding بین کنترل آموزشی، نمودار و Property واقعی موتور.
- lesson kit در همان فایل آزمایش، نه محتوای جدا از simulation.
- قابلیت ترکیب دامنه‌ها؛ مثلاً مدار + موتور، یا flowchart + مکانیک.

## ۱۰. ضعف‌های نسخه قدیمی که نباید بازتولید شوند

- Windows/x86/Qt3 و معماری desktop-only؛ برای محصول جدید مردود است.
- وابستگی شدید Presentation و Engine به مسیرهای XPath و IDهای متنی؛ شکننده و سخت برای versioning.
- مدل سه‌بعدی واقعی وجود ندارد؛ مکانیک عمدتاً ۲بعدی است.
- نبود collaboration، cloud save، teacher assignment، analytics و version history مدرن.
- نبود accessibility مدرن، touch-first/mobile-first و responsive canvas.
- ابزارهای سنجش علمی محدود: uncertainty، error bars، regression/curve fit، data table حرفه‌ای و export پژوهشی باید اضافه شوند.
- حوزه‌های فیزیک مهم ناقص یا غایب‌اند: thermodynamics/heat، electrostatics و field visualization، magnetism، electromagnetism field experiments، fluids مستقل، atomic/quantum/modern physics، nuclear physics کامل و relativity.
- قطعات دیجیتال و ICهای ثابت دهه‌های قبل برای آموزش تاریخی خوب‌اند، اما محصول جدید باید logic abstraction، microcontroller/IoT و virtual instrumentation مدرن هم داشته باشد.

## ۱۱. ارزیابی پوشش علمی

| حوزه | وضعیت در 605 | نتیجه برای نسل جدید |
|---|---|---|
| مکانیک و سینماتیک | قوی در سطح مدرسه، ۲D، نیرو/انرژی/تکانه/فنر/آونگ/مکانیزم | حفظ + ارتقا به solver مدرن و 2D/3D |
| مدار و الکترونیک | بسیار غنی؛ آنالوگ، دیجیتال، IC، سنسور/خروجی | حفظ + ابزار اندازه‌گیری و MCU/IoT مدرن |
| اپتیک | بسیار غنی در اپتیک هندسی | حفظ + wave optics و ابزار اندازه‌گیری دقیق‌تر |
| موج و صوت | خوب، 1D/2D و چند محیط | حفظ + solver GPU/WebGPU و spectrum/FFT |
| انرژی الکتریکی | خوب | ادغام در برق/انرژی مدرن |
| ترمودینامیک | تقریباً غایب | موتور جدید مستقل لازم |
| الکتریسیته ساکن/میدان | غایب | موتور field solver لازم |
| مغناطیس | بسیار محدود/غایب | موتور magnetics/EM لازم |
| اتمی/هسته‌ای/مدرن | چند نمونه radiation، ولی کتابخانه ابزار مستقل ندارد | ماژول جدید لازم |
| آزمایش و تحلیل داده | Graph موجود، اما ابزار تحلیل محدود | Data Lab حرفه‌ای لازم |

## ۱۲. حقیقت مهم درباره «سورس کامل»

از این ZIP **سورس C++ اصلی قابل بازیابی کامل نیست**؛ DLLها کامپایل شده‌اند. هر ادعایی مبنی بر اینکه می‌توان دقیقاً سورس اصلی را از این فایل تحویل داد غیرواقعی است. چیزی که با دقت بالا قابل استخراج است و اکنون استخراج شده:

- schema قطعات و inheritance
- Propertyها، defaultها، validatorها و units
- UI bindings و control panes
- تمام CXPهای آزمایش و صحنه‌ها
- راهنماهای درون آزمایش
- ارتباط کنترل‌ها با Propertyها
- ساختار موضوعی Contents
- Help و رفتار user-facing
- نام ماژول‌ها و فایل‌های سورس کامپایل‌شده از روی debug strings
- شواهد کافی برای بازسازی رفتاری مستقل و تمیز (clean-room style) یک محصول جدید

## ۱۳. مدل داده پیشنهادی برای نسل جدید

نسخه جدید بهتر است داده‌های استخراج‌شده را به موجودیت‌های زیر تبدیل کند:

```text
Domain
PartDefinition
  ├─ ports
  ├─ editableProperties
  ├─ observableProperties
  ├─ validators
  ├─ units
  └─ visualDefinition
Experiment
  ├─ curriculumTags
  ├─ learningObjectives
  ├─ scene
  ├─ initialState
  ├─ allowedParts
  ├─ controls
  ├─ measurements/graphs
  ├─ steps
  ├─ expectedObservations
  └─ assessment
SimulationEngine
Association/Binding
Unit/Quantity
TeacherActivity
StudentRun/Telemetry
```

## ۱۴. فایل‌های داده‌ای تولیدشده

- `experiments_full.json`: اطلاعات ساختاری تمام ۲۰۹ CXP.
- `experiments_summary.csv`: نمای خلاصه هر آزمایش.
- `experiment_instruction_pages.csv`: ۳۹۸ صفحه راهنمای استخراج‌شده.
- `experiment_parts.csv`: ۸٬۵۱۸ instance قطعه در آزمایش‌ها.
- `experiment_associations.csv`: bindingها و associationهای استخراج‌شده.
- `parts_full.json`: کاتالوگ کامل ۲۰۶ قطعه visible با inheritance/property/UI.
- `parts_catalog_compact.csv`: نمای یک‌ردیفی هر قطعه.
- `parts_settings_and_observables.csv`: تنظیمات و خروجی‌های قابل مشاهده قطعات.
- `definition_properties.csv` و `definitions_full.json`: تعریف ۸۰۸ کلاس و Propertyها.
- `ui_controls.csv`: اتصال کنترل‌های UI به Propertyها.
- `scene_properties.csv`: تنظیمات سطح scene هر دامنه.
- `units.csv` و `quantities.csv`: سیستم واحدها.
- `help_pages_index.csv` و `help_pages_full.json`: مستندات داخلی استخراج‌شده.
- `compiled_source_path_hints.csv`: نام فایل‌های C++ آشکارشده در DLLها.
- `binary_inventory.csv`: نوع فایل، اندازه، hash و DLL imports.

## ۱۵. گام بعدی پیشنهادی

قبل از کدنویسی آزمایشگاه جدید، این داده باید به یک **Master Physics Lab Dataset v1** نرمال شود. سپس برای هر Part یک specification مستقل شامل مدل فیزیکی، ورودی‌ها، خروجی‌ها، constraints، واحدها، UX و تست مرجع ساخته شود. در مرحله بعد می‌توان ۲۰۹ آزمایش Crocodile را به قالب جدید مهاجرت کرد و هم‌زمان حوزه‌های غایب را اضافه نمود.