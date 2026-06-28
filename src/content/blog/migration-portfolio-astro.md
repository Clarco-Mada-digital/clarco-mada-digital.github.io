---
title: "Pourquoi j'ai migré mon portfolio vers Astro"
description: "D'un fichier HTML unique à une architecture Astro + Alpine + Tailwind : ce que j'ai gagné en performance, en maintenabilité et en plaisir de dev."
date: 2026-06-20
tags: ["Astro", "Performance", "Web"]
cover: /blog/cover-astro.webp
---

Mon portfolio a longtemps vécu dans un **seul fichier HTML** de plusieurs milliers de lignes. Ça marchait… jusqu'au jour où ajouter une simple section devenait un casse-tête. J'ai donc tout repensé autour d'**Astro**.

## Le problème du fichier unique

Tout était mélangé : structure, styles, logique. Chaque modification demandait de scroller à l'infini, et le moindre copier-coller introduisait des incohérences. Impossible de réutiliser proprement un composant.

## Pourquoi Astro

Astro coche toutes les cases pour un portfolio :

- **Zéro JS par défaut** : la page est livrée en HTML statique, ultra-rapide.
- **Composants** : chaque section vit dans son propre fichier `.astro`.
- **Islands** : j'ajoute de l'interactivité (Alpine.js) seulement là où c'est utile.
- **Build statique** : parfait pour un hébergement gratuit sur GitHub Pages.

> L'idée clé : envoyer le moins de JavaScript possible au navigateur, sans renoncer à l'interactivité.

## La stack finale

```ts
// Le cœur : Astro orchestre, Alpine anime, Tailwind habille.
const stack = {
  framework: "Astro",
  interactivity: "Alpine.js",
  styles: "Tailwind CSS",
  hosting: "GitHub Pages",
};
```

## Avant / après

| Critère | Fichier unique | Astro |
| --- | --- | --- |
| JS envoyé | tout, toujours | le strict nécessaire |
| Maintenance | pénible | par composants |
| Temps de build | aucun | quelques secondes |

Côté perf, on cherche à minimiser le temps de rendu perçu. Si $n$ est le nombre de composants interactifs, le coût JS devient proportionnel à $n$ réellement utilisés, et non au site entier :

$$
\text{coût}_{JS} = \sum_{i=1}^{n} \text{island}_i
$$

Résultat : un site **plus rapide**, **plus simple à faire évoluer**, et surtout un code dont je suis fier. La prochaine étape ? Continuer à expérimenter — c'est tout l'esprit de la section *Labs*.
