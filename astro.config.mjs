import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";

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
  const uploadDir = fileURLToPath(new URL("./public/projects/", import.meta.url));

  const MAX_UPLOAD = 10 * 1024 * 1024; // 10 Mo
  const EXT_BY_MIME = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
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
    const { name, dataUrl } = JSON.parse(await readBody(req));
    const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || "");
    if (!match) throw new Error("Image invalide (dataURL base64 attendu)");
    const mime = match[1];
    const ext = EXT_BY_MIME[mime];
    if (!ext) throw new Error("Format non supporté : " + mime);
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > MAX_UPLOAD) throw new Error("Fichier trop volumineux (max 10 Mo)");

    await fs.mkdir(uploadDir, { recursive: true });
    const baseName = slugify((name || "image").replace(/\.[^.]+$/, ""));
    const fileName = `${baseName}-${Date.now().toString(36)}.${ext}`;
    await fs.writeFile(path.join(uploadDir, fileName), buffer);
    const publicPath = `/projects/${fileName}`;
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, path: publicPath }));
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
const SITE = process.env.SITE_URL || "https://bryan-clark.github.io";

// https://astro.build
export default defineConfig({
  site: SITE,
  base: process.env.BASE_PATH || "/",
  trailingSlash: "ignore",
  integrations: [
    tailwind({ applyBaseStyles: false }),
    // On exclut /admin du sitemap (page privée, locale uniquement).
    sitemap({ filter: (page) => !page.includes("/admin") }),
  ],
  vite: {
    plugins: [adminDevApi()],
  },
});
