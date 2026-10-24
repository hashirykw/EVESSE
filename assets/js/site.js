/* Evessé by Dr. Faria — site behaviour. Vanilla JS, no build step. */
(() => {
  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const WA = { dha: '923001172177', north: '923335974283' };
  const wa = (b, t) => `https://wa.me/${WA[b]}?text=${encodeURIComponent(t)}`;
  let data = {};
  try { data = JSON.parse($('#ev-data')?.textContent || '{}'); } catch (e) {}

  /* ── preloader: once per session, ≤ ~1.6 s, lens opens onto the page ── */
  const pre = $('.preloader');
  if (pre && !doc.classList.contains('seen')) {
    const pct = $('.pl__pct', pre);
    doc.style.overflow = 'hidden';
    let p = 0, shown = 0, finished = false;
    const paint = () => {
      shown += (p - shown) * 0.16;
      pre.style.setProperty('--p', shown.toFixed(4));
      if (pct) pct.textContent = String(Math.min(100, Math.round(shown * 100))).padStart(2, '0');
      if (!(finished && shown > 0.998)) requestAnimationFrame(paint);
    };
    requestAnimationFrame(paint);
    const tick = setInterval(() => { p = Math.min(0.9, p + 0.075 + Math.random() * 0.05); }, 90);
    const done = () => {
      if (finished) return; finished = true;
      clearInterval(tick); p = 1;
      setTimeout(() => {
        pre.classList.add('is-done'); doc.style.overflow = '';
        try { sessionStorage.setItem('ev-seen', '1'); } catch (e) {}
        setTimeout(() => pre.remove(), 1300);
      }, reduce ? 0 : 380);
    };
    const start = performance.now();
    const ready = () => setTimeout(done, Math.max(0, (reduce ? 200 : 1150) - (performance.now() - start)));
    if (document.readyState === 'complete') ready(); else addEventListener('load', ready, { once: true });
    setTimeout(done, 2000); // hard cap on slow networks
  }

  /* ── smooth scroll (desktop pointers only) ── */
  let lenis = null;
  if (window.Lenis && fine && !reduce) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true, anchors: false });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    window.__lenis = lenis;
  }
  $$('a[href^="#"], a[href*=".html#"]').forEach(a => a.addEventListener('click', e => {
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const t = document.getElementById(url.hash.slice(1));
    if (!t) return;
    e.preventDefault(); closePanel();
    if (lenis) lenis.scrollTo(t, { offset: -84 }); else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', url.hash);
  }));

  /* ── nav ── */
  const nav = $('#nav');
  const menuBtn = $('.nav__menu');
  const panel = $('#nav-panel');
  const prog = $('.nav__progress');
  let sTick = false;
  const onScroll = () => {
    if (sTick) return; sTick = true;
    requestAnimationFrame(() => {
      sTick = false;
      nav && nav.classList.toggle('is-scrolled', scrollY > 40);
      if (prog) { const max = document.documentElement.scrollHeight - innerHeight; prog.style.setProperty('--sp', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0); }
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  function closePanel() { if (!panel) return; panel.classList.remove('is-open'); menuBtn?.setAttribute('aria-expanded', 'false'); menuBtn?.setAttribute('aria-label', 'Open menu'); }
  menuBtn?.addEventListener('click', e => {
    e.stopPropagation();
    const open = !panel.classList.contains('is-open');
    panel.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) { closeChat(); $('a', panel)?.focus({ preventScroll: true }); }
  });
  document.addEventListener('click', e => { if (panel?.classList.contains('is-open') && !panel.contains(e.target)) closePanel(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePanel(); closeChat(); } });

  /* ── reveal images + lazy autoplay videos ── */
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  const vio = new IntersectionObserver(es => es.forEach(en => {
    const v = en.target;
    if (en.isIntersecting) {
      if (!v.src && v.dataset.src) { v.src = v.dataset.src; }
      if (!reduce) v.play().catch(() => {});
    } else v.pause();
  }), { rootMargin: '0px' });
  $$('video.autoplay').forEach(v => { v.muted = true; vio.observe(v); });

  /* ── treatment index peek (desktop) ── */
  const peek = $('.tx-peek');
  if (peek && fine) {
    let x = 0, y = 0, tx = 0, ty = 0, on = false, raf = 0;
    const loop = () => { x += (tx - x) * 0.16; y += (ty - y) * 0.16; peek.style.transform = `translate(${x + 40}px, ${y - 170}px)`; if (on) raf = requestAnimationFrame(loop); };
    $$('.tx__link').forEach(a => {
      a.addEventListener('mouseenter', e => {
        tx = e.clientX; ty = e.clientY; if (!on) { x = tx; y = ty; }
        $$('img', peek).forEach(i => i.classList.toggle('is-on', i.dataset.k === a.dataset.peek));
        peek.classList.add('is-on'); if (!on) { on = true; raf = requestAnimationFrame(loop); }
      });
      a.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
      a.addEventListener('mouseleave', () => { peek.classList.remove('is-on'); on = false; cancelAnimationFrame(raf); });
    });
  }

  /* ── layers panel (3D model syncs through 'ev:layer') ── */
  const card = $('#layer-card');
  function showLayer(id, fromModel) {
    const L = (data.layers || []).find(l => l.id === id); if (!L || !card) return;
    $$('.layer-tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.layer === id)));
    card.innerHTML = `<span class="layer-card__depth">${L.n} · ${L.depth}</span><h3>${L.name}</h3><p>${L.lead}</p><ul>${L.tx.map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join('')}</ul>`;
    if (!fromModel) dispatchEvent(new CustomEvent('ev:layer', { detail: id }));
  }
  $$('.layer-tabs button').forEach(b => b.addEventListener('click', () => showLayer(b.dataset.layer)));
  addEventListener('ev:layer-from-model', e => showLayer(e.detail, true));

  const stage = $('#stage');
  if (stage) {
    const sio = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) {
        sio.disconnect();
        import('./skin3d.js?v=0b416042').then(m => m.init(stage, data.layers || [])).catch(err => { console.warn(err); stage.querySelector('.stage__loading').textContent = '3D view unavailable on this device — use the layer list.'; });
      }
    }, { rootMargin: '400px 0px' });
    sio.observe(stage);
  }

  /* ── 3D satin backgrounds (lazy, per section) ── */
  const satins = $$('[data-satin]');
  if (satins.length) {
    let satinMod = null;
    const sio = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      sio.unobserve(en.target);
      (satinMod ||= import('./satin.js?v=e3c0c947')).then(m => m.mount(en.target, en.target.dataset.satin)).catch(() => {});
    }), { rootMargin: '300px 0px' });
    satins.forEach(el => sio.observe(el));
  }

  /* ── depth tilt on image plates (desktop pointers) ── */
  if (fine && !reduce) $$('[data-tilt]').forEach(el => {
    let raf = 0;
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { el.classList.add('is-tilting'); el.style.transform = `perspective(1100px) rotateY(${x * 7}deg) rotateX(${-y * 6}deg) translateZ(0)`; });
    });
    el.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); el.classList.remove('is-tilting'); el.style.transform = ''; });
  });

  /* ── hero lens ── */
  const hero = $('#hero');
  if (hero && $('.hero__canvas', hero)) {
    import('./hero-lens.js?v=3e4e9dba').then(m => m.init(hero)).catch(err => console.warn(err));
  }

  /* ── five markers ── */
  const mk = $('#mk-card');
  if (mk && data.markers) {
    const set = k => {
      const m = data.markers.find(x => x.k === k); if (!m) return;
      $$('.mk-tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.k === k)));
      $('.mk-name', mk).textContent = m.name;
      $('.mk-low', mk).textContent = `${m.low} ${m.unit}`; $('.mk-good', mk).textContent = `${m.good} ${m.unit}`;
      $('.mk-lownote', mk).textContent = m.lowNote; $('.mk-goodnote', mk).textContent = m.goodNote;
      const a = (m.a / m.max) * 100, b = (m.b / m.max) * 100;
      const sc = $('.mk-scale', mk), track = $('.mk-scale__track', mk);
      sc.style.setProperty('--low', a + '%'); sc.style.setProperty('--hi', b + '%');
      track.style.background = m.inverse
        ? `linear-gradient(90deg, oklch(50% 0.03 120) 0%, oklch(74% 0.09 78) 6%, oklch(74% 0.09 78) ${a}%, oklch(50% 0.03 120) ${a}%, oklch(50% 0.03 120) ${b}%, oklch(45% 0.09 30) ${b}%, oklch(45% 0.09 30) 100%)`
        : '';
      const ta = $('.mk-a', mk), tb = $('.mk-b', mk);
      ta.style.left = a + '%'; tb.style.left = b + '%';
      ta.textContent = m.inverse ? '2' : String(m.a); tb.textContent = String(m.b);
    };
    $$('.mk-tabs button').forEach(b => b.addEventListener('click', () => set(b.dataset.k)));
    set(data.markers[0].k);
  }

  /* ── reels ── */
  $$('.reel').forEach(r => {
    const v = $('video', r), btn = $('.reel__btn', r);
    btn.addEventListener('click', () => {
      if (r.classList.contains('is-playing')) { v.pause(); r.classList.remove('is-playing'); return; }
      $$('.reel.is-playing').forEach(o => { $('video', o).pause(); o.classList.remove('is-playing'); });
      if (!v.src) v.src = v.dataset.src;
      v.muted = false; v.play().then(() => r.classList.add('is-playing')).catch(() => { v.muted = true; v.play(); r.classList.add('is-playing'); });
    });
    v.addEventListener('ended', () => r.classList.remove('is-playing'));
  });
  const rio = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) { const v = $('video', en.target); if (v && !v.paused) { v.pause(); en.target.classList.remove('is-playing'); } } }), { threshold: 0.2 });
  $$('.reel').forEach(r => rio.observe(r));

  /* ── jump nav highlight (treatments page) ── */
  const jumps = $$('.jump a');
  if (jumps.length) {
    const jio = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) jumps.forEach(a => a.classList.toggle('is-current', a.hash === '#' + en.target.id));
    }), { rootMargin: '-40% 0px -55% 0px' });
    jumps.forEach(a => { const t = document.getElementById(a.hash.slice(1)); if (t) jio.observe(t); });
  }

  /* ── chat (compact card) ── */
  const fab = $('.chat-fab'), chat = $('#chat');
  const log = $('.chat__log', chat || document), chips = $('.chat__chips', chat || document);
  const btnWA = (b, label, text) => `<a class="btn btn--wa" href="${wa(b, text)}" target="_blank" rel="noopener">${label}</a>`;
  const BOOK = b => `Hello Evessé, I'd like to book a consultation at the ${b === 'dha' ? 'DHA' : 'North Nazimabad'} clinic.`;
  const QA = [
    { q: 'Book a consultation', a: `Pick your clinic — WhatsApp opens with your message ready to send.<br>${btnWA('dha', 'DHA Phase 6', BOOK('dha'))} ${btnWA('north', 'North Nazimabad', BOOK('north'))}` },
    { q: 'Where are the clinics?', a: `<b>DHA</b> — Building 38C, 1st Floor, Lane 11, Main Bukhari Commercial, Phase 6.<br><b>North Nazimabad</b> — B-122, 2nd Floor, Block H, Main Five Star Roundabout (new, opened 24 Oct).<br><a href="clinics.html">Maps and phone numbers →</a>` },
    { q: 'Hair fall — where do I start?', a: `With bloodwork. Dr. Faria checks <b>ferritin, vitamin D, B12, zinc and TSH</b> first, then plans treatment — PRP, QR678®, Dutexome or microneedling. <a href="index.html#markers">See the five markers →</a>` },
    { q: 'Bridal skin plan', a: `Start about six months out if you can — that leaves time to treat acne or pigmentation before the glow work. <a href="treatments.html#bridal">The bridal timeline →</a>` },
    { q: 'Botox & fillers', a: `Injectables are done after a face assessment with Dr. Faria — the aim is to look rested, not changed. <a href="treatments.html#injectables">Injectables at Evessé →</a>` },
    { q: 'Weight management', a: `It begins with a body composition assessment — BMI, body fat %, visceral fat, muscle mass and a metabolic health score — then a medical plan. <a href="treatments.html#body">Body &amp; weight →</a>` },
    { q: 'Prices?', a: `Fees depend on the plan your skin actually needs, so treatment prices are shared after consultation. The front desk can tell you today’s consultation fee.<br>${btnWA('dha', 'Ask DHA', 'Hello Evessé, what is the consultation fee?')} ${btnWA('north', 'Ask North', 'Hello Evessé, what is the consultation fee?')}` },
    { q: 'Timings', a: `For today’s timings call the front desk — DHA <a href="tel:+923001172177">0300-1172177</a> · North <a href="tel:+923335974283">0333-5974283</a>.` },
  ];
  let greeted = false;
  const add = (html, who = 'bot') => { const d = document.createElement('div'); d.className = `msg msg--${who}`; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
  const reply = html => { const t = add('<i></i><i></i><i></i>'); t.classList.add('msg--typing'); setTimeout(() => { t.remove(); add(html); }, reduce ? 50 : 650); };
  if (chips) chips.innerHTML = QA.map((x, i) => `<button type="button" data-i="${i}">${x.q}</button>`).join('');
  chips?.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const x = QA[+b.dataset.i]; add(x.q, 'me'); reply(x.a); });
  function openChat() {
    chat.classList.add('is-open'); fab?.setAttribute('aria-expanded', 'true'); $$('.dock__icon[data-open-chat]').forEach(b => b.setAttribute('aria-expanded', 'true')); closePanel();
    if (!greeted) { greeted = true; add('Hello — this is Evessé’s quick-answer desk. Pick a question below, or book straight on WhatsApp.'); }
    setTimeout(() => $('button', chips)?.focus({ preventScroll: true }), 50);
  }
  function closeChat() { if (!chat) return; chat.classList.remove('is-open'); fab?.setAttribute('aria-expanded', 'false'); $$('.dock__icon[data-open-chat]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
  fab?.addEventListener('click', () => chat.classList.contains('is-open') ? closeChat() : openChat());
  $('.chat__close', chat || document)?.addEventListener('click', () => { closeChat(); (fab && fab.offsetParent ? fab : $('.dock__icon[data-open-chat]'))?.focus(); });
  $$('[data-open-chat]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    if (b.classList.contains('dock__icon') && chat.classList.contains('is-open')) { closeChat(); return; }
    openChat();
  }));

  /* ── booking builder → WhatsApp ── */
  const bk = $('#booker');
  bk?.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(bk);
    const branch = f.get('branch') || 'dha';
    const concerns = f.getAll('concern');
    const when = f.get('when');
    const name = (f.get('name') || '').toString().trim();
    const clinic = branch === 'dha' ? 'DHA Phase 6' : 'North Nazimabad';
    const msg = [`Hello Evessé${name ? `, this is ${name}` : ''}.`, `I'd like to book a consultation at the ${clinic} clinic.`,
      concerns.length ? `I'd like help with: ${concerns.join(', ')}.` : '', when ? `Preferred time: ${when}.` : ''].filter(Boolean).join('\n');
    window.open(wa(branch, msg), '_blank', 'noopener');
  });

  /* ── tuck the chat button away when the footer credit is on screen ── */
  const nx = $('.nexlyr');
  if (nx && fab) new IntersectionObserver(es => fab.classList.toggle('is-tucked', es[0].isIntersecting && !chat.classList.contains('is-open'))).observe(nx);

  /* ── mobile glass dock: appears after the first screen ── */
  const dockEl = $('.dock');
  if (dockEl) {
    const first = $('.hero, .page-hero');
    const toggleDock = () => {
      const past = first ? first.getBoundingClientRect().bottom < innerHeight * 0.35 : scrollY > 300;
      const footer = $('.footer'); const nearEnd = footer ? footer.getBoundingClientRect().top < innerHeight - 40 : false;
      dockEl.classList.toggle('is-on', past && !nearEnd);
    };
    addEventListener('scroll', toggleDock, { passive: true }); toggleDock();
  }
})();
