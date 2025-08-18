export function compileShader({
  gl,
  type,
  source,
}: {
  gl: WebGLRenderingContext;
  type: number;
  source: string;
}): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Shader compile error: " + info);
  }
  return shader;
}

export function createProgram({
  gl,
  vsSource,
  fsSource,
}: {
  gl: WebGLRenderingContext;
  vsSource: string;
  fsSource: string;
}): WebGLProgram {
  const vs = compileShader({ gl, type: gl.VERTEX_SHADER, source: vsSource });
  const fs = compileShader({ gl, type: gl.FRAGMENT_SHADER, source: fsSource });
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error("Program link error: " + info);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}
