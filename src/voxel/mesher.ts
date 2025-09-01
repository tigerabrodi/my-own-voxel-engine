import * as THREE from "three";
import { VoxelVolume } from "./volume";

export function buildNaiveCubesGeometry(
  volume: VoxelVolume,
  isSolid: (v: number) => boolean = (v) => v > 0
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Face definitions in CCW order as seen from outside
  // Each face: 4 corners and a normal
  const faces = [
    // +X
    {
      n: [1, 0, 0] as const,
      c: [
        [1, 0, 0],
        [1, 0, 1],
        [1, 1, 1],
        [1, 1, 0],
      ] as const,
      neighbor: (x: number, y: number, z: number) => [x + 1, y, z] as const,
    },
    // -X
    {
      n: [-1, 0, 0] as const,
      c: [
        [0, 0, 1],
        [0, 0, 0],
        [0, 1, 0],
        [0, 1, 1],
      ] as const,
      neighbor: (x: number, y: number, z: number) => [x - 1, y, z] as const,
    },
    // +Y
    {
      n: [0, 1, 0] as const,
      c: [
        [0, 1, 1],
        [1, 1, 1],
        [1, 1, 0],
        [0, 1, 0],
      ] as const,
      neighbor: (x: number, y: number, z: number) => [x, y + 1, z] as const,
    },
    // -Y
    {
      n: [0, -1, 0] as const,
      c: [
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
        [0, 0, 1],
      ] as const,
      neighbor: (x: number, y: number, z: number) => [x, y - 1, z] as const,
    },
    // +Z
    {
      n: [0, 0, 1] as const,
      c: [
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 1],
      ] as const,
      neighbor: (x: number, y: number, z: number) => [x, y, z + 1] as const,
    },
    // -Z
    {
      n: [0, 0, -1] as const,
      c: [
        [1, 0, 0],
        [0, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
      ] as const,
      neighbor: (x: number, y: number, z: number) => [x, y, z - 1] as const,
    },
  ];

  const pushFace = (
    bx: number,
    by: number,
    bz: number,
    n: readonly number[],
    c: readonly (readonly number[])[]
  ) => {
    const baseIndex = positions.length / 3;
    for (let i = 0; i < 4; i++) {
      const cx = bx + c[i][0];
      const cy = by + c[i][1];
      const cz = bz + c[i][2];
      positions.push(cx, cy, cz);
      normals.push(n[0], n[1], n[2]);
      uvs.push(i === 0 || i === 3 ? 0 : 1, i < 2 ? 0 : 1);
    }
    indices.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
    indices.push(baseIndex + 0, baseIndex + 2, baseIndex + 3);
  };

  for (let z = 0; z < volume.sizeZ; z++) {
    for (let y = 0; y < volume.sizeY; y++) {
      for (let x = 0; x < volume.sizeX; x++) {
        const v = volume.getVoxel(x, y, z);
        if (!isSolid(v)) continue;

        for (const f of faces) {
          const npos = f.neighbor(x, y, z);
          const neighborSolid = volume.inBounds(npos[0], npos[1], npos[2])
            ? isSolid(volume.getVoxel(npos[0], npos[1], npos[2]))
            : false;
          if (!neighborSolid) {
            pushFace(x, y, z, f.n, f.c as any);
          }
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3)
  );
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(new Float32Array(normals), 3)
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array(uvs), 2)
  );

  const vertexCount = positions.length / 3;
  const useUint32 = vertexCount > 65535;
  if (useUint32) {
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
  } else {
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
  }

  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  return geometry;
}
