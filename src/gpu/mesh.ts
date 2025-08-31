import type { MeshData } from "../rendering/meshTypes";

export type GPUMesh = {
  position: GPUBuffer;
  normal: GPUBuffer;
  index: GPUBuffer;
  indexCount: number;
};

export function createGPUMesh({
  device,
  mesh,
}: {
  device: GPUDevice;
  mesh: MeshData;
}): GPUMesh {
  const position = device.createBuffer({
    size: mesh.positions.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    position,
    0,
    mesh.positions.buffer,
    mesh.positions.byteOffset,
    mesh.positions.byteLength
  );

  const normal = device.createBuffer({
    size: mesh.normals.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    normal,
    0,
    mesh.normals.buffer,
    mesh.normals.byteOffset,
    mesh.normals.byteLength
  );

  // Ensure index data is 4-byte aligned for writeBuffer
  const indexBytes = mesh.indices.byteLength;
  const paddedBytes = (indexBytes + 3) & ~3;
  const index = device.createBuffer({
    size: paddedBytes,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  if ((indexBytes & 3) === 0) {
    device.queue.writeBuffer(
      index,
      0,
      mesh.indices.buffer,
      mesh.indices.byteOffset,
      indexBytes
    );
  } else {
    const src = new Uint8Array(
      mesh.indices.buffer,
      mesh.indices.byteOffset,
      indexBytes
    );
    const padded = new Uint8Array(paddedBytes);
    padded.set(src);
    device.queue.writeBuffer(index, 0, padded);
  }

  return { position, normal, index, indexCount: mesh.indices.length };
}
