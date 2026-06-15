/* =========================================================
   EL ARTE DE MUDARTE · experiencia.js
   - GSAP ScrollTrigger: storytelling sincronizado al scroll
   - Three.js: camión 3D (momento héroe)
   - Degradación elegante: sin librerías / reduced-motion -> estático y legible
   ========================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);

  /* ---------- Progreso + capítulo (siempre, sin dependencias) ---------- */
  var bar = document.getElementById('expBar');
  var chapterEl = document.getElementById('expChapter');
  var acts = Array.prototype.slice.call(document.querySelectorAll('.act[data-chapter]'));
  var pTick = false;

  function onScroll() {
    pTick = false;
    var doc = document.documentElement;
    var max = (doc.scrollHeight - doc.clientHeight) || 1;
    var y = window.scrollY || window.pageYOffset || 0;
    if (bar) bar.style.width = Math.min(100, (y / max) * 100) + '%';

    if (chapterEl) {
      var mid = y + window.innerHeight * 0.5, name = acts.length ? acts[0].getAttribute('data-chapter') : '';
      for (var i = 0; i < acts.length; i++) {
        if (acts[i].offsetTop <= mid) name = acts[i].getAttribute('data-chapter');
      }
      if (chapterEl.textContent !== name) chapterEl.textContent = name;
    }
  }
  function reqScroll() { if (!pTick) { pTick = true; requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', reqScroll, { passive: true });
  window.addEventListener('resize', reqScroll, { passive: true });
  onScroll();

  /* ---------- Three.js · camión 3D (independiente de GSAP) ---------- */
  var truckProgress = 0; // 0..1, lo alimenta GSAP en el acto 3
  function initThree() {
    if (!window.THREE) return; // fallback SVG queda visible
    var mount = document.getElementById('threeMount');
    if (!mount) return;

    var THREE = window.THREE;
    var w = mount.clientWidth || window.innerWidth;
    var h = mount.clientHeight || window.innerHeight;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(5.2, 2.6, 6.4);
    camera.lookAt(0, 0.4, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(5, 8, 6); scene.add(key);
    var warm = new THREE.PointLight(0xff7a1a, 0.8, 40); warm.position.set(-6, 3, 4); scene.add(warm);

    // Materiales de marca
    var matWhite = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, metalness: 0.1, roughness: 0.55 });
    var matRed = new THREE.MeshStandardMaterial({ color: 0xe11414, metalness: 0.15, roughness: 0.5 });
    var matDark = new THREE.MeshStandardMaterial({ color: 0x15171b, metalness: 0.3, roughness: 0.6 });
    var matGlass = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, metalness: 0.2, roughness: 0.2 });

    var truck = new THREE.Group();

    // Caja de carga
    var box = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 2.0), matWhite);
    box.position.set(-0.6, 1.1, 0); truck.add(box);
    // Franja roja
    var stripe = new THREE.Mesh(new THREE.BoxGeometry(3.42, 0.34, 2.02), matRed);
    stripe.position.set(-0.6, 0.7, 0); truck.add(stripe);
    // Cabina
    var cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 2.0), matRed);
    cab.position.set(1.7, 0.85, 0); truck.add(cab);
    // Parabrisas
    var glass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 1.7), matGlass);
    glass.position.set(2.46, 1.05, 0); truck.add(glass);
    // Chasis
    var chassis = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.3, 1.9), matDark);
    chassis.position.set(0.1, 0.2, 0); truck.add(chassis);

    // Ruedas
    var wheels = [];
    var wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 22);
    [[-1.6, 1.05], [-1.6, -1.05], [1.6, 1.05], [1.6, -1.05]].forEach(function (p) {
      var wheel = new THREE.Mesh(wheelGeo, matDark);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(p[0], 0.05, p[1]);
      truck.add(wheel); wheels.push(wheel);
    });

    truck.position.y = -0.2;
    scene.add(truck);

    document.body.classList.add('three-ready');

    var curRot = -0.5;
    function resize() {
      w = mount.clientWidth || window.innerWidth; h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    }
    window.addEventListener('resize', resize, { passive: true });

    function loop() {
      // El camión gira de 3/4 a perfil y "avanza" con el progreso del acto
      var targetRot = -0.5 + truckProgress * 1.1;
      curRot += (targetRot - curRot) * 0.08;
      truck.rotation.y = curRot;
      truck.position.x = -1.5 + truckProgress * 3.0;
      var spin = (reduce ? 0.02 : 0.12) + truckProgress * 0.4;
      for (var i = 0; i < wheels.length; i++) wheels[i].rotation.y += spin * 0.2;
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    }
    loop();
  }

  /* ---------- GSAP storytelling ---------- */
  function initGSAP() {
    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    document.body.classList.add('gsap-ready');

    var EASE = 'power2.out';

    // ACTO 0 · parallax sutil del hogar
    gsap.to('.act--hero .home', {
      yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: '#acto-0', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.act--hero .dust', {
      yPercent: -20, ease: 'none',
      scrollTrigger: { trigger: '#acto-0', start: 'top top', end: 'bottom top', scrub: true }
    });

    // Helper de copy
    function copyIn(tl, sel) {
      tl.from(sel, { opacity: 0, y: 40, duration: 0.5, ease: EASE }, 0);
    }

    // ACTO 1 · El embalaje
    var t1 = gsap.timeline({ scrollTrigger: { trigger: '#acto-1', start: 'top top', end: '+=120%', scrub: true, pin: '#acto-1 .scene' } });
    copyIn(t1, '#acto-1 .scene__copy');
    t1.from('#acto-1 [data-anim="sofa"]', { opacity: 0, y: 30, duration: 0.4 }, 0.1)
      .from('#acto-1 [data-anim="box"]', { opacity: 0, y: -60, stagger: 0.12, duration: 0.4 }, 0.2)
      .fromTo('#acto-1 [data-anim="wrap"]', { opacity: 0, scaleY: 0, transformOrigin: 'top center' }, { opacity: 0.18, scaleY: 1, duration: 0.5 }, 0.6);

    // ACTO 2 · La carga
    var t2 = gsap.timeline({ scrollTrigger: { trigger: '#acto-2', start: 'top top', end: '+=120%', scrub: true, pin: '#acto-2 .scene' } });
    copyIn(t2, '#acto-2 .scene__copy');
    t2.from('#acto-2 [data-anim="truckbox"]', { opacity: 0, x: -80, duration: 0.5 }, 0.05)
      .from('#acto-2 [data-anim="loadbox"]', { opacity: 0, x: 120, y: -20, stagger: 0.15, duration: 0.5 }, 0.3);

    // ACTO 3 · El protagonista (alimenta Three.js)
    var t3 = gsap.timeline({ scrollTrigger: {
      trigger: '#acto-3', start: 'top top', end: '+=150%', scrub: true, pin: '#acto-3 .scene',
      onUpdate: function (self) { truckProgress = self.progress; }
    } });
    copyIn(t3, '#acto-3 .truck-copy');
    t3.from('#acto-3 .truck-fallback', { opacity: 0, duration: 0.4 }, 0);

    // ACTO 4 · Cobertura (rutas + nodos)
    gsap.utils.toArray('#acto-4 .route').forEach(function (path) {
      var len = path.getTotalLength ? path.getTotalLength() : 300;
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
    });
    var t4 = gsap.timeline({ scrollTrigger: { trigger: '#acto-4', start: 'top top', end: '+=160%', scrub: true, pin: '#acto-4 .scene' } });
    copyIn(t4, '#acto-4 .scene__copy');
    t4.to('#acto-4 .route', { strokeDashoffset: 0, stagger: 0.12, duration: 0.6, ease: 'none' }, 0.1)
      .from('#acto-4 .node', { opacity: 0, scale: 0, transformOrigin: 'center', stagger: 0.08, duration: 0.4, ease: 'back.out(2)' }, 0.25);

    // ACTO 5 · Nuevo hogar
    var t5 = gsap.timeline({ scrollTrigger: { trigger: '#acto-5', start: 'top top', end: '+=120%', scrub: true, pin: '#acto-5 .scene' } });
    copyIn(t5, '#acto-5 .scene__copy');
    t5.from('#acto-5 [data-anim="newhome"]', { opacity: 0, scale: 0.9, transformOrigin: 'center bottom', duration: 0.5 }, 0.05)
      .from('#acto-5 [data-anim="door"]', { opacity: 0, y: 30, duration: 0.4 }, 0.4)
      .fromTo('#acto-5 [data-anim="warm"]', { opacity: 0 }, { opacity: 1, stagger: 0.1, duration: 0.5 }, 0.55);

    // CIERRE · confianza
    gsap.from('#cierre .stat', { opacity: 0, y: 30, stagger: 0.12, duration: 0.5, ease: EASE,
      scrollTrigger: { trigger: '#cierre', start: 'top 70%' } });
    gsap.from('#cierre .quotes figure', { opacity: 0, y: 30, stagger: 0.15, duration: 0.5, ease: EASE,
      scrollTrigger: { trigger: '.quotes', start: 'top 80%' } });

    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  }

  /* ---------- Arranque ---------- */
  function start() {
    initThree();
    if (hasGSAP && !reduce) {
      try { initGSAP(); }
      catch (e) { document.body.classList.remove('gsap-ready'); }
    }
    // Si no hay GSAP o reduce: no se añade 'gsap-ready' -> CSS deja todo visible.
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(start, 0);
  } else {
    window.addEventListener('DOMContentLoaded', start);
  }
})();
