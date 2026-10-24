/* Satin — a live, lit 3D silk surface behind a section.
   Waves drift continuously; the cursor presses a soft dent into the silk and every
   click / tap sends a ripple across it. One small WebGL canvas per section,
   low resolution, paused when off-screen. */

const PALETTES = {
  dark:  { a: [0.045, 0.012, 0.018], b: [0.33, 0.055, 0.09],  c: [0.26, 0.06, 0.08], s: [0.92, 0.78, 0.56], spec: 0.34, shade: 0.45 },
  sage:  { a: [0.07, 0.12, 0.10],    b: [0.23, 0.32, 0.28],   c: [0.30, 0.30, 0.20], s: [0.92, 0.80, 0.55], spec: 0.32, shade: 0.30 },
  cream: { a: [0.83, 0.755, 0.69],   b: [0.965, 0.94, 0.905], c: [0.93, 0.85, 0.80], s: [1.0, 0.98, 0.94],  spec: 0.18, shade: 0.05 },
  blush: { a: [0.80, 0.665, 0.645],  b: [0.955, 0.89, 0.865], c: [0.92, 0.80, 0.72], s: [1.0, 0.97, 0.93],  spec: 0.18, shade: 0.05 },
};
const RIPPLES = 6;

const VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
const FS = `precision mediump float;
uniform vec2 uRes; uniform float uT; uniform float uSeed;
uniform vec3 uA, uB, uC, uS; uniform float uSpec, uShade;
uniform vec3 uPtr;               // xy = pointer in silk space, z = press strength 0..1
uniform vec4 uRip[${RIPPLES}];   // xy = origin, z = start time, w = amplitude
float base(vec2 p){
  float t = (uT + uSeed) * 1.7;
  vec2 r = mat2(0.82, -0.57, 0.57, 0.82) * p;
  float w = 1.15 * sin(r.y * 0.85 + t * 0.19) + 0.55 * sin(r.y * 1.9 - t * 0.14 + r.x * 0.35) + 0.25 * sin(r.y * 3.3 + t * 0.23);
  float v = sin(r.x * 2.6 + w * 1.9) * 0.62 + sin(r.x * 1.25 - w * 0.9 + t * 0.09) * 0.38;
  v += 0.10 * sin(r.x * 5.2 - t * 0.9 + r.y * 1.4);   // a travelling swell keeps it alive
  return v;
}
float touch(vec2 p){
  vec2 d = p - uPtr.xy;
  float v = -0.7 * uPtr.z * exp(-dot(d, d) * 2.2);   // the silk gives under the cursor
  for (int i = 0; i < ${RIPPLES}; i++) {
    vec4 rp = uRip[i];
    float age = uT - rp.z;
    if (age < 0.0 || age > 4.0 || rp.w <= 0.0) continue;
    float dist = length(p - rp.xy);
    float front = age * 1.1;
    float k = dist - front;
    v += rp.w * exp(-age * 0.8) * exp(-k * k * 2.6) * cos(k * 9.0) * 0.55 / (1.0 + dist * 0.6);
  }
  return v;
}
float h(vec2 p){ return base(p) + touch(p); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y) * 2.4;
  float e = 0.012;
  float c = h(p);
  vec3 n = normalize(vec3(h(p - vec2(e, 0.)) - h(p + vec2(e, 0.)), h(p - vec2(0., e)) - h(p + vec2(0., e)), 0.07));
  vec3 L = normalize(vec3(-0.55, 0.62, 0.72));
  float dif = clamp(dot(n, L), 0., 1.);
  float spec = pow(clamp(dot(n, normalize(L + vec3(0., 0., 1.))), 0., 1.), 30.);
  float rim = pow(1. - clamp(n.z, 0., 1.), 2.);
  vec3 col = mix(uA, uB, smoothstep(0.0, 1.0, dif * dif * 1.15));
  col = mix(col, uC, smoothstep(0.35, 1.0, c * 0.5 + 0.5) * 0.32);
  col += uS * (spec * uSpec + rim * uSpec * 0.14);
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
  const u = { res: U('uRes'), t: U('uT'), ptr: U('uPtr'), rip: U('uRip') };
  gl.uniform3fv(U('uA'), pal.a); gl.uniform3fv(U('uB'), pal.b); gl.uniform3fv(U('uC'), pal.c); gl.uniform3fv(U('uS'), pal.s);
  gl.uniform1f(U('uSpec'), pal.spec); gl.uniform1f(U('uShade'), pal.shade);
  gl.uniform1f(U('uSeed'), Math.random() * 40);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scale = Math.min(devicePixelRatio || 1, 1.5) * (innerWidth < 700 ? 0.42 : 0.5);
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;

  /* pointer → silk space (matches the shader's p) */
  let W = 2, H = 2, rect = el.getBoundingClientRect();
  const toSilk = (cx, cy) => {
    const fx = (cx - rect.left) * scale, fy = (rect.height - (cy - rect.top)) * scale;
    const m = Math.min(W, H);
    return [((fx - W / 2) / m) * 2.4, ((fy - H / 2) / m) * 2.4];
  };
  const ptr = { x: 0, y: 0, tx: 0, ty: 0, press: 0, target: 0 };
  const rip = new Float32Array(RIPPLES * 4); let ri = 0;
  const addRipple = (x, y, amp) => { rip.set([x, y, now(), amp], ri * 4); ri = (ri + 1) % RIPPLES; lastInput = performance.now(); wake(); };
  let lastInput = -1e9, lastWake = { x: 0, y: 0, t: 0 };

  if (!reduce) {
    const fine = matchMedia('(pointer: fine)').matches;
    el.addEventListener('pointermove', e => {
      rect = el.getBoundingClientRect();
      const [x, y] = toSilk(e.clientX, e.clientY);
      ptr.tx = x; ptr.ty = y; ptr.target = fine ? 1 : 0.6; lastInput = performance.now();
      // moving quickly leaves a soft wake behind the cursor
      const dx = x - lastWake.x, dy = y - lastWake.y, t = performance.now();
      if (dx * dx + dy * dy > 0.2 && t - lastWake.t > 140) { addRipple(x, y, 0.35); lastWake = { x, y, t }; }
      wake();
    }, { passive: true });
    el.addEventListener('pointerleave', () => { ptr.target = 0; }, { passive: true });
    el.addEventListener('pointerdown', e => {
      rect = el.getBoundingClientRect();
      const [x, y] = toSilk(e.clientX, e.clientY);
      ptr.tx = ptr.x = x; ptr.ty = ptr.y = y; ptr.target = 1;
      addRipple(x, y, 1.0);
    }, { passive: true });
    el.addEventListener('pointerup', () => { if (!matchMedia('(pointer: fine)').matches) ptr.target = 0; }, { passive: true });
  }

  const draw = () => {
    const t = reduce ? 6 : now();
    gl.uniform1f(u.t, t);
    gl.uniform3f(u.ptr, ptr.x, ptr.y, ptr.press);
    gl.uniform4fv(u.rip, rip);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const size = () => {
    rect = el.getBoundingClientRect();
    W = cv.width = Math.max(2, Math.round(rect.width * scale)); H = cv.height = Math.max(2, Math.round(rect.height * scale));
    gl.viewport(0, 0, W, H); gl.uniform2f(u.res, W, H);
    draw();
  };

  let vis = false, raf = 0, last = 0, prev = 0;
  function loop(ts) {
    raf = 0; if (!vis || document.hidden) return;
    const dt = prev ? Math.min(0.1, (ts - prev) / 1000) : 1 / 60; prev = ts;
    const k = 1 - Math.pow(0.0015, dt);          // smooth follow, frame-rate independent
    ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k;
    ptr.press += (ptr.target - ptr.press) * (1 - Math.pow(0.02, dt));
    const interacting = ts - lastInput < 4000 || ptr.press > 0.01;
    if (interacting || ts - last > 33) { last = ts; draw(); }   // 60 fps while touched, 30 fps idle
    if (!reduce) raf = requestAnimationFrame(loop);
  }
  function wake() { if (vis && !raf) { prev = 0; raf = requestAnimationFrame(loop); } }
  new ResizeObserver(size).observe(el);
  new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) wake(); else prev = 0; }, { rootMargin: '80px' }).observe(el);
  addEventListener('scroll', () => { rect = el.getBoundingClientRect(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  size();
  requestAnimationFrame(() => cv.classList.add('is-on'));
  el.__satin = true;
}
