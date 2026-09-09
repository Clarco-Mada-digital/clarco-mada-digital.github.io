import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { content } from "../lib/content";

/**
 * Flux RSS des articles. Écrit à la main plutôt qu'avec @astrojs/rss : le
 * format tient en quelques lignes et le projet évite volontairement les
 * dépendances qu'il peut produire lui-même.
 */

/** Échappe les cinq caractères interdits dans du texte XML. */
function xml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL;
  // `site` est absent si `site:` n'est pas configuré : le flux exige des URL
  // absolues, on ne peut rien produire de valide sans lui.
  const origin = site ?? new URL("http://localhost:4321");

  const posts = (await getCollection("blog"))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const self = new URL(`${base}rss.xml`, origin).href;
  const items = posts
    .map((p) => {
      const url = new URL(`${base}blog/${p.slug}/`, origin).href;
      return `    <item>
      <title>${xml(p.data.title)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <description>${xml(p.data.description)}</description>
      <pubDate>${p.data.date.toUTCString()}</pubDate>
${p.data.tags.map((t) => `      <category>${xml(t)}</category>`).join("\n")}
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(`${content.site.name} — Blog`)}</title>
    <link>${xml(new URL(`${base}blog/`, origin).href)}</link>
    <description>${xml(`Articles et notes techniques de ${content.site.name} : développement web, mobile et IA.`)}</description>
    <language>fr-FR</language>
    <atom:link href="${xml(self)}" rel="self" type="application/rss+xml" />
${posts[0] ? `    <lastBuildDate>${posts[0].data.date.toUTCString()}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
