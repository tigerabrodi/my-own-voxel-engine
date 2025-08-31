export function createBasicPipeline({
  device,
  format,
}: {
  device: GPUDevice;
  format: GPUTextureFormat;
}): GPURenderPipeline {
  const shader = device.createShaderModule({
    code: /* wgsl */ `
      @vertex
      fn vs_main(@builtin(vertex_index) vtx: u32) -> @builtin(position) vec4f {
        var pos = array<vec2f, 3>(
          vec2f(-0.8, -0.6),
          vec2f(0.8, -0.6),
          vec2f(0.0, 0.7)
        );
        let p = pos[vtx];
        return vec4f(p, 0.0, 1.0);
      }

      @fragment
      fn fs_main() -> @location(0) vec4f {
        return vec4f(0.2, 0.7, 1.0, 1.0);
      }
    `,
  });

  return device.createRenderPipeline({
    layout: "auto",
    vertex: { module: shader, entryPoint: "vs_main" },
    fragment: { module: shader, entryPoint: "fs_main", targets: [{ format }] },
    primitive: { topology: "triangle-list" },
  });
}
