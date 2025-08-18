import { CHUNK_SIZE } from "./types";

export type WorldToChunkResult = {
  chunkX: number;
  chunkY: number;
  chunkZ: number;
  localX: number;
  localY: number;
  localZ: number;
};

// Converts world-space voxel coordinates to chunk coordinates and local coords in [0, CHUNK_SIZE)
export function worldToChunk({
  x,
  y,
  z,
}: {
  x: number;
  y: number;
  z: number;
}): WorldToChunkResult {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cy = Math.floor(y / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);

  const localX = x - cx * CHUNK_SIZE;
  const localY = y - cy * CHUNK_SIZE;
  const localZ = z - cz * CHUNK_SIZE;

  return { chunkX: cx, chunkY: cy, chunkZ: cz, localX, localY, localZ };
}

// Converts chunk coordinates + local coords back to world-space voxel coordinates
export function chunkToWorld({
  chunkX,
  chunkY,
  chunkZ,
  localX,
  localY,
  localZ,
}: {
  chunkX: number;
  chunkY: number;
  chunkZ: number;
  localX: number;
  localY: number;
  localZ: number;
}): { x: number; y: number; z: number } {
  return {
    x: chunkX * CHUNK_SIZE + localX,
    y: chunkY * CHUNK_SIZE + localY,
    z: chunkZ * CHUNK_SIZE + localZ,
  };
}
