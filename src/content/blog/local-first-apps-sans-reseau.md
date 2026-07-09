---
title: "Local-first : et si ton app marchait d'abord sans réseau ?"
description: "Développer depuis Madagascar m'a appris une chose : le réseau est un bonus, pas un acquis. Le mouvement local-first transforme cette contrainte en architecture — CRDT, moteurs de sync et SQLite embarqué."
date: 2026-07-09
tags: ["Architecture", "Offline", "Mobile", "SQLite"]
---

Je développe depuis Diego-Suarez, Madagascar. Ici, la coupure réseau n'est pas un cas limite qu'on simule dans les DevTools — c'est mardi après-midi. Et cette contrainte m'a fait regarder de très près un mouvement qui monte fort : le **local-first**.

## L'idée en une phrase

Dans une app classique, le serveur détient la vérité et ton écran n'en est qu'un reflet : chaque clic attend un aller-retour réseau. Le local-first inverse la logique — **les données vivent d'abord sur l'appareil**, l'interface répond instantanément, et la synchronisation se fait en arrière-plan, quand le réseau veut bien.

Tu utilises déjà des apps construites comme ça sans le savoir : Linear, Figma, Notion (en partie), Excalidraw. Leur point commun ? Zéro spinner. L'app répond à la milliseconde parce qu'elle ne demande la permission à personne.

## Le problème que ça pose (et qui est enfin résolu)

Si deux personnes modifient la même donnée hors ligne, qui gagne ? Pendant des années, la réponse était « le dernier qui écrit » — et on perdait des données. La percée, ce sont les **CRDT** (*Conflict-free Replicated Data Types*) : des structures de données qui fusionnent mathématiquement, sans conflit, quel que soit l'ordre d'arrivée des changements.

```js
// Avec Yjs, deux clients modifient le même document hors ligne…
const doc = new Y.Doc();
const todos = doc.getArray("todos");
todos.push(["Acheter du café"]);        // client A, offline
// pendant ce temps, client B ajoute "Payer la facture"

// …et à la reconnexion, la fusion est automatique et sans perte :
Y.applyUpdate(doc, updateFromClientB);
// todos contient les deux items, dans un ordre convergent
```

Plus besoin d'écrire la moindre logique de résolution de conflit. C'est le CRDT qui garantit que tous les appareils convergent vers le même état.

## La stack local-first en 2026

Ce qui a changé récemment, c'est que l'outillage est devenu sérieux :

- **Yjs / Automerge** — les deux grandes bibliothèques CRDT, matures et rapides.
- **SQLite partout** — dans le navigateur via WASM (avec l'API Origin Private File System pour la persistance), natif sur mobile. Une vraie base SQL sur l'appareil.
- **Les moteurs de sync** — ElectricSQL, PowerSync, Zero… ils répliquent ta base Postgres vers un SQLite local et gèrent la synchro bidirectionnelle pour toi.

```sql
-- Ta requête tourne EN LOCAL, sur le SQLite embarqué :
SELECT * FROM commandes WHERE statut = 'en_attente';
-- 0 ms de latence réseau, et ça marche dans un taxi-brousse sans 4G.
```

## Pourquoi ça me parle en tant que dev mobile

Sur mobile, le local-first n'est pas un luxe, c'est la base d'une bonne UX : personne n'a envie d'une app de prise de notes qui refuse d'ouvrir une note parce que le tunnel n'a pas de réseau. Flutter et React Native s'intègrent très bien avec SQLite local + une couche de sync — c'est exactement le genre d'architecture que je pousse sur les projets à fortes contraintes de connectivité, et en Afrique elles sont partout.

> Mon avis : le local-first fait pour la donnée ce que le responsive a fait pour l'écran. Dans quelques années, une app qui affiche un spinner pour ouvrir une liste de tâches paraîtra aussi datée qu'un site qui ne marche que sur desktop.

## Par où commencer

Pas besoin de tout réécrire. Commence petit : un cache SQLite local en lecture, puis les écritures optimistes, puis la sync complète si le besoin se confirme. Et si tu démarres un projet neuf où plusieurs utilisateurs éditent les mêmes données, pose-toi la question dès le premier jour — rétrofitter du local-first sur une app pensée serveur-d'abord, c'est douloureux.

Le réseau est un bonus. Les apps qui l'ont compris se reconnaissent à la première seconde d'utilisation.
