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
npm run dev      # http://localhost:4321            → le site
                 # http://localhost:4321/clarco-console → la console d'admin
```

## 🕵️ Accès caché à la console

L'admin **n'est pas** sur `/admin` (trop prévisible) mais sur **`/clarco-console`**
(défini dans `src/lib/config.ts`). Aucun lien visible : on y accède par un
**easter egg** depuis le site —

- **Konami Code** : `↑ ↑ ↓ ↓ ← → ← → B A`
- ou **triple-clic rapide** sur le logo (avatar) de la sidebar.

Une petite animation néon confirme puis redirige vers la console.

## ✍️ Gérer mon contenu (l'admin)

Toutes les données vivent dans un seul fichier : **`src/data/content.json`**.

1. Lance `npm run dev`.
2. Ouvre la console (`/clarco-console` ou l'easter egg). Tu peux y éditer :
   identité, hero, stats, à propos, compétences, outils, projets (avec
   **images** : couverture + galerie, par URL ou upload), parcours, contact.
3. Clique **💾 Sauvegarder** : en mode dev, ça écrit **directement** dans
   `src/data/content.json` (et les images uploadées dans `public/projects/`).
4. Pour **publier**, commit + `git push` → GitHub Pages se met à jour tout seul.

> L'admin n'a pas d'authentification car elle ne fonctionne **qu'en local**
> (`npm run dev`). En production (site statique), la sauvegarde fichier est
> désactivée ; l'admin propose alors **Exporter / Importer** le JSON.

### Sans serveur (édition sur un autre poste)
Le bouton **Exporter** télécharge un `content.json` ; remplace le fichier dans
`src/data/` puis `git push`. **Importer** permet de recharger un JSON existant.

## ✨ Fonctionnalités phares
- **CV PDF généré à la volée** depuis tes données, avec **3 templates graphiques**
  (Élégant, Vibrant, Rosé) : photo de profil, sidebar/bandeau coloré, en-têtes de
  section colorés, mise en page deux colonnes. La **photo** se règle dans l'admin
  (onglet Identité) ; à défaut, un avatar « initiales » est généré.
  pdfmake est chargé à la demande (pas dans le bundle principal).
- **Mode clair / sombre** avec bascule dans la sidebar, persistance
  (localStorage) et respect de la préférence système, sans flash au chargement.
- **Compteurs animés** sur les statistiques (au défilement).
- **Accès admin caché** (Konami code / triple-clic logo) — voir plus haut.

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
Dépôt : **`clarco-mada-digital.github.io`** → site servi à la racine
`https://clarco-mada-digital.github.io/`.

1. Pousse le repo sur GitHub (branche `main`).
2. `Settings → Pages → Build and deployment → Source : GitHub Actions`.
3. Chaque push sur `main` build et déploie automatiquement.

Comme c'est un dépôt « utilisateur » (`<nom>.github.io`), **aucun `BASE_PATH`**
n'est nécessaire. (Pour un dépôt « projet » classique, il faudrait définir
`BASE_PATH: /<repo>` dans `.github/workflows/deploy.yml`.)

## 🗂️ Structure
```
src/
  data/content.json     ← LA source de vérité (éditée par l'admin)
  layouts/Base.astro    ← <head>, fonts, SEO, canvas/curseur
  components/           ← Sidebar, modale, sections (Home, About, …)
  scripts/              ← effects (canvas/curseur/reveal), portfolio, admin
  pages/index.astro          ← le portfolio
  pages/clarco-console.astro ← la console d'admin (locale, accès caché)
  lib/config.ts              ← le slug secret de la console
public/                 ← favicon, robots.txt
_legacy/                ← l'index.html d'origine, pour référence
```

Construit avec [Astro](https://astro.build), Tailwind CSS & Alpine.js.
