import * as THREE from "three";
import { chunkKey, chunkOrigin } from "./coords";

export type ChunkCoords = { cx: number; cy: number; cz: number };

export function createChunkGroup(
  cx: number,
  cy: number,
  cz: number
): THREE.Group {
  const group = new THREE.Group();
  const [ox, oy, oz] = chunkOrigin(cx, cy, cz);
  group.position.set(ox, oy, oz);
  group.name = `chunk(${cx},${cy},${cz})`;
  group.userData.coords = { cx, cy, cz } satisfies ChunkCoords;
  group.userData.key = chunkKey(cx, cy, cz);
  return group;
}
