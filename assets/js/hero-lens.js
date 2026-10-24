/* Dermascope hero — WebGL skin macro with a magnifying analysis lens.
   Terms are definitions, never fabricated measurements. */

// zones in displayed (mirrored) image coordinates, calibrated against the photo
const ZONES = [
  { t: 'Sebaceous pores', d: 'Densest around the nose — where blackheads and enlarged pores begin.', test: (x, y) => x > 0.8 && y < 0.36 },
  { t: 'Vermilion border', d: 'The line where lip meets skin. It softens with age; fillers redefine it.', test: (x, y) => x > 0.7 && y > 0.44 && y < 0.6 },
  { t: 'Lip mucosa', d: 'No oil glands of its own — the reason lips are first to dehydrate.', test: (x, y) => x > 0.72 && y >= 0.6 },
  { t: 'Hair follicle', d: 'Every hair grows from a follicle rooted in the dermis, a few millimetres down.', test: (x) => x < 0.36 },
  { t: 'Melanocytes', d: 'Pigment cells at the base of the epidermis — the source of freckles and dark spots.', test: (x, y) => x > 0.56 && x <= 0.8 && y < 0.32 },
  { t: 'Stratum corneum', d: 'The outer 15–20 layers of flattened cells — your moisture barrier.', test: (x, y) => x < 0.5 },
  { t: 'Microrelief', d: 'The fine criss-cross texture of skin. Peels and microneedling refine it.', test: () => true },
];

const VS = `attribute vec2 a; varying vec2 vUv; void main(){ vUv = a*0.5+0.5; gl_Position = vec4(a,0.,1.); }`;
const FS = `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex; uniform vec2 uRes; uniform vec2 uImg; uniform vec2 uFocal;
uniform vec2 uLens; uniform float uR; uniform float uT; uniform float uIn; uniform float uZoom;
vec2 imgUv(vec2 p){
  vec2 uv = p / uRes;
  float sa = uRes.x/uRes.y, ia = uImg.x/uImg.y;
  vec2 s = vec2(1.0);
  if (sa > ia) s.y = ia/sa; else s.x = sa/ia;
  s *= 1.0 - 0.035*(0.5+0.5*sin(uT*0.06));
  vec2 iu = (1.0 - s) * uFocal + uv * s;
  iu.x = 1.0 - iu.x;
  return iu;
}
vec3 tx(vec2 u){ return texture2D(uTex, clamp(u, 0.001, 0.999)).rgb; }
float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
vec2 h2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
float cell(vec2 p){ vec2 i = floor(p), f = fract(p); float m = 1.0;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g = vec2(float(x),float(y)); vec2 o = h2(i+g); m = min(m, length(g+o-f)); }
  return m; }
void main(){
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  vec2 iu = imgUv(p);
  vec3 base = tx(iu);
  vec3 col = pow(base * vec3(0.68, 0.61, 0.56), vec3(1.06));
  float sweep = exp(-pow((vUv.x*0.85 + (1.0-vUv.y)*0.3 - fract(uT*0.03)*2.4 + 0.5)*3.0, 2.0));
  col += vec3(0.11,0.075,0.04) * sweep;
  float d = distance(p, uLens);
  float f = d / uR;
  if (f < 1.0) {
    vec2 q = uLens + (p - uLens) / uZoom * (1.0 + 0.16*f*f);
    vec2 iq = imgUv(q);
    vec2 px = 1.2 / uImg;
    vec3 c = tx(iq);
    vec3 bl = (tx(iq+vec2(px.x,0.))+tx(iq-vec2(px.x,0.))+tx(iq+vec2(0.,px.y))+tx(iq-vec2(0.,px.y)))*0.25;
    float hp = luma(c) - luma(bl);
    vec3 s = c + (c - bl) * 1.15;
    s = (s - 0.5) * 1.1 + 0.52;
    // procedural micro-relief: pores and fine lines at true magnified scale
    vec2 ip = iq * uImg * 3.4;
    float pores = smoothstep(0.08, 0.0, cell(ip)) ;
    float lines = smoothstep(0.03, 0.0, abs(fract((ip.x*0.7+ip.y*0.45)*0.18) - 0.5) - 0.47) * 0.5 + smoothstep(0.03, 0.0, abs(fract((ip.x*0.5-ip.y*0.8)*0.15) - 0.5) - 0.47) * 0.5;
    float skinMask = smoothstep(0.18, 0.4, luma(c));
    s *= 1.0 - (pores*0.07 + lines*0.025) * skinMask;
    vec3 gilt = vec3(0.88, 0.74, 0.47);
    s = mix(s, gilt, smoothstep(0.015, 0.06, abs(hp)) * 0.1 * skinMask);
    vec2 g = abs(fract((p - uLens) / (uR*0.25)) - 0.5);
    s = mix(s, gilt, smoothstep(0.488, 0.5, max(g.x, g.y)) * 0.12);
    float sy = mod(uT * 0.42, 2.4) - 1.2;
    s += gilt * exp(-pow(((p.y - uLens.y)/uR - sy) * 16.0, 2.0)) * 0.2;
    s *= 1.0 - 0.32 * smoothstep(0.6, 1.0, f);
    col = mix(col, s, smoothstep(1.0, 0.985, f) * uIn);
  }
  float ring = smoothstep(1.4, 1.0, f) * step(1.0, f);
  col *= 1.0 - 0.28 * ring * uIn;
  vec2 v = vUv - 0.5; col *= 1.0 - 0.5 * dot(v, v);
  gl_FragColor = vec4(col, 1.0);
}`;

