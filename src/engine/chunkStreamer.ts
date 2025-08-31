import { runDensityCompute } from "../gpu/compute";
import { createGPUMesh, type GPUMesh } from "../gpu/mesh";
import type { MeshData } from "../rendering/meshTypes";
import { Chunk } from "../world/chunk";
import type { TerrainParams } from "../world/terrain";
import { CHUNK_SIZE } from "../world/types";

export type ChunkKey = string;
type State = "Empty" | "Populating" | "Meshed" | "Uploading" | "Uploaded";

export type ChunkRecord = {
  cx: number;
  cy: number;
  cz: number;
  chunk: Chunk;
  state: State;
  meshData?: MeshData;
  gpuMesh?: GPUMesh;
  lastTouchedFrame: number;
  jobId?: number;
};

export type ChunkStreamer = {
  updateTarget(
    cx: number,
    cy: number,
    cz: number,
    radius: number,
    frame: number
  ): void;
  processUntil(deadlineMs: number): void;
  uploaded(): Iterable<ChunkRecord>;
};

export function createChunkStreamer({
  device,
  terrain,
}: {
  device: GPUDevice;
  terrain: TerrainParams;
}): ChunkStreamer {
  const recs = new Map<ChunkKey, ChunkRecord>();
  const queue: ChunkRecord[] = [];
  let nextJobId = 1;

  const key = (cx: number, cy: number, cz: number) => `${cx},${cy},${cz}`;

  function touch(cx: number, cy: number, cz: number, frame: number): void {
    const k = key(cx, cy, cz);
    const r = recs.get(k);
    if (r) {
      r.lastTouchedFrame = frame;
      if (r.state !== "Uploaded" && !queue.includes(r)) queue.push(r);
      return;
    }
    const rec: ChunkRecord = {
      cx,
      cy,
      cz,
      chunk: new Chunk({ chunkX: cx, chunkY: cy, chunkZ: cz }),
      state: "Empty",
      lastTouchedFrame: frame,
    };
    recs.set(k, rec);
    queue.push(rec);
  }

  function updateTarget(
    centerX: number,
    _centerY: number,
    centerZ: number,
    radius: number,
    frame: number
  ): void {
    const cx = Math.floor(centerX / CHUNK_SIZE);
    const cy = 0;
    const cz = Math.floor(centerZ / CHUNK_SIZE);
    const keep = new Set<ChunkKey>();
    for (let dz = -radius; dz <= radius; dz++)
      for (let dx = -radius; dx <= radius; dx++) {
        const k = key(cx + dx, cy, cz + dz);
        keep.add(k);
        touch(cx + dx, cy, cz + dz, frame);
      }
    for (const k of Array.from(recs.keys())) if (!keep.has(k)) recs.delete(k);
  }

  function startPopulate(r: ChunkRecord): void {
    if (r.state !== "Empty") return;
    r.state = "Populating";
    r.jobId = nextJobId++;
    runDensityCompute({
      device,
      params: terrain,
      chunkX: r.cx,
      chunkY: r.cy,
      chunkZ: r.cz,
    }).then((densities) => {
      const worker = new Worker(
        new URL("../workers/mcWorker.ts", import.meta.url),
        { type: "module" }
      );
      worker.onmessage = (
        ev: MessageEvent<{
          id: number;
          positions: Float32Array;
          normals: Float32Array;
          indices: Uint16Array;
        }>
      ) => {
        if (r.jobId !== ev.data.id) {
          worker.terminate();
          return;
        }
        r.meshData = {
          positions: ev.data.positions,
          normals: ev.data.normals,
          indices: ev.data.indices,
        } as MeshData;
        r.state = "Meshed";
        queue.push(r);
        worker.terminate();
      };
      worker.postMessage({ id: r.jobId!, densities }, [densities.buffer]);
    });
  }

  function processUntil(deadlineMs: number): void {
    let uploads = 0;
    for (const r of recs.values())
      if (r.state !== "Uploaded" && !queue.includes(r)) queue.push(r);
    while (performance.now() < deadlineMs && queue.length) {
      const r = queue.shift()!;
      if (r.state === "Empty") startPopulate(r);
      else if (r.state === "Meshed" && r.meshData && uploads < 1) {
        r.state = "Uploading";
        r.gpuMesh = createGPUMesh({ device, mesh: r.meshData });
        r.state = "Uploaded";
        uploads++;
      }
    }
  }

  function* uploaded(): Iterable<ChunkRecord> {
    for (const r of recs.values())
      if (r.state === "Uploaded" && r.gpuMesh) yield r;
  }

  return { updateTarget, processUntil, uploaded };
}
