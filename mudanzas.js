/* ============================================================
   MUDANZAS METEPEC · mudanzas.js (v10)
   Experiencia cinematográfica de 7 actos.
   - Conversión SIEMPRE activa (form -> WhatsApp, stub plataforma).
   - GSAP ScrollTrigger: pins, timelines, reveals por máscara, parallax.
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
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var doc = document.documentElement, y = window.scrollY || 0;
        var max = (doc.scrollHeight - doc.clientHeight) || 1;
        if (topbar) topbar.classList.toggle('solid', y > 40);
        if (bar) bar.style.width = Math.min(100, (y / max) * 100) + '%';
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
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
      var d = {
        nombre: g('nombre'), telefono: g('telefono'), origen: g('origen'),
        destino: g('destino'), servicio: g('servicio'), source: CONFIG.source, createdAt: new Date().toISOString()
      };
      if (CONFIG.leadsEndpoint) {
        try { fetch(CONFIG.leadsEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), keepalive: true }).catch(function () {}); } catch (e2) {}
      }
      var msg = ['¡Hola Mudanzas Metepec! Quiero cotizar una mudanza 🚚', '',
        '👤 ' + d.nombre, '📞 ' + d.telefono, '📍 Origen: ' + d.origen,
        '🎯 Destino: ' + d.destino, '📦 Servicio: ' + d.servicio, '', '¿Me ayudan con el precio? ¡Gracias!'].join('\n');
      window.open('https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(msg), '_blank');
    });
  }

  /* ---------------- Motion ---------------- */
  function initMotion() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if (!gsap || !ST || reduce) return;
    gsap.registerPlugin(ST);
    document.body.classList.add('anim');
    var vh = function () { return window.innerHeight; };

    /* Reveal por máscara (fuera del hero) */
    gsap.utils.toArray('[data-mask]').forEach(function (el) {
      if (el.closest('.act1')) return;
      gsap.to(el, { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%' } });
    });

    /* Hero: reveal inmediato */
    gsap.timeline({ delay: 0.15 }).to(gsap.utils.toArray('.act1 [data-mask]'),
      { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power3.out', stagger: 0.16 });

    /* Parallax de medios (capa externa; el Ken Burns vive en .media__layer) */
    gsap.utils.toArray('.media[data-parallax]').forEach(function (m) {
      var depth = parseFloat(m.getAttribute('data-parallax')) || 0.15;
      gsap.fromTo(m, { yPercent: -depth * 50 }, { yPercent: depth * 50, ease: 'none',
        scrollTrigger: { trigger: m.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* ACTO 2 · datos uno por uno (pin + scrub) */
    var statements = gsap.utils.toArray('.act2 .statement');
    if (statements.length) {
      var tl2 = gsap.timeline({ scrollTrigger: { trigger: '.act2', start: 'top top',
        end: '+=' + (statements.length * vh() * 0.8), pin: true, scrub: 0.6 } });
      statements.forEach(function (s, i) {
        tl2.fromTo(s, { opacity: 0, y: 60, scale: .92, filter: 'blur(12px)' },
          { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1 });
        if (i < statements.length - 1) tl2.to(s, { opacity: 0, y: -60, scale: .92, filter: 'blur(12px)', duration: 1 }, '+=0.55');
      });
    }

    /* ACTO 3 · pin real: medio fijo + texto + HUD de progreso */
    var steps = gsap.utils.toArray('.care__step');
    var slides = document.querySelectorAll('.care__slide');
    var careCount = document.getElementById('careCount');
    var careBar = document.getElementById('careBar');
    var total = steps.length;
    steps.forEach(function (step) {
      var i = parseInt(step.getAttribute('data-step'), 10);
      ST.create({
        trigger: step, start: 'top center', end: 'bottom center',
        onToggle: function (self) {
          if (!self.isActive) return;
          steps.forEach(function (s) { s.classList.remove('is-active'); });
          step.classList.add('is-active');
          slides.forEach(function (sl) { sl.classList.toggle('is-active', parseInt(sl.getAttribute('data-slide'), 10) === i); });
          if (careCount) careCount.textContent = ('0' + (i + 1)).slice(-2);
          if (careBar) careBar.style.width = (((i + 1) / total) * 100) + '%';
        }
      });
    });

    /* ACTO 5 · rutas que se trazan + nodos */
    gsap.utils.toArray('#map .route').forEach(function (p) {
      var len = p.getTotalLength ? p.getTotalLength() : 300;
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(p, { strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: '.act5', start: 'top 70%', end: 'bottom 80%', scrub: true } });
    });
    gsap.from('#map .node', { opacity: 0, scale: 0, transformOrigin: 'center', stagger: 0.09, duration: 0.5, ease: 'back.out(2)',
      scrollTrigger: { trigger: '.act5', start: 'top 55%' } });

    /* ACTO 6 · opiniones que se funden (pin + scrub) */
    var quotes = gsap.utils.toArray('.act6 .quote');
    if (quotes.length) {
      var tl6 = gsap.timeline({ scrollTrigger: { trigger: '.act6', start: 'top top',
        end: '+=' + (quotes.length * vh() * 0.8), pin: true, scrub: 0.6 } });
      quotes.forEach(function (q, i) {
        tl6.fromTo(q, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1 });
        if (i < quotes.length - 1) tl6.to(q, { opacity: 0, y: -40, duration: 1 }, '+=0.6');
      });
    }

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
