# Portfolio — Bryan Clark

Portfolio personnel « lab / néon » migré de l'HTML mono-fichier d'origine vers
**Astro** + **Tailwind CSS** + **Alpine.js**, avec un **espace d'administration
local** pour gérer le contenu (projets, compétences, parcours…) sans toucher au
code.

Le visuel d'origine est conservé à l'identique (curseur custom, particules,
glitch, machine à écrire, reveal au scroll, modale projet).

## 🚀 Démarrer

```bash
npm install
npm run dev      # http://localhost:4321  → le site
                 # http://localhost:4321/admin → la console d'admin
```

## ✍️ Gérer mon contenu (l'admin)

Toutes les données vivent dans un seul fichier : **`src/data/content.json`**.

1. Lance `npm run dev`.
2. Ouvre **`/admin`**. Tu peux y éditer : identité, hero, stats, à propos,
   compétences, outils, projets, parcours, contact et réseaux.
3. Clique **💾 Sauvegarder** : en mode dev, ça écrit **directement** dans
   `src/data/content.json`.
4. Pour **publier**, commit + `git push` → GitHub Pages se met à jour tout seul.

> L'admin n'a pas d'authentification car elle ne fonctionne **qu'en local**
> (`npm run dev`). En production (site statique), la sauvegarde fichier est
> désactivée ; l'admin propose alors **Exporter / Importer** le JSON.

### Sans serveur (édition sur un autre poste)
Le bouton **Exporter** télécharge un `content.json` ; remplace le fichier dans
`src/data/` puis `git push`. **Importer** permet de recharger un JSON existant.

## 🎨 Améliorations apportées (en plus de la migration)
- **Contenu 100 % éditable** via `/admin` (CRUD + réordonnancement) au lieu de
  données codées en dur.
- **Tailwind compilé** (plus de CDN) → CSS purgé, plus léger et plus rapide.
- **SEO** : balises Open Graph, `canonical`, `sitemap.xml`, `robots.txt`,
  favicon SVG dégradé.
- **Accessibilité** : respect de `prefers-reduced-motion` (désactive
  particules/curseur/animations), liens sociaux avec `aria-label`.
- **Formulaire de contact fonctionnel** : `mailto:` par défaut, ou envoi AJAX
  si tu renseignes un *endpoint* (Formspree…) dans l'admin.
- **Projets enrichis** : liens repo/démo et badge « featured ».
- **Navigation par hash** (`#projects`, `#contact`…) partageable.
- **Déploiement GitHub Pages automatisé** (`.github/workflows/deploy.yml`).

## ☁️ Déploiement GitHub Pages
1. Pousse le repo sur GitHub.
2. `Settings → Pages → Build and deployment → Source : GitHub Actions`.
3. Chaque push sur `main` build et déploie automatiquement.

**Dépôt « projet »** (URL type `https://user.github.io/folio/`) : décommente
`BASE_PATH: /folio` dans `.github/workflows/deploy.yml` (nom exact du dépôt).
**Domaine perso** ou dépôt `user.github.io` : rien à faire.

## 🗂️ Structure
```
src/
  data/content.json     ← LA source de vérité (éditée par l'admin)
  layouts/Base.astro    ← <head>, fonts, SEO, canvas/curseur
  components/           ← Sidebar, modale, sections (Home, About, …)
  scripts/              ← effects (canvas/curseur/reveal), portfolio, admin
  pages/index.astro     ← le portfolio
  pages/admin.astro     ← la console d'admin (locale)
public/                 ← favicon, robots.txt
_legacy/                ← l'index.html d'origine, pour référence
```

Construit avec [Astro](https://astro.build), Tailwind CSS & Alpine.js.
