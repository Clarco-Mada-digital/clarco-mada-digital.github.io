/**
 * Accès caché à la console d'administration. Aucun lien visible : on y accède
 * via un easter egg.
 *
 *   1. Le « Konami Code » : ↑ ↑ ↓ ↓ ← → ← → B A
 *   2. Un triple-clic rapide sur le logo (avatar) de la sidebar.
 *
 * Les deux déclenchent une petite animation néon puis redirigent vers la
 * console (dont l'URL n'est pas « /admin »).
 */
import { ADMIN_PATH } from "../lib/config";

const target = import.meta.env.BASE_URL.replace(/\/?$/, "/") + ADMIN_PATH;

function unlock() {
  // Évite les double-déclenchements.
  if (document.getElementById("secret-toast")) return;

  const toast = document.createElement("div");
  toast.id = "secret-toast";
  toast.textContent = "🔓 Accès console déverrouillé…";
  toast.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:32px",
    "transform:translateX(-50%) translateY(20px)",
    "z-index:99999",
    "padding:12px 20px",
    "font-family:'JetBrains Mono',monospace",
    "font-size:13px",
    "color:#070a0f",
    "background:linear-gradient(90deg,#00f0ff,#bc13fe)",
    "border-radius:10px",
    "box-shadow:0 10px 40px -8px rgba(0,240,255,.6)",
    "opacity:0",
    "transition:opacity .3s ease, transform .3s ease",
  ].join(";");
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });

  setTimeout(() => {
    window.location.href = target;
  }, 750);
}

// --- 1. Konami code ---
const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];
let progress = 0;
window.addEventListener("keydown", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  progress = key === KONAMI[progress] ? progress + 1 : key === KONAMI[0] ? 1 : 0;
  if (progress === KONAMI.length) {
    progress = 0;
    unlock();
  }
});

// --- 2. Triple-clic rapide sur le logo ---
function initLogoTrigger() {
  const logo = document.getElementById("brand-logo");
  if (!logo) return;
  let clicks = 0;
  let timer: number | undefined;
  logo.addEventListener("click", () => {
    clicks++;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => (clicks = 0), 600);
    if (clicks >= 3) {
      clicks = 0;
      unlock();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLogoTrigger);
} else {
  initLogoTrigger();
}
