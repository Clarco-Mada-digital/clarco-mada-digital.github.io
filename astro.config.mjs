import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import matter from "gray-matter";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * === Plugin Vite "Admin local" ===
 * Disponible UNIQUEMENT pendant `npm run dev`. Il expose une mini-API qui lit
 * et écrit le fichier `src/data/content.json`. C'est ce qui permet à la page
 * /admin de sauvegarder tes vraies données dans le repo. En production
 * (build statique pour GitHub Pages) ce plugin n'existe pas : on édite en
 * local puis on `git push` pour publier.
 */
function adminDevApi() {
  const dataFile = fileURLToPath(new URL("./src/data/content.json", import.meta.url));
  const publicDir = fileURLToPath(new URL("./public/", import.meta.url));
  const blogDir = fileURLToPath(new URL("./src/content/blog/", import.meta.url));

  const MAX_UPLOAD = 10 * 1024 * 1024; // 10 Mo
  // Dossiers de destination autorisés (anti path-traversal).
  const ALLOWED_DIRS = new Set(["projects", "cv", "profile", "blog"]);
  const EXT_BY_MIME = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "application/pdf": "pdf",
  };

  function readBody(req, limit = MAX_UPLOAD * 1.4) {
    return new Promise((resolve, reject) => {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
        if (raw.length > limit) {
          reject(new Error("Fichier trop volumineux (max ~10 Mo)"));
          req.destroy();
        }
      });
      req.on("end", () => resolve(raw));
      req.on("error", reject);
    });
  }

  function slugify(name) {
    return (
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "image"
    );
  }

  async function handleContent(req, res) {
    if (req.method === "GET") {
      const json = await fs.readFile(dataFile, "utf-8");
      res.statusCode = 200;
      res.end(json);
      return;
    }
    if (req.method === "POST" || req.method === "PUT") {
      const parsed = JSON.parse(await readBody(req));
      const pretty = JSON.stringify(parsed, null, 2) + "\n";
      // Sauvegarde atomique : on écrit un .tmp puis on renomme.
      const tmp = path.join(path.dirname(dataFile), ".content.tmp.json");
      await fs.writeFile(tmp, pretty, "utf-8");
      await fs.rename(tmp, dataFile);
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }));
      return;
    }
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Méthode non autorisée" }));
  }

  async function handleUpload(req, res) {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "Méthode non autorisée" }));
      return;
    }
    const { name, dataUrl, dir } = JSON.parse(await readBody(req));
    const targetDir = ALLOWED_DIRS.has(dir) ? dir : "projects";
    const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || "");
    if (!match) throw new Error("Fichier invalide (dataURL base64 attendu)");
    const mime = match[1];
    const ext = EXT_BY_MIME[mime];
    if (!ext) throw new Error("Format non supporté : " + mime);
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > MAX_UPLOAD) throw new Error("Fichier trop volumineux (max 10 Mo)");

    const outDir = path.join(publicDir, targetDir);
    await fs.mkdir(outDir, { recursive: true });
    const baseName = slugify((name || "fichier").replace(/\.[^.]+$/, ""));
    const fileName = `${baseName}-${Date.now().toString(36)}.${ext}`;
    await fs.writeFile(path.join(outDir, fileName), buffer);
    const publicPath = `/${targetDir}/${fileName}`;
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, path: publicPath }));
  }

  // --- Articles de blog (fichiers Markdown dans src/content/blog/) ---
  async function handleBlog(req, res) {
    await fs.mkdir(blogDir, { recursive: true });

    if (req.method === "GET") {
      const files = (await fs.readdir(blogDir)).filter((f) => f.endsWith(".md"));
      const posts = [];
      for (const f of files) {
        const raw = await fs.readFile(path.join(blogDir, f), "utf-8");
        const { data, content } = matter(raw);
        // La date peut être un objet Date : on la normalise en YYYY-MM-DD.
        const date =
          data.date instanceof Date
            ? data.date.toISOString().slice(0, 10)
            : String(data.date ?? "");
        posts.push({
          slug: f.replace(/\.md$/, ""),
          data: { ...data, date, tags: data.tags ?? [] },
          body: content.replace(/^\n+/, ""),
        });
      }
      res.statusCode = 200;
      res.end(JSON.stringify(posts));
      return;
    }

    if (req.method === "POST" || req.method === "PUT") {
      const { slug, originalSlug, data, body } = JSON.parse(await readBody(req));
      const safe = slugify(slug || data?.title || "article");
      const fm = {
        title: data?.title ?? "",
        description: data?.description ?? "",
        date: data?.date || new Date().toISOString().slice(0, 10),
        tags: Array.isArray(data?.tags) ? data.tags : [],
        draft: Boolean(data?.draft),
      };
      if (data?.cover) fm.cover = data.cover;
      const md = matter.stringify((body ?? "").trim() + "\n", fm);
      await fs.writeFile(path.join(blogDir, safe + ".md"), md, "utf-8");
      // Renommage : supprime l'ancien fichier si le slug a changé.
      const oldSafe = slugify(originalSlug || "");
      if (oldSafe && oldSafe !== safe) {
        await fs.rm(path.join(blogDir, oldSafe + ".md"), { force: true });
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, slug: safe }));
      return;
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url, "http://localhost");
      const slug = slugify(url.searchParams.get("slug") || "");
      if (slug) await fs.rm(path.join(blogDir, slug + ".md"), { force: true });
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Méthode non autorisée" }));
  }

  // --- Génération d'articles par IA (dev only) ---
  // Les appels passent par ici (serveur Node) et non le navigateur : pas de
  // CORS, pas de CSP, et la clé API n'est jamais committée (elle vit dans le
  // localStorage du navigateur et n'est relayée qu'au provider à la volée).
  const AI_PROVIDERS = {
    openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", format: "openai" },
    groq: { url: "https://api.groq.com/openai/v1/chat/completions", format: "openai" },
    xai: { url: "https://api.x.ai/v1/chat/completions", format: "openai" },
    gemini: { url: "https://generativelanguage.googleapis.com/v1beta/models", format: "gemini" },
  };

  // Le « persona » : tout l'article doit sonner comme les articles déjà publiés.
  const AI_SYSTEM = `Tu écris des articles de blog À LA PLACE de Bryan Clark (marque « ABC.Dev »), développeur full-stack & mobile basé à Diego-Suarez (Antsiranana), Madagascar. Tu dois imiter fidèlement SON style, déjà en place sur son blog tech.

STYLE & TON (impératif) :
- Français, première personne ("je"), tutoie le lecteur ("tu").
- Ton direct, concret, un brin opinioné : il donne son avis de dev, pas un cours neutre.
- Point de vue de praticien : il parle de ce qu'il fait/utilise, des implications réelles pour un dev.
- Glisse, quand c'est pertinent (pas à chaque fois), son contexte : mobile, performance/latence, dev depuis Madagascar.
- Pas de remplissage, pas de superlatifs creux, pas de "en conclusion" scolaire.

FORMAT (impératif) :
- Markdown. NE répète PAS le titre en H1 : commence directement par un court paragraphe d'accroche.
- Structure en sections "## Titre" (3 à 5 sections).
- Listes à puces avec amorce en **gras** quand utile.
- 0 à 2 bloc(s) de code pertinents (\`\`\`js, \`\`\`bash, \`\`\`text…) seulement si ça aide.
- Exactement UN blockquote "> …" avec une phrase qui frappe.
- Termine par une section d'avis perso ("## Mon avis", "## Ce que j'en retiens"…).
- Longueur cible : 450 à 650 mots. Pas de blabla.

SORTIE (impératif) : réponds UNIQUEMENT par un objet JSON valide, sans texte autour, de la forme :
{"title": "Titre clair, parfois avec un sous-titre après ':'", "description": "1 à 2 phrases d'accroche pour le SEO", "tags": ["Trois","Tags","Pertinents"], "coverLabel": "2-3 MOTS pour la couverture", "body": "le markdown complet de l'article"}`;

  function buildAiUserPrompt(mode, topic) {
    if (mode === "trends") {
      return `Choisis TOI-MÊME un sujet d'actualité tech ou IA qui fait le buzz en ce moment (dev web/mobile, frameworks, IA, performance, outils…) et qui collerait au blog. ${topic ? `Oriente-toi de préférence vers : « ${topic} ». ` : ""}Puis écris l'article complet dans le style décrit. Reste factuel et à jour ; si tu cites des chiffres, qu'ils soient crédibles.`;
    }
    return `Écris un article complet, dans le style décrit, sur le sujet suivant : « ${topic} ». Apporte un angle de dev concret et un avis personnel.`;
  }

  function extractJson(text) {
    let t = String(text || "").trim();
    const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) t = fence[1].trim();
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) t = t.slice(start, end + 1);
    return JSON.parse(t);
  }

  async function callOpenAiLike(url, apiKey, model, webSearch, prompt) {
    // OpenRouter sait faire de la recherche web en suffixant le modèle de ":online".
    const finalModel =
      webSearch && url.includes("openrouter") && !model.includes(":online") ? model + ":online" : model;
    const body = {
      model: finalModel,
      temperature: 0.8,
      messages: [
        { role: "system", content: AI_SYSTEM },
        { role: "user", content: prompt },
      ],
    };
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:4321",
        "X-Title": "Portfolio Admin",
      },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out?.error?.message || out?.error || `HTTP ${res.status}`);
    return out?.choices?.[0]?.message?.content || "";
  }

  async function callGemini(base, apiKey, model, webSearch, prompt) {
    const url = `${base}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
      systemInstruction: { parts: [{ text: AI_SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8 },
    };
    // La recherche Google et le forçage JSON ne cohabitent pas : on parse à la main si web search.
    if (webSearch) body.tools = [{ google_search: {} }];
    else body.generationConfig.responseMimeType = "application/json";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out?.error?.message || `HTTP ${res.status}`);
    return out?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  }

  /** Génère une couverture néon dans le style du blog (best-effort, ne jette jamais). */
  async function generateCover(slug, label) {
    try {
      let font = null;
      try {
        font = execFileSync("fc-match", ["-f", "%{file}", "JetBrains Mono"]).toString().trim() || null;
      } catch {
        /* font par défaut */
      }
      const accents = ["#00e5ff", "#39ff14", "#ff2fb3", "#b388ff", "#ffd23f"];
      let h = 0;
      for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const accent = accents[h % accents.length];
      const raw = String(label || "Article").toUpperCase().slice(0, 28);
      // Coupe en 2 lignes sur l'espace le plus central si c'est long.
      let text = raw;
      if (raw.length > 14 && raw.includes(" ")) {
        const mid = raw.length / 2;
        let best = -1;
        for (let i = 0; i < raw.length; i++)
          if (raw[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
        if (best > 0) text = raw.slice(0, best) + "\n" + raw.slice(best + 1);
      }
      const size = raw.length > 16 ? "60" : "78";
      const outDir = path.join(publicDir, "blog");
      await fs.mkdir(outDir, { recursive: true });
      const outPath = path.join(outDir, `${slug}.webp`);
      const args = ["-size", "1200x630", "radial-gradient:#0b2533-#05070b"];
      if (font) args.push("-font", font);
      args.push(
        "-fill", "#13303d", "-draw", "rectangle 0,540 1200,544",
        "-gravity", "NorthWest", "-pointsize", "26", "-fill", "#5b7686", "-annotate", "+80+90", "// abc.dev — blog",
        "-gravity", "West", "-pointsize", size, "-fill", accent, "-annotate", "+80-10", text,
        "-gravity", "SouthEast", "-pointsize", "24", "-fill", "#5b7686", "-annotate", "+70+60", new Date().getFullYear() + "",
        outPath,
      );
      await execFileAsync("convert", args);
      return `/blog/${slug}.webp`;
    } catch {
      return null;
    }
  }

  async function handleAi(req, res) {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "Méthode non autorisée" }));
      return;
    }
    const { provider, apiKey, model, mode, topic, webSearch, cover } = JSON.parse(await readBody(req));
    const conf = AI_PROVIDERS[provider];
    if (!conf) throw new Error("Fournisseur inconnu : " + provider);
    if (!apiKey) throw new Error("Clé API manquante.");
    if (!model) throw new Error("Nom du modèle manquant.");
    if (mode !== "trends" && !String(topic || "").trim()) throw new Error("Donne un sujet à traiter.");

    const prompt = buildAiUserPrompt(mode, String(topic || "").trim());

    const raw =
      conf.format === "gemini"
        ? await callGemini(conf.url, apiKey, model, Boolean(webSearch), prompt)
        : await callOpenAiLike(conf.url, apiKey, model, Boolean(webSearch), prompt);

    let article;
    try {
      article = extractJson(raw);
    } catch {
      throw new Error("Réponse de l'IA illisible (JSON attendu). Essaie un autre modèle.");
    }
    if (!article || !article.body) throw new Error("L'IA n'a pas renvoyé d'article exploitable.");

    article.title = String(article.title || "Sans titre").trim();
    article.description = String(article.description || "").trim();
    article.tags = Array.isArray(article.tags) ? article.tags.slice(0, 6).map((t) => String(t).trim()) : [];
    article.body = String(article.body).trim();

    // Couverture assortie (optionnelle, best-effort).
    let coverPath = null;
    if (cover) {
      const slug =
        slugify(article.title) + "-" + Math.random().toString(36).slice(2, 6);
      coverPath = await generateCover(slug, article.coverLabel || article.title);
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, article, cover: coverPath }));
  }

  return {
    name: "portfolio-admin-dev-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/admin/")) return next();
        res.setHeader("Content-Type", "application/json");
        try {
          if (req.url.startsWith("/api/admin/content")) return await handleContent(req, res);
          if (req.url.startsWith("/api/admin/upload")) return await handleUpload(req, res);
          if (req.url.startsWith("/api/admin/blog")) return await handleBlog(req, res);
          if (req.url.startsWith("/api/admin/ai")) return await handleAi(req, res);
          res.statusCode = 404;
          res.end(JSON.stringify({ ok: false, error: "Route inconnue" }));
        } catch (err) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }));
        }
      });
    },
  };
}

// L'URL publique du site. Modifiable via la variable d'env SITE_URL.
// Pour GitHub Pages "projet" : mets aussi `base` (voir README).
const SITE = process.env.SITE_URL || "https://clarco-mada-digital.github.io";

// https://astro.build
export default defineConfig({
  site: SITE,
  base: process.env.BASE_PATH || "/",
  trailingSlash: "ignore",
  markdown: {
    // Coloration syntaxique (Shiki) + support des maths (KaTeX).
    shikiConfig: { theme: "night-owl", wrap: false },
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    // On exclut la console d'admin du sitemap (page privée).
    sitemap({ filter: (page) => !page.includes("/clarco-console") }),
  ],
  vite: {
    plugins: [adminDevApi()],
  },
});
