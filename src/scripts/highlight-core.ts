/**
 * Cœur de la coloration syntaxique (highlight.js + les trois langages des
 * démos). Pèse ~88 Ko : ce module est volontairement isolé pour être importé
 * dynamiquement par `highlight.ts`, uniquement quand un onglet de code est
 * réellement affiché.
 *
 * Seuls HTML / CSS / JS sont enregistrés : c'est tout ce dont les démos des
 * labos ont besoin, et ça garde le poids minimal.
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

export function escapeHtml(s: string): string {
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
