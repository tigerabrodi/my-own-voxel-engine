## WebGPU + WGSL Working Notes (Pitfalls, Fixes, Patterns)

Purpose: a concise reference to avoid common gotchas while we build everything WebGPU‑first.

### WGSL syntax essentials

- Struct field separators: use commas, not semicolons.
  - Good:
    ```wgsl
    struct Uniforms {
      mvp : mat4x4<f32>,
      lightDir : vec3<f32>,
      _pad0 : f32,
    };
    ```
  - Bad: `mvp : mat4x4<f32>;`
- Entry points and attributes:
  - `@vertex fn vs_main(...) -> @builtin(position) vec4<f32>`
  - `@fragment fn fs_main(...) -> @location(0) vec4<f32>`
- Passing varyings:
  - Either return a struct with annotated fields, or return builtins directly. Both are valid.

### Uniform layout and alignment

- `vec3<f32>` consumes 16 bytes in uniform/storage buffers; add a padding `f32` field (e.g., `_pad0 : f32`) after `vec3`.
- Matrices are column‑major. `mat4x4<f32>` is 64 bytes.
- Keep uniform buffer sizes multiples of 16 bytes and fields naturally aligned.

### Buffer upload rules (CPU → GPU)

- `GPUQueue.writeBuffer` requires:
  - `offset` multiple of 4 bytes
  - `size` multiple of 4 bytes
  - Fix: pad non‑aligned data (e.g., `Uint16Array` of odd length) to a 4‑byte length before writing.
- Indices:
  - Using `uint16` is fine; ensure written byte length is 4‑byte aligned (pad if needed). Bind with `setIndexBuffer(..., "uint16")`.

### Shader loading patterns

- Prefer separate `.wgsl` files and import as raw text (Vite):
  ```ts
  import src from "./shaders/lambert.wgsl?raw";
  const module = device.createShaderModule({ code: src });
  ```
- Avoid inline template strings when debugging parser errors; external files give clear line/col in errors.
- Ensure no BOM/hidden chars in `.wgsl` files; save as UTF‑8 without BOM.

### Render pipeline checklist

- Pipeline links shader modules + vertex layouts + primitive + depth/stencil state.
- Vertex buffers: define `arrayStride` and attribute formats (`float32x3` for positions/normals).
- Depth texture:
  - Create per canvas size with `depth24plus`, usage `RENDER_ATTACHMENT`.
- Cull/backface & topology: start with `triangle-list`, `cullMode: "back"`.

### Debugging compiler errors

- Get messages:
  ```ts
  const mod = device.createShaderModule({ code: src });
  (mod as any)
    .getCompilationInfo?.()
    .then((info) => console.warn(info.messages));
  ```
- If errors complain at struct fields like “expected '}' for struct declaration”:
  - Verify commas between fields.
  - Verify the source being compiled is the actual WGSL (log the string). If it looks like HTML, the import path/loader is wrong.

### Minimal known‑good WGSL (baseline)

```wgsl
struct Uniforms { mvp : mat4x4<f32>, };
@group(0) @binding(0) var<uniform> u : Uniforms;

@vertex
fn vs_main(@location(0) position : vec3<f32>) -> @builtin(position) vec4<f32> {
  return u.mvp * vec4<f32>(position, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4<f32> { return vec4<f32>(0.8, 0.85, 0.9, 1.0); }
```

### Common runtime issues and fixes

- Device lost / too many warnings: usually shader compile failure cascading; fix WGSL first.
- Blank screen but no errors: verify camera/matrices, depth state, and that index/vertex counts are > 0.
- HMR/cache weirdness: fully restart dev server and hard‑reload.

### References

- WGSL commas in struct fields (not semicolons): see discussion and example fixes in community answers ([StackOverflow](https://stackoverflow.com/questions/76940206/cannot-load-webgpu-code-wgsl-reader-error)).
