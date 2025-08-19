import { Chunk } from "./chunk";
import { fillChunkHeights, type TerrainParams } from "./terrain";
import { CHUNK_SIZE } from "./types";

export type ChunkKey = string; // "cx,cy,cz"

export function makeChunkKey({
  chunkX,
  chunkY,
  chunkZ,
}: {
  chunkX: number;
  chunkY: number;
  chunkZ: number;
}): ChunkKey {
  return `${chunkX},${chunkY},${chunkZ}`;
}

export type ChunkManager = {
  getLoaded(): Map<ChunkKey, Chunk>;
  update({
    centerX,
    centerY,
    centerZ,
    radius,
  }: {
    centerX: number;
    centerY: number;
    centerZ: number;
    radius: number;
  }): void;
};

export function createChunkManager({
  terrain,
}: {
  terrain: TerrainParams;
}): ChunkManager {
  const loaded = new Map<ChunkKey, Chunk>();

  function ensureChunk(cx: number, cy: number, cz: number): void {
    const key = makeChunkKey({ chunkX: cx, chunkY: cy, chunkZ: cz });
    if (loaded.has(key)) return;
    const chunk = new Chunk({ chunkX: cx, chunkY: cy, chunkZ: cz });
    fillChunkHeights({ chunk, params: terrain });
    loaded.set(key, chunk);
  }

  function update({
    centerX,
    centerY,
    centerZ,
    radius,
  }: {
    centerX: number;
    centerY: number;
    centerZ: number;
    radius: number;
  }): void {
    const cx = Math.floor(centerX / CHUNK_SIZE);
    const cy = Math.floor(centerY / CHUNK_SIZE);
    const cz = Math.floor(centerZ / CHUNK_SIZE);

    const newSet = new Set<ChunkKey>();
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dy = -0; dy <= 0; dy++) {
        // keep single layer for now (y=0)
        for (let dx = -radius; dx <= radius; dx++) {
          const x = cx + dx;
          const y = 0; // fixed layer for simplicity
          const z = cz + dz;
          const key = makeChunkKey({ chunkX: x, chunkY: y, chunkZ: z });
          newSet.add(key);
          ensureChunk(x, y, z);
        }
      }
    }

    // Unload chunks not in the desired set
    for (const key of loaded.keys()) {
      if (!newSet.has(key)) loaded.delete(key);
    }
  }

  return { getLoaded: () => loaded, update };
}
