// GPU mesh helpers
// What: Create and bind buffers/attributes. Why: Separate GL boilerplate from logic.
// Uses OES_vertex_array_object if present to reduce state churn.
import type { MeshData } from "../rendering/meshTypes";

export type GLMesh = {
  vao: WebGLVertexArrayObjectOES | null;
  vbo: WebGLBuffer | null;
  nbo: WebGLBuffer | null;
  ebo: WebGLBuffer | null;
  indexCount: number;
  model?: Float32Array; // optional per-instance model matrix
};

/**
 * Uploads CPU mesh to GPU buffers. Returns handles plus index count.
 */
export function createMesh({
  gl,
  ext,
  mesh,
}: {
  gl: WebGLRenderingContext;
  ext: OES_vertex_array_object | null;
  mesh: MeshData;
}): GLMesh {
  const vao = ext ? ext.createVertexArrayOES() : null;
  if (vao && ext) ext.bindVertexArrayOES(vao);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);

  const nbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

  const ebo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

  if (vao && ext) ext.bindVertexArrayOES(null);

  return { vao, vbo, nbo, ebo, indexCount: mesh.indices.length };
}

/**
 * Binds attribute layouts for a_position and a_normal.
 * Why: Keeps shader → buffer wiring in one place for clarity.
 */
export function bindMeshAttributes({
  gl,
  ext,
  mesh,
  program,
}: {
  gl: WebGLRenderingContext;
  ext: OES_vertex_array_object | null;
  mesh: GLMesh;
  program: WebGLProgram;
}): void {
  const posLoc = gl.getAttribLocation(program, "a_position");
  const nrmLoc = gl.getAttribLocation(program, "a_normal");

  if (mesh.vao && ext) {
    ext.bindVertexArrayOES(mesh.vao);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nbo);
  gl.enableVertexAttribArray(nrmLoc);
  gl.vertexAttribPointer(nrmLoc, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ebo);
}
