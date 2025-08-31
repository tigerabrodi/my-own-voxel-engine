## Phase 3 — Large World, Streaming, and Foundations for Scale

Scope: Expand the MVP into a streaming voxel world that stays performant and memory‑bounded. Keep the design compatible with WebGL1 and the current code structure.

Constraints

- WebGPU only (render + compute). No WebGL path after migration
- TypeScript, no third‑party render engines
- Maintain simple, testable modules (mirror Phase 2 style)

Current baseline (from Phase 2)

- `world/` has `Chunk` (16³), `chunkManager` loads a 2R+1 ring in XZ (single Y layer)
- `terrain.ts` provides height‑field SDF via FBM value noise
- `rendering/` has Marching Cubes + tables, normals from density gradient
- `webgl/` handles context, programs, mesh buffers
- `camera/` provides fly controls with pointer lock

Phase 3 Objectives

1. WebGPU rendering migration (primary)
2. WebGPU compute densities
3. Dynamic streaming (load/unload)
4. Basic runtime optimizations (culling, prioritization, memory bounds)
5. Improved world generation (layered noise + features)
6. Origin shifting for large coordinates

---

### 1) Dynamic Chunk Streaming

Deliverables

- Expand active region to a configurable radius (default R=3..8) in XZ and optionally multiple Y layers later
- Maintain explicit states per chunk: `Unloaded | QueuedGenerate | Populated | Meshed | Uploaded`
- As the player moves, enqueue work for new chunks and unload distant ones

API additions

- `world/chunkManager.ts`
  - Track `Map<ChunkKey, ChunkRecord>` where `ChunkRecord` holds `chunk`, `meshData?`, `glMesh?`, `state`, `lastTouchedFrame`
  - Methods: `update(center, radius)`, `getVisible()`, `getStats()`
- `rendering/meshQueue.ts` (new)
  - Small FIFO/LIFO queue for CPU tasks: generate densities, polygonize
  - Rate‑limit per frame (e.g., max X ms or N cells) to avoid frame spikes

Implementation notes

- Keep current synchronous path working; add an optional background queue (still on main thread) that processes a few chunks per frame
- Unload policy: when a chunk leaves the active set, delete GPU buffers immediately and drop `meshData`; keep only seed/params

Acceptance

- Walking the camera through the world visibly loads nearby chunks and frees old ones without stutters or memory growth

---

### 2) Basic Optimizations

Deliverables

- Frustum culling per chunk AABB in view space
- Distance‑based work budget: prioritize closer chunks for generation/meshing
- Memory caps: configurable limits for `maxLoadedChunks` and `maxUploadedMeshes`

API/Code changes

- `webgl/camera.ts` → add helpers to build a frustum planes struct
- `world/chunkManager.ts` → compute world‑space AABB for each chunk; expose `getVisible()` filtered by frustum
- `main.ts` → draw only visible set

Acceptance

- Camera facing empty space draws ~0 chunks; turning toward terrain increases draws; FPS stays stable as you move

---

### 3) Better World Generation (CPU, WebGL1‑friendly)

Deliverables

- Replace single height‑field with layered noises: base heightfield + ridged FBM modifier + domain warping
- Optional features toggles: caves (3D noise threshold), simple ores (masked 3D noise), sparse “pillars/ridges” via bias

API/Code changes

- `world/noise.ts` → add ridged FBM, 3D value noise, domain warp helpers
- `world/terrain.ts` → compose SDF: `surface = y - H(xz) + modifiers`; caves subtract interior density using 3D noise

Acceptance

- Distinct silhouettes and more varied terrain while preserving Marching Cubes performance

---

### 4) Origin Shifting

Deliverables

- Keep player near (0,0,0) to mitigate float precision
- Maintain `worldOrigin` offset. Convert world→render coordinates by subtracting `worldOrigin`
- When the player crosses a threshold (e.g., 256 units), shift `worldOrigin` and remap active chunks’ keys

API/Code changes

- `world/coords.ts` → add `applyOriginShift(origin, vec3)` and chunk key helpers that include origin epoch if needed
- `main.ts` → check shift each frame; update matrices/model translations accordingly

Acceptance

- You can travel far without visible jitter; meshes continue to render correctly after shifts

---

### Milestones

- M6: Streaming ring (R=3), unload on exit, no memory growth
- M7: Frustum culling + distance prioritization; stable frame time while moving
- M8: Layered terrain (ridged + warp + optional caves) with MC
- M9: Origin shifting with seamless rendering across shifts

---

### Suggested Task Order (actionable)

1. WebGPU rendering migration (Why: align the whole engine around WebGPU now)
   - Create `gpu/context.ts` (adapter/device, canvas + swap chain setup).
   - Port simple color pass: clear + draw a test triangle/quad.
   - Port current mesh pipeline: vertex/index buffers, uniform buffers, WGSL shader pair for Lambert.
   - Render the existing single‑chunk mesh via WebGPU (no compute yet).
   - Outcome & how to test:
     - App starts only if `navigator.gpu` exists; canvas clears and draws a test mesh.
     - The previous WebGL code path is removed and unused imports stripped.
