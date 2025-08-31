struct Uniforms {
  mvp : mat4x4<f32>,
  model : mat4x4<f32>,
  lightDir : vec3<f32>,
  _pad0 : f32,
  ambient : vec3<f32>,
  _pad1 : f32,
};
@group(0) @binding(0) var<uniform> u : Uniforms;

struct VSOut {
  @builtin(position) position : vec4<f32>,
  @location(0) normal : vec3<f32>,
};

@vertex
fn vs_main(
  @location(0) position : vec3<f32>,
  @location(1) normalIn : vec3<f32>
) -> VSOut {
  var out : VSOut;
  out.position = u.mvp * vec4<f32>(position, 1.0);
  // approximate normal transform
  let n4 = u.model * vec4<f32>(normalIn, 0.0);
  out.normal = normalize(n4.xyz);
  return out;
}

@fragment
fn fs_main(@location(0) normal : vec3<f32>) -> @location(0) vec4<f32> {
  let n = normalize(normal);
  let ndl = max(dot(n, normalize(u.lightDir)), 0.0);
  let color = u.ambient + ndl * vec3<f32>(0.8, 0.85, 0.9);
  return vec4<f32>(color, 1.0);
}


