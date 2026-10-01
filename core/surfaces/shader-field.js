// core/surfaces/shader-field.js: a full-frame fragment shader for a bare HTML page.
//
//   const field = shaderField(fragSource, { seed: 7, uniforms: { u_a: [r, g, b] } });
//   vawe.onFrame((t) => field.draw(t));      // or inside window.seek(t)
//
// The shader source is the body after the header this file adds: `precision highp float;` and
// `uniform float u_time` (seconds, the seek time), `uniform vec2 u_res` (canvas pixels) and
// `uniform float u_seed`. A page declares any extra uniform itself and passes its value in `uniforms`
// (a number, or an array of 2 to 4). draw(t) paints once and starts no loop: time is the seek, never a clock.
// preserveDrawingBuffer keeps the last draw readable by the renderer's capture.
const HEADER = 'precision highp float;\nuniform float u_time;\nuniform vec2 u_res;\nuniform float u_seed;\n';
const VERTEX = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`shader-field: ${gl.getShaderInfoLog(shader)}`);
  return shader;
}

const setUniform = (gl, location, value) => {
  if (typeof value === 'number') gl.uniform1f(location, value);
  else gl[`uniform${value.length}fv`](location, value);
};

export function shaderField(fragSource, { parent = document.body, seed = 1, uniforms = {}, pixelRatio = 1 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(innerWidth * pixelRatio);
  canvas.height = Math.round(innerHeight * pixelRatio);
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  parent.prepend(canvas);
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, HEADER + fragSource));
  gl.linkProgram(program);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const at = (name) => gl.getUniformLocation(program, name);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform2f(at('u_res'), canvas.width, canvas.height);
  gl.uniform1f(at('u_seed'), seed);
  for (const [name, value] of Object.entries(uniforms)) setUniform(gl, at(name), value);
  const time = at('u_time');
  return {
    canvas,
    draw(t) {
      gl.uniform1f(time, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
