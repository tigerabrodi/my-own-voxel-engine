// Lightweight 2D value noise with FBM

function hash2(xi: number, yi: number, seed: number): number {
  let x = xi | 0;
  let y = yi | 0;
  let h = (x * 374761393) ^ (y * 668265263) ^ (seed * 374761);
  h = (h ^ (h >>> 13)) * 1274126177;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h & 0xfffffff) / 0xfffffff; // [0,1)
}

export function valueNoise2D(
  x: number,
  y: number,
  seed: number = 1337
): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = x - xi;
  const ty = y - yi;

  const v00 = hash2(xi, yi, seed);
  const v10 = hash2(xi + 1, yi, seed);
  const v01 = hash2(xi, yi + 1, seed);
  const v11 = hash2(xi + 1, yi + 1, seed);

  // Smoothstep interpolation
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);

  const ix0 = v00 + (v10 - v00) * sx;
  const ix1 = v01 + (v11 - v01) * sx;
  return ix0 + (ix1 - ix0) * sy; // [0,1]
}

export function fbm2(
  x: number,
  y: number,
  octaves: number = 4,
  lacunarity: number = 2,
  gain: number = 0.5,
  seed: number = 1337
): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2D(x * freq, y * freq, seed + i * 101);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm; // [0,1]
}
