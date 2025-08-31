import densityWGSL from "./shaders/density.wgsl?raw";

export type DensityParams = {
  worldScale: number;
  amplitude: number;
  baseHeight: number;
  octaves: number;
  lacunarity: number;
  gain: number;
  seed: number;
};

export async function runDensityCompute({
  device,
  params,
  chunkX,
  chunkY,
  chunkZ,
}: {
  device: GPUDevice;
  params: DensityParams;
  chunkX: number;
  chunkY: number;
  chunkZ: number;
}): Promise<Float32Array> {
  const CHUNK_SIZE = 16;
  const voxelCount = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE; // 4096
  const byteLength = voxelCount * 4;

  // Storage buffer for densities (GPU writes here)
  const storage = device.createBuffer({
    size: byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  // Uniforms for floats
  const pf = new Float32Array(8);
  // a: worldScale, amplitude, baseHeight, lacunarity
  pf[0] = params.worldScale;
  pf[1] = params.amplitude;
  pf[2] = params.baseHeight;
  pf[3] = params.lacunarity;
  // b: gain, seed, unused, unused
  pf[4] = params.gain;
  pf[5] = params.seed;
  pf[6] = 0;
  pf[7] = 0;
  const pfBuf = device.createBuffer({
    size: pf.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(pfBuf, 0, pf);

  // Uniforms for ints
  const pi = new Int32Array(4);
  pi[0] = chunkX;
  pi[1] = chunkY;
  pi[2] = chunkZ;
  pi[3] = params.octaves | 0;
  const piBuf = device.createBuffer({
    size: pi.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(piBuf, 0, pi);

  const module = device.createShaderModule({ code: densityWGSL });
  const pipeline = device.createComputePipeline({
    layout: "auto",
    compute: { module, entryPoint: "main" },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: storage } },
      { binding: 1, resource: { buffer: pfBuf } },
      { binding: 2, resource: { buffer: piBuf } },
    ],
  });

  // Dispatch
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  // Workgroup size 4x4x4 → groups = 4 in each dim for 16
  pass.dispatchWorkgroups(4, 4, 4);
  pass.end();

  // Read back
  const readback = device.createBuffer({
    size: byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  encoder.copyBufferToBuffer(storage, 0, readback, 0, byteLength);
  device.queue.submit([encoder.finish()]);

  await readback.mapAsync(GPUMapMode.READ);
  const copy = new Float32Array(readback.getMappedRange().slice(0));
  readback.unmap();
  return copy;
}
