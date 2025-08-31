export type Plane = { nx: number; ny: number; nz: number; d: number };

// m is column-major 4x4 (Float32Array length 16)
export function extractFrustumPlanes(m: Float32Array): Plane[] {
  const m00 = m[0],
    m01 = m[4],
    m02 = m[8],
    m03 = m[12];
  const m10 = m[1],
    m11 = m[5],
    m12 = m[9],
    m13 = m[13];
  const m20 = m[2],
    m21 = m[6],
    m22 = m[10],
    m23 = m[14];
  const m30 = m[3],
    m31 = m[7],
    m32 = m[11],
    m33 = m[15];

  const raw: Plane[] = [
    { nx: m30 + m00, ny: m31 + m01, nz: m32 + m02, d: m33 + m03 }, // left
    { nx: m30 - m00, ny: m31 - m01, nz: m32 - m02, d: m33 - m03 }, // right
    { nx: m30 + m10, ny: m31 + m11, nz: m32 + m12, d: m33 + m13 }, // bottom
    { nx: m30 - m10, ny: m31 - m11, nz: m32 - m12, d: m33 - m13 }, // top
    { nx: m30 + m20, ny: m31 + m21, nz: m32 + m22, d: m33 + m23 }, // near
    { nx: m30 - m20, ny: m31 - m21, nz: m32 - m22, d: m33 - m23 }, // far
  ];
  for (const p of raw) {
    const inv = 1 / Math.hypot(p.nx, p.ny, p.nz);
    p.nx *= inv;
    p.ny *= inv;
    p.nz *= inv;
    p.d *= inv;
  }
  return raw;
}

export function aabbInFrustum(
  planes: Plane[],
  min: [number, number, number],
  max: [number, number, number]
): boolean {
  for (const p of planes) {
    const vx = p.nx >= 0 ? max[0] : min[0];
    const vy = p.ny >= 0 ? max[1] : min[1];
    const vz = p.nz >= 0 ? max[2] : min[2];
    if (p.nx * vx + p.ny * vy + p.nz * vz + p.d < 0) return false;
  }
  return true;
}
