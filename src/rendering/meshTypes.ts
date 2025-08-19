// MeshData represents a CPU-side mesh ready to upload to GPU buffers.
// We keep it minimal: interleaving is done on the GPU bind step.
export type MeshData = {
  positions: Float32Array; // 3 * numVertices
  normals: Float32Array; // 3 * numVertices
  indices: Uint16Array; // 3 * numTriangles (WebGL1-friendly)
};
