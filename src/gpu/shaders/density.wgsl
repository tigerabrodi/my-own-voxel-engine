// Compute densities for one 16x16x16 chunk using a heightfield SDF with FBM value noise
// Output: array<f32> length 4096 in x-major order: i = x + y*16 + z*256

const CHUNK_SIZE : u32 = 16u;

struct ParamsF {
  a : vec4<f32>, // worldScale, amplitude, baseHeight, lacunarity
  b : vec4<f32>, // gain, seed, unused, unused
};

struct ParamsI {
  c : vec4<i32>, // chunkX, chunkY, chunkZ, octaves (as i32)
};

@group(0) @binding(0) var<storage, read_write> densities : array<f32>;
@group(0) @binding(1) var<uniform> pf : ParamsF;
@group(0) @binding(2) var<uniform> pi : ParamsI;

fn fract_f(x: f32) -> f32 {
  return x - floor(x);
}

fn rand2D(ix: i32, iz: i32, seed: f32) -> f32 {
  let x = sin(f32(ix) * 127.1 + f32(iz) * 311.7 + seed * 0.001) * 43758.5453123;
  return fract_f(x);
}

fn smoothstep01(t: f32) -> f32 { return t * t * (3.0 - 2.0 * t); }

fn valueNoise2D(x: f32, z: f32, seed: f32) -> f32 {
  let x0 = floor(x);
  let z0 = floor(z);
  let x1 = x0 + 1.0;
  let z1 = z0 + 1.0;
  let sx = smoothstep01(x - x0);
  let sz = smoothstep01(z - z0);
  let n00 = rand2D(i32(x0), i32(z0), seed);
  let n10 = rand2D(i32(x1), i32(z0), seed);
  let n01 = rand2D(i32(x0), i32(z1), seed);
  let n11 = rand2D(i32(x1), i32(z1), seed);
  let ix0 = mix(n00, n10, sx);
  let ix1 = mix(n01, n11, sx);
  let v = mix(ix0, ix1, sz);
  return v * 2.0 - 1.0; // map to [-1,1]
}

fn fbm2D(x: f32, z: f32, seed: f32, octaves: i32, lac: f32, gain: f32) -> f32 {
  var amplitude = 1.0;
  var frequency = 1.0;
  var sum = 0.0;
  var ampSum = 0.0;
  for (var i = 0; i < octaves; i = i + 1) {
    let n = valueNoise2D(x * frequency, z * frequency, seed + f32(i) * 1013.0);
    sum = sum + n * amplitude;
    ampSum = ampSum + amplitude;
    frequency = frequency * lac;
    amplitude = amplitude * gain;
  }
  return select(0.0, sum / ampSum, ampSum > 0.0);
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  if (gid.x >= CHUNK_SIZE || gid.y >= CHUNK_SIZE || gid.z >= CHUNK_SIZE) { return; }
  let x = i32(gid.x);
  let y = i32(gid.y);
  let z = i32(gid.z);

  let worldX = pi.c.x * i32(CHUNK_SIZE) + x;
  let worldY = pi.c.y * i32(CHUNK_SIZE) + y;
  let worldZ = pi.c.z * i32(CHUNK_SIZE) + z;

  let nx = f32(worldX) * pf.a.x; // worldScale
  let nz = f32(worldZ) * pf.a.x;
  let h = pf.a.z + pf.a.y * fbm2D(nx, nz, pf.b.y, pi.c.w, pf.a.w, pf.b.x);
  let d = f32(worldY) - h; // SDF: negative inside

  let idx = gid.x + gid.y * CHUNK_SIZE + gid.z * CHUNK_SIZE * CHUNK_SIZE;
  densities[idx] = d;
}


