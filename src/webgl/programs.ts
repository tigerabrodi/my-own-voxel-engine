import { createProgram } from "./shader";

/**
 * Minimal Lambert shading program.
 * What: Vertex transforms + per-fragment Lambert with ambient.
 * Why: Simple directional lighting to visualize surface normals.
 */
export function createLambertProgram({
  gl,
}: {
  gl: WebGLRenderingContext;
}): WebGLProgram {
  const vs = `
attribute vec3 a_position;
attribute vec3 a_normal;
uniform mat4 u_mvp;
uniform mat4 u_model;
varying vec3 v_normal;
void main() {
  v_normal = mat3(u_model) * a_normal;
  gl_Position = u_mvp * vec4(a_position, 1.0);
}`;

  const fs = `
precision mediump float;
varying vec3 v_normal;
uniform vec3 u_lightDir;
uniform vec3 u_ambient;
void main() {
  vec3 n = normalize(v_normal);
  float ndl = max(dot(n, normalize(u_lightDir)), 0.0);
  vec3 color = u_ambient + ndl * vec3(0.8, 0.85, 0.9);
  gl_FragColor = vec4(color, 1.0);
}`;

  return createProgram({ gl, vsSource: vs, fsSource: fs });
}
