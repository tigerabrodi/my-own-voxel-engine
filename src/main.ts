import { createFlyControls } from "./camera/flyControls";
import { runDensityCompute } from "./gpu/compute";
import { initWebGPU, resizeCanvasToDisplaySize } from "./gpu/context";
import { createLambertPipeline } from "./gpu/lambert";
import { createGPUMesh, type GPUMesh } from "./gpu/mesh";
import { aabbInFrustum, extractFrustumPlanes } from "./math/frustum";
import { multiply4, perspective, translation4 } from "./math/mat4";
import { type TerrainParams } from "./world/terrain";
import { CHUNK_SIZE } from "./world/types";

async function main() {
  const { device, context, canvas, format } = await initWebGPU({
    canvasId: "glcanvas",
  });
  const { pipeline, bindGroupLayout } = createLambertPipeline({
    device,
    format,
  });

  let depthTexture = device.createTexture({
    size: { width: canvas.width, height: canvas.height },
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // Terrain
  const terrain: TerrainParams = {
    seed: 1337,
    worldScale: 0.017,
    amplitude: 24,
    baseHeight: 11,
    octaves: 4,
    lacunarity: 2.0,
    gain: 0.5,
  };

  // Uniforms
  const uniformBufferSize = 64 + 64 + 16 + 16; // mvp + model + light + ambient
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  // Helper: MC in a worker
  function mcPolygonizeInWorker(densities: Float32Array): Promise<{
    positions: Float32Array;
    normals: Float32Array;
    indices: Uint16Array;
  }> {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 1e9);
      const worker = new Worker(
        new URL("./workers/mcWorker.ts", import.meta.url),
        { type: "module" }
      );
      worker.onmessage = (
        ev: MessageEvent<{
          id: number;
          positions: Float32Array;
          normals: Float32Array;
          indices: Uint16Array;
        }>
      ) => {
        resolve({
          positions: ev.data.positions,
          normals: ev.data.normals,
          indices: ev.data.indices,
        });
        worker.terminate();
      };
      worker.postMessage({ id, densities }, [densities.buffer]);
    });
  }

  // Preload fixed grid (3x3x1) sequentially before enabling controls
  const gridMeshes: Array<{
    cx: number;
    cy: number;
    cz: number;
    mesh: GPUMesh;
  }> = [];
  const radius = 1;
  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const cx = dx,
        cy = 0,
        cz = dz;
      const densities = await runDensityCompute({
        device,
        params: terrain,
        chunkX: cx,
        chunkY: cy,
        chunkZ: cz,
      });
      const meshData = await mcPolygonizeInWorker(densities);
      const gpuMesh = createGPUMesh({ device, mesh: meshData });
      gridMeshes.push({ cx, cy, cz, mesh: gpuMesh });
    }
  }

  // Controls after preload
  const controls = createFlyControls({
    canvas,
    position: [24, 24, 48],
    target: [8, 8, 8],
  });
  let lastTime = performance.now();

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

    const now = performance.now();
    const dt = Math.min(1 / 120, (now - lastTime) / 1000);
    lastTime = now;
    controls.update({ dt });

    const aspect = canvas.width / canvas.height;
    const proj = perspective({
      fovyRad: Math.PI / 3,
      aspect,
      near: 0.1,
      far: 1000,
    });
    const view = controls.getViewMatrix();
    const pv = multiply4({ a: proj, b: view });
    const planes = extractFrustumPlanes(pv);

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

    // Draw preloaded grid
    for (const rec of gridMeshes) {
      const min: [number, number, number] = [
        rec.cx * CHUNK_SIZE,
        rec.cy * CHUNK_SIZE,
        rec.cz * CHUNK_SIZE,
      ];
      const max: [number, number, number] = [
        min[0] + CHUNK_SIZE,
        min[1] + CHUNK_SIZE,
        min[2] + CHUNK_SIZE,
      ];
      if (!aabbInFrustum(planes, min, max)) continue;

      const model = translation4({ x: min[0], y: min[1], z: min[2] });
      const mvp = multiply4({ a: proj, b: multiply4({ a: view, b: model }) });
      const uData = new Float32Array(uniformBufferSize / 4);
      uData.set(mvp, 0);
      uData.set(model, 16);
      uData.set([-0.35, 0.9, 0.25, 0], 32);
      uData.set([0.12, 0.14, 0.16, 0], 36);
      device.queue.writeBuffer(
        uniformBuffer,
        0,
        uData.buffer,
        uData.byteOffset,
        uData.byteLength
      );
      pass.setVertexBuffer(0, rec.mesh.position);
      pass.setVertexBuffer(1, rec.mesh.normal);
      pass.setIndexBuffer(rec.mesh.index, "uint16");
      pass.drawIndexed(rec.mesh.indexCount, 1, 0, 0, 0);
    }

    pass.end();
    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }
  frame();
}

main();
