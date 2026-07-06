import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import matter from "gray-matter";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import os from "node:os";
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

    // Optimisation automatique : les images bitmap sont remises droites (EXIF),
    // limitées à 1600 px de côté et converties en WebP (qualité 82). Peu importe
    // le format ou la taille d'origine, le site reçoit toujours un fichier léger.
    // Si ImageMagick n'est pas disponible ou échoue, on garde l'original tel quel.
    const { buffer: finalBuffer, ext: finalExt, optimized } = await optimizeImage(buffer, ext);

    const outDir = path.join(publicDir, targetDir);
    await fs.mkdir(outDir, { recursive: true });
    const baseName = slugify((name || "fichier").replace(/\.[^.]+$/, ""));
    const fileName = `${baseName}-${Date.now().toString(36)}.${finalExt}`;
    await fs.writeFile(path.join(outDir, fileName), finalBuffer);
    const publicPath = `/${targetDir}/${fileName}`;
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        path: publicPath,
        optimized,
        originalBytes: buffer.length,
        finalBytes: finalBuffer.length,
      }),
    );
  }

  // Formats bitmap qu'on sait convertir. SVG (vectoriel), GIF (souvent animé)
  // et PDF passent tels quels.
  const OPTIMIZABLE_EXTS = new Set(["png", "jpg", "webp", "avif"]);

  async function optimizeImage(buffer, ext) {
    if (!OPTIMIZABLE_EXTS.has(ext)) return { buffer, ext, optimized: false };
    const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const tmpIn = path.join(os.tmpdir(), `folio-up-${stamp}.${ext}`);
    const tmpOut = path.join(os.tmpdir(), `folio-up-${stamp}.webp`);
    try {
      await fs.writeFile(tmpIn, buffer);
      // "1600x1600>" : ne réduit QUE si l'image dépasse 1600 px (jamais d'agrandissement).
      await execFileAsync("convert", [
        tmpIn, "-auto-orient", "-resize", "1600x1600>", "-quality", "82", tmpOut,
      ]);
      const out = await fs.readFile(tmpOut);
      // Si la conversion ne fait pas gagner de place (image déjà optimale), on garde l'original.
      if (out.length >= buffer.length) return { buffer, ext, optimized: false };
      return { buffer: out, ext: "webp", optimized: true };
    } catch {
      return { buffer, ext, optimized: false };
    } finally {
      await fs.rm(tmpIn, { force: true }).catch(() => {});
      await fs.rm(tmpOut, { force: true }).catch(() => {});
    }
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
    openrouter: {
      url: "https://openrouter.ai/api/v1/chat/completions",
      modelsUrl: "https://openrouter.ai/api/v1/models",
      format: "openai",
    },
    groq: {
      url: "https://api.groq.com/openai/v1/chat/completions",
      modelsUrl: "https://api.groq.com/openai/v1/models",
      format: "openai",
    },
    xai: {
      url: "https://api.x.ai/v1/chat/completions",
      modelsUrl: "https://api.x.ai/v1/models",
      format: "openai",
    },
    gemini: {
      url: "https://generativelanguage.googleapis.com/v1beta/models",
      modelsUrl: "https://generativelanguage.googleapis.com/v1beta/models",
      format: "gemini",
    },
  };

  // Le « persona » : tout l'article doit sonner comme les articles déjà publiés.
  // On demande du Markdown BRUT (pas de JSON) : c'est ce que tous les modèles,
  // même gratuits/légers, savent produire de façon fiable → fini les
  // "réponse illisible". Le titre est sur la 1ʳᵉ ligne en H1, on le détache ensuite.
  const AI_SYSTEM = `Tu écris un article de blog À LA PLACE de Bryan Clark (« ABC.Dev »), développeur full-stack & mobile à Diego-Suarez (Antsiranana), Madagascar. Imite SON style.

STYLE : français, 1ʳᵉ personne ("je"), tutoie le lecteur ("tu"). Ton direct, concret, opinioné — un avis de dev, pas un cours. Point de vue de praticien ; glisse quand c'est pertinent son contexte (mobile, performance/latence, dev depuis Madagascar). Pas de remplissage ni de superlatifs creux.

FORMAT (Markdown uniquement) :
- 1ʳᵉ ligne : le titre en H1 « # Titre » (clair, accrocheur).
- Puis un court paragraphe d'accroche.
- 3 à 5 sections « ## Titre ».
- Listes à puces avec amorce en **gras** si utile ; 0 à 2 blocs de code si ça aide.
- Exactement UN blockquote « > … ».
- Termine par une section d'avis perso (« ## Mon avis » / « ## Ce que j'en retiens »).
- Longueur : 450 à 650 mots.

Réponds UNIQUEMENT avec le Markdown de l'article (commençant par « # »). Aucun préambule, aucune explication, aucun JSON, aucune balise de code autour.`;

  function buildAiUserPrompt(mode, topic) {
    if (mode === "trends") {
      return `Choisis TOI-MÊME un sujet d'actualité tech ou IA qui fait le buzz en ce moment (dev web/mobile, frameworks, IA, performance, outils…) et qui collerait au blog. ${topic ? `Oriente-toi de préférence vers : « ${topic} ». ` : ""}Puis écris l'article complet dans le style décrit. Reste factuel et à jour ; si tu cites des chiffres, qu'ils soient crédibles.`;
    }
    return `Écris un article complet, dans le style décrit, sur le sujet suivant : « ${topic} ». Apporte un angle de dev concret et un avis personnel.`;
  }

  /** Détache le titre (1ᵉʳ H1) du corps Markdown ; tolère un éventuel ```fence```. */
  function splitTitleBody(raw) {
    let text = String(raw || "").trim();
    const fence = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
    if (fence) text = fence[1].trim();
    const lines = text.split("\n");
    let i = 0;
    while (i < lines.length && !lines[i].trim()) i++; // saute les lignes vides
    const h1 = lines[i] ? lines[i].match(/^#\s+(.+?)\s*$/) : null;
    let title = "";
    if (h1) {
      title = h1[1].trim();
      lines.splice(0, i + 1);
      text = lines.join("\n").trim();
    }
    return { title, body: text };
  }

  // Plafond de sortie : ~650 mots ≈ 1300 tokens ; on laisse de la marge sans
  // exploser le quota (un cap évite qu'un modèle parte en roue libre).
  const AI_MAX_TOKENS = 2000;

  async function callOpenAiLike(url, apiKey, model, webSearch, prompt) {
    // OpenRouter sait faire de la recherche web en suffixant le modèle de ":online".
    const finalModel =
      webSearch && url.includes("openrouter") && !model.includes(":online") ? model + ":online" : model;
    const body = {
      model: finalModel,
      temperature: 0.8,
      max_tokens: AI_MAX_TOKENS,
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
      generationConfig: { temperature: 0.8, maxOutputTokens: AI_MAX_TOKENS },
    };
    if (webSearch) body.tools = [{ google_search: {} }];
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

  /** Liste les modèles auxquels la clé donne accès (sert aussi de test de clé). */
  async function fetchAiModels(conf, apiKey) {
    if (conf.format === "gemini") {
      const res = await fetch(`${conf.modelsUrl}?key=${encodeURIComponent(apiKey)}`);
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out?.error?.message || `HTTP ${res.status}`);
      return (out.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m) => String(m.name || "").replace(/^models\//, ""))
        .filter(Boolean);
    }
    const res = await fetch(conf.modelsUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out?.error?.message || out?.error || `HTTP ${res.status}`);
    // On garde les modèles qui savent répondre en texte (on écarte image/audio/embeddings).
    // NB : les routeurs (openrouter/auto, openrouter/free) restent proposés, mais ils
    // rendent parfois de la prose au lieu du JSON → "réponse illisible" possible.
    return (out.data || [])
      .filter((m) => {
        const outMods = m?.architecture?.output_modalities;
        if (Array.isArray(outMods) && outMods.length && !outMods.includes("text")) return false;
        return true;
      })
      .map((m) => String(m.id || ""))
      .filter(Boolean);
  }

  async function handleAiModels(req, res) {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, error: "Méthode non autorisée" }));
      return;
    }
    const { provider, apiKey } = JSON.parse(await readBody(req));
    const conf = AI_PROVIDERS[provider];
    if (!conf) throw new Error("Fournisseur inconnu : " + provider);
    if (!apiKey) throw new Error("Clé API manquante.");
    const models = (await fetchAiModels(conf, apiKey)).sort((a, b) => a.localeCompare(b));
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, models }));
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

    // UN SEUL appel : la sortie est du Markdown brut (pas de JSON à parser, donc
    // pas de "réponse illisible" → plus besoin de réessayer). Économise le quota.
    const raw =
      conf.format === "gemini"
        ? await callGemini(conf.url, apiKey, model, Boolean(webSearch), prompt)
        : await callOpenAiLike(conf.url, apiKey, model, Boolean(webSearch), prompt);

    if (!String(raw || "").trim()) {
      throw new Error(
        "L'IA a renvoyé une réponse vide. Réessaie, ou choisis un autre modèle " +
          "(certains modèles gratuits saturent vite).",
      );
    }

    const { title, body } = splitTitleBody(raw);
    // On ne devine ni description ni tags : tu organises le brouillon toi-même.
    const article = { title, description: "", tags: [], body };

    // Couverture assortie (optionnelle, best-effort).
    let coverPath = null;
    if (cover && (title || body)) {
      const slug = slugify(title || "article") + "-" + Math.random().toString(36).slice(2, 6);
      coverPath = await generateCover(slug, title || "Article");
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
          if (req.url.startsWith("/api/admin/ai/models")) return await handleAiModels(req, res);
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
