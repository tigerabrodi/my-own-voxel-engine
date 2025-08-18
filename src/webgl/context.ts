export type GLContext = {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
};

/**
 * Creates and returns a WebGL rendering context from a canvas element.
 * Throws if the canvas cannot be found or WebGL is unavailable.
 */
export function initWebGLCanvas({
  canvasId = "glcanvas",
}: {
  canvasId?: string;
}): GLContext {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error(`Canvas with id "${canvasId}" not found`);
  }

  const gl =
    canvas.getContext("webgl") ||
    (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

  if (!gl) {
    throw new Error("WebGL not supported by this browser");
  }

  return { gl, canvas };
}

/**
 * Resizes the canvas' internal pixel size to match its CSS display size,
 * accounting for devicePixelRatio (for HiDPI/retina crispness).
 * Returns true if a resize occurred. Call this each frame before drawing.
 */
export function resizeCanvasToDisplaySize({
  canvas,
  devicePixelRatio = window.devicePixelRatio || 1,
}: {
  canvas: HTMLCanvasElement;
  devicePixelRatio?: number;
}): boolean {
  const displayWidth = Math.floor(canvas.clientWidth * devicePixelRatio);
  const displayHeight = Math.floor(canvas.clientHeight * devicePixelRatio);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    return true;
  }

  return false;
}
