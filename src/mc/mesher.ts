import * as THREE from "three";
import { edgeTable, triTable } from "./tables";

type DensityAt = (x: number, y: number, z: number) => number;

function interpolateVertex(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  valp1: number,
  valp2: number,
  isoLevel: number
): THREE.Vector3 {
  if (Math.abs(isoLevel - valp1) < 1e-6) return p1.clone();
  if (Math.abs(isoLevel - valp2) < 1e-6) return p2.clone();
  if (Math.abs(valp1 - valp2) < 1e-6) return p1.clone();
  const mu = (isoLevel - valp1) / (valp2 - valp1);
  return new THREE.Vector3(
    p1.x + mu * (p2.x - p1.x),
    p1.y + mu * (p2.y - p1.y),
    p1.z + mu * (p2.z - p1.z)
  );
}

export function marchingCubes(
  dims: { x: number; y: number; z: number },
  density: DensityAt,
  isoLevel: number = 0
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];

  const vertList = new Array<THREE.Vector3>(12);
  for (let i = 0; i < 12; i++) vertList[i] = new THREE.Vector3();

  const p = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];
  const val = new Array<number>(8);

  for (let z = 0; z < dims.z - 1; z++) {
    for (let y = 0; y < dims.y - 1; y++) {
      for (let x = 0; x < dims.x - 1; x++) {
        p[0].set(x, y, z);
        p[1].set(x + 1, y, z);
        p[2].set(x + 1, y + 1, z);
        p[3].set(x, y + 1, z);
        p[4].set(x, y, z + 1);
        p[5].set(x + 1, y, z + 1);
        p[6].set(x + 1, y + 1, z + 1);
        p[7].set(x, y + 1, z + 1);

        for (let i = 0; i < 8; i++) val[i] = density(p[i].x, p[i].y, p[i].z);

        let cubeIndex = 0;
        if (val[0] < isoLevel) cubeIndex |= 1;
        if (val[1] < isoLevel) cubeIndex |= 2;
        if (val[2] < isoLevel) cubeIndex |= 4;
        if (val[3] < isoLevel) cubeIndex |= 8;
        if (val[4] < isoLevel) cubeIndex |= 16;
        if (val[5] < isoLevel) cubeIndex |= 32;
        if (val[6] < isoLevel) cubeIndex |= 64;
        if (val[7] < isoLevel) cubeIndex |= 128;

        const edges = edgeTable[cubeIndex];
        if (edges === 0) continue;

        if (edges & 1)
          vertList[0] = interpolateVertex(p[0], p[1], val[0], val[1], isoLevel);
        if (edges & 2)
          vertList[1] = interpolateVertex(p[1], p[2], val[1], val[2], isoLevel);
        if (edges & 4)
          vertList[2] = interpolateVertex(p[2], p[3], val[2], val[3], isoLevel);
        if (edges & 8)
          vertList[3] = interpolateVertex(p[3], p[0], val[3], val[0], isoLevel);
        if (edges & 16)
          vertList[4] = interpolateVertex(p[4], p[5], val[4], val[5], isoLevel);
        if (edges & 32)
          vertList[5] = interpolateVertex(p[5], p[6], val[5], val[6], isoLevel);
        if (edges & 64)
          vertList[6] = interpolateVertex(p[6], p[7], val[6], val[7], isoLevel);
        if (edges & 128)
          vertList[7] = interpolateVertex(p[7], p[4], val[7], val[4], isoLevel);
        if (edges & 256)
          vertList[8] = interpolateVertex(p[0], p[4], val[0], val[4], isoLevel);
        if (edges & 512)
          vertList[9] = interpolateVertex(p[1], p[5], val[1], val[5], isoLevel);
        if (edges & 1024)
          vertList[10] = interpolateVertex(
            p[2],
            p[6],
            val[2],
            val[6],
            isoLevel
          );
        if (edges & 2048)
          vertList[11] = interpolateVertex(
            p[3],
            p[7],
            val[3],
            val[7],
            isoLevel
          );

        const tri = triTable[cubeIndex];
        for (let i = 0; tri[i] !== -1; i += 3) {
          const a = vertList[tri[i]];
          const b = vertList[tri[i + 1]];
          const c = vertList[tri[i + 2]];
          positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);

          // face normal
          const abx = b.x - a.x,
            aby = b.y - a.y,
            abz = b.z - a.z;
          const acx = c.x - a.x,
            acy = c.y - a.y,
            acz = c.z - a.z;
          const nx = aby * acz - abz * acy;
          const ny = abz * acx - abx * acz;
          const nz = abx * acy - aby * acx;
          // same normal for all three verts (let BufferGeometry smooth later)
          normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
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
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}
