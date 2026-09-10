import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { content } from "../lib/content";

/**
 * Fiche de synthèse en Markdown, à destination des agents et assistants IA
 * (convention llms.txt). Le site est une application Alpine : un modèle qui
 * récupère le HTML brut voit surtout du balisage. Ce fichier lui donne
 * directement l'essentiel — profil, compétences, projets, articles — pour
 * qu'un recruteur qui demande « parle-moi de ce candidat » obtienne des
 * informations exactes plutôt que devinées.
 *
 * Généré depuis content.json : il ne peut pas se désynchroniser du site.
 */
export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL;
  const origin = site ?? new URL("http://localhost:4321");
  const url = (p: string) => new URL(`${base}${p}`, origin).href;

  const { site: s, hero, about, skills, projects, experience, socials, contact } = content;

  const posts = (await getCollection("blog"))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  // Le texte « à propos » peut contenir du HTML léger saisi côté admin.
  const plain = (v: unknown) =>
    String(v ?? "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const skillLines = (skills ?? [])
    .map((g) => (g.items?.length ? `- **${g.name}** : ${g.items.join(", ")}` : ""))
    .filter(Boolean)
    .join("\n");

  const bullets = (arr: string[] | undefined) =>
    (arr ?? []).map((x) => `- ${plain(x)}`).join("\n");

  const projectLines = projects
    .map((p) => {
      const links = [
        p.repoUrl ? `[code](${p.repoUrl})` : "",
        p.demoUrl ? `[démo](${p.demoUrl})` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return `- **${p.name}** (${p.year}) — ${plain(p.shortDesc)}\n  Stack : ${(p.tags ?? []).join(", ")}${links ? `\n  ${links}` : ""}`;
    })
    .join("\n");

  const xpLines = (experience ?? [])
    .map(
      (e) =>
        `### ${e.role} — ${e.company} (${String(e.period).trim()})\n\n${plain(e.description)}`,
    )
    .join("\n\n");

  const postLines = posts
    .map((p) => `- [${p.data.title}](${url(`blog/${p.slug}/`)}) — ${p.data.date.toISOString().slice(0, 10)} — ${plain(p.data.description)}`)
    .join("\n");

  const body = `# ${s.name}

> ${s.role}${hero?.code?.location ? `, basé à ${hero.code.location}` : ""}.
> ${plain(hero?.tagline).replace(new RegExp(`^${s.role}\\.\\s*`), "")}

${(about?.paragraphs ?? []).map(plain).join("\n\n")}

## Ce que je fais

${bullets(about?.doing)}

## Ce que je cherche

${bullets(about?.looking)}

## Contact et liens

- Site : ${url("")}
${contact?.email ? `- Email : ${contact.email}\n` : ""}${socials?.github ? `- GitHub : ${socials.github}\n` : ""}${socials?.linkedin ? `- LinkedIn : ${socials.linkedin}\n` : ""}- Flux RSS des articles : ${url("rss.xml")}
- Version anglaise de cette page : ${url("en/")}
- Analyseur Argus embarqué : ${url("analyser/")}

## Compétences

${skillLines || "_Voir le site._"}

## Projets

${projectLines}

## Parcours

${xpLines || "_Voir le site._"}

## Articles (${posts.length})

${postLines}

---

Contenu généré depuis les données du site, dernière mise à jour : ${new Date().toISOString().slice(0, 10)}.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
