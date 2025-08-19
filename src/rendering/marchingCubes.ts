import { Chunk } from "../world/chunk";
import { CHUNK_SIZE } from "../world/types";
import {
  EDGE_MASKS,
  EDGE_VERTEX_INDICES,
  TRIANGLE_TABLE,
} from "./marchingCubesTables";
import type { MeshData } from "./meshTypes";

type PolygonizeParams = {
  chunk: Chunk;
  isoLevel?: number; // default 0
};

type Vec3 = [number, number, number];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateVertex({
  p0,
  p1,
  v0,
  v1,
  isoLevel,
}: {
  p0: Vec3;
  p1: Vec3;
  v0: number;
  v1: number;
  isoLevel: number;
}): Vec3 {
  const denom = v1 - v0;
  const t = denom !== 0 ? (isoLevel - v0) / denom : 0.5;
  return [lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t), lerp(p0[2], p1[2], t)];
}

export function polygonizeChunk({
  chunk,
  isoLevel = 0,
}: PolygonizeParams): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Temporary storage for the 12 possible edge vertices per cell
  const edgeVertices: Vec3[] = new Array(12);

  // Iterate over 15 cells along each axis (since 16 samples define 15 cells)
  for (let z = 0; z < CHUNK_SIZE - 1; z++) {
    for (let y = 0; y < CHUNK_SIZE - 1; y++) {
      for (let x = 0; x < CHUNK_SIZE - 1; x++) {
        // Corner densities
        const d: number[] = new Array(8);
        d[0] = chunk.getDensity(x + 0, y + 0, z + 0);
        d[1] = chunk.getDensity(x + 1, y + 0, z + 0);
        d[2] = chunk.getDensity(x + 0, y + 0, z + 1);
        d[3] = chunk.getDensity(x + 1, y + 0, z + 1);
        d[4] = chunk.getDensity(x + 0, y + 1, z + 0);
        d[5] = chunk.getDensity(x + 1, y + 1, z + 0);
        d[6] = chunk.getDensity(x + 0, y + 1, z + 1);
        d[7] = chunk.getDensity(x + 1, y + 1, z + 1);

        // Build case index
        let cubeIndex = 0;
        if (d[0] < isoLevel) cubeIndex |= 1; // bit 0 -> corner 0
        if (d[1] < isoLevel) cubeIndex |= 2; // bit 1 -> corner 1
        if (d[2] < isoLevel) cubeIndex |= 4; // bit 2 -> corner 2
        if (d[3] < isoLevel) cubeIndex |= 8; // bit 3 -> corner 3
        if (d[4] < isoLevel) cubeIndex |= 16; // bit 4 -> corner 4
        if (d[5] < isoLevel) cubeIndex |= 32; // bit 5 -> corner 5
        if (d[6] < isoLevel) cubeIndex |= 64; // bit 6 -> corner 6
        if (d[7] < isoLevel) cubeIndex |= 128; // bit 7 -> corner 7

        const edgeMask = EDGE_MASKS[cubeIndex];
        if (edgeMask === 0) continue;

        // Compute interpolated vertex for each intersected edge
        const cornerPositions: Vec3[] = [
          [x + 0, y + 0, z + 0],
          [x + 1, y + 0, z + 0],
          [x + 0, y + 0, z + 1],
          [x + 1, y + 0, z + 1],
          [x + 0, y + 1, z + 0],
          [x + 1, y + 1, z + 0],
          [x + 0, y + 1, z + 1],
          [x + 1, y + 1, z + 1],
        ];

        for (let e = 0; e < 12; e++) {
          if (edgeMask & (1 << e)) {
            const [c0, c1] = EDGE_VERTEX_INDICES[e];
            edgeVertices[e] = interpolateVertex({
              p0: cornerPositions[c0],
              p1: cornerPositions[c1],
              v0: d[c0],
              v1: d[c1],
              isoLevel,
            });
          }
        }

        // Emit triangles
        const triEdges = TRIANGLE_TABLE[cubeIndex];
        for (let t = 0; t < triEdges.length && triEdges[t] !== -1; t += 3) {
          const a = edgeVertices[triEdges[t + 0]];
          const b = edgeVertices[triEdges[t + 1]];
          const c = edgeVertices[triEdges[t + 2]];
          const baseIndex = positions.length / 3;

          positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);

          // Flat normal from triangle (temporary; gradient normals can be added later)
          const ux = b[0] - a[0];
          const uy = b[1] - a[1];
          const uz = b[2] - a[2];
          const vx = c[0] - a[0];
          const vy = c[1] - a[1];
          const vz = c[2] - a[2];
          const nx = uy * vz - uz * vy;
          const ny = uz * vx - ux * vz;
          const nz = ux * vy - uy * vx;
          const len = Math.hypot(nx, ny, nz) || 1;
          const invLen = 1 / len;
          const nxn = nx * invLen;
          const nyn = ny * invLen;
          const nzn = nz * invLen;
          normals.push(nxn, nyn, nzn, nxn, nyn, nzn, nxn, nyn, nzn);

          indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}
