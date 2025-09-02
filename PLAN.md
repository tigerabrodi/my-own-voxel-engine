## Voxel Engine (Three.js) — Detailed, Chronological Plan

This plan rebuilds the voxel engine with Three.js, focusing on clarity and incremental verification. Each step states what to implement, why it matters, and how to verify (visual checks or logs).

Assumptions

- Vite + TypeScript + Three.js.
- Entry: `src/main.ts`; root `index.html` contains a canvas or uses default renderer canvas insertion.
- Use `console.log` and `renderer.info` for simple diagnostics.

### Phase 1 — Foundations

1. Project bootstrap with renderer, scene, camera, loop ✅

- What: Create `THREE.WebGLRenderer`, `THREE.Scene`, `THREE.PerspectiveCamera`, and a `requestAnimationFrame` loop. Add window resize handling.
- Why: Establish a predictable rendering baseline.
- Test:

  - Visual: Canvas shows a clear color (e.g., dark gray), no errors.
  - Logs: `console.log("boot: three baseline ok")` prints once.

- Notes:
  - Call `renderer.setPixelRatio(window.devicePixelRatio)` and `renderer.setSize(innerWidth, innerHeight)`.
  - Set `renderer.outputColorSpace = THREE.SRGBColorSpace`.
  - Optional: `renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0`.
  - On window resize: update `camera.aspect`, call `camera.updateProjectionMatrix()`, and `renderer.setSize()`.

2. Lighting + simple helpers ✅

- What: Add `THREE.AmbientLight`, `THREE.DirectionalLight`, and `THREE.AxesHelper` or `THREE.GridHelper`.
- Why: Confirm lighting works and set a spatial frame of reference.
- Test:
  - Visual: Axes/grid visible; moving light changes helper shading subtly.
  - Logs: Light and helper object counts in scene hierarchy.

3. Voxel data container (CPU) with small utilities ✅

- What: Implement a minimal voxel volume container using a 3D array or flat array with index helpers `xyz → i`. Provide `getVoxel`, `setVoxel`, `fill(predicate)`.
- Why: Core data model for voxels; independent from rendering.
- Test:
  - Logs: After a few sets/gets, log sample values and array length.
  - Non-visual: Bounds checks and index mapping correctness logs.

4. Geometry adaptor: from voxel volume to BufferGeometry (naive cubes) ✅

- What: Convert each solid cell to a cube mesh (greedy meshing not required now). Generate `position`, `normal`, `uv`, and `index` arrays; build `THREE.BufferGeometry` and `THREE.Mesh`.
- Why: First end-to-end path from data to something on screen.
- Test:

  - Visual: A small blocky shape appears (e.g., 8×8×8 hill or a single cube).
  - Logs:
    - Number of cubes → expected (e.g., count of filled cells)
    - Geometry attributes sizes.

- Notes:
  - Attributes:
    - `geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))`
    - `geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))`
    - `geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))`
    - `geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1))` (use `Uint32Array` if vertices > 65535)
  - If normals omitted, call `geometry.computeVertexNormals()`.
  - After writing attributes, compute bounds: `geometry.computeBoundingSphere()` (and `computeBoundingBox()` if needed).

5. Marching Cubes integration (CPU) ✅

- What: Implement/port MC tables; write `polygonize(densityField, isoLevel)` producing triangle soup; compute vertex normals via gradient or cross products; return `BufferGeometry`.
- Why: Smooth surface extraction from scalar fields; foundation for terrain.
- Test:

  - Visual: Render an isosurface of a sphere SDF; rotating shows smooth lighting.
  - Logs: Triangle and vertex counts within expected ranges (not zero, not exploding).

- Notes:
  - Ensure counter-clockwise winding for faces (front-face default).
  - Prefer indexed geometry: `geometry.setIndex(indices)` to reduce duplication.
  - If generating positions only, run `geometry.computeVertexNormals()`.
  - Optional cleanup: merge nearly-duplicate vertices for better normals using `BufferGeometryUtils.mergeVertices` (if imported).

6. Basic material & camera controls

- What: Use `THREE.MeshStandardMaterial` (color, metalness=0, roughness≈0.9). Add `OrbitControls` for quick inspection.
- Why: Lighting verifies normals; controls speed up iteration.
- Test:

  - Visual: Specular highlights change with camera; orbit and zoom work.
  - Logs: `renderer.info.render.triangles` reasonable and changes with LOD/size.

- Notes:
  - Import controls: `import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'` and bind to `renderer.domElement`.
  - `MeshStandardMaterial` requires lights; set `flatShading: false` for smooth MC surfaces.
  - Debug logs: print `camera.position` and `controls.target` on input for quick sanity checks.

### Phase 2 — First Voxel Engine Core

