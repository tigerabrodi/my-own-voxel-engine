export type GPUContext = {
  adapter: GPUAdapter;
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
};

export async function initWebGPU({
  canvasId = "glcanvas",
}: {
  canvasId?: string;
}): Promise<GPUContext> {
  if (!("gpu" in navigator)) {
    throw new Error("WebGPU not supported in this browser");
  }
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) throw new Error(`Canvas with id "${canvasId}" not found`);

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("Failed to request WebGPU adapter");
  const device = await adapter.requestDevice();

  const context = canvas.getContext("webgpu") as GPUCanvasContext | null;
  if (!context) throw new Error("Failed to get WebGPU canvas context");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });

  return { adapter, device, canvas, context, format };
}

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
