import * as THREE from "three";
import { buildNaiveCubesGeometry } from "./voxel/mesher";
import { VoxelVolume } from "./voxel/volume";

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
camera.position.set(0, 2, 5);

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 4);
scene.add(dirLight);

// Helpers
const axes = new THREE.AxesHelper(1.5);
scene.add(axes);

const grid = new THREE.GridHelper(10, 10);
scene.add(grid);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log("boot: three baseline ok");

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
  color: 0x88a0ff,
  metalness: 0,
  roughness: 0.9,
});
const mesh = new THREE.Mesh(geom, mat);
mesh.position.set(-4, 0, -4);
scene.add(mesh);

function animate(): void {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
console.log("Hello World");
