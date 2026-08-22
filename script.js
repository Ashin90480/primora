/* =========================================================
   PRIMORA 26 — animation system
   Preloader -> letter reveal -> scroll-triggered choreography ->
   custom cursor -> magnetic buttons -> 3D tilt -> marquee -> counters
   ========================================================= */

const gsapReady = typeof gsap !== 'undefined';
if (gsapReady && typeof ScrollTrigger !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.body.classList.add('loading');

/* =========================================================
   0. PRELOADER
   ========================================================= */
function runPreloader(onDone) {
  const preloader = document.getElementById('preloader');
  const fill = document.getElementById('preloaderFill');
  const pct = document.getElementById('preloaderPct');

  if (!preloader) { onDone(); return; }
  if (prefersReducedMotion) {
    preloader.style.display = 'none';
    onDone();
    return;
  }

  let progress = 0;
  const duration = 1400; // ms
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    progress = Math.min(100, Math.round((elapsed / duration) * 100));
    if (fill) fill.style.width = progress + '%';
    if (pct) pct.textContent = progress + '%';

    if (progress < 100) {
      requestAnimationFrame(tick);
    } else {
      finish();
    }
  }

  function finish() {
    if (gsapReady) {
      gsap.to(preloader, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
        delay: 0.15,
        onComplete: () => {
          preloader.style.display = 'none';
          onDone();
        }
      });
    } else {
      preloader.style.transition = 'opacity .5s ease';
      preloader.style.opacity = '0';
      setTimeout(() => { preloader.style.display = 'none'; onDone(); }, 500);
    }
  }

  requestAnimationFrame(tick);
}

/* =========================================================
   1. SPLIT TEXT INTO CHARACTER SPANS
   ========================================================= */
function splitChars(el) {
  const text = el.textContent;
  el.setAttribute('data-glitch-text', text);
  el.innerHTML = '';
  [...text].forEach(ch => {
    const span = document.createElement('span');
    span.className = 'split-char';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    el.appendChild(span);
  });
  return el.querySelectorAll('.split-char');
}

/* hero title needs to preserve its inner markup (colored O, year badge) --
   split only its text nodes / child element text into character spans */
function splitHeroTitle(el) {
  const walker = [];
  Array.from(el.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      [...node.textContent].forEach(ch => {
        const span = document.createElement('span');
        span.className = 'split-char';
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        frag.appendChild(span);
        walker.push(span);
      });
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const color = getComputedStyle(node).color;
      const frag = document.createDocumentFragment();
      [...node.textContent].forEach(ch => {
        const span = document.createElement('span');
        span.className = 'split-char';
        span.style.color = color;
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        frag.appendChild(span);
        walker.push(span);
      });
      node.replaceWith(frag);
    }
  });
  return walker;
}

/* =========================================================
   2. INTRO SEQUENCE (hero, on load)
   ========================================================= */
function playIntro() {
  document.body.classList.remove('loading');

  const signal = document.getElementById('signalHousing');
  const heroTitleEl = document.getElementById('heroTitle');
  const eyebrows = document.querySelectorAll('.hero-eyebrows .eyebrow');
  const revealFades = document.querySelectorAll('.hero .reveal-fade');

  if (!gsapReady || prefersReducedMotion) {
    document.querySelectorAll('.reveal-fade, .reveal-up, .reveal-node').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  const chars = heroTitleEl ? splitHeroTitle(heroTitleEl) : [];
  gsap.set(chars, { yPercent: 120, opacity: 0 });
  gsap.set(signal, { opacity: 0, y: -30, scale: 0.85 });
  gsap.set(eyebrows, { opacity: 0, y: -10 });

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.to(eyebrows, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 })
    .to(signal, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'back.out(1.4)' }, '-=0.3')
    .to(chars, {
      yPercent: 0,
      opacity: 1,
      duration: 0.8,
      stagger: 0.025,
      ease: 'power4.out'
    }, '-=0.5');

  revealFades.forEach(el => {
    const delay = parseFloat(el.getAttribute('data-reveal-delay')) || 0;
    tl.to(el, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, `-=${0.5 - delay * 0.4}`);
  });

  // subtle periodic glitch flicker on hero title
  const glitchTarget = document.querySelector('[data-glitch]');
  if (glitchTarget) {
    setInterval(() => {
      glitchTarget.classList.add('glitching');
      setTimeout(() => glitchTarget.classList.remove('glitching'), 160);
    }, 4200);
  }
}

/* =========================================================
   3. SCROLL-TRIGGERED REVEALS
   ========================================================= */
