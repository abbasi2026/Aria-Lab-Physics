# Stage 9 — Student Execution Mode

Stage 9 changes Aria Lab Physics from an editor-first prototype into a student-facing executable laboratory mode.

## Core rules
- The default workspace mode is **اجرای آزمایش**.
- Visual behavior is always derived from a real solver snapshot.
- Unsupported canonical parts are labelled **در حال توسعه**; no fake physics is produced.
- Persian display names are required for all 203 canonical parts and all 209 migrated Crocodile experiment records.

## Executable baseline
### Optics
- Crocodile `raybox`, `torch` and lamp sources generate physical ray bundles.
- Convex/concave thin lenses bend each ray using the optics solver.
- A focus estimate is computed from outgoing rays and rendered on the board.
- `projection` is treated as a physical screen.

### Circuits
- Crocodile pictorial switches (`SPST` etc.) are real solver components.
- In execution mode the student can touch/click the switch.
- Lamp intensity is derived from calculated branch current.

### Mechanics
- Ball/block positions are rendered from the live World2D snapshot.
- Collision behavior remains solver-driven.

### Waves
- The live 2D displacement field is rendered from WaveGrid2D values.

## Reference executable experiments
1. کانون عدسی محدب
2. مدار کلید و لامپ
3. برخورد دو توپ
4. تداخل دو منبع موج

Each is an Experiment Package v2 with guide, probes, expected results and assessment.
