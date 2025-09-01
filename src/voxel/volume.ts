export class VoxelVolume {
  readonly sizeX: number;
  readonly sizeY: number;
  readonly sizeZ: number;
  readonly data: Float32Array;

  constructor(
    sizeX: number,
    sizeY: number,
    sizeZ: number,
    initialValue: number = 0
  ) {
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.sizeZ = sizeZ;
    const totalCells = sizeX * sizeY * sizeZ;
    this.data = new Float32Array(totalCells);
    if (initialValue !== 0) {
      this.data.fill(initialValue);
    }
  }

  getIndex(x: number, y: number, z: number): number {
    return x + this.sizeX * (y + this.sizeY * z);
  }

  inBounds(x: number, y: number, z: number): boolean {
    return (
      x >= 0 &&
      x < this.sizeX &&
      y >= 0 &&
      y < this.sizeY &&
      z >= 0 &&
      z < this.sizeZ
    );
  }

  getVoxel(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return 0;
    return this.data[this.getIndex(x, y, z)];
  }

  setVoxel(x: number, y: number, z: number, value: number): void {
    if (!this.inBounds(x, y, z)) return;
    this.data[this.getIndex(x, y, z)] = value;
  }

  fill(write: (x: number, y: number, z: number) => number): void {
    for (let z = 0; z < this.sizeZ; z++) {
      for (let y = 0; y < this.sizeY; y++) {
        for (let x = 0; x < this.sizeX; x++) {
          this.setVoxel(x, y, z, write(x, y, z));
        }
      }
    }
  }
}
