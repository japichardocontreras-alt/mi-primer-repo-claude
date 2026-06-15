/* =========================================================
   MUDANZAS METEPEC · "El Arte de Mudarte" · arte.js
   - Funcionalidad comercial SIEMPRE activa (menú, form→WhatsApp,
     progreso, capítulo, contadores, año).
   - GSAP ScrollTrigger como CAPA de mejora (storytelling).
   - Degradación elegante: sin librerías / reduced-motion -> legible.
   ========================================================= */
(function () {
  'use strict';

  var WA = '527228300083';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);

  /* ---------- Menú móvil ---------- */
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); navToggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---------- Header + progreso + capítulo ---------- */
  var hdr = document.getElementById('hdr');
  var bar = document.getElementById('progressBar');
  var chapterEl = document.getElementById('chapter');
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene[data-chapter]'));
  var tick = false;
  function onScroll() {
    tick = false;
    var doc = document.documentElement;
    var y = window.scrollY || window.pageYOffset || 0;
    var max = (doc.scrollHeight - doc.clientHeight) || 1;
    if (hdr) hdr.classList.toggle('scrolled', y > 8);
    if (bar) bar.style.width = Math.min(100, (y / max) * 100) + '%';
    if (chapterEl && scenes.length) {
      var mid = y + window.innerHeight * 0.5, name = scenes[0].getAttribute('data-chapter');
      for (var i = 0; i < scenes.length; i++) { if (scenes[i].offsetTop <= mid) name = scenes[i].getAttribute('data-chapter'); }
      if (chapterEl.textContent !== name) chapterEl.textContent = name;
    }
  }
  function reqScroll() { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', reqScroll, { passive: true });
  window.addEventListener('resize', reqScroll, { passive: true });

  /* ---------- Formulario -> WhatsApp ---------- */
  var form = document.getElementById('quoteForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var g = function (id) { var el = document.getElementById(id); return el && el.value ? el.value.trim() : ''; };
      var lines = ['¡Hola Mudanzas Metepec! Quiero solicitar una cotización 🚚', '',
        '👤 Nombre: ' + g('nombre'), '📞 Teléfono: ' + g('telefono'),
        '📍 Origen: ' + g('origen'), '🎯 Destino: ' + g('destino')];
      if (g('fecha')) lines.push('📅 Fecha tentativa: ' + g('fecha'));
      lines.push('📦 Servicio: ' + g('servicio'));
      if (g('descripcion')) lines.push('📝 Detalles: ' + g('descripcion'));
      lines.push('', '¿Me pueden ayudar con el precio? ¡Gracias!');
      window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(lines.join('\n')), '_blank');
    });
  }

  /* ---------- Contadores ---------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1), eased = 1 - (1 - p) * (1 - p);
      el.textContent = Math.floor(eased * target);
      if (p < 1) requestAnimationFrame(step); else el.textContent = target;
    }
    requestAnimationFrame(step);
  }
  var counters = Array.prototype.slice.call(document.querySelectorAll('.stat__n[data-count]'));
  function runCountersWithIO() {
    if (!('IntersectionObserver' in window)) { counters.forEach(animateCount); return; }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCount(en.target); obs.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* ---------- Año ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- GSAP storytelling (mejora) ---------- */
  function initGSAP() {
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    document.body.classList.add('gsap-ready');

    // Reveal por escena
    gsap.utils.toArray('.scene').forEach(function (scene) {
      var items = scene.querySelectorAll('[data-reveal]');
      if (!items.length) return;
      gsap.fromTo(items, { opacity: 0, y: 36 }, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.12,
        scrollTrigger: { trigger: scene, start: 'top 72%' }
      });
    });

    // Parallax de fondos
    gsap.utils.toArray('.scene__bg[data-parallax]').forEach(function (bg) {
      var depth = parseFloat(bg.getAttribute('data-parallax')) || 0.12;
      gsap.to(bg, {
        yPercent: depth * 100, ease: 'none',
        scrollTrigger: { trigger: bg.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Mapa: rutas que se dibujan + nodos que se encienden
    gsap.utils.toArray('#map .route').forEach(function (path) {
      var len = path.getTotalLength ? path.getTotalLength() : 300;
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, { strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: '#cobertura', start: 'top 60%', end: 'bottom 70%', scrub: true } });
    });
    gsap.from('#map .node', { opacity: 0, scale: 0, transformOrigin: 'center', stagger: 0.08, duration: 0.4, ease: 'back.out(2)',
      scrollTrigger: { trigger: '#cobertura', start: 'top 55%' } });

    // Cajas / piezas que entran
    gsap.from('.pbox', { opacity: 0, y: -50, stagger: 0.12, duration: 0.5, ease: 'power2.out',
      scrollTrigger: { trigger: '#preparacion', start: 'top 60%' } });
    gsap.fromTo('.pwrap', { opacity: 0, scaleY: 0, transformOrigin: 'top center' }, { opacity: 0.18, scaleY: 1, duration: 0.6,
      scrollTrigger: { trigger: '#preparacion', start: 'top 50%' } });
    gsap.from('.lbox', { opacity: 0, x: 80, y: -20, stagger: 0.15, duration: 0.5, ease: 'power2.out',
      scrollTrigger: { trigger: '#carga', start: 'top 55%' } });

    // Servicios con stagger
    gsap.from('.svc', { opacity: 0, y: 40, stagger: 0.1, duration: 0.5, ease: 'power2.out',
      scrollTrigger: { trigger: '.svc-grid', start: 'top 78%' } });

    // Contadores al entrar
    counters.forEach(function (c) {
      window.ScrollTrigger.create({ trigger: c, start: 'top 85%', once: true, onEnter: function () { animateCount(c); } });
    });

    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  }

  /* ---------- Arranque ---------- */
  function start() {
    onScroll();
    if (hasGSAP && !reduce) {
      try { initGSAP(); }
      catch (e) { document.body.classList.remove('gsap-ready'); runCountersWithIO(); }
    } else {
      // Sin GSAP / reduced-motion: todo visible (CSS) + contadores por IO
      runCountersWithIO();
    }
  }
  if (document.readyState !== 'loading') { setTimeout(start, 0); }
  else { window.addEventListener('DOMContentLoaded', start); }
})();
