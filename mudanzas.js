/* ============================================================
   MUDANZAS METEPEC · mudanzas.js (v11)
   Scroll experience: cada escena se PINEA a 100vh y el scroll
   cambia su contenido interno (timelines scrubbed).
   - Conversión siempre activa (form -> WhatsApp + stub plataforma).
   - Degradación: sin GSAP / reduced-motion -> todo visible (CSS).
   ============================================================ */
(function () {
  'use strict';

  var CONFIG = { whatsapp: '527228300083', leadsEndpoint: null, source: 'web' };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- UI ---------------- */
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

  /* ---------------- Cotizador ---------------- */
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

  /* ---------------- Motion (escenas pinned) ---------------- */
  function initMotion() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if (!gsap || !ST || reduce) return;
    gsap.registerPlugin(ST);
    document.body.classList.add('anim');
    var vh = window.innerHeight;

    function pin(trigger, distance) {
      return gsap.timeline({ scrollTrigger: { trigger: trigger, start: 'top top', end: '+=' + distance, pin: true, scrub: 0.6, anticipatePin: 1 } });
    }

    /* ESCENA 1 · HERO — intro + zoom/exit con scroll */
    gsap.timeline({ delay: 0.15 }).fromTo('.hero__inner [data-mask]',
      { opacity: 0, y: 28, clipPath: 'inset(0 0 100% 0)' },
      { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.out', stagger: 0.16 });
    var heroTl = pin('#hero', vh * 0.9);
    heroTl.to('.scene--hero .media__layer', { scale: 1.25, ease: 'none' }, 0)
          .to('.hero__inner', { y: -80, opacity: 0, ease: 'none' }, 0)
          .to('.scroll-hint', { opacity: 0, ease: 'none' }, 0);

    /* ESCENA 2 · CONFIANZA — datos uno por uno */
    var statements = gsap.utils.toArray('.statement');
    var trustTl = pin('#confianza', statements.length * vh * 0.85);
    statements.forEach(function (s, i) {
      trustTl.fromTo(s, { opacity: 0, y: 70, scale: .9, filter: 'blur(14px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1 });
      if (i < statements.length - 1) trustTl.to(s, { opacity: 0, y: -70, scale: .9, filter: 'blur(14px)', duration: 1 }, '+=0.55');
    });

    /* ESCENA 3 · CUIDADO — imagen fija + texto que cambia + HUD */
    var steps = gsap.utils.toArray('.care__step');
    var shots = gsap.utils.toArray('.care__shot');
    var n = steps.length;
    var careCount = document.getElementById('careCount');
    var careBar = document.getElementById('careBar');
    gsap.set(steps, { opacity: 0, y: 60 });
    gsap.set(shots, { opacity: 0 });
    gsap.set(shots[0], { opacity: 1 });
    var careTl = gsap.timeline({ scrollTrigger: {
      trigger: '#cuidado', start: 'top top', end: '+=' + (n * vh * 0.85), pin: true, scrub: 0.6, anticipatePin: 1,
      onUpdate: function (self) {
        var idx = Math.min(n - 1, Math.floor(self.progress * n));
        if (careCount) careCount.textContent = ('0' + (idx + 1)).slice(-2);
        if (careBar) careBar.style.width = (((idx + 1) / n) * 100) + '%';
      }
    } });
    steps.forEach(function (step, i) {
      careTl.to(step, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' });
      careTl.to(shots[i], { opacity: 1, duration: 1 }, '<');
      if (i < n - 1) {
        careTl.to(step, { opacity: 0, y: -60, duration: 1, ease: 'power2.in' }, '+=0.55');
        careTl.to(shots[i], { opacity: 0, duration: 1 }, '<');
      }
    });

    /* ESCENA 4 · SEGURIDAD — líneas que aparecen una por una */
    var safety = pin('#seguridad', vh * 1.1);
    safety.from('.safety__label', { opacity: 0, y: 30, duration: 0.6 })
          .from('.safety__title', { opacity: 0, y: 40, clipPath: 'inset(0 0 100% 0)', duration: 1 }, '-=0.2')
          .from('.safety__line', { opacity: 0, x: -40, duration: 0.8, stagger: 0.6 }, '+=0.2')
          .from('.safety__cta', { opacity: 0, y: 20, duration: 0.6 }, '+=0.3');

    /* ESCENA 5 · COBERTURA — mapa con líneas que se trazan */
    var routes = gsap.utils.toArray('#map .route');
    routes.forEach(function (p) { var len = p.getTotalLength ? p.getTotalLength() : 300; gsap.set(p, { strokeDasharray: len, strokeDashoffset: len }); });
    var mapTl = pin('#cobertura', vh * 1.0);
    mapTl.from('.map__head [data-mask]', { opacity: 0, y: 30, clipPath: 'inset(0 0 100% 0)', duration: 1, stagger: 0.2 })
         .to(routes, { strokeDashoffset: 0, duration: 3, stagger: 0.3, ease: 'none' }, '+=0.2')
         .from('#map .node', { opacity: 0, scale: 0, transformOrigin: 'center', duration: 0.5, stagger: 0.15, ease: 'back.out(2)' }, '-=2.5');

    /* ESCENA 6 · OPINIONES — slides grandes que entran/salen */
    var slides = gsap.utils.toArray('.slide');
    gsap.set(slides, { opacity: 0, x: 80 });
    gsap.set(slides[0], { opacity: 1, x: 0 });
    var revTl = pin('#opiniones', slides.length * vh * 0.85);
    slides.forEach(function (sl, i) {
      if (i > 0) revTl.fromTo(sl, { opacity: 0, x: 80 }, { opacity: 1, x: 0, duration: 1, ease: 'power2.out' });
      if (i < slides.length - 1) revTl.to(sl, { opacity: 0, x: -80, duration: 1, ease: 'power2.in' }, '+=0.6');
    });

    window.addEventListener('load', function () { ST.refresh(); });
  }

  /* ---------------- Arranque ---------------- */
  function start() {
    initUI();
    initQuote();
    try { initMotion(); }
    catch (e) { document.body.classList.remove('anim'); }
  }
  if (document.readyState !== 'loading') start();
  else window.addEventListener('DOMContentLoaded', start);
})();
