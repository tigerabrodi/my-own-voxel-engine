import { lookAt, type Mat4 } from "../webgl/camera";

// FPS-style fly controls with pointer lock and WASD.
// - What: maintains camera position and orientation (yaw/pitch) and produces a view matrix.
// - Why: lets us move smoothly through the world in later steps.

export type FlyControls = {
  update({ dt }: { dt: number }): void;
  getViewMatrix(): Mat4;
  getPosition(): [number, number, number];
};

export function createFlyControls({
  canvas,
  position = [24, 24, 48],
  target,
  yaw,
  pitch,
  movementSpeed = 10,
  mouseSensitivity = 0.002,
}: {
  canvas: HTMLCanvasElement;
  position?: [number, number, number];
  target?: [number, number, number];
  yaw?: number; // radians
  pitch?: number; // radians
  movementSpeed?: number;
  mouseSensitivity?: number;
}): FlyControls {
  const pos: [number, number, number] = [...position];
  const keys = new Set<string>();
  let yawRad = yaw ?? 0;
  let pitchRad = pitch ?? 0;

  // If target provided, derive initial yaw/pitch
  if (target) {
    const dx = target[0] - pos[0];
    const dy = target[1] - pos[1];
    const dz = target[2] - pos[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    const nx = dx / len,
      ny = dy / len,
      nz = dz / len;
    yawRad = Math.atan2(nx, nz);
    pitchRad = Math.asin(ny);
  }

  function clampPitch(v: number): number {
    const limit = Math.PI / 2 - 0.001;
    return Math.max(-limit, Math.min(limit, v));
  }

  function forwardVec(): [number, number, number] {
    // Yaw around Y, pitch around X (left-handed lookAt usage is fine here)
    const cp = Math.cos(pitchRad);
    const sp = Math.sin(pitchRad);
    const sy = Math.sin(yawRad);
    const cy = Math.cos(yawRad);
    return [cp * sy, sp, cp * cy];
  }

  function rightVec(f: [number, number, number]): [number, number, number] {
    // right = normalize(cross(up, forward)) with up = (0,1,0)
    const rx = 1 * f[2] - 0 * f[1]; // up x forward
    const ry = 0 * f[0] - 0 * f[2];
    const rz = 0 * f[1] - 1 * f[0];
    const len = Math.hypot(rx, ry, rz) || 1;
    return [rx / len, ry / len, rz / len];
  }

  function onKey(e: KeyboardEvent, down: boolean) {
    keys[down ? "add" : "delete"](e.code);
  }

  function onMouseMove(e: MouseEvent) {
    if (document.pointerLockElement !== canvas) return;
    yawRad += e.movementX * mouseSensitivity;
    pitchRad = clampPitch(pitchRad - e.movementY * mouseSensitivity);
  }

  function onClick() {
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
  }

  // Event listeners
  window.addEventListener("keydown", (e) => onKey(e, true));
  window.addEventListener("keyup", (e) => onKey(e, false));
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("click", onClick);

  function update({ dt }: { dt: number }): void {
    const f = forwardVec();
    const r = rightVec(f);
    const speed = movementSpeed * dt;

    if (keys.has("KeyW")) {
      pos[0] += f[0] * speed;
      pos[1] += f[1] * speed;
      pos[2] += f[2] * speed;
    }
    if (keys.has("KeyS")) {
      pos[0] -= f[0] * speed;
      pos[1] -= f[1] * speed;
      pos[2] -= f[2] * speed;
    }
    if (keys.has("KeyD")) {
      pos[0] += r[0] * speed;
      pos[1] += r[1] * speed;
      pos[2] += r[2] * speed;
    }
    if (keys.has("KeyA")) {
      pos[0] -= r[0] * speed;
      pos[1] -= r[1] * speed;
      pos[2] -= r[2] * speed;
    }
    if (keys.has("Space")) {
      pos[1] += speed;
    }
    if (keys.has("ShiftLeft") || keys.has("ShiftRight")) {
      pos[1] -= speed;
    }
  }

  function getViewMatrix(): Mat4 {
    const f = forwardVec();
    const center: [number, number, number] = [
      pos[0] + f[0],
      pos[1] + f[1],
      pos[2] + f[2],
    ];
    return lookAt({ eye: pos, center, up: [0, 1, 0] });
  }

  function getPosition(): [number, number, number] {
    return [pos[0], pos[1], pos[2]];
  }

  return { update, getViewMatrix, getPosition };
}