7. Chunk definition and coordinate system

- What: Define constants `CHUNK_SIZE`, chunk world size = `CHUNK_SIZE` units; implement helpers to map world position → chunk key + local coord; store chunks in `Map` keyed by `x,y,z`.
- Why: Organize world into manageable regions.
- Test:
  - Logs: For a few sample world coords, print computed chunk keys and locals; verify round-trips.

8. Chunk container objects in Three.js

- What: Represent each chunk as a `THREE.Group` containing a single MC mesh. Position the group by chunk origin.
- Why: Simple lifetime management; easy add/remove.
- Test:
  - Visual: Adding multiple chunk groups places meshes on a grid.
  - Logs: Scene child count equals number of active chunks.

9. Terrain generation (heightfield SDF → density field)

- What: Implement 2D noise-based height function H(x,z). Density(y) = y − H(x,z). Fill chunk density fields then run MC.
- Why: Produce coherent outdoor terrain quickly.
- Test:
  - Visual: Hills/valleys; iso surface around y≈H. Changing amplitude/frequency alters shape.
  - Logs: Generation time per chunk (ms), min/max density, triangle counts.

10. Basic camera movement options

- What: Keep `OrbitControls` for inspection; optionally add simple WASD fly controls later.
- Why: Navigate terrain comfortably.
- Test:
  - Visual: Camera navigation smooth; no control conflicts.
  - Logs: Current camera position printed on key press for debugging.

11. Materials and lighting polish

- What: Configure `DirectionalLight` with shadow map off initially; tweak material color and roughness; add ambient.
- Why: Readable surface without the cost/complexity of shadows.
- Test:
  - Visual: Terrain readable from most angles; no glaring specular artifacts.
  - Logs: Material params on toggle to ensure runtime updates work.

### Phase 3 — Expand and Optimize

12. Active ring loading around camera (static radius)

- What: Compute required chunk keys in a radius R (XZ) around camera; load missing chunks (generate density+mesh); keep them in memory.
- Why: Show more terrain while bounding generation work.
- Test:
  - Visual: As camera moves, new surrounding chunks appear; no hard stutter.
  - Logs: On update, print counts: `needed`, `loaded`, `newlyAdded`.

13. Unload chunks outside radius

- What: Remove chunk groups and drop geometry for chunks beyond R.
- Why: Keep memory within bounds.
- Test:
  - Visual: Distant chunks disappear when far enough; near area remains filled.
  - Logs: `removed` count on each maintenance pass; track total memory via `renderer.info` trends.

14. Frustum-aware visibility (simple)

- What: Rely on Three.js built-in frustum culling per object; ensure chunk groups have correct `matrixWorld` and bounding spheres/boxes via geometry.
- Why: Avoid drawing off-screen chunks.
- Test:

  - Visual: Looking at empty sky reduces draw calls.
  - Logs: Observe `renderer.info.render.calls` drop when looking away.

- Notes:
  - Leave `mesh.frustumCulled = true` (default) unless debugging visibility issues.
  - After attributes are updated, recompute bounds: `geometry.computeBoundingSphere()` (and optionally `computeBoundingBox()`).

15. Terrain improvements (procedural variety)

- What: Add layered noise: base heightfield + ridged modifier and optional domain warp; expose a few tunable params.
- Why: More interesting silhouettes with modest cost.
- Test:
  - Visual: Sharper ridges and warped features; toggles reflect immediately.
  - Logs: Regeneration times stay stable; triangle counts within acceptable bounds.

16. LOD with THREE.LOD

- What: For each chunk, generate 2–3 geometry resolutions (e.g., different sampling steps) and attach them to a `THREE.LOD` object with distance thresholds.
- Why: Reduce triangle counts at distance while keeping close detail.
- Test:

  - Visual: Walking toward/away changes mesh detail smoothly.
  - Logs: Triangle counts and draw calls drop when far; thresholds adjustable at runtime.

- Notes:
  - Usage example:
    - `const lod = new THREE.LOD();`
    - `lod.addLevel(meshHigh, 0);`
    - `lod.addLevel(meshMid, 50);`
    - `lod.addLevel(meshLow, 120);`
  - Distances are world units from the camera; tune to your scene scale.

17. Optional: Basic runtime profiling HUD

- What: Small on-screen text overlay: fps, active chunks, triangles, draw calls.
- Why: Quantify changes as features land.
- Test:
  - Visual: Overlay updates each frame and matches `renderer.info`.
  - Logs: None (overlay is the metric).

Deliverable Criteria (high-level)

- Stable render loop with camera and lighting.
- MC-generated terrain rendered via chunks; ring-based load/unload works.
- Frustum culling effective; LOD reduces distant cost.
- Simple, tweakable worldgen producing varied terrain.
