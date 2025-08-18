import { initWebGLCanvas, resizeCanvasToDisplaySize } from "./webgl/context";
import { Chunk } from "./world/chunk";
import { fillChunkHeights, TerrainParams } from "./world/terrain";
import { CHUNK_SIZE } from "./world/types";

/**
 * Entry point: initializes WebGL and runs a minimal render loop.
 * The goal here is only to establish a stable frame lifecycle and a clear color.
 */
function main() {
  const { gl, canvas } = initWebGLCanvas({ canvasId: "glcanvas" });

  // Terrain generation sanity test: fill a chunk with a height-based SDF
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

  function render() {
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

    requestAnimationFrame(render);
  }

  // Depth testing ensures nearer fragments hide farther ones in 3D.
  // We enable it up front even though we are not drawing geometry yet.
  gl.enable(gl.DEPTH_TEST);
  render();
}

main();
