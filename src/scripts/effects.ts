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
  const dot = document.querySelector<HTMLElement>(".cursor-dot");
  const outline = document.querySelector<HTMLElement>(".cursor-outline");
  if (!dot || !outline) return;

  window.addEventListener("mousemove", (e) => {
    dot.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
    outline.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`;
  });

  // Délégation d'événements : fonctionne aussi pour les éléments ajoutés
  // dynamiquement (cartes projet générées par Alpine).
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

  const createParticles = () => {
    particles = [];
    const count = (window.innerWidth * window.innerHeight) / 15000;
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

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    createParticles();
  });
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p1, index) => {
      p1.x += p1.vx;
      p1.y += p1.vy;
      if (p1.x < 0 || p1.x > canvas.width) p1.vx *= -1;
      if (p1.y < 0 || p1.y > canvas.height) p1.vy *= -1;

      ctx.fillStyle = "rgba(0, 240, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
      ctx.fill();

      for (let j = index + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.1 + (1 - dist / 100) * 0.2})`;
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
          ctx.strokeStyle = `rgba(188, 19, 254, ${(1 - dist / mouse.radius) * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    });
    requestAnimationFrame(animate);
  };
  animate();
}

export function initEffects() {
  initScrollReveal();
  if (prefersReducedMotion) return; // pas de curseur custom ni de particules
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
