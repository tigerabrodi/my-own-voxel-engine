import { Chunk } from "./chunk";
import { fbm2D } from "./noise";
import { CHUNK_SIZE } from "./types";

export type TerrainParams = {
  seed: number;
  worldScale: number; // how stretched the terrain is in world units
  amplitude: number; // max terrain height variation
  baseHeight: number; // offset of sea level / base altitude
  octaves: number;
  lacunarity: number;
  gain: number;
};

// Signed distance: negative inside ground, positive above ground. isoLevel = 0
export function heightFieldSDF({
  worldX,
  worldY,
  worldZ,
  params,
}: {
  worldX: number;
  worldY: number;
  worldZ: number;
  params: TerrainParams;
}): number {
  const nx = worldX * params.worldScale;
  const nz = worldZ * params.worldScale;
  const h =
    params.baseHeight +
    params.amplitude *
      fbm2D({
        x: nx,
        z: nz,
        seed: params.seed,
        octaves: params.octaves,
        lacunarity: params.lacunarity,
        gain: params.gain,
      });
  // Inside terrain if y < h
  return worldY - h;
}

// Fill the provided chunk's densities using the height-field SDF
export function fillChunkHeights({
  chunk,
  params,
}: {
  chunk: Chunk;
  params: TerrainParams;
}): void {
  const { origin } = chunk;
  for (let z = 0; z < CHUNK_SIZE; z++) {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const worldX = origin.chunkX * CHUNK_SIZE + x;
        const worldY = origin.chunkY * CHUNK_SIZE + y;
        const worldZ = origin.chunkZ * CHUNK_SIZE + z;
        const d = heightFieldSDF({ worldX, worldY, worldZ, params });
        chunk.setDensity(x, y, z, d);
      }
    }
  }
}
