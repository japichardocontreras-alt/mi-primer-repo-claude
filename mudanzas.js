/* ============================================================
   MUDANZAS METEPEC · mudanzas.js (v8)
   - Funcionalidad comercial SIEMPRE activa (nav, form, WhatsApp).
   - Animación cinematográfica con GSAP como capa de mejora.
   - Degradación elegante: sin GSAP / reduced-motion -> legible y usable.
   - Arquitectura lista para conectar con la plataforma interna.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- CONFIG (único lugar a tocar para integraciones) ---------- */
  var CONFIG = {
    whatsapp: '527228300083',
    // Plataforma interna de cotización (Fase 1+). Cuando exista el endpoint,
    // coloca la URL aquí y los leads se guardarán además de abrir WhatsApp.
    leadsEndpoint: null, // p.ej. 'https://api.mudanzasmetepec.com/cotizaciones'
    source: 'web'
  };

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ========================================================
     UI · navegación, header, progreso, capítulo, año
     ======================================================== */
  var UI = {
    init: function () {
      this.nav();
      this.year();
      this.scroll();
      window.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
      this.onScroll();
    },
    nav: function () {
      var toggle = document.getElementById('navToggle');
      var nav = document.getElementById('nav');
      if (!toggle || !nav) return;
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        // En móvil el menú aparece como overlay simple
        nav.style.display = open ? 'flex' : '';
      });
      nav.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          nav.classList.remove('open'); nav.style.display = '';
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    },
    year: function () {
      var y = document.getElementById('year');
      if (y) y.textContent = new Date().getFullYear();
    },
    scroll: function () {
      this.header = document.getElementById('header');
      this.bar = document.getElementById('progressBar');
      this.chapterEl = document.getElementById('chapter');
      this.scenes = Array.prototype.slice.call(document.querySelectorAll('.scene[data-chapter]'));
      this.ticking = false;
    },
    onScroll: function () {
      if (this.ticking) return;
      this.ticking = true;
      var self = this;
      requestAnimationFrame(function () {
        self.ticking = false;
        var doc = document.documentElement;
        var y = window.scrollY || 0;
        var max = (doc.scrollHeight - doc.clientHeight) || 1;
        if (self.header) self.header.classList.toggle('scrolled', y > 8);
        if (self.bar) self.bar.style.width = Math.min(100, (y / max) * 100) + '%';
        if (self.chapterEl && self.scenes.length) {
          var mid = y + window.innerHeight * 0.5, name = self.scenes[0].getAttribute('data-chapter');
          for (var i = 0; i < self.scenes.length; i++) {
            if (self.scenes[i].offsetTop <= mid) name = self.scenes[i].getAttribute('data-chapter');
          }
          if (self.chapterEl.textContent !== name) self.chapterEl.textContent = name;
        }
      });
    }
  };

  /* ========================================================
     CONTADORES
     ======================================================== */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    var start = null, dur = 1300;
    (function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target);
      if (p < 1) requestAnimationFrame(step); else el.textContent = target;
    })(performance.now());
  }
  function countersViaIO() {
    var counters = document.querySelectorAll('.stat__num[data-count]');
    if (!('IntersectionObserver' in window)) { counters.forEach(animateCount); return; }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCount(en.target); obs.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* ========================================================
     FORMULARIO · cotizador
     1) Construye el mensaje y abre WhatsApp (conversión inmediata).
     2) Envía el lead a la plataforma interna si hay endpoint (Fase 1+).
     ======================================================== */
  var Quote = {
    init: function () {
      this.form = document.getElementById('quoteForm');
      if (!this.form) return;
      this.form.addEventListener('submit', this.onSubmit.bind(this));
    },
    data: function () {
      var g = function (id) { var el = document.getElementById(id); return el && el.value ? el.value.trim() : ''; };
      return {
        nombre: g('nombre'), telefono: g('telefono'), origen: g('origen'),
        destino: g('destino'), fecha: g('fecha'), servicio: g('servicio'),
        descripcion: g('descripcion'), source: CONFIG.source, createdAt: new Date().toISOString()
      };
    },
    message: function (d) {
      var l = ['¡Hola Mudanzas Metepec! Quiero solicitar una cotización 🚚', '',
        '👤 Nombre: ' + d.nombre, '📞 Teléfono: ' + d.telefono,
        '📍 Origen: ' + d.origen, '🎯 Destino: ' + d.destino];
      if (d.fecha) l.push('📅 Fecha tentativa: ' + d.fecha);
      l.push('📦 Servicio: ' + d.servicio);
      if (d.descripcion) l.push('📝 Detalles: ' + d.descripcion);
      l.push('', '¿Me pueden ayudar con el precio? ¡Gracias!');
      return l.join('\n');
    },
    // Stub listo para la plataforma interna. No bloquea la conversión.
    saveLead: function (d) {
      if (!CONFIG.leadsEndpoint) return; // Fase 0: aún sin backend
      try {
        fetch(CONFIG.leadsEndpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(d), keepalive: true
        }).catch(function () {/* silencioso: nunca romper la conversión */});
      } catch (e) {/* noop */}
    },
    onSubmit: function (e) {
      e.preventDefault();
      if (!this.form.checkValidity()) { this.form.reportValidity(); return; }
      var d = this.data();
      this.saveLead(d); // 2) plataforma interna (si está configurada)
      window.open('https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(this.message(d)), '_blank'); // 1) WhatsApp
    }
  };

  /* ========================================================
     MOTION · GSAP + ScrollTrigger (capa de mejora)
     ======================================================== */
  function initMotion() {
    var gsap = window.gsap;
    if (!gsap || !window.ScrollTrigger || reduce) { countersViaIO(); return; }
    gsap.registerPlugin(window.ScrollTrigger);
    document.body.classList.add('anim');

    // Reveals genéricos por escena
    gsap.utils.toArray('.scene').forEach(function (scene) {
      var items = scene.querySelectorAll('[data-reveal]');
      if (!items.length) return;
      gsap.to(items, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: scene, start: 'top 78%' }
      });
    });

    // Contadores
    gsap.utils.toArray('.stat__num[data-count]').forEach(function (c) {
      window.ScrollTrigger.create({ trigger: c, start: 'top 88%', once: true, onEnter: function () { animateCount(c); } });
    });

    // Mapa: rutas que se trazan + nodos que se encienden
    gsap.utils.toArray('#map .route').forEach(function (path) {
      var len = path.getTotalLength ? path.getTotalLength() : 300;
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, { strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: '#cobertura', start: 'top 65%', end: 'bottom 75%', scrub: true } });
    });
    gsap.from('#map .node', { opacity: 0, scale: 0, transformOrigin: 'center', stagger: 0.07, duration: 0.4, ease: 'back.out(2)',
      scrollTrigger: { trigger: '#cobertura', start: 'top 60%' } });

    // Servicios y proceso: stagger de tarjetas
    ['.services__grid .service', '.process__track .pstep'].forEach(function (sel) {
      gsap.from(sel, { opacity: 0, y: 36, stagger: 0.1, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: sel, start: 'top 82%' } });
    });

    // Animaciones específicas de desktop (media fija + image-swap)
    var mm = gsap.matchMedia();
    mm.add('(min-width: 992px)', function () {
      var steps = gsap.utils.toArray('.care__step');
      var slides = document.querySelectorAll('.care__slide');
      steps.forEach(function (step) {
        var i = parseInt(step.getAttribute('data-step'), 10);
        window.ScrollTrigger.create({
          trigger: step, start: 'top 60%', end: 'bottom 60%',
          onToggle: function (self) {
            if (!self.isActive) return;
            steps.forEach(function (s) { s.classList.remove('is-active'); });
            step.classList.add('is-active');
            slides.forEach(function (sl) { sl.classList.toggle('is-active', parseInt(sl.getAttribute('data-slide'), 10) === i); });
          }
        });
      });
    });

    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  }

  /* ========================================================
     ARRANQUE
     ======================================================== */
  function start() {
    UI.init();
    Quote.init();
    initMotion();
  }
  if (document.readyState !== 'loading') start();
  else window.addEventListener('DOMContentLoaded', start);
})();
