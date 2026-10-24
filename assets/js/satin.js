/* Satin — a slow, lit 3D silk drape rendered behind a section.
   One small WebGL canvas per section, low resolution, ~30 fps, paused when off-screen. */

const PALETTES = {
  dark:  { a: [0.045, 0.012, 0.018], b: [0.33, 0.055, 0.09],  c: [0.26, 0.06, 0.08], s: [0.90, 0.77, 0.56], spec: 0.30, shade: 0.45 },
  sage:  { a: [0.07, 0.12, 0.10],    b: [0.23, 0.32, 0.28],   c: [0.30, 0.30, 0.20], s: [0.92, 0.80, 0.55], spec: 0.30, shade: 0.30 },
  cream: { a: [0.83, 0.755, 0.69],   b: [0.965, 0.94, 0.905], c: [0.93, 0.85, 0.80], s: [1.0, 0.98, 0.94],  spec: 0.16, shade: 0.05 },
  blush: { a: [0.80, 0.665, 0.645],  b: [0.955, 0.89, 0.865], c: [0.92, 0.80, 0.72], s: [1.0, 0.97, 0.93],  spec: 0.16, shade: 0.05 },
};

const VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
const FS = `precision mediump float;
uniform vec2 uRes; uniform float uT; uniform float uSeed;
uniform vec3 uA, uB, uC, uS; uniform float uSpec, uShade;
float h(vec2 p){
  float t = uT + uSeed;
  vec2 r = mat2(0.82, -0.57, 0.57, 0.82) * p;
  float w = 1.15 * sin(r.y * 0.85 + t * 0.19) + 0.55 * sin(r.y * 1.9 - t * 0.14 + r.x * 0.35) + 0.25 * sin(r.y * 3.3 + t * 0.23);
  return sin(r.x * 2.6 + w * 1.9) * 0.62 + sin(r.x * 1.25 - w * 0.9 + t * 0.09) * 0.38;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y) * 2.4;
  float e = 0.01;
  float c = h(p);
  vec3 n = normalize(vec3(h(p - vec2(e, 0.)) - h(p + vec2(e, 0.)), h(p - vec2(0., e)) - h(p + vec2(0., e)), 0.065));
  vec3 L = normalize(vec3(-0.55, 0.62, 0.72));
  float dif = clamp(dot(n, L), 0., 1.);
  float spec = pow(clamp(dot(n, normalize(L + vec3(0., 0., 1.))), 0., 1.), 30.);
  float rim = pow(1. - clamp(n.z, 0., 1.), 2.);
  vec3 col = mix(uA, uB, smoothstep(0.0, 1.0, dif * dif * 1.15));
  col = mix(col, uC, smoothstep(0.35, 1.0, c * 0.5 + 0.5) * 0.32);
  col += uS * (spec * uSpec + rim * uSpec * 0.12);
  col = min(col, vec3(0.985));
  col *= 1.0 - uShade * smoothstep(0.25, 0.95, length(uv - vec2(0.5, 0.55)));
  gl_FragColor = vec4(col, 1.0);
}`;

export function mount(el, kind = 'dark') {
  if (el.__satin) return;
  const pal = PALETTES[kind] || PALETTES.dark;
  const cv = document.createElement('canvas');
  cv.className = 'satin'; cv.setAttribute('aria-hidden', 'true');
  el.prepend(cv);
  const gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) { cv.remove(); return; }
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.remove(); return; }
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const u = { res: U('uRes'), t: U('uT') };
  gl.uniform3fv(U('uA'), pal.a); gl.uniform3fv(U('uB'), pal.b); gl.uniform3fv(U('uC'), pal.c); gl.uniform3fv(U('uS'), pal.s);
  gl.uniform1f(U('uSpec'), pal.spec); gl.uniform1f(U('uShade'), pal.shade);
  gl.uniform1f(U('uSeed'), Math.random() * 40);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scale = Math.min(devicePixelRatio || 1, 1.5) * (innerWidth < 700 ? 0.42 : 0.5);
  const t0 = performance.now();
  const draw = now => { gl.uniform1f(u.t, reduce ? 6 : (now - t0) / 1000); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  const size = () => {
    const r = el.getBoundingClientRect();
    cv.width = Math.max(2, Math.round(r.width * scale)); cv.height = Math.max(2, Math.round(r.height * scale));
    gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(u.res, cv.width, cv.height);
    draw(performance.now());
  };
  let vis = false, raf = 0, last = 0;
  function loop(now) {
    raf = 0; if (!vis || document.hidden) return;
    if (now - last > 32) { last = now; draw(now); }
    if (!reduce) raf = requestAnimationFrame(loop);
  }
  new ResizeObserver(size).observe(el);
  new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis && !raf) raf = requestAnimationFrame(loop); }, { rootMargin: '80px' }).observe(el);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && vis && !raf) raf = requestAnimationFrame(loop); });
  size();
  requestAnimationFrame(() => cv.classList.add('is-on'));
  el.__satin = true;
}
