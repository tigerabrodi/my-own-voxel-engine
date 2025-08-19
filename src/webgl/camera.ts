// Column-major 4x4 matrix utilities for camera/projection transforms.
export type Mat4 = Float32Array; // column-major 4x4

/** Returns an identity 4x4 matrix. */
export function identity4(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

/**
 * Perspective projection matrix.
 * Why: Projects 3D to clip space with a vertical FOV and aspect ratio.
 */
export function perspective({
  fovyRad,
  aspect,
  near,
  far,
}: {
  fovyRad: number;
  aspect: number;
  near: number;
  far: number;
}): Mat4 {
  const f = 1.0 / Math.tan(fovyRad / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

/**
 * Left-handed lookAt view matrix.
 * Why: Positions the camera to look from eye → center with a given up vector.
 */
export function lookAt({
  eye,
  center,
  up,
}: {
  eye: [number, number, number];
  center: [number, number, number];
  up: [number, number, number];
}): Mat4 {
  const [ex, ey, ez] = eye;
  const [cx, cy, cz] = center;
  let zx = ex - cx,
    zy = ey - cy,
    zz = ez - cz;
  let len = Math.hypot(zx, zy, zz);
  if (len === 0) {
    zx = 0;
    zy = 0;
    zz = 1;
  } else {
    zx /= len;
    zy /= len;
    zz /= len;
  }

  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  len = Math.hypot(xx, xy, xz);
  if (len === 0) {
    xx = 1;
    xy = 0;
    xz = 0;
  } else {
    xx /= len;
    xy /= len;
    xz /= len;
  }

  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  const m = new Float32Array(16);
  m[0] = xx;
  m[4] = xy;
  m[8] = xz;
  m[12] = -(xx * ex + xy * ey + xz * ez);
  m[1] = yx;
  m[5] = yy;
  m[9] = yz;
  m[13] = -(yx * ex + yy * ey + yz * ez);
  m[2] = zx;
  m[6] = zy;
  m[10] = zz;
  m[14] = -(zx * ex + zy * ey + zz * ez);
  m[3] = 0;
  m[7] = 0;
  m[11] = 0;
  m[15] = 1;
  return m;
}

/** Multiplies two 4x4 matrices: out = a * b. */
export function multiply4({ a, b }: { a: Mat4; b: Mat4 }): Mat4 {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    const ai0 = a[i];
    const ai1 = a[i + 4];
    const ai2 = a[i + 8];
    const ai3 = a[i + 12];
    out[i] = ai0 * b[0] + ai1 * b[1] + ai2 * b[2] + ai3 * b[3];
    out[i + 4] = ai0 * b[4] + ai1 * b[5] + ai2 * b[6] + ai3 * b[7];
    out[i + 8] = ai0 * b[8] + ai1 * b[9] + ai2 * b[10] + ai3 * b[11];
    out[i + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
  }
  return out;
}
