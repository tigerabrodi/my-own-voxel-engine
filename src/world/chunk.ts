import type { ChunkCoordinates, LocalCoordinates } from "./types";
import { CHUNK_SIZE } from "./types";

// Negative density = inside terrain; positive = outside. isoLevel = 0.
export class Chunk {
  // Lazy-allocated flat array of densities (length = CHUNK_SIZE^3)
  private densities: Float32Array | null = null;

  constructor(public readonly origin: ChunkCoordinates) {}

  private ensureAllocated(): void {
    if (!this.densities) {
      this.densities = new Float32Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
    }
  }

  // Convert local (x,y,z) in [0, CHUNK_SIZE) to flat index
  static toIndex(x: number, y: number, z: number): number {
    return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
  }

  // Bounds check helper for clarity
  static isInBounds({ x, y, z }: LocalCoordinates): boolean {
    return (
      x >= 0 &&
      x < CHUNK_SIZE &&
      y >= 0 &&
      y < CHUNK_SIZE &&
      z >= 0 &&
      z < CHUNK_SIZE
    );
  }

  setDensity(x: number, y: number, z: number, value: number): void {
    if (!Chunk.isInBounds({ x, y, z })) {
      throw new Error(`setDensity out of bounds: (${x}, ${y}, ${z})`);
    }
    this.ensureAllocated();
    this.densities![Chunk.toIndex(x, y, z)] = value;
  }

  getDensity(x: number, y: number, z: number): number {
    if (!Chunk.isInBounds({ x, y, z })) {
      throw new Error(`getDensity out of bounds: (${x}, ${y}, ${z})`);
    }
    if (!this.densities) return 0; // default empty = outside surface
    return this.densities[Chunk.toIndex(x, y, z)];
  }
}