export function init(hero) {
  const canvas = hero.querySelector('.hero__canvas');
  const fallback = hero.querySelector('.hero__fallback');
  const lens = hero.querySelector('.lens');
  const term = hero.querySelector('.lens__term');
  const def = hero.querySelector('.lens__def');
  const tag = hero.querySelector('.lens__tag');
  const ro = hero.querySelector('.hero__readout');
  const roT = ro?.querySelector('.lens__term'), roD = ro?.querySelector('.lens__def');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const u = { res: U('uRes'), img: U('uImg'), focal: U('uFocal'), lens: U('uLens'), r: U('uR'), t: U('uT'), inn: U('uIn'), zoom: U('uZoom') };

  const tex = gl.createTexture();
  const img = new Image(); img.decoding = 'async'; img.src = fallback.currentSrc || fallback.src;

  let W = 0, H = 0, dpr = 1, R = 120, mobile = false;
  const size = () => {
    mobile = innerWidth < 640;
    dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.6);
    const r = hero.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    R = mobile ? Math.min(78, W * 0.19) : Math.min(150, Math.max(110, W * 0.085));
    if (mobile && ro) contentTop = ro.getBoundingClientRect().top - r.top;
    lens.style.setProperty('--r', R + 'px');
  };

  // pointer + idle drift
  let tx = 0, ty = 0, x = 0, y = 0, lastMove = -1e9, inten = 0, tIn = 1;
  let contentTop = H * 0.5;
  const bounds = () => mobile
    ? { x0: R + 6, x1: W - R - 6, y0: 74 + R, y1: Math.max(74 + R, contentTop - R - 10) }
    : { x0: W * 0.58, x1: W - R * 0.8, y0: R + 90, y1: H - R - 120 };
  const clampT = () => { const b = bounds(); tx = Math.min(b.x1, Math.max(b.x0, tx)); ty = Math.min(b.y1, Math.max(b.y0, ty)); };
  const onMove = e => {
    const r = hero.getBoundingClientRect();
    tx = e.clientX - r.left; ty = e.clientY - r.top; clampT(); lastMove = performance.now();
  };
  hero.addEventListener('pointermove', onMove, { passive: true });
  hero.addEventListener('pointerdown', onMove, { passive: true });

  let zone = -1;
  const setZone = () => {
    // map lens centre to image uv (mirror of shader)
    const sa = W / H, ia = img.width / img.height;
    let sx = 1, sy = 1; if (sa > ia) sy = ia / sa; else sx = sa / ia;
    const fx = focal()[0], fy = focal()[1];
    const ix = (1 - sx) * fx + (x / W) * sx, iy = (1 - sy) * fy + (y / H) * sy;
    const z = ZONES.findIndex(Z => Z.test(ix, iy));
    if (z !== zone) {
      zone = z; tag.classList.add('is-swapping'); ro?.classList.add('is-swapping');
      setTimeout(() => {
        term.textContent = ZONES[z].t; def.textContent = ZONES[z].d; tag.classList.remove('is-swapping');
        if (ro) { roT.textContent = ZONES[z].t; roD.textContent = ZONES[z].d; ro.classList.remove('is-swapping'); }
      }, 180);
    }
    lens.classList.toggle('flip', mobile ? x > W * 0.5 : x > W * 0.74);
  };
  const focal = () => mobile ? [0.62, 0.42] : [0.5, 0.42];

  let visible = true, raf = 0, t0 = performance.now();
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(frame); }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(frame); });

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    if (now - lastMove > 2600) {
      const b = bounds();
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, ax = (b.x1 - b.x0) / 2, ay = (b.y1 - b.y0) / 2;
      const s = reduce ? 0 : t * 0.16;
      tx = cx + Math.sin(s * 1.0 + 0.6) * ax * 0.92; ty = cy + Math.sin(s * 1.7) * ay * 0.85;
    }
    const k = reduce ? 1 : 0.11;
    x += (tx - x) * k; y += (ty - y) * k;
    inten += (tIn - inten) * 0.06;
    lens.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    setZone();
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform2f(u.img, img.width, img.height);
    gl.uniform2f(u.focal, ...focal());
    gl.uniform2f(u.lens, x * dpr, y * dpr);
    gl.uniform1f(u.r, R * dpr);
    gl.uniform1f(u.t, reduce ? 0 : t);
    gl.uniform1f(u.inn, inten);
    gl.uniform1f(u.zoom, mobile ? 1.5 : 1.6);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(frame);
  }

  const start = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    size();
    const b = bounds(); x = tx = (b.x0 + b.x1) / 2; y = ty = (b.y0 + b.y1) / 2;
    hero.classList.add('has-gl');
    raf = requestAnimationFrame(frame);
  };
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 120); });
  if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start, { once: true });
}
