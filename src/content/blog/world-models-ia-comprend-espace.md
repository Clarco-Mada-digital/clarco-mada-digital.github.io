---
title: "World models : l'IA commence à comprendre l'espace"
description: "Atlas, présenté début septembre par World Labs, génère et reconstruit des scènes 3D cohérentes. Après le texte et l'image, l'IA s'attaque à la dimension qu'elle ratait : l'espace."
date: 2026-09-08
tags: ["IA", "3D", "Robotique", "Veille"]
cover: /blog/news-atlas.webp
---

Demande à un modèle d'images de te dessiner une pièce, puis de te montrer la même pièce vue depuis la porte. Tu obtiendras deux belles images — et deux pièces différentes. La fenêtre aura changé de mur, le fauteuil aura disparu.

C'est le défaut de fond des modèles génératifs actuels : ils produisent des **images** cohérentes, pas des **espaces** cohérents. Ils n'ont pas de mémoire de la géométrie.

C'est exactement ce que les *world models* cherchent à corriger, et World Labs — la société de Fei-Fei Li — a présenté le sien le 1er septembre : **Atlas**.

## L'idée technique

Atlas est un transformer de diffusion autorégressif multimodal, pré-entraîné depuis zéro pour manipuler nativement **texte, image, vidéo et 3D** dans un même modèle.

Le mécanisme intéressant tient en une phrase : là où un LLM encode ses entrées dans un contexte de *tokens*, Atlas **ancre chaque image à une position 3D**. Le contexte n'est plus une séquence, c'est un **contexte spatial**.

```text
LLM classique   : [token] [token] [token] …        → contexte séquentiel
Atlas           : [image @ (x,y,z,orientation)] …  → contexte spatial
```

La conséquence est directe : quand tu demandes une nouvelle vue, le modèle ne réinvente pas la scène, il génère depuis un espace qu'il a déjà en mémoire. La cohérence n'est plus un effet de bord, c'est la structure.

## Ce qu'il sait faire

Quatre capacités annoncées, dans un seul modèle :

- **Génération contrôlée par la caméra** — tu déplaces un point de vue, la scène tient.
- **Reconstruction spatiale** à partir d'une seule image, ou de quelques dizaines, avec des sorties 3D explicites : profondeur, nuages de points, *gaussian splats*.
- **Simulation espace-temps** depuis une vidéo, ce qui ouvre les flux *Real-to-Sim* pour la robotique.
- **Génération d'images** et de panoramas 360.

Le tout en 1440p, jusqu'à une minute.

## Les chiffres, et pourquoi je les prends avec des pincettes

Sur la reconstruction 3D à vues éparses, Atlas annonce une erreur moyenne de 25,3 contre 28,7 pour le meilleur modèle spécialisé. Des évaluateurs humains l'ont préféré aux modèles vidéo concurrents dans 75 à 94 % des cas.

Sauf que ces chiffres viennent de l'éditeur, et deux détails méritent d'être signalés. D'abord, l'écart avec Seedance 2.5 est rapporté de façon **incohérente** selon les documents (86 % ici, 94 % là). Ensuite, et c'est plus gênant : dans le comparatif vidéo, Atlas reçoit des trajectoires de caméra natives quand ses concurrents ne reçoivent qu'une description textuelle. Ce n'est pas la même épreuve.

Il n'y a par ailleurs **ni identifiant de modèle public, ni API, ni tarif, ni latence, ni carte de modèle, ni nombre de paramètres, ni information sur les données d'entraînement**. Juste un accès anticipé sur demande.

> Autrement dit : la démonstration est impressionnante et la piste technique est sérieuse, mais rien n'est encore vérifiable par un tiers. C'est une annonce, pas un produit qu'on peut juger.

## Pourquoi ça compte quand même

Parce que la cible n'est pas la génération d'images jolies — c'est la **robotique**.

Un robot qui apprend uniquement dans le monde réel apprend lentement et casse du matériel. S'entraîner en simulation est bien plus rapide, à condition que la simulation ressemble suffisamment au réel. Le *Real-to-Sim* — filmer une scène réelle, en dériver un environnement simulable — est le chaînon qui manquait.

Ça rejoint d'ailleurs un autre travail de cet été : **GeoPT**, du MIT, qui aide les modèles à prédire le comportement physique des objets — déformation d'une carrosserie dans un choc, tenue d'un bateau dans les vagues — avec jusqu'à **60 % de données en moins** que les approches existantes.

La convergence est nette. Après avoir appris à manipuler le langage, puis les images, les modèles apprennent la **physique** et l'**espace**. C'est la brique qui manquait pour que l'IA agisse sur le monde et pas seulement sur des écrans.

## Ce que j'en fais, moi, concrètement

Rien, à court terme. Je fais du web et du mobile, et il n'y a pas de `npm install atlas`.

Mais je note deux choses. La première, c'est que les sorties du modèle — profondeur, nuages de points, gaussian splats — sont des formats qu'on sait **déjà** afficher dans un navigateur, via WebGPU. Le jour où un modèle spatial devient accessible par API, la couche de restitution est en place : visite immobilière générée depuis cinq photos, configurateur produit, reconstitution d'un lieu à partir de quelques clichés touristiques.

La seconde, c'est que ce sont des modèles **lourds**. Là où j'écris, la question ne sera pas « est-ce que c'est possible » mais « est-ce que ça tient dans la bande passante disponible ». Les traitements spatiaux resteront côté serveur longtemps, et le web ne recevra que le résultat, compressé. Ce n'est pas une limite technique — c'est le même arbitrage que pour tout le reste, et il se prépare dès l'architecture.

À suivre, donc. Sans acheter le discours marketing, mais sans détourner le regard non plus : c'est l'une des directions les plus intéressantes de l'année.
