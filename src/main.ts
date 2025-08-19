import { createFlyControls } from "./camera/flyControls";
import { polygonizeChunk } from "./rendering/marchingCubes";
import {
  identity4,
  multiply4,
  perspective,
  translation4,
} from "./webgl/camera";
import { initWebGLCanvas, resizeCanvasToDisplaySize } from "./webgl/context";
import { bindMeshAttributes, createMesh } from "./webgl/mesh";
import { createLambertProgram } from "./webgl/programs";
import { Chunk } from "./world/chunk";
import { createChunkManager } from "./world/chunkManager";
import { fillChunkHeights, type TerrainParams } from "./world/terrain";
import { CHUNK_SIZE } from "./world/types";

/**
 * Entry point: set up WebGL, generate one chunk of terrain, polygonize with
 * Marching Cubes, upload mesh to GPU, and render with a simple lit shader.
 * Why: Completes Step 4 — rendering a single chunk.
 */
function main() {
  const { gl, canvas } = initWebGLCanvas({ canvasId: "glcanvas" });

  // 1) Generate terrain densities for a single chunk
  const testChunk = new Chunk({ chunkX: 0, chunkY: 0, chunkZ: 0 });
  const terrainParams: TerrainParams = {
    seed: 1337,
    worldScale: 0.02, // lower = larger features
    amplitude: 12,
    baseHeight: 8,
    octaves: 4,
    lacunarity: 2.0,
    gain: 0.5,
  };

  fillChunkHeights({ chunk: testChunk, params: terrainParams });
  const center = Math.floor(CHUNK_SIZE / 2);
  console.log(
    "Center density after terrain fill:",
    testChunk.getDensity(center, center, center)
  );

  // 2) Marching Cubes: convert densities → triangle mesh
  const meshData = polygonizeChunk({ chunk: testChunk, isoLevel: 0 });
  console.log(
    "Mesh vertex count:",
    meshData.positions.length / 3,
    "triangles:",
    meshData.indices.length / 3
  );

  // 3) Create GL program and upload mesh buffers
  const program = createLambertProgram({ gl });
  const vaoExt = gl.getExtension("OES_vertex_array_object");
  const glMesh = createMesh({ gl, ext: vaoExt, mesh: meshData });

  // 3b) Chunk manager for multi-chunk rendering
  const chunkManager = createChunkManager({ terrain: terrainParams });

  let lastTime = performance.now();
  const controls = createFlyControls({
    canvas,
    position: [24, 24, 48],
    target: [8, 8, 8],
  });

  function render() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    const resized = resizeCanvasToDisplaySize({ canvas });
    if (resized) {
      // Ensure the GL viewport matches the actual canvas pixel size.
      // Without this, content can look stretched or clipped after resizes/zoom.
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // Set the color used when clearing the screen.
    // clearColor takes normalized RGBA components in the range [0, 1].
    // Here: a dark blue‑gray background (R=0.07, G=0.09, B=0.12) with full opacity (A=1.0).
    // You can think of it like RGB in 0–255 scaled down: ~ (18, 23, 31).
    gl.clearColor(0.07, 0.09, 0.12, 1.0);

    // Clear both the color buffer (the visible pixels) and the depth buffer
    // (used for correct 3D occlusion). Clearing depth each frame avoids
    // leftover depth values from previous frames affecting current rendering.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 4) Camera + matrices (now driven by fly controls)
    const aspect = canvas.width / canvas.height;
    const proj = perspective({
      fovyRad: Math.PI / 3,
      aspect,
      near: 0.1,
      far: 1000,
    });
    controls.update({ dt });
    const camPos = controls.getPosition();
    chunkManager.update({
      centerX: camPos[0],
      centerY: camPos[1],
      centerZ: camPos[2],
      radius: 2,
    });
    const view = controls.getViewMatrix();
    const model = identity4();
    const mvp = multiply4({ a: proj, b: multiply4({ a: view, b: model }) });

    gl.useProgram(program);
    const u_mvp = gl.getUniformLocation(program, "u_mvp");
    const u_model = gl.getUniformLocation(program, "u_model");
    const u_lightDir = gl.getUniformLocation(program, "u_lightDir");
    const u_ambient = gl.getUniformLocation(program, "u_ambient");
    gl.uniformMatrix4fv(u_mvp, false, mvp);
    gl.uniformMatrix4fv(u_model, false, model);
    gl.uniform3f(u_lightDir, -0.5, 1.0, 0.3);
    gl.uniform3f(u_ambient, 0.2, 0.22, 0.25);

    // 5) Draw all loaded chunks using the same mesh geometry, with per-chunk translation
    for (const [key] of chunkManager.getLoaded()) {
      const [cx, cy, cz] = key.split(",").map(Number);
      const modelT = translation4({
        x: cx * CHUNK_SIZE,
        y: cy * CHUNK_SIZE,
        z: cz * CHUNK_SIZE,
      });
      const mvpChunk = multiply4({
        a: proj,
        b: multiply4({ a: view, b: modelT }),
      });
      gl.uniformMatrix4fv(u_mvp, false, mvpChunk);
      gl.uniformMatrix4fv(u_model, false, modelT);
      bindMeshAttributes({ gl, ext: vaoExt, mesh: glMesh, program });
      gl.drawElements(gl.TRIANGLES, glMesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(render);
  }

  // Depth testing ensures nearer fragments hide farther ones in 3D.
  // We enable it up front even though we are not drawing geometry yet.
  gl.enable(gl.DEPTH_TEST);
  render();
}

main();
