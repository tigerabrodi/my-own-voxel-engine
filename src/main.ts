import { initWebGPU, resizeCanvasToDisplaySize } from "./gpu/context";
import { createLambertPipeline } from "./gpu/lambert";
import { createGPUMesh } from "./gpu/mesh";
import { polygonizeChunk } from "./rendering/marchingCubes";
import { Chunk } from "./world/chunk";
import { fillChunkHeights, type TerrainParams } from "./world/terrain";
// import { CHUNK_SIZE } from "./world/types";
import {
  identity4,
  multiply4,
  perspective,
  translation4,
} from "./webgl/camera";

/**
 * Entry point: set up WebGL, generate one chunk of terrain, polygonize with
 * Marching Cubes, upload mesh to GPU, and render with a simple lit shader.
 * Why: Completes Step 4 — rendering a single chunk.
 */
async function main() {
  const { device, context, canvas, format } = await initWebGPU({
    canvasId: "glcanvas",
  });
  const { pipeline, bindGroupLayout } = createLambertPipeline({
    device,
    format,
  });

  // Depth
  let depthTexture = device.createTexture({
    size: { width: canvas.width, height: canvas.height },
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // CPU MC single chunk for now
  const terrain: TerrainParams = {
    seed: 1337,
    worldScale: 0.02,
    amplitude: 12,
    baseHeight: 8,
    octaves: 4,
    lacunarity: 2.0,
    gain: 0.5,
  };
  const chunk = new Chunk({ chunkX: 0, chunkY: 0, chunkZ: 0 });
  fillChunkHeights({ chunk, params: terrain });
  const meshData = polygonizeChunk({ chunk, isoLevel: 0 });
  const gpuMesh = createGPUMesh({ device, mesh: meshData });

  const uniformBufferSize = 64 + 64 + 16 + 16; // mvp + model + light + ambient
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  function frame() {
    const resized = resizeCanvasToDisplaySize({ canvas });
    if (resized) {
      depthTexture.destroy();
      depthTexture = device.createTexture({
        size: { width: canvas.width, height: canvas.height },
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }

    const aspect = canvas.width / canvas.height;
    const proj = perspective({
      fovyRad: Math.PI / 3,
      aspect,
      near: 0.1,
      far: 1000,
    });
    const view = translation4({ x: 0, y: 0, z: -48 });
    const model = identity4();
    const mvp = multiply4({ a: proj, b: multiply4({ a: view, b: model }) });

    const uData = new Float32Array(uniformBufferSize / 4);
    uData.set(mvp, 0);
    uData.set(model, 16);
    uData.set([-0.5, 1.0, 0.3, 0], 32);
    uData.set([0.2, 0.22, 0.25, 0], 36);
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      uData.buffer,
      uData.byteOffset,
      uData.byteLength
    );

    const encoder = device.createCommandEncoder();
    const colorView = context.getCurrentTexture().createView();
    const depthView = depthTexture.createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: colorView,
          clearValue: { r: 0.07, g: 0.09, b: 0.12, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthView,
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, gpuMesh.position);
    pass.setVertexBuffer(1, gpuMesh.normal);
    pass.setIndexBuffer(gpuMesh.index, "uint16");
    pass.drawIndexed(gpuMesh.indexCount, 1, 0, 0, 0);
    pass.end();
    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }
  frame();
}

main();
