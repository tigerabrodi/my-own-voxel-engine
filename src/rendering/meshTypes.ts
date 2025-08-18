export type MeshData = {
  positions: Float32Array; // 3 * numVertices
  normals: Float32Array; // 3 * numVertices
  indices: Uint32Array; // 3 * numTriangles
};
