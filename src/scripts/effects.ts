/**
 * Effets visuels globaux, indépendants d'Alpine (curseur custom, particules
 * canvas, reveal au scroll). Repris à l'identique du portfolio d'origine et
 * factorisés ici pour être partagés entre les pages.
 */

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let revealObserver: IntersectionObserver | null = null;

function initScrollReveal() {
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    { threshold: 0.1 },
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObserver!.observe(el));
}

/** Ré-observe les éléments .reveal (utile après un changement de vue SPA). */
export function refreshReveal() {
  if (prefersReducedMotion) return;
  document.querySelectorAll(".reveal").forEach((el) => {
    el.classList.remove("visible");
  });
  window.setTimeout(() => {
    document.querySelectorAll(".reveal").forEach((el) => revealObserver?.observe(el));
  }, 100);
}

function initCustomCursor() {
  // Inutile sur écran tactile : on rétablit alors le curseur système
  // (le body est en `cursor: none`) pour ne jamais laisser l'utilisateur sans.
  if (window.matchMedia && !window.matchMedia("(pointer: fine)").matches) {
    document.body.style.cursor = "auto";
    return;
  }

  const dot = document.querySelector<HTMLElement>(".cursor-dot");
  const outline = document.querySelector<HTMLElement>(".cursor-outline");
  if (!dot || !outline) {
    document.body.style.cursor = "auto";
    return;
  }

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let ox = mx;
  let oy = my;

  // Le point suit instantanément (pas de transition CSS = pas de latence) ;
  // le cercle suit avec un léger lissage (lerp) pour l'effet de traîne.
  window.addEventListener(
    "pointermove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = `translate3d(${mx - 4}px, ${my - 4}px, 0)`;
    },
    { passive: true },
  );

  const loop = () => {
    ox += (mx - ox) * 0.2;
    oy += (my - oy) * 0.2;
    outline.style.transform = `translate3d(${ox - 20}px, ${oy - 20}px, 0)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // Délégation d'événements : couvre aussi les éléments ajoutés dynamiquement.
  document.addEventListener("mouseover", (e) => {
    if ((e.target as Element)?.closest("a, button, .card-hover, input, textarea")) {
      outline.classList.add("hovered");
    }
  });
  document.addEventListener("mouseout", (e) => {
    if ((e.target as Element)?.closest("a, button, .card-hover, input, textarea")) {
      outline.classList.remove("hovered");
    }
  });
}

function initParticles() {
  const canvas = document.getElementById("particle-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
  const mouse = { x: null as number | null, y: null as number | null, radius: 150 };

  // Couleurs lues depuis la palette CSS (suivent le choix du visiteur).
  let cyan = "0,240,255";
  let purple = "188,19,254";
  const readPalette = () => {
    const cs = getComputedStyle(document.documentElement);
    const c = cs.getPropertyValue("--neon-cyan").trim();
    const p = cs.getPropertyValue("--neon-purple").trim();
    if (c) cyan = c.replace(/\s+/g, ",");
    if (p) purple = p.replace(/\s+/g, ",");
  };
  readPalette();
  window.addEventListener("palette-change", readPalette);

  const createParticles = () => {
    particles = [];
    // Densité réduite + plafond : évite une boucle O(n²) trop lourde sur
    // grands écrans (le coût des connexions explose avec le nombre).
    const count = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 22000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.5,
      });
    }
  };

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  createParticles();

  let resizeTimer: number | undefined;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createParticles();
    }, 150);
  });
  window.addEventListener(
    "mousemove",
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    },
    { passive: true },
  );

  let rafId = 0;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(${cyan}, 0.4)`;
    particles.forEach((p1, index) => {
      p1.x += p1.vx;
      p1.y += p1.vy;
      if (p1.x < 0 || p1.x > canvas.width) p1.vx *= -1;
      if (p1.y < 0 || p1.y > canvas.height) p1.vy *= -1;

      ctx.beginPath();
      ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
      ctx.fill();

      for (let j = index + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.strokeStyle = `rgba(${cyan}, ${0.1 + (1 - dist / 100) * 0.2})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      if (mouse.x !== null && mouse.y !== null) {
        const dx = p1.x - mouse.x;
        const dy = p1.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          ctx.strokeStyle = `rgba(${purple}, ${(1 - dist / mouse.radius) * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    });
    rafId = requestAnimationFrame(animate);
  };
  animate();

  // Met l'animation en pause quand l'onglet n'est pas visible (CPU/batterie).
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(animate);
    }
  });
}

function initCounters() {
  const els = document.querySelectorAll<HTMLElement>("[data-count-to]");
  if (!els.length) return;
  const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
  const run = (el: HTMLElement) => {
    const target = Number(el.dataset.countTo || "0");
    const prefix = el.dataset.countPrefix || "";
    const suffix = el.dataset.countSuffix || "";
    const duration = 1200;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const value = Math.round(ease(p) * target);
      el.textContent = `${prefix}${value}${suffix}`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          run(entry.target as HTMLElement);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 },
  );
  els.forEach((el) => obs.observe(el));
}

export function initEffects() {
  initScrollReveal();
  if (prefersReducedMotion) return; // valeurs finales déjà affichées, pas d'anim
  initCounters();
  initCustomCursor();
  initParticles();
}

// Auto-init au chargement.
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEffects);
  } else {
    initEffects();
  }
}
