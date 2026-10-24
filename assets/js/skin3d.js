/* Three.js skin cross-section — epidermis, dermis (collagen, vessels, glands, follicles), hypodermis (fat lobules).
   Lazy-loaded when the section approaches the viewport. */
import * as THREE from 'three';
import { RoomEnvironment } from './../vendor/RoomEnvironment.js';

const W = 4.2, D = 2.6, FZ = D / 2;
const Y = { top: 1.2, epi: 0.98, der: -0.28, bot: -1.3 };

export function init(stage, layers) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const camBase = new THREE.Vector3(6.3, 3.85, 8.4);
  camera.position.copy(camBase);
  camera.lookAt(0, 0.05, 0);

  const key = new THREE.DirectionalLight(0xffe4c8, 2.3); key.position.set(4, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xe9c27f, 3.0); rim.position.set(-6, 3.5, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xc9d4ff, 0.35); fill.position.set(-4, -1, 6); scene.add(fill);
  scene.add(new THREE.AmbientLight(0x3a2620, 0.6));

  const root = new THREE.Group(); scene.add(root);
  const groups = { epidermis: new THREE.Group(), dermis: new THREE.Group(), follicle: new THREE.Group(), hypodermis: new THREE.Group() };
  Object.values(groups).forEach(g => root.add(g));

  const mat = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, metalness: 0, ...o });
  const mats = [];
  const M = (g, m) => { mats.push({ g, m, base: m.emissive.clone() }); return m; };

  /* ── epidermis: displaced top surface ── */
  const epiGeo = new THREE.BoxGeometry(W, Y.top - Y.epi, D, 140, 1, 90);
  const pos = epiGeo.attributes.position;
  const relief = (x, z) => 0.022 * Math.sin(x * 6.5 + z * 2.4) + 0.016 * Math.sin(z * 8.2 - x * 2.1) + 0.008 * Math.sin(x * 21) * Math.sin(z * 17) + 0.006 * Math.sin((x + z) * 33);
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) pos.setY(i, pos.getY(i) + relief(pos.getX(i), pos.getZ(i)));
  }
  epiGeo.computeVertexNormals();
  const epi = new THREE.Mesh(epiGeo, M('epidermis', mat(0xd8a184, { roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.45, sheen: 0.7, sheenColor: new THREE.Color(0xffd9c4), sheenRoughness: 0.5 })));
  epi.position.y = (Y.top + Y.epi) / 2; groups.epidermis.add(epi);
  // stratum basale with melanocytes (darker band)
  const basal = new THREE.Mesh(new THREE.BoxGeometry(W + 0.002, 0.035, D + 0.002), M('epidermis', mat(0x7d4b37, { roughness: 0.7 })));
  basal.position.y = Y.epi + 0.017; groups.epidermis.add(basal);

  /* ── dermis ── */
  const der = new THREE.Mesh(new THREE.BoxGeometry(W, Y.epi - Y.der, D), M('dermis', mat(0xe2a19b, { roughness: 0.78, sheen: 0.3, sheenColor: new THREE.Color(0xffd0c8) })));
  der.position.y = (Y.epi + Y.der) / 2; groups.dermis.add(der);

  /* ── hypodermis ── */
  const hyp = new THREE.Mesh(new THREE.BoxGeometry(W, Y.der - Y.bot, D), M('hypodermis', mat(0xe9c37a, { roughness: 0.62 })));
  hyp.position.y = (Y.der + Y.bot) / 2; groups.hypodermis.add(hyp);

  // fat lobules on the front and right cut faces
  const fatMat = M('hypodermis', mat(0xf5d68e, { roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.25 }));
  const lobGeo = new THREE.SphereGeometry(1, 20, 14);
  const lobs = [];
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let row = 0; row < 4; row++) for (let i = 0; i < 15; i++) {
    const r = 0.11 + rnd() * 0.06; const x = -W / 2 + 0.16 + i * (W - 0.3) / 14 + (row % 2) * 0.12 + (rnd() - 0.5) * 0.05;
    const y = Y.der - 0.16 - row * 0.25 + (rnd() - 0.5) * 0.04;
    if (x < W / 2 - 0.1 && y > Y.bot + 0.1) lobs.push([x, y, FZ - r * 0.5, r]);
  }
  for (let row = 0; row < 4; row++) for (let i = 0; i < 9; i++) {
    const r = 0.11 + rnd() * 0.06; const z = -D / 2 + 0.16 + i * (D - 0.3) / 8 + (row % 2) * 0.12;
    const y = Y.der - 0.16 - row * 0.25;
    if (z < FZ - 0.12 && y > Y.bot + 0.1) lobs.push([W / 2 - r * 0.5, y, z, r]);
  }
  const fat = new THREE.InstancedMesh(lobGeo, fatMat, lobs.length);
  const m4 = new THREE.Matrix4();
  lobs.forEach(([x, y, z, r], i) => { m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(r, r * 0.92, r)); fat.setMatrixAt(i, m4); });
  groups.hypodermis.add(fat);

  /* ── tubes helper ── */
  const tube = (pts, r, material, group, seg = 64) => {
    const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 10, false), material); group.add(m); return m;
  };

  // collagen bundles on front face
  const colMat = M('dermis', mat(0xf6d3c9, { roughness: 0.5, sheen: 0.4 }));
  for (let k = 0; k < 13; k++) {
    const y0 = Y.der + 0.12 + k * 0.085; const pts = [];
    for (let i = 0; i <= 14; i++) { const x = -W / 2 + 0.02 + i * (W - 0.04) / 14; pts.push([x, y0 + Math.sin(i * 1.3 + k) * 0.022, FZ + 0.004]); }
    tube(pts, 0.009, colMat, groups.dermis, 90);
  }
  for (let k = 0; k < 11; k++) {
    const y0 = Y.der + 0.14 + k * 0.1; const pts = [];
    for (let i = 0; i <= 10; i++) { const z = -D / 2 + 0.02 + i * (D - 0.04) / 10; pts.push([W / 2 + 0.004, y0 + Math.sin(i * 1.5 + k) * 0.025, z]); }
    tube(pts, 0.009, colMat, groups.dermis, 70);
  }

  // blood supply: artery + vein along dermis base, capillary loops up to papillae
  const art = M('dermis', mat(0xa3202f, { roughness: 0.35, clearcoat: 0.6 }));
  const vein = M('dermis', mat(0x3e4f8f, { roughness: 0.35, clearcoat: 0.6 }));
  const vpath = (y, wob) => { const p = []; for (let i = 0; i <= 12; i++) { const x = -W / 2 + i * W / 12; p.push([Math.min(x, W / 2), y + Math.sin(i * 0.9 + wob) * 0.04, FZ - 0.01]); } p.push([W / 2 - 0.01, y, FZ - 0.5]); p.push([W / 2 - 0.01, y + 0.03, -D / 2]); return p; };
  tube(vpath(Y.der + 0.08, 0), 0.05, art, groups.dermis, 120);
  tube(vpath(Y.der - 0.04, 1.4), 0.055, vein, groups.dermis, 120);
  for (let i = 0; i < 8; i++) {
    const x = -W / 2 + 0.35 + i * 0.5;
    tube([[x, Y.der + 0.1, FZ - 0.005], [x + 0.03, 0.5, FZ - 0.01], [x + 0.08, Y.epi - 0.06, FZ - 0.01], [x + 0.14, 0.5, FZ - 0.01], [x + 0.17, Y.der - 0.02, FZ - 0.005]], 0.014, i % 2 ? vein : art, groups.dermis, 40);
  }

  // sweat gland: coiled tube + duct
  const sweat = M('dermis', mat(0xe9c6d6, { roughness: 0.4, clearcoat: 0.4 }));
  const coil = []; for (let i = 0; i < 60; i++) { const a = i * 0.5; coil.push([-0.55 + Math.cos(a) * 0.09, Y.der + 0.12 + i * 0.002, FZ - 0.06 + Math.sin(a) * 0.06]); }
  for (let i = 1; i <= 8; i++) coil.push([-0.55 + Math.sin(i) * 0.03, Y.der + 0.24 + i * (Y.top - Y.der - 0.24) / 8, FZ - 0.02]);
  tube(coil, 0.02, sweat, groups.dermis, 200);

  /* ── hair follicles ── */
  const shaft = M('follicle', mat(0x3a2218, { roughness: 0.42, clearcoat: 0.5 }));
  const sheath = M('follicle', mat(0xc77b6d, { roughness: 0.55, transparent: false }));
  const bulbM = M('follicle', mat(0xa9524a, { roughness: 0.4, clearcoat: 0.4 }));
  const gland = M('follicle', mat(0xf2e0a6, { roughness: 0.3, clearcoat: 0.6 }));
  const muscle = M('follicle', mat(0xb8574f, { roughness: 0.6 }));
  const follicles = [[-1.25, 0.18, -0.18], [0.25, -0.12, 0.2], [1.45, 0.1, -0.22]];
  const bulbs = [];
  follicles.forEach(([fx, lean, curl], idx) => {
    const by = Y.der - 0.02;
    const inner = [[fx, by, FZ - 0.05], [fx + lean * 0.4, 0.3, FZ - 0.05], [fx + lean * 0.8, Y.epi, FZ - 0.05], [fx + lean, Y.top + 0.02, FZ - 0.06]];
    tube(inner, 0.08, sheath, groups.follicle, 40);
    const out = [...inner, [fx + lean * 1.25 + curl * 0.2, Y.top + 0.45, FZ - 0.12], [fx + lean * 1.5 + curl * 0.6, Y.top + 0.85, FZ - 0.25 - idx * 0.05], [fx + lean * 1.6 + curl * 1.1, Y.top + 1.15, FZ - 0.42]];
    tube(out, 0.03, shaft, groups.follicle, 90);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 18), bulbM); b.scale.set(1, 1.25, 0.9); b.position.set(fx, by - 0.04, FZ - 0.07); groups.follicle.add(b); bulbs.push(b);
    for (let g = 0; g < 4; g++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06 + g * 0.006, 16, 12), gland); s.position.set(fx + lean * 0.65 + 0.12 + (g % 2) * 0.07, 0.55 + (g >> 1) * 0.09 - g * 0.01, FZ - 0.05); groups.follicle.add(s); }
    tube([[fx + lean * 0.3 + 0.08, 0.15, FZ - 0.04], [fx + 0.32, 0.55, FZ - 0.04], [fx + 0.55, Y.epi - 0.04, FZ - 0.04]], 0.018, muscle, groups.follicle, 24);
  });
  // a few fine hairs on the top surface
  for (let i = 0; i < 9; i++) {
    const x = -W / 2 + 0.3 + rnd() * (W - 0.6), z = -D / 2 + 0.3 + rnd() * (D - 1.2), y = Y.top + relief(x, z);
    tube([[x, y - 0.02, z], [x + 0.05, y + 0.25, z - 0.04], [x + 0.14, y + 0.45, z - 0.12]], 0.012, shaft, groups.follicle, 16);
  }

  /* ── contact shadow ── */
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; const sx = sc.getContext('2d');
  const gr = sx.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.9, D * 2.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = Y.bot - 0.02; root.add(shadow);

  root.position.y = -0.05;
  root.rotation.y = -0.18;

  /* ── hotspots ── */
  const anchors = {
    epidermis: new THREE.Vector3(-1.55, Y.top + 0.02, FZ - 0.3),
    dermis: new THREE.Vector3(-1.95, 0.42, FZ),
    follicle: bulbs[1].position.clone().add(new THREE.Vector3(0.12, 0, 0.08)),
    hypodermis: new THREE.Vector3(1.0, Y.der - 0.62, FZ + 0.08),
  };
  const spots = {};
  (layers || []).forEach(L => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'hotspot'; b.innerHTML = `<b>${L.n}</b><span>${L.name}</span>`;
    b.setAttribute('aria-label', `Show ${L.name}`);
    b.addEventListener('click', e => { e.stopPropagation(); select(L.id, true); });
    stage.appendChild(b); spots[L.id] = b;
  });

  /* ── selection: exploded view + glow ── */
  let active = 'epidermis';
  const gilt = new THREE.Color(0xd9a95c);
  const offsets = { epidermis: 0, dermis: 0, follicle: 0, hypodermis: 0 };
  const explode = { epidermis: 0.46, dermis: 0, follicle: 0, hypodermis: -0.4 };
  let exploded = 0;
  function select(id, emit) {
    active = id; exploded = 1;
    Object.entries(spots).forEach(([k, b]) => b.classList.toggle('is-active', k === id));
    if (emit) dispatchEvent(new CustomEvent('ev:layer-from-model', { detail: id }));
  }
  addEventListener('ev:layer', e => select(e.detail, false));
  select('epidermis', false); exploded = 0;

  /* ── interaction: drag to turn ── */
  let rotY = -0.18, rotX = 0, vY = 0, dragging = false, lx = 0, ly = 0, lastInput = -1e9, moved = 0;
  stage.addEventListener('pointerdown', e => { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; lastInput = performance.now(); stage.setPointerCapture?.(e.pointerId); });
  stage.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    vY = dx * 0.006; rotY += vY; rotX = Math.max(-0.25, Math.min(0.3, rotX + dy * 0.003)); lastInput = performance.now();
  });
  const end = e => {
    if (!dragging) return; dragging = false;
    if (moved < 6) pick(e);
  };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', () => { dragging = false; });

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    const r = stage.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(root.children, true)[0];
    if (!hit) return;
    let o = hit.object; while (o && !Object.values(groups).includes(o)) o = o.parent;
    const id = Object.keys(groups).find(k => groups[k] === o);
    if (id) select(id, true);
  }

  /* ── sizing + loop ── */
  const resize = () => {
    const r = stage.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    const narrow = camera.aspect < 1.05;
    camera.position.copy(camBase).multiplyScalar(narrow ? 1.06 : 1);
    camera.lookAt(0, 0.12, 0);
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(stage);

  let visible = false, raf = 0, last = 0; const t0 = performance.now();
  const ease = (rate, dt) => 1 - Math.pow(1 - rate, dt * 60); // frame-rate independent
  const black = new THREE.Color(0x000000);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }, { rootMargin: '100px' }).observe(stage);
  const v3 = new THREE.Vector3();
  function loop(now) {
    raf = 0; if (!visible) { last = 0; return; }
    const t = (now - t0) / 1000;
    const dt = last ? Math.min(0.25, (now - last) / 1000) : 1 / 60; last = now;
    if (!dragging) {
      vY *= Math.pow(0.92, dt * 60); rotY += vY * dt * 60;
      if (now - lastInput > 3500 && !reduce) rotY += (Math.sin(t * 0.25) * 0.42 - 0.12 - rotY) * ease(0.01, dt);
      rotX *= Math.pow(0.97, dt * 60);
    }
    root.rotation.y = rotY; root.rotation.x = rotX;
    // exploded offsets ease in/out
    Object.keys(groups).forEach(k => {
      const target = explode[k] * exploded;
      offsets[k] += (target - offsets[k]) * (reduce ? 1 : ease(0.09, dt));
      groups[k].position.y = k === 'follicle' ? offsets.dermis : offsets[k];
    });
    // glow on the active layer
    const pulse = reduce ? 0.6 : 0.5 + 0.5 * Math.sin(t * 2.6);
    mats.forEach(({ g, m }) => {
      const on = g === active && exploded > 0;
      m.emissive.lerp(on ? gilt : black, ease(0.12, dt));
      m.emissiveIntensity = on ? 0.16 + pulse * 0.14 : 0.0;
    });
    renderer.render(scene, camera);
    // hotspots
    const r = stage.getBoundingClientRect();
    Object.entries(anchors).forEach(([k, p]) => {
      const b = spots[k]; if (!b) return;
      const g = groups[k];
      v3.copy(p); v3.y += g.position.y; root.localToWorld(v3); v3.project(camera);
      b.style.transform = `translate(${(v3.x * 0.5 + 0.5) * r.width - 12}px, ${(-v3.y * 0.5 + 0.5) * r.height}px) translateY(-50%)`;
    });
    raf = requestAnimationFrame(loop);
  }
  stage.classList.add('is-ready');
  raf = requestAnimationFrame(loop);
}
