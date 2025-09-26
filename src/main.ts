import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { marchingCubes } from "./mc/mesher";
import { buildNaiveCubesGeometry } from "./voxel/mesher";
import { VoxelVolume } from "./voxel/volume";
import { createChunkGroup } from "./world/chunk";
import {
  CHUNK_SIZE,
  chunkKey,
  worldToChunk,
  worldToLocal,
} from "./world/coords";
import { heightSDF } from "./world/terrain";

const canvas = document.getElementById("glcanvas") as HTMLCanvasElement | null;

const renderer = new THREE.WebGLRenderer({
  canvas: canvas ?? undefined,
  antialias: true,
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 4, 12);
const clock = new THREE.Clock();

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(-8, 2, -8);

// Pointer-lock FPS look
const fpControls = new PointerLockControls(camera, renderer.domElement);
renderer.domElement.addEventListener("click", () => fpControls.lock());
fpControls.addEventListener("lock", () => {
  controls.enabled = false;
  console.log("pointer: locked");
});
fpControls.addEventListener("unlock", () => {
  controls.enabled = true;
  console.log("pointer: unlocked");
});

// Prevent OrbitControls from handling pointerdown while pointer is locked
renderer.domElement.addEventListener(
  "pointerdown",
  (e) => {
    if (fpControls.isLocked) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  },
  true
);

// Lights
const ambient = new THREE.AmbientLight(0x9fb3ff, 0.22); // subtle cool ambient
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xfff3d6, 1.0); // slightly warm key light
dirLight.position.set(5, 10, 4);
dirLight.castShadow = false; // keep shadows off for now per plan
scene.add(dirLight);

// Helpers
const axes = new THREE.AxesHelper(1.5);
scene.add(axes);

const grid = new THREE.GridHelper(20, 20);
scene.add(grid);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log("boot: three baseline ok");
console.log("chunk: CHUNK_SIZE", CHUNK_SIZE);

// Voxel sanity + naive cubes mesh
const volume = new VoxelVolume(8, 8, 8, 0);
for (let z = 2; z <= 4; z++) {
  for (let y = 2; y <= 4; y++) {
    for (let x = 2; x <= 4; x++) {
      volume.setVoxel(x, y, z, 1);
    }
  }
}
console.log("voxel: dims", volume.sizeX, volume.sizeY, volume.sizeZ);
console.log("voxel: sample", volume.getVoxel(2, 2, 2));

const geom = buildNaiveCubesGeometry(volume, (v) => v > 0);
const mat = new THREE.MeshStandardMaterial({
  color: 0x6f83ff,
  metalness: 0,
  roughness: 0.88,
});
const mesh = new THREE.Mesh(geom, mat);
mesh.position.set(-4, 0, -4);
scene.add(mesh);

// Terrain via Marching Cubes per chunk (two chunks demo)
const dims = { x: CHUNK_SIZE, y: CHUNK_SIZE, z: CHUNK_SIZE };
const terrainParams = { scale: 0.07, amplitude: 10, offset: 4 };

// Keep references to terrain materials for live tweaks
const terrainMaterials: THREE.MeshStandardMaterial[] = [];

function buildChunkMC(cx: number, cy: number, cz: number): THREE.Mesh {
  const [ox, oy, oz] = [cx * CHUNK_SIZE, cy * CHUNK_SIZE, cz * CHUNK_SIZE];
  const density = (x: number, y: number, z: number) =>
    heightSDF(ox + x, oy + y, oz + z, terrainParams);
  const t0 = performance.now();
  const geom = marchingCubes(dims, density, 0);
  const ms = (performance.now() - t0).toFixed(2);
  console.log(
    "chunk gen:",
    cx,
    cy,
    cz,
    "tris",
    (geom.getAttribute("position").count / 3) | 0,
    "time(ms)",
    ms
  );
  const mat = new THREE.MeshStandardMaterial({
    color: 0x8be4c6,
    metalness: 0,
    roughness: 0.82,
  });
  terrainMaterials.push(mat);
  return new THREE.Mesh(geom, mat);
}

const groupA = createChunkGroup(-1, 0, -1);
groupA.add(buildChunkMC(-1, 0, -1));
scene.add(groupA);

const groupB = createChunkGroup(0, 0, -1);
groupB.add(buildChunkMC(0, 0, -1));
scene.add(groupB);

// Chunk coord sanity logs
const samples: Array<[number, number, number]> = [
  [0, 0, 0],
  [15, 0, 15],
  [16, 0, 16],
  [-1, 0, -1],
  [-17, 0, 2],
];
for (const s of samples) {
  const [cx, cy, cz] = worldToChunk(s[0], s[1], s[2]);
  const local = worldToLocal(s[0], s[1], s[2]);
  console.log(
    "chunk: world",
    s,
    "→ chunk",
    [cx, cy, cz],
    "key",
    chunkKey(cx, cy, cz),
    "local",
    local
  );
}

// Simple keyboard fly controls (WASD move, Q/E down/up)
const keys = new Set<string>();
window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
const baseSpeed = 14; // units per second (increase from 8)
const sprintMultiplier = 2.5; // hold Shift to sprint
const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpMove = new THREE.Vector3();

// Material/lighting tweak helpers
function applyRoughness(delta: number) {
  for (const m of terrainMaterials) {
    m.roughness = THREE.MathUtils.clamp(m.roughness + delta, 0, 1);
    m.needsUpdate = true;
  }
  mat.roughness = THREE.MathUtils.clamp(mat.roughness + delta, 0, 1);
  mat.needsUpdate = true;
  console.log("mat roughness:", {
    ui: mat.roughness,
    terrain: terrainMaterials[0]?.roughness,
  });
}

function animate(): void {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // Fly translation in view space
  tmpMove.set(0, 0, 0);
  camera.getWorldDirection(tmpForward).normalize();
  tmpRight.crossVectors(tmpForward, camera.up).normalize();

  if (keys.has("w")) tmpMove.add(tmpForward);
  if (keys.has("s")) tmpMove.sub(tmpForward);
  if (keys.has("d")) tmpMove.add(tmpRight);
  if (keys.has("a")) tmpMove.sub(tmpRight);
  if (keys.has("e")) tmpMove.add(camera.up);
  if (keys.has("q")) tmpMove.sub(camera.up);

  if (tmpMove.lengthSq() > 0) {
    const speed = keys.has("shift") ? baseSpeed * sprintMultiplier : baseSpeed;
    tmpMove.normalize().multiplyScalar(speed * dt);
    camera.position.add(tmpMove);
    // Keep OrbitControls target in sync when not in FPS mode
    if (!fpControls.isLocked) controls.target.add(tmpMove);
  }

  if (!fpControls.isLocked) controls.update();
  renderer.render(scene, camera);
}

animate();
console.log("Hello World");

// Expose a simple material tweak in dev console (optional)
(window as any).applyRoughness = applyRoughness;
