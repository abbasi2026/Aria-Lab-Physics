# Stage 4 Test Report

## Automated suite

Run:

```bash
npm test
```

Stage 4 adds tests for:

1. blank Scene Model validation
2. editor add/update/remove + undo/redo
3. connection cleanup after part removal
4. all 203 canonical parts available through ComponentCatalog
5. duplicate legacy terminal aliases collapsed for editor display
6. bounded measurement recorder + CSV
7. graph bounds/downsample/SVG path generation
8. mechanics scene execution
9. circuit scene solve from explicit nodes
10. circuit node derivation from editor wiring topology
11. optics scene ray trace
12. stable 2D wave runtime + probe recording
13. rejection of unstable wave CFL configuration

The whole legacy + scientific regression suite must remain green before Stage 4 is publishable.

## Browser smoke-check note

The local static server is provided with `npm run dev` and all requested HTTP assets were verified reachable. Automated Chromium navigation is restricted in the current execution sandbox, so visual/browser interaction should also be run on the developer workstation before merging.
