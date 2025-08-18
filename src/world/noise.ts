// Simple 2D value noise with smooth interpolation and FBM (fractal Brownian motion)

function fract(n: number): number {
  return n - Math.floor(n);
}

// Deterministic pseudo-random value in [0,1) per integer lattice coord
function rand2D(ix: number, iz: number, seed: number): number {
  // Mix integers and seed, then map to [0,1)
  const x = Math.sin(ix * 127.1 + iz * 311.7 + seed * 0.001) * 43758.5453123;
  return fract(x);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

// Bilinear interpolated value noise at (x, z) with given seed
export function valueNoise2D({
  x,
  z,
  seed,
}: {
  x: number;
  z: number;
  seed: number;
}): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = x0 + 1;
  const z1 = z0 + 1;

  const sx = smoothstep(x - x0);
  const sz = smoothstep(z - z0);

  const n00 = rand2D(x0, z0, seed);
  const n10 = rand2D(x1, z0, seed);
  const n01 = rand2D(x0, z1, seed);
  const n11 = rand2D(x1, z1, seed);

  const ix0 = n00 + (n10 - n00) * sx;
  const ix1 = n01 + (n11 - n01) * sx;
  const v = ix0 + (ix1 - ix0) * sz;

  // Map from [0,1] to [-1,1] for nicer FBM behavior
  return v * 2 - 1;
}

export function fbm2D({
  x,
  z,
  seed,
  octaves,
  lacunarity,
  gain,
}: {
  x: number;
  z: number;
  seed: number;
  octaves: number;
  lacunarity: number;
  gain: number;
}): number {
  let amplitude = 1.0;
  let frequency = 1.0;
  let sum = 0.0;
  let ampSum = 0.0;

  for (let i = 0; i < octaves; i++) {
    const n = valueNoise2D({
      x: x * frequency,
      z: z * frequency,
      seed: seed + i * 1013,
    });
    sum += n * amplitude;
    ampSum += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }

  return ampSum > 0 ? sum / ampSum : 0;
}
