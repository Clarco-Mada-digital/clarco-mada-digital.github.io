---
title: "Le CSS de 2026 remplace la moitié de ton JavaScript"
description: "Container queries, :has(), View Transitions, scroll-driven animations… le CSS natif fait aujourd'hui ce qui demandait hier une lib JS. Tour d'horizon pratique."
date: 2026-07-06
tags: ["CSS", "Frontend", "Performance", "UX"]
cover: /blog/css-2026.webp
---

Il y a cinq ans, pour animer au scroll, détecter un parent selon son contenu ou faire une transition entre deux pages, il fallait du JavaScript — souvent une lib entière. En 2026, **le CSS natif fait tout ça**, avec de meilleures performances et zéro kilo-octet de JS. Petit inventaire de ce que j'utilise vraiment.

## Les container queries : le responsive au niveau du composant

Les media queries regardent l'écran ; les **container queries** regardent le conteneur. Une carte peut enfin s'adapter à la place qu'*elle* a, pas à la taille de la fenêtre :

```css
.card-wrap { container-type: inline-size; }
@container (min-width: 400px) {
  .card { grid-template-columns: 120px 1fr; }
}
```

C'est le chaînon manquant du design par composants — le même composant marche dans une sidebar étroite et une grille large, sans prop `variant`.

## `:has()` : le sélecteur de parent qu'on attendait depuis 20 ans

Styler un champ de formulaire **selon ce qu'il contient**, sans une ligne de JS :

```css
/* Encadre en rouge le label dont l'input est invalide */
label:has(input:invalid) { border-color: #f87171; }
/* Grille différente si la carte contient une image */
.card:has(img) { grid-template-rows: 160px auto; }
```

Chaque fois que tu écris du JS pour ajouter une classe à un parent, demande-toi si `:has()` ne le fait pas déjà.

## Les animations pilotées par le scroll

`animation-timeline: scroll()` relie une animation à la position de défilement. Barre de progression de lecture, images qui se révèlent, parallaxe : **tout tourne sur le compositeur**, hors du thread principal — fini les listeners `scroll` qui saccadent sur mobile.

```css
.progress {
  animation: grow linear;
  animation-timeline: scroll(root);
}
@keyframes grow { from { scale: 0 1; } to { scale: 1 1; } }
```

## View Transitions : le « feel » d'une app native

L'API View Transitions anime le passage d'une page à l'autre — y compris entre **vraies pages** d'un site statique. C'est ce qu'Astro exploite pour donner aux sites multi-pages la fluidité d'une SPA, sans en payer le poids.

## Mention rapide

- **Les popovers natifs** (`popover`) : menus et tooltips accessibles sans lib.
- **`text-wrap: balance`** : des titres qui ne cassent plus bizarrement.
- **Nesting natif** : l'imbrication façon Sass, sans Sass.

## Ce que j'en retiens comme dev

Avant d'installer une dépendance pour un besoin d'interface, je vérifie désormais si la plateforme le fait nativement — et de plus en plus, la réponse est oui. Moins de JS, c'est moins de bundle, moins de bugs, et une interface qui reste fluide sur les téléphones d'entrée de gamme — ceux qu'utilisent la majorité de mes utilisateurs ici. Le CSS de 2026 n'est plus un langage de « mise en forme » : c'est un moteur d'interactions.
