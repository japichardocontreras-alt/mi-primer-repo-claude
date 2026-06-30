/* ============================================================
   MUDANZAS METEPEC · mudanzas.js (v13 · final)
   Ligero, robusto, sin dependencias externas.
   Header, menú móvil, reveal, contadores, formulario -> WhatsApp.
   ============================================================ */
(function () {
  'use strict';
  var WA = '527228300083';
  // Plataforma interna (futuro): coloca aquí la URL para guardar leads.
  var LEADS_ENDPOINT = null;

  /* Header al hacer scroll */
  var header = document.getElementById('header');
  function onScroll() { if (header) header.classList.toggle('scrolled', (window.scrollY || 0) > 20); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menú móvil */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* Reveal al hacer scroll */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); } });
    }, { threshold: 0.14 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* Contadores */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (isNaN(target)) return;
    var start = null, dur = 1300;
    (function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (el.getAttribute('data-suffix') === '+' ? '+' : '') + Math.floor(eased * target) + (suffix === '%' ? '%' : '');
      if (p < 1) requestAnimationFrame(step); else el.textContent = (suffix === '+' ? '+' : '') + target + (suffix === '%' ? '%' : '');
    })(performance.now());
  }
  var counters = document.querySelectorAll('.stat__n[data-count]');
  if ('IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCount(en.target); obs.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { io2.observe(c); });
  }

  /* Formulario -> WhatsApp (+ stub plataforma interna) */
  var form = document.getElementById('quoteForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var g = function (id) { var el = document.getElementById(id); return el && el.value ? el.value.trim() : ''; };
      var d = { nombre: g('nombre'), telefono: g('telefono'), origen: g('origen'), destino: g('destino'),
        servicio: g('servicio'), source: 'web', createdAt: new Date().toISOString() };
      if (LEADS_ENDPOINT) {
        try { fetch(LEADS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), keepalive: true }).catch(function () {}); } catch (e2) {}
      }
      var msg = ['¡Hola Mudanzas Metepec! Quiero cotizar una mudanza 🚚', '',
        '👤 ' + d.nombre, '📞 ' + d.telefono, '📍 Origen: ' + d.origen,
        '🎯 Destino: ' + d.destino, '📦 Servicio: ' + d.servicio, '', '¿Me ayudan con el precio? ¡Gracias!'].join('\n');
      window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank');
    });
  }

  /* Año */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