2. WebGPU compute densities (Why: move generation off CPU and prepare for GPU MC)
   - Add `gpu/pipelines.ts` (compute) and `gpu/shaders/density.wgsl`.
   - Implement a compute pass that writes a 16×16×16 density buffer per chunk using current SDF.
   - Read back densities to CPU for existing Marching Cubes temporarily.
   - Outcome & how to test:
     - Console shows matching center density from GPU vs prior CPU path (within tolerance).
     - Toggling a flag to use CPU/GPU densities yields identical meshes.
3. Chunk states & per‑frame work queues (Why: foundation for streaming without hitches)
   - Add `ChunkRecord` and a simple state machine (`Unloaded → QueuedGenerate → Populated → Meshed → Uploaded`).
   - Implement a per‑frame budget (e.g., 3 ms or N chunks) to process generation/MC/upload incrementally.
   - Outcome & how to test:
     - Moving the camera loads nearby chunks gradually; FPS stays steady; memory does not continually grow.
4. Unload logic (Why: bound memory so long sessions don’t leak)
   - Dispose GPU buffers immediately on eviction; drop CPU mesh; keep only seed/params.
   - Add LRU or distance‑based eviction when caps are exceeded.
   - Outcome & how to test:
     - Watching memory in dev tools shows plateau after moving around; unloaded chunks’ GPU buffers disappear.
5. CPU frustum culling (Why: skip obvious off‑screen chunks cheaply)
   - Extract frustum planes from `proj*view`; test chunk AABBs; only draw visible.
   - Outcome & how to test:
     - Looking at empty sky draws 0 chunks; turning toward terrain increases draw count.
6. Distance prioritization (Why: players notice nearby quality first)
   - Score queued work by squared distance; process nearest first.
   - Outcome & how to test:
     - Nearby holes fill first; distant terrain may pop in slightly later without stutter.
7. Memory caps (Why: predictable resource footprint)
   - Configurable caps for `maxLoadedChunks` and `maxUploadedMeshes`; evict farthest when above cap.
   - Outcome & how to test:
     - Exceeding caps triggers eviction logs, but gameplay remains smooth.
8. Worldgen upgrades (Why: visual variety without new systems)
   - Ridged FBM and domain warp for terrain; optional caves via 3D noise thresholding.
   - Outcome & how to test:
     - Terrain variety is visibly higher; triangles per chunk and frame time remain within budget.
9. Origin shift (Why: float precision at large distances)
   - Add `worldOrigin`; subtract in model transforms and camera; shift when beyond threshold.
   - Outcome & how to test:
     - Traveling far then shifting origin does not cause visible jitter; chunk positions remain correct.
10. GPU Marching Cubes (Why: full GPU path)

- Prototype a WGSL MC stage once densities + rendering are stable.
- Outcome & how to test:
  - CPU time during meshing drops significantly; geometry output matches CPU MC reference.

---

### Notes for Phase 4 compatibility

- Keep mesh layout stable (positions, normals, indices) for future lighting/shading upgrades
- Consider batching uploads using VAO when available; keep fallbacks for WebGL1

---

### Glossary

- AABB: Axis‑Aligned Bounding Box (min/max corners aligned to axes); cheap for culling.
- Frustum: Pyramid‑like view volume defined by camera; anything outside can be skipped.
- Domain warp: Modify noise sample coordinates by other noises to add large‑scale bends.
- Ridged FBM: 1 − |noise| across octaves; produces sharper peaks/ridges than standard FBM.

### Metrics to Watch (Why these matter)

- Frame time (ms): latency budget; target steady frame time while moving.
- Upload counts/frame: indicates streaming churn; keep within a small bound.
- Loaded vs uploaded counts: guardrails for CPU/GPU memory usage.
- GC pauses / stutters: signal that per‑frame budget/work queue needs tuning.

---

### WebGPU (primary compute path)

Why

- WebGL lacks compute; WebGPU unlocks GPU compute for density generation and, later, GPU MC.

Plan

1. Bootstrap WebGPU alongside a minimal WebGL fallback (feature detect at startup).
2. Implement a WGSL compute pass for densities (16×16×16 per chunk).
3. Read back densities for existing CPU MC; later, add a GPU MC prototype.
4. Runtime flag controls fallback; WebGPU is the default path.

Deliverables

- `gpu/` directory with `context.ts`, `pipelines.ts` (compute), and WGSL shaders
- Adapter that feeds CPU MC with densities from GPU when available

Notes

- Browser support varies; fallback remains available; workers help on CPU when GPU is unavailable.
