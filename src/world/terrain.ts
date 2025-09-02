import { fbm2 } from "./noise2d";

export type HeightParams = {
  scale: number; // world units -> noise units
  amplitude: number; // height amplitude
  offset: number; // base offset
  octaves?: number;
  lacunarity?: number;
  gain?: number;
  seed?: number;
};

export function heightAt(x: number, z: number, p: HeightParams): number {
  const n = fbm2(
    x * p.scale,
    z * p.scale,
    p.octaves ?? 4,
    p.lacunarity ?? 2,
    p.gain ?? 0.5,
    p.seed ?? 1337
  );
  return n * p.amplitude + p.offset;
}

// Signed distance to height surface: y - H(x,z)
export function heightSDF(
  x: number,
  y: number,
  z: number,
  p: HeightParams
): number {
  return y - heightAt(x, z, p);
}
