---
title: "WebGPU est enfin partout : la 3D et l'IA directement dans ton navigateur"
description: "Chrome, Firefox, Safari : WebGPU est désormais supporté sur toutes les plateformes majeures. Voici ce que ça change concrètement pour le web."
date: 2026-07-01
tags: ["WebGPU", "3D", "Web", "Performance"]
cover: /blog/webgpu-3d-ia.webp
---

Pendant des années, la 3D sur le web, c'était WebGL : une API héritée d'OpenGL ES, pensée en 2011. Elle a bien servi — mes labos 3D tournent encore dessus — mais elle montre ses limites. Bonne nouvelle : **WebGPU est maintenant disponible sur tous les navigateurs majeurs**, mobile compris. Et ça change la donne.

## WebGPU, c'est quoi au juste ?

C'est la nouvelle API graphique du web, conçue pour parler directement aux GPU modernes (Vulkan, Metal, Direct3D 12). Deux gros apports :

- **Moins de surcharge CPU.** Là où WebGL passait son temps à valider des états, WebGPU pré-compile des *pipelines*. Résultat : des scènes avec **10× plus d'objets** à framerate égal.
- **Les compute shaders.** Le GPU ne sert plus qu'à dessiner : il peut **calculer**. Simulations physiques, traitement d'image, et surtout… inférence de réseaux de neurones.

> WebGL dessinait. WebGPU calcule *et* dessine. C'est toute la différence.

## L'IA dans l'onglet, sans serveur

C'est le cas d'usage qui explose en 2026 : faire tourner des modèles d'IA **localement, dans le navigateur**, via WebGPU.

- **Transformers.js** exécute des modèles Hugging Face côté client (transcription, traduction, embeddings…).
- **WebLLM** fait tourner de petits LLM quantifiés directement dans l'onglet — zéro appel API, zéro donnée qui sort de la machine.
- Les navigateurs eux-mêmes embarquent des API d'IA locale pour le résumé et la rédaction.

Pour nous à Madagascar, où la connexion n'est pas toujours généreuse, ce point est loin d'être un détail : **une fois le modèle en cache, tout fonctionne hors ligne**.

## Et pour la 3D « classique » ?

Three.js a un backend WebGPU stable (`WebGPURenderer`), et Babylon.js est passé au tout-WebGPU. La migration est douce : le même code de scène, un renderer différent, et un fallback WebGL automatique pour les vieux appareils.

## Ce que j'en retiens comme dev

Je vais migrer progressivement mes labos vers WebGPU avec fallback WebGL — le gain se sentira surtout sur les scènes à particules. Et pour l'IA locale dans le navigateur, on tient enfin le combo confidentialité + hors-ligne + zéro coût serveur. Le navigateur devient une vraie plateforme de calcul, pas juste un lecteur de documents.
