---
title: "Vite 8 : le build passe au Rust, et ça se sent"
description: "Rolldown remplace enfin le duo esbuild/Rollup. Des builds 10 à 30× plus rapides, la même API de plugins — et quelques pièges à connaître avant de migrer."
date: 2026-08-12
tags: ["Vite", "Build", "Rust", "Outillage"]
cover: /blog/news-vite8.webp
---

Pendant des années, Vite a vécu avec une bizarrerie qu'on avait fini par accepter : **deux bundlers différents**. esbuild en développement, parce qu'il est instantané. Rollup en production, parce qu'il produit de meilleurs bundles. Résultat, ton code passait par deux chaînes distinctes, et il arrivait que ça marche en dev et casse au build.

Vite 8, stable depuis mars, met fin à ça. Un seul bundler, écrit en Rust : **Rolldown**.

## Ce que ça change sur les chiffres

Sur le banc d'essai de l'équipe Vite — 19 000 modules — un build de production qui prenait **40 secondes avec Rollup tombe à 1,6 seconde**. Environ 25×.

Attention quand même à ne pas prendre le chiffre d'affiche pour une promesse : le gain dépend de la taille du projet.

- Petite base de code : 2 à 5×. Réel, mais tu ne changeras pas de vie.
- Grosse base : c'est là que les 10 à 30× apparaissent.

Le cas le plus parlant reste celui de Linear, passé de 46 s à 6 s de build.

## Pourquoi c'est plus qu'une question de vitesse

Le vrai bénéfice est ailleurs, et on en parle moins : **unifier le bundler débloque des choses qui étaient difficiles avec deux moteurs**.

- Le *full bundle mode* — plus de différence de comportement entre dev et prod.
- Un découpage de chunks nettement plus souple.
- Un cache persistant au niveau du module.
- Le support du Module Federation, pour ceux qui font du micro-frontend.

Et sous le capot, la transformation que faisait esbuild est reprise par **Oxc**, une chaîne d'outils Rust complète (parser, resolver, transformer, minifier) de la même équipe. Concrètement, le bloc `esbuild` de ta config est devenu un bloc `oxc` :

```js
// vite.config.js — avant
export default {
  esbuild: { drop: ["console", "debugger"] },
};

// après : la couche de compatibilité convertit automatiquement,
// mais autant écrire directement la bonne clé.
export default {
  oxc: { drop: ["console", "debugger"] },
};
```

## Les pièges avant de migrer

Trois points qui m'ont sauté aux yeux en lisant les notes de version :

1. **Node 20.19+ ou 22.12+** requis, et le paquet est désormais **ESM uniquement**. Si tu traînes un `require()` dans un fichier de config, ça va coincer.
2. **~15 Mo d'installation en plus** : Rolldown et LightningCSS arrivent sous forme de binaires natifs. Sur une CI facturée à la minute ou une connexion capricieuse, ça compte.
3. **Les plugins qui touchent aux entrailles de Rollup ou d'esbuild** sont le vrai risque. L'API publique est compatible, les hacks ne le sont pas.

Pour un projet conséquent, la migration progressive est la bonne approche : passer d'abord de Vite 7 au paquet `rolldown-vite`, qui isole les incompatibilités propres à Rolldown, puis basculer sur Vite 8 une fois le terrain dégagé.

```bash
# étape 1 : même Vite, bundler Rolldown
npm i -D rolldown-vite

# étape 2, une fois les plugins validés
npm i -D vite@8
```

## Ce que j'en pense depuis ici

Ce portfolio tourne sur Astro, donc sur Vite. À l'échelle de ce site, je ne vais pas gagner trente secondes — le build tient déjà en une poignée de secondes. Mais il y a un point que les benchmarks ne montrent pas et qui compte beaucoup quand on développe depuis Madagascar : **15 Mo de binaires à télécharger à chaque installation propre en CI**, ce n'est pas neutre quand la bande passante est la ressource rare. Le cache de dépendances de la CI passe de « optimisation » à « obligatoire ».

> Mon avis : le passage au Rust dans l'outillage JS n'est plus une curiosité, c'est le sens du courant. esbuild avait montré que c'était possible, Rolldown, Oxc et Biome montrent que c'est généralisable. D'ici deux ans, un bundler écrit en JavaScript paraîtra aussi étrange qu'un compilateur écrit en Python.

Le plus élégant dans cette version, c'est qu'elle supprime une complexité au lieu d'ajouter une fonctionnalité. Deux bundlers deviennent un. C'est rare, et c'est le genre de release qui vieillit bien.
