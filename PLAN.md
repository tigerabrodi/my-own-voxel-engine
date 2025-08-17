## Voxel Engine MVP Plan (Phase 2)

Scope: Build a minimal voxel terrain you can fly around, using only WebGL (no 3rd‑party rendering libs). Keep systems small and iterate.

Constraints

- Only WebGL for rendering (no Three.js, etc.)
- TypeScript
- Chunk size: 16 x 16 x 16
- Keep data structures and APIs small and testable

Target directory layout

```
src/
  main.ts
  webgl/          # WebGL setup, shaders
  world/          # Chunks, world gen
  camera/         # Controls, movement
  rendering/      # Marching cubes, mesh gen
public/
```

End goal for Phase 2

- Multiple chunks visible at once (at least a 3x3 area around the player)
- Smooth FPS camera (WASD + mouse, pointer lock)
- Height‑based terrain (noise‑driven) with a simple erosion‑like touch
- Marching Cubes rendering with basic directional lighting

---

Step‑by‑step roadmap

1. Project setup + basic WebGL

- Create a WebGL context, set clear color, resize handling
- Render a test triangle (or just clear) to verify pipeline
- Acceptance: Page loads, canvas resizes, stable render loop with requestAnimationFrame

2. Chunk system (16x16x16)

- Define `Chunk` data structure (density/voxel scalar field)
- Coordinate helpers: world <-> chunk <-> local indices
- Lazy allocation for chunk data
- Acceptance: Create a chunk, set/get densities, unit tests for indexing

3. Simple height‑based terrain

- Implement small 2D noise (value or simplex variant implemented in‑house)
- Terrain function: height = noise(x,z) \* amplitude + offset
- Optional: micro erosion touch (e.g., blur/slope damp) to soften sharp steps
- Fill chunk scalar field with signed distance to surface (isoLevel = 0)
- Acceptance: Given a chunk coordinate, procedurally fill its 16^3 density

4. Marching Cubes (single chunk)

- Implement MC lookup tables
- Polygonize one 16^3 chunk to produce vertices, normals, indices
- Generate per‑vertex normals from gradient of density
- Upload mesh to GPU buffers and draw
- Acceptance: One chunk renders a shaded mesh at origin

5. Camera controls (WASD + mouse)

- Pointer lock, mouse look, WASD + Space/Shift (fly)
- Frame‑rate independent movement with delta time
- Acceptance: Smooth, predictable movement and look on desktop

6. Multi‑chunk system

- Chunk manager: load/generate/unload around player position
- World to chunk mapping; maintain a small active region (e.g., 3x3 or 5x5)
- Simple visibility selection (no heavy culling yet)
- Acceptance: Multiple chunks generate and render, updating as player moves

7. Basic directional lighting

- Simple Lambert shading in fragment shader
- Uniform for light direction, basic ambient term
- Acceptance: Lighting reacts to surface normals and camera

---

Milestones & acceptance

- M1 (Steps 1–2): WebGL loop + chunk data structure proven
- M2 (Step 3): Terrain fills scalar field consistently for any chunk coord
- M3 (Step 4): Single chunk renders with MC and normals
- M4 (Step 5): FPS camera stable
- M5 (Steps 6–7): 3x3 (or more) chunks render with directional light; flyable world

Key design decisions (initial defaults)

- Coordinate system: right‑handed; +X right, +Y up, +Z forward
- Units: 1 unit = 1 voxel; chunk world size = 16 units on each axis
- Iso level: 0.0; densities negative = inside terrain
- Terrain scale: start with coarse noise (e.g., 0.01–0.02) and amplitude ~12–24

Out‑of‑scope (for now)

- Advanced erosion simulation, shadows, AO, PBR
- GPU compute pipelines, mesh LOD, occlusion culling
- Saving/loading worlds

Next actionable tasks (to start immediately)

- Create `src/webgl/` with a minimal GL init (context, resize, clear)
- Hook a render loop in `src/main.ts`
- Add a simple input loop scaffold for future camera controls
