/**
 * Coloration syntaxique côté client, bundlée localement (pas de CDN).
 *
 * Exposé sous forme de « magies » Alpine, utilisables dans les templates :
 *   - $hl(code, lang)   → HTML coloré (échappé par highlight.js, sûr en x-html)
 *   - $linenos(code)    → colonne de numéros de ligne (<span> par ligne)
 *
 * highlight.js (~88 Ko) ne sert qu'aux onglets de code des labos, que la
 * plupart des visiteurs n'ouvrent jamais. Il vit donc dans `highlight-core.ts`,
 * importé à la volée au premier appel de `$hl`. Comme une magie Alpine doit
 * répondre de façon synchrone, on rend d'abord le code simplement échappé,
 * puis on incrémente un compteur réactif : Alpine ré-évalue l'expression et
 * la version colorée remplace la première, sans que le visiteur voie de vide.
 */

/** Échappement minimal, disponible sans charger le cœur. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Colonne de numéros de ligne alignée sur le code (1 <span> par ligne). */
export function lineNumbers(code: string): string {
  const n = Math.max(1, String(code ?? "").split("\n").length);
  let out = "";
  for (let i = 1; i <= n; i++) out += `<span>${i}</span>`;
  return out;
}

/** Interface minimale d'Alpine (le paquet ne fournit pas de déclarations de types). */
interface AlpineLike {
  magic(name: string, cb: () => unknown): void;
  reactive<T extends object>(obj: T): T;
}

type Core = typeof import("./highlight-core");

/** Enregistre les magies $hl et $linenos sur une instance Alpine (avant start). */
export function registerHighlight(Alpine: AlpineLike): void {
  let core: Core | null = null;
  let pending: Promise<void> | null = null;
  // Lu par $hl pour créer une dépendance réactive : l'incrémenter après le
  // chargement suffit à faire recolorer tous les blocs déjà affichés.
  const state = Alpine.reactive({ revision: 0 });

  function loadCore(): void {
    if (core || pending) return;
    pending = import("./highlight-core")
      .then((m) => {
        core = m;
        state.revision++;
      })
      .catch(() => {
        // Échec réseau : on en reste au code échappé, parfaitement lisible.
        pending = null;
      });
  }

  Alpine.magic("hl", () => (code: string, lang: string) => {
    state.revision; // dépendance réactive (voir loadCore)
    const src = String(code ?? "");
    if (!src.trim()) return "";
    if (core) return core.highlightCode(src, lang);
    loadCore();
    return escapeHtml(src);
  });
  Alpine.magic("linenos", () => (code: string) => lineNumbers(code));
}
