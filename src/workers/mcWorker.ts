import { polygonizeChunk } from "../rendering/marchingCubes";
import { CHUNK_SIZE } from "../world/types";

type MsgIn = { id: number; densities: Float32Array };

self.onmessage = (e: MessageEvent<MsgIn>) => {
  const { id, densities } = e.data;
  const chunkLike = {
    getDensity(x: number, y: number, z: number): number {
      return densities[x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE];
    },
  } as unknown as Parameters<typeof polygonizeChunk>[0]["chunk"];

  const mesh = polygonizeChunk({ chunk: chunkLike, isoLevel: 0 });

  const transfers = [
    mesh.positions.buffer,
    mesh.normals.buffer,
    mesh.indices.buffer,
  ] as unknown as Transferable[];
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(
    {
      id,
      positions: mesh.positions,
      normals: mesh.normals,
      indices: mesh.indices,
    },
    transfers
  );
};
