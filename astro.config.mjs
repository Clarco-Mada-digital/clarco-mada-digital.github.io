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

  async function readBody(req) {
    return new Promise((resolve, reject) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => resolve(raw));
      req.on("error", reject);
    });
  }

  return {
    name: "portfolio-admin-dev-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/admin/content")) return next();

        res.setHeader("Content-Type", "application/json");

        try {
          if (req.method === "GET") {
            const json = await fs.readFile(dataFile, "utf-8");
            res.statusCode = 200;
            res.end(json);
            return;
          }

          if (req.method === "POST" || req.method === "PUT") {
            const raw = await readBody(req);
            // Validation minimale : doit être du JSON parseable.
            const parsed = JSON.parse(raw);
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
