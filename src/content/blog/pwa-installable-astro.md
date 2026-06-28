---
title: "Rendre un site Astro installable et hors-ligne"
description: "Transformer un site statique en PWA : manifest, service worker et stratégie de cache, le tout sans framework lourd."
date: 2026-06-26
tags: ["PWA", "Astro", "Service Worker"]
---

Une **PWA** (Progressive Web App) permet d'installer un site comme une vraie application et de le consulter même sans connexion. Voici comment je l'ai ajouté à ce portfolio, sans dépendance externe.

## Les trois ingrédients

1. Un **manifest** qui décrit l'app (nom, icônes, couleurs).
2. Un **service worker** qui met les fichiers en cache.
3. L'**enregistrement** du service worker au chargement.

## Le manifest

```json
{
  "name": "Mon Portfolio",
  "display": "standalone",
  "background_color": "#070a0f",
  "theme_color": "#070a0f",
  "icons": [
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

## La stratégie de cache

Le piège classique est de tout précacher « en dur » : les noms de fichiers changent à chaque build. J'ai préféré une approche mixte :

- **Navigations** : réseau d'abord, repli sur le cache si hors-ligne.
- **Assets** : *stale-while-revalidate* — on sert le cache immédiatement et on met à jour en arrière-plan.

> Le bon réflexe : ne jamais intercepter le cross-origin (CDN, scripts d'analytics) dans le service worker.

## Le détail qui m'a coûté une heure

Mon script d'enregistrement était mal généré et plantait silencieusement. La leçon : **toujours vérifier dans un vrai navigateur** que le service worker passe bien à l'état *activated*. Un test vaut mille suppositions.
