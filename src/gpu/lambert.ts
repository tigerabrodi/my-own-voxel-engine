import shaderSource from "./shaders/lambert.wgsl?raw";
export function createLambertPipeline({
  device,
  format,
  depthFormat = "depth24plus",
}: {
  device: GPUDevice;
  format: GPUTextureFormat;
  depthFormat?: GPUTextureFormat;
}): { pipeline: GPURenderPipeline; bindGroupLayout: GPUBindGroupLayout } {
  // Shader source loaded via Vite raw import
  const shader = device.createShaderModule({ code: shaderSource });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });

  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: {
      module: shader,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 12,
          attributes: [{ shaderLocation: 0, format: "float32x3", offset: 0 }],
        },
        {
          arrayStride: 12,
          attributes: [{ shaderLocation: 1, format: "float32x3", offset: 0 }],
        },
      ],
    },
    fragment: {
      module: shader,
      entryPoint: "fs_main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list", cullMode: "back" },
    depthStencil: {
      format: depthFormat,
      depthWriteEnabled: true,
      depthCompare: "less",
    },
  });

  return { pipeline, bindGroupLayout };
}
