import type { Lab } from "./content";

/**
 * Assemble le HTML/CSS/JS d'un labo en un document complet, destiné à être
 * injecté dans `srcdoc` d'un iframe `sandbox="allow-scripts"`.
 *
 * Sécurité : le contenu tourne dans une origine opaque (pas de allow-same-origin),
 * il ne peut donc ni lire les cookies, ni accéder au DOM parent. Le seul auteur
 * du code est l'administrateur du site.
 */
export function buildLabSrcdoc(demo: Lab["demo"] | undefined): string {
  if (!demo) return "";
  const html = demo.html ?? "";
  const css = demo.css ?? "";
  // Empêche une fermeture prématurée de la balise <script> via le code utilisateur.
  const js = (demo.js ?? "").replace(/<\/script/gi, "<\\/script");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin: 0; min-height: 100%; }
  body {
    background: #070a0f;
    color: #e5e7eb;
    font-family: system-ui, -apple-system, sans-serif;
  }
  * { box-sizing: border-box; }
${css}
</style>
</head>
<body>
${html}
<script>
try {
${js}
} catch (e) {
  document.body.insertAdjacentHTML("beforeend",
    "<pre style='color:#f87171;font:12px monospace;padding:10px;white-space:pre-wrap'>" +
    String(e) + "</pre>");
}
<\/script>
</body>
</html>`;
}

/** Un labo a-t-il une démo exécutable ? */
export function hasDemo(lab: Lab): boolean {
  return !!(lab.demo && (lab.demo.html || lab.demo.css || lab.demo.js));
}