function initScrollReveals() {
  if (!gsapReady || prefersReducedMotion) return;

  // generic fade/slide-up blocks
  gsap.utils.toArray('.reveal-up').forEach(el => {
    const delay = parseFloat(el.getAttribute('data-reveal-delay')) || 0;
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay,
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
    });
  });

  // staggered highlight timeline nodes
  gsap.to('.reveal-node', {
    opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.15,
    scrollTrigger: { trigger: '.highlight-track', start: 'top 78%', toggleActions: 'play none none reverse' }
  });

  // section title letter-in on scroll
  document.querySelectorAll('[data-split]').forEach(el => {
    const chars = splitChars(el);
    gsap.set(chars, { yPercent: 100, opacity: 0 });
    gsap.to(chars, {
      yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.02, ease: 'power4.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' }
    });
  });

  // hero parallax drift on the signal housing while scrolling away
  gsap.to('#signalHousing', {
    y: 80,
    opacity: 0.4,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  // scroll progress bar
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    gsap.to(progressBar, {
      width: '100%',
      ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 }
    });
  }
}

/* =========================================================
   4. ANIMATED COUNTERS (stat numbers)
   ========================================================= */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  counters.forEach(el => {
    const target = parseInt(el.getAttribute('data-count'), 10);
    const run = () => {
      const obj = { val: 0 };
      if (gsapReady && !prefersReducedMotion) {
        gsap.to(obj, {
          val: target, duration: 1.2, ease: 'power2.out',
          onUpdate: () => { el.textContent = String(Math.round(obj.val)).padStart(2, '0'); }
        });
      } else {
        el.textContent = String(target).padStart(2, '0');
      }
    };
    if (gsapReady && typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: run });
    } else {
      run();
    }
  });
}

/* =========================================================
   5. CUSTOM CURSOR
   ========================================================= */
function initCursor() {
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  let ringX = mouseX, ringY = mouseY;

  window.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.left = mouseX + 'px';
    dot.style.top = mouseY + 'px';
  });

  function loop() {
    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';
    requestAnimationFrame(loop);
  }
  loop();

  const interactiveSelector = 'a, button, [data-magnetic], .pill-chip, mark';
  document.querySelectorAll(interactiveSelector).forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('is-active'));
    el.addEventListener('mouseleave', () => ring.classList.remove('is-active'));
  });
}

/* =========================================================
   6. MAGNETIC BUTTONS
   ========================================================= */
function initMagnetic() {
  if (!gsapReady || prefersReducedMotion) return;
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

  document.querySelectorAll('[data-magnetic]').forEach(el => {
    const strength = 0.35;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });

    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;
      xTo(relX * strength);
      yTo(relY * strength);
    });
    el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
  });
}

/* =========================================================
   7. 3D TILT (about card, ticket)
   ========================================================= */
function initTilt() {
  if (!gsapReady || prefersReducedMotion) return;
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

  document.querySelectorAll('[data-tilt]').forEach(el => {
    const rotX = gsap.quickTo(el, 'rotateX', { duration: 0.6, ease: 'power3.out' });
    const rotY = gsap.quickTo(el, 'rotateY', { duration: 0.6, ease: 'power3.out' });
    const maxTilt = 6;

    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      rotY((px - 0.5) * maxTilt * 2);
      rotX(-(py - 0.5) * maxTilt * 2);
    });
    el.addEventListener('mouseleave', () => { rotX(0); rotY(0); });
  });
}

/* =========================================================
   8. NAV: mobile toggle + active link on scroll
   ========================================================= */
function initNav() {
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('main-nav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.main-nav a');
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(section => observer.observe(section));
}

/* =========================================================
   9. TICKET STUB ID + NOTIFY INTERACTION
   ========================================================= */
function initTicket() {
  function generatePassCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 2; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return `PASS-${code}-RAS`;
  }
  function generateStubId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return `TKT-PRIMORA-${code}`;
  }

  const barcodeLabel = document.getElementById('stubId');
  if (barcodeLabel) barcodeLabel.textContent = generatePassCode();

  const ticketStubEl = document.getElementById('ticketStubId');
  if (ticketStubEl) ticketStubEl.textContent = generateStubId();

  const notifyBtn = document.getElementById('notifyBtn');
  const formNote = document.getElementById('formNote');
  if (notifyBtn && formNote) {
    notifyBtn.addEventListener('click', () => {
      notifyBtn.disabled = true;
      notifyBtn.textContent = 'On the list';
      formNote.textContent = "Registrations aren't live yet -- we'll flip the signal green the moment they open.";
      if (gsapReady) {
        gsap.fromTo(formNote, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
      }
    });
  }
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initTicket();
  initCursor();

  runPreloader(() => {
    playIntro();
    initScrollReveals();
    initCounters();
    initMagnetic();
    initTilt();
    if (gsapReady && typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  });
});