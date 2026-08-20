# Stage 4 — Scene Editor & Interactive Runtime

Stage 4 introduces the first user-facing laboratory editor while preserving the scientific model built in Stages 1–3.

## Architectural rule: world coordinates are not pixels

`Scene Model v1` stores physical/world coordinates. The editor maintains a separate camera transform for rendering:

- scene `transform.position`: world coordinates (SI-oriented scene space)
- browser position: viewport pixels
- camera scale/origin: editor-only state and never serialized into the physics scene

This prevents UI layout decisions from corrupting physics data and keeps reference scenes portable across desktop/mobile/editor renderers.

## Packages

### `@aria-lab/editor-core`

Owns deterministic scene editing operations:

- add/remove parts
- transform/property changes
- connections and probes
- selection
- undo/redo history
- JSON import/export shape validation

It has no DOM dependency.

### `@aria-lab/component-library`

Consumes the canonical 203-part dataset and exposes:

- search/filter by domain
- default editable properties
- UI-safe logical ports (legacy duplicate port aliases are collapsed for display)

The canonical dataset remains unchanged; presentation deduplication is a view concern.

### `@aria-lab/scene-runtime`

Bridges `Scene Model v1` into scientific engines:

- Mechanics → `World2D`
- Circuits → MNA `CircuitNetwork`
- Optics → `RayScene`
- Waves → `WaveGrid2D`

The circuit adapter derives electrical nodes from editor wiring endpoints, rather than requiring UI-specific node IDs.

### `@aria-lab/measurement-engine`

Bounded time-series recorder for probes and CSV export.

### `@aria-lab/graph-engine`

Framework-independent series bounds, downsampling and SVG polyline generation.

## Web editor capabilities

`apps/web` is dependency-free in Stage 4 so the editor can run before the final frontend framework is selected.

Implemented:

- RTL Persian laboratory shell
- all 203 canonical parts searchable in the palette
- domain filters
- drag/drop and double-click insertion
- physical World ↔ Screen coordinate conversion
- part selection and dragging
- Property Inspector sourced from canonical Part Properties
- logical port rendering
- electrical/mechanical/optical/wave/binding connections
- undo / redo
- Run / Pause / Step / Reset
- Scene JSON import/export
- runtime measurements
- lightweight SVG graph view
- responsive layout baseline

## Scientific guarantees kept in Stage 4

1. Existing Stage 2/3 tests continue to pass.
2. Wave CFL instability is rejected; timestep is not silently changed.
3. Electrical wiring is converted into MNA nodes by topology.
4. UI pixels are not stored as physics coordinates.
5. Part defaults and editable Properties come from the canonical data model.

## Explicit limitations

Stage 4 is an editor/runtime foundation, not the final production laboratory UI.

Still pending:

- production rendering system for each Part (SVG/WebGL assets)
- nonlinear semiconductor circuit solve
- AC/SPICE-grade circuit analysis
- full joint/constraint mechanics toolset
- curved optical surfaces and thick lenses
- GPU wave rendering
- multi-select, snapping guides, copy/paste groups
- touch-first wiring ergonomics
- lesson authoring and guided experiment player
- persistence/backend/collaboration

These should be implemented without weakening the scientific contracts established here.
