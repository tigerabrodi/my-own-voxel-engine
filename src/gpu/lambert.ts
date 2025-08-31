export function createLambertPipeline({
  device,
  format,
  depthFormat = "depth24plus",
}: {
  device: GPUDevice;
  format: GPUTextureFormat;
  depthFormat?: GPUTextureFormat;
}): { pipeline: GPURenderPipeline; bindGroupLayout: GPUBindGroupLayout } {
  const shader = device.createShaderModule({
    code: /* wgsl */ `
      struct Uniforms {
        mvp : mat4x4<f32>;
        model : mat4x4<f32>;
        lightDir : vec3<f32>;
        _pad0 : f32;
        ambient : vec3<f32>;
        _pad1 : f32;
      };
      @group(0) @binding(0) var<uniform> u : Uniforms;

      struct VSIn {
        @location(0) position : vec3<f32>;
        @location(1) normal : vec3<f32>;
      };
      struct VSOut {
        @builtin(position) position : vec4<f32>;
        @location(0) normal : vec3<f32>;
      };

      @vertex
      fn vs_main(inp : VSIn) -> VSOut {
        var out : VSOut;
        out.normal = (mat3x3<f32>(u.model) * inp.normal);
        out.position = u.mvp * vec4<f32>(inp.position, 1.0);
        return out;
      }

      @fragment
      fn fs_main(@location(0) normal : vec3<f32>) -> @location(0) vec4<f32> {
        let n = normalize(normal);
        let ndl = max(dot(n, normalize(u.lightDir)), 0.0);
        let color = u.ambient + ndl * vec3(0.8, 0.85, 0.9);
        return vec4<f32>(color, 1.0);
      }
    `,
  });

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
