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

  const index = device.createBuffer({
    size: mesh.indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    index,
    0,
    mesh.indices.buffer,
    mesh.indices.byteOffset,
    mesh.indices.byteLength
  );

  return { position, normal, index, indexCount: mesh.indices.length };
}
