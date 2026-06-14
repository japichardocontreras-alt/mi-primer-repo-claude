/* =========================================================
   MUDANZAS METEPEC · script.js
   - Menú móvil
   - Header con sombra al hacer scroll
   - Formulario que abre WhatsApp con mensaje prellenado
   - Contadores animados
   - Animaciones de aparición (reveal)
   - Año dinámico en footer
   ========================================================= */
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '527228300083';

  /* ---------- Menú móvil ---------- */
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });

    // Cerrar el menú al hacer clic en un enlace
    nav.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Header con sombra + barra de progreso al hacer scroll ---------- */
  var header = document.getElementById('header');
  var progress = document.getElementById('scrollProgress');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;

    if (header) {
      if (y > 10) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    }

    if (progress) {
      var doc = document.documentElement;
      var max = (doc.scrollHeight - doc.clientHeight) || 1;
      var pct = Math.min(100, (y / max) * 100);
      progress.style.width = pct + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------- Formulario → WhatsApp prellenado ---------- */
  var form = document.getElementById('quoteForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var get = function (id) {
        var el = document.getElementById(id);
        return el && el.value ? el.value.trim() : '';
      };

      var nombre = get('nombre');
      var telefono = get('telefono');
      var origen = get('origen');
      var destino = get('destino');
      var fecha = get('fecha');
      var servicio = get('servicio');
      var descripcion = get('descripcion');

      var lineas = [
        '¡Hola Mudanzas Metepec! Quiero solicitar una cotización 🚚',
        '',
        '👤 Nombre: ' + nombre,
        '📞 Teléfono: ' + telefono,
        '📍 Origen: ' + origen,
        '🎯 Destino: ' + destino
      ];
      if (fecha) lineas.push('📅 Fecha tentativa: ' + fecha);
      lineas.push('📦 Servicio: ' + servicio);
      if (descripcion) lineas.push('📝 Detalles: ' + descripcion);
      lineas.push('', '¿Me pueden ayudar con el precio? ¡Gracias!');

      var mensaje = encodeURIComponent(lineas.join('\n'));
      var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + mensaje;

      window.open(url, '_blank');
    });
  }

  /* ---------- Contadores animados ---------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    var duration = 1400;
    var start = null;

    function tick(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      // easeOutQuad
      var eased = 1 - (1 - progress) * (1 - progress);
      el.textContent = Math.floor(eased * target).toString();
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toString();
    }
    requestAnimationFrame(tick);
  }

  /* ---------- IntersectionObserver: reveal + contadores ---------- */
  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Marcar secciones para animar
  var revealEls = document.querySelectorAll(
    '.section-head, .service-card, .ps-card, .tailored-card, .tailored__cta, .step, ' +
    '.review, .gallery__item, .badge-item, .coverage__chip, ' +
    '.security__content, .security__highlight, .quote__intro, .quote-form'
  );
  revealEls.forEach(function (el) { el.classList.add('reveal'); });

  if ('IntersectionObserver' in window && !prefersReduced) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // Stagger: retraso según la posición del elemento entre sus hermanos
          var parent = entry.target.parentElement;
          var idx = 0;
          if (parent) {
            var sibs = parent.children;
            for (var i = 0; i < sibs.length; i++) {
              if (sibs[i] === entry.target) { idx = i; break; }
            }
          }
          var delay = Math.min(idx % 6, 5) * 80; // máx 400ms, se reinicia por grupo
          entry.target.style.transitionDelay = delay + 'ms';
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { io.observe(el); });

    // Contadores
    var counterObserved = false;
    var trustbar = document.querySelector('.trustbar');
    if (trustbar) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !counterObserved) {
            counterObserved = true;
            document.querySelectorAll('.trust__num[data-count]').forEach(animateCount);
          }
        });
      }, { threshold: 0.4 });
      io2.observe(trustbar);
    }
  } else {
    // Sin animación: mostrar todo y fijar números
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    document.querySelectorAll('.trust__num[data-count]').forEach(function (el) {
      el.textContent = el.getAttribute('data-count');
    });
  }

  /* ---------- Parallax ligero (capas del hero) ---------- */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var parallaxActive = parallaxEls.length > 0 && !prefersReduced && window.innerWidth > 760;
  var ticking = false;

  function applyParallax() {
    var y = window.scrollY || window.pageYOffset;
    // Solo vale la pena mientras el hero está a la vista
    if (y < window.innerHeight) {
      for (var i = 0; i < parallaxEls.length; i++) {
        var el = parallaxEls[i];
        var factor = parseFloat(el.getAttribute('data-parallax')) || 0;
        el.style.transform = 'translate3d(0,' + (y * factor).toFixed(1) + 'px,0)';
      }
    }
    ticking = false;
  }
  function requestParallax() {
    if (!ticking) { ticking = true; requestAnimationFrame(applyParallax); }
  }
  if (parallaxActive) {
    window.addEventListener('scroll', requestParallax, { passive: true });
    applyParallax();
  }

  /* ---------- Scroll storytelling: "El viaje de tu mudanza" ---------- */
  var journey = document.getElementById('viaje');
  if (journey && !prefersReduced) {
    journey.classList.add('is-interactive');

    var jTrack   = journey.querySelector('.journey__track');
    var jView    = journey.querySelector('.journey__viewport');
    var jTruck   = document.getElementById('jrTruck');
    var jRoute   = document.getElementById('jrRoute');
    var jBoxes   = Array.prototype.slice.call(document.querySelectorAll('#jrBoxes .jr-box'));
    var jCityWin = document.getElementById('jrCityWin');
    var jDest    = document.getElementById('jrDest');
    var jArrive  = document.getElementById('jrArrive');
    var jCaps    = Array.prototype.slice.call(journey.querySelectorAll('.jr-cap'));
    var jDots    = Array.prototype.slice.call(journey.querySelectorAll('.journey__dots li'));

    var TRUCK_START = 130, TRUCK_END = 880, ROAD_Y = 408;
    var routeLen = (jRoute && jRoute.getTotalLength) ? jRoute.getTotalLength() : 900;
    jRoute.style.strokeDasharray = routeLen;
    jRoute.style.strokeDashoffset = routeLen;

    var jInView = false, jTicking = false;

    function jClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function jSS(a, b, x) { var t = jClamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

    function renderJourney() {
      jTicking = false;
      var rect = jTrack.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var p = jClamp((-rect.top) / (total || 1), 0, 1);

      // El camión avanza por la carretera
      var x = TRUCK_START + (TRUCK_END - TRUCK_START) * p;
      jTruck.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + ROAD_Y + ')');

      // La ruta se dibuja sola
      jRoute.style.strokeDashoffset = (routeLen * (1 - jSS(0.02, 0.9, p))).toFixed(1);

      // Cajas: aparecen y luego "se cargan" (se desvanecen)
      var appear = jSS(0.04, 0.18, p);
      var bOp = appear * (1 - jSS(0.20, 0.30, p));
      for (var i = 0; i < jBoxes.length; i++) {
        jBoxes[i].style.opacity = bOp.toFixed(2);
        jBoxes[i].style.transform = 'translateY(' + ((1 - appear) * 12).toFixed(1) + 'px)';
      }

      // La ciudad enciende sus ventanas
      jCityWin.style.opacity = jSS(0.40, 0.66, p).toFixed(2);
      // El destino se ilumina
      jDest.style.opacity = (0.35 + 0.65 * jSS(0.70, 0.92, p)).toFixed(2);
      // Llegada: estrellas del cliente satisfecho
      jArrive.style.opacity = jSS(0.85, 0.99, p).toFixed(2);

      // Leyenda y progreso (6 etapas)
      var step = jClamp(Math.floor(p * 6), 0, 5);
      for (var c = 0; c < jCaps.length; c++) jCaps[c].classList.toggle('is-active', c === step);
      for (var d = 0; d < jDots.length; d++) jDots[d].classList.toggle('is-active', d === step);
      jView.style.setProperty('--jr-progress', (p * 100).toFixed(1) + '%');
    }
    function reqJourney() { if (!jTicking && jInView) { jTicking = true; requestAnimationFrame(renderJourney); } }

    if ('IntersectionObserver' in window) {
      var jio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { jInView = e.isIntersecting; if (jInView) reqJourney(); });
      }, { threshold: 0 });
      jio.observe(journey);
    } else {
      jInView = true;
    }

    window.addEventListener('scroll', reqJourney, { passive: true });
    window.addEventListener('resize', function () {
      routeLen = (jRoute.getTotalLength) ? jRoute.getTotalLength() : routeLen;
      jRoute.style.strokeDasharray = routeLen;
      jInView = true; reqJourney();
    }, { passive: true });
    renderJourney();
  }

  /* ---------- Año dinámico ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
