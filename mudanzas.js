/* ============================================================
   MUDANZAS METEPEC · mudanzas.js (v12 · marca elevada)
   Escenas PINNED a 100vh, contenido cambia con scroll.
   Video real gestionado para rendimiento. GSAP ScrollTrigger.
   Conversión siempre activa. Degradación elegante.
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = { whatsapp: '527228300083', leadsEndpoint: null, source: 'web' };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- UI ---------- */
  function initUI() {
    var topbar = document.getElementById('topbar');
    var bar = document.getElementById('progressBar');
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var doc = document.documentElement, y = window.scrollY || 0;
        var max = (doc.scrollHeight - doc.clientHeight) || 1;
        if (topbar) topbar.classList.toggle('solid', y > 40);
        if (bar) bar.style.width = Math.min(100, (y / max) * 100) + '%';
      });
    }, { passive: true });
    var yr = document.getElementById('year');
    if (yr) yr.textContent = new Date().getFullYear();
  }

  /* ---------- Video real: reproducir solo cuando se ve (perf) ---------- */
  function initVideos() {
    var vids = document.querySelectorAll('.bgvideo');
    if (reduce) { vids.forEach(function (v) { v.removeAttribute('autoplay'); try { v.pause(); } catch (e) {} }); return; }
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else { try { v.pause(); } catch (e) {} }
      });
    }, { threshold: 0.15 });
    vids.forEach(function (v) { io.observe(v); });
  }

  /* ---------- Cotizador ---------- */
  function initQuote() {
    var form = document.getElementById('quoteForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var g = function (id) { var el = document.getElementById(id); return el && el.value ? el.value.trim() : ''; };
      var d = { nombre: g('nombre'), telefono: g('telefono'), origen: g('origen'), destino: g('destino'),
        servicio: g('servicio'), source: CONFIG.source, createdAt: new Date().toISOString() };
      if (CONFIG.leadsEndpoint) {
        try { fetch(CONFIG.leadsEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), keepalive: true }).catch(function () {}); } catch (e2) {}
      }
      var msg = ['¡Hola Mudanzas Metepec! Quiero cotizar una mudanza 🚚', '',
        '👤 ' + d.nombre, '📞 ' + d.telefono, '📍 Origen: ' + d.origen,
        '🎯 Destino: ' + d.destino, '📦 Servicio: ' + d.servicio, '', '¿Me ayudan con el precio? ¡Gracias!'].join('\n');
      window.open('https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(msg), '_blank');
    });
  }

  /* ---------- Motion ---------- */
  function initMotion() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if (!gsap || !ST || reduce) return;
    gsap.registerPlugin(ST);
    document.body.classList.add('anim');
    var vh = window.innerHeight;

    function pin(trigger, distance) {
      return gsap.timeline({ scrollTrigger: { trigger: trigger, start: 'top top', end: '+=' + distance, pin: true, scrub: 0.6, anticipatePin: 1 } });
    }

    /* HERO: intro + zoom/exit */
    gsap.timeline({ delay: 0.15 }).fromTo('.hero__inner [data-mask]',
      { opacity: 0, y: 28, clipPath: 'inset(0 0 100% 0)' },
      { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.out', stagger: 0.15 });
    pin('#hero', vh * 0.9)
      .to('.hero .media', { scale: 1.18, ease: 'none' }, 0)
      .to('.hero__inner', { y: -70, opacity: 0, ease: 'none' }, 0)
      .to('.scroll-hint', { opacity: 0, ease: 'none' }, 0);

    /* CONFIANZA: datos uno por uno */
    var stmts = gsap.utils.toArray('.stmt');
    var t = pin('#confianza', stmts.length * vh * 0.85);
    stmts.forEach(function (s, i) {
      t.fromTo(s, { opacity: 0, y: 70, scale: .9, filter: 'blur(14px)' }, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1 });
      if (i < stmts.length - 1) t.to(s, { opacity: 0, y: -70, scale: .9, filter: 'blur(14px)', duration: 1 }, '+=0.55');
    });

    /* POR QUÉ: reveal por máscara secuencial dentro del pin */
    pin('#porque', vh * 0.9)
      .from('.why .label', { opacity: 0, y: 24, duration: 0.5 })
      .from('.why__title', { opacity: 0, y: 36, clipPath: 'inset(0 0 100% 0)', duration: 1 }, '-=0.1')
      .from('.why__item', { opacity: 0, x: -40, duration: 0.7, stagger: 0.5 }, '+=0.1');

    /* CUIDADO: imagen fija + pasos + HUD */
    var steps = gsap.utils.toArray('.care__step'), shots = gsap.utils.toArray('.care__shot');
    var n = steps.length, cC = document.getElementById('careCount'), cB = document.getElementById('careBar');
    gsap.set(steps, { opacity: 0, y: 60 }); gsap.set(shots, { opacity: 0 }); gsap.set(shots[0], { opacity: 1 });
    var care = gsap.timeline({ scrollTrigger: { trigger: '#cuidado', start: 'top top', end: '+=' + (n * vh * 0.85), pin: true, scrub: 0.6, anticipatePin: 1,
      onUpdate: function (self) { var idx = Math.min(n - 1, Math.floor(self.progress * n)); if (cC) cC.textContent = ('0' + (idx + 1)).slice(-2); if (cB) cB.style.width = (((idx + 1) / n) * 100) + '%'; } } });
    steps.forEach(function (step, i) {
      care.to(step, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' });
      care.to(shots[i], { opacity: 1, duration: 1 }, '<');
      if (i < n - 1) { care.to(step, { opacity: 0, y: -60, duration: 1, ease: 'power2.in' }, '+=0.55'); care.to(shots[i], { opacity: 0, duration: 1 }, '<'); }
    });

    /* SEGURIDAD: líneas una por una */
    pin('#seguridad', vh * 1.0)
      .from('.safety .label', { opacity: 0, y: 24, duration: 0.5 })
      .from('.safety__title', { opacity: 0, y: 36, clipPath: 'inset(0 0 100% 0)', duration: 1 }, '-=0.1')
      .from('.safety__line', { opacity: 0, x: -40, duration: 0.7, stagger: 0.5 }, '+=0.1')
      .from('.safety .cta', { opacity: 0, y: 20, duration: 0.6 }, '+=0.2');

    /* COBERTURA: anillos del logo + rutas que se trazan */
    var rings = gsap.utils.toArray('.rings span');
    rings.forEach(function (r, i) {
      gsap.set(r, { width: 120 + i * 140, height: 120 + i * 140 });
      gsap.fromTo(r, { scale: 0.3, opacity: 0.5 }, { scale: 1.4, opacity: 0, duration: 3, ease: 'none', repeat: -1, delay: i * 0.7 });
    });
    var routes = gsap.utils.toArray('#map .route');
    routes.forEach(function (p) { var len = p.getTotalLength ? p.getTotalLength() : 300; gsap.set(p, { strokeDasharray: len, strokeDashoffset: len }); });
    pin('#cobertura', vh * 1.0)
      .from('.map-head [data-mask]', { opacity: 0, y: 30, clipPath: 'inset(0 0 100% 0)', duration: 1, stagger: 0.2 })
      .to(routes, { strokeDashoffset: 0, duration: 3, stagger: 0.3, ease: 'none' }, '+=0.1')
      .from('#map .node', { opacity: 0, scale: 0, transformOrigin: 'center', duration: 0.5, stagger: 0.15, ease: 'back.out(2)' }, '-=2.4');

    /* OPINIONES: slides grandes */
    var slides = gsap.utils.toArray('.slide');
    gsap.set(slides, { opacity: 0, x: 80 }); gsap.set(slides[0], { opacity: 1, x: 0 });
    var rev = pin('#opiniones', slides.length * vh * 0.85);
    slides.forEach(function (sl, i) {
      if (i > 0) rev.fromTo(sl, { opacity: 0, x: 80 }, { opacity: 1, x: 0, duration: 1, ease: 'power2.out' });
      if (i < slides.length - 1) rev.to(sl, { opacity: 0, x: -80, duration: 1, ease: 'power2.in' }, '+=0.6');
    });

    window.addEventListener('load', function () { ST.refresh(); });
  }

  /* ---------- Arranque ---------- */
  function start() { initUI(); initVideos(); initQuote(); try { initMotion(); } catch (e) { document.body.classList.remove('anim'); } }
  if (document.readyState !== 'loading') start();
  else window.addEventListener('DOMContentLoaded', start);
})();
