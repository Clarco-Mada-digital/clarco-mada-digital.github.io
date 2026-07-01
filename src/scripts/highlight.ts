/**
 * Coloration syntaxique côté client, bundlée localement (pas de CDN).
 * Seuls HTML / CSS / JS sont enregistrés : c'est tout ce dont les démos des
 * labos ont besoin, et ça garde le poids minimal.
 *
 * Exposé sous forme de « magies » Alpine, utilisables dans les templates :
 *   - $hl(code, lang)   → HTML coloré (échappé par highlight.js, sûr en x-html)
 *   - $linenos(code)    → colonne de numéros de ligne (<span> par ligne)
 */
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);

/** Alias d'onglets (html→xml, js→javascript) vers les langages enregistrés. */
const LANG_ALIAS: Record<string, string> = {
  html: "xml",
  xml: "xml",
  js: "javascript",
  javascript: "javascript",
  css: "css",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Code coloré en HTML. Vide → chaîne vide. Langage inconnu → simplement échappé. */
export function highlightCode(code: string, lang: string): string {
  const src = String(code ?? "");
  if (!src.trim()) return "";
  const language = LANG_ALIAS[String(lang || "").toLowerCase()];
  if (!language) return escapeHtml(src);
  try {
    return hljs.highlight(src, { language, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(src);
  }
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
}

/** Enregistre les magies $hl et $linenos sur une instance Alpine (avant start). */
export function registerHighlight(Alpine: AlpineLike): void {
  Alpine.magic("hl", () => (code: string, lang: string) => highlightCode(code, lang));
  Alpine.magic("linenos", () => (code: string) => lineNumbers(code));
}
