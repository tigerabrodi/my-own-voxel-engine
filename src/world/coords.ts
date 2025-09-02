export const CHUNK_SIZE = 16;

export type ChunkKey = string; // "x,y,z"

export function chunkKey(cx: number, cy: number, cz: number): ChunkKey {
  return `${cx},${cy},${cz}`;
}

export function worldToChunkCoord(value: number): number {
  // Floor divide; works for negatives as well
  return Math.floor(value / CHUNK_SIZE);
}

export function worldToChunk(
  x: number,
  y: number,
  z: number
): [number, number, number] {
  return [worldToChunkCoord(x), worldToChunkCoord(y), worldToChunkCoord(z)];
}

export function chunkOrigin(
  cx: number,
  cy: number,
  cz: number
): [number, number, number] {
  return [cx * CHUNK_SIZE, cy * CHUNK_SIZE, cz * CHUNK_SIZE];
}

export function worldToLocal(
  x: number,
  y: number,
  z: number
): [number, number, number] {
  const [cx, cy, cz] = worldToChunk(x, y, z);
  const [ox, oy, oz] = chunkOrigin(cx, cy, cz);
  return [x - ox, y - oy, z - oz];
}
