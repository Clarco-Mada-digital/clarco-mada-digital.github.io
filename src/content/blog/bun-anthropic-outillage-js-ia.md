---
title: "Bun chez Anthropic : quand l'IA rachète son propre outillage"
description: "Anthropic a racheté Oven, l'équipe derrière Bun, parce que Claude Code est un exécutable Bun. Ce que cette première acquisition dit de l'écosystème JavaScript — et ce qu'elle coûte déjà."
date: 2026-08-21
tags: ["JavaScript", "Bun", "IA", "Open Source"]
cover: /blog/news-bun.webp
---

Il y a une phrase, dans l'annonce du rachat de Bun par Anthropic, qui résume mieux l'opération que n'importe quelle analyse de marché. Elle est de Jarred Sumner, le créateur de Bun :

> « Si Bun casse, Claude Code casse. »

Ce n'est pas une figure de style. Claude Code est distribué comme **un binaire unique compilé avec `bun build --compile`**, sur macOS, Linux et Windows. Le produit d'IA le plus rentable d'Anthropic repose littéralement sur un runtime JavaScript maintenu par une poignée de personnes.

## Le contexte chiffré

L'annonce, en décembre 2025, était double. Anthropic rachetait Oven — première acquisition de son histoire — et révélait au passage que **Claude Code avait atteint un milliard de dollars de revenu annualisé six mois après son lancement public**.

Mets les deux informations côte à côte et la décision devient évidente. Quand un produit à un milliard dépend d'une brique open source, tu n'as que trois options : contribuer, forker, ou acheter.

## Rappel : Bun, c'est quoi exactement

Pour ceux qui ne l'ont jamais sorti du placard, Bun n'est pas « juste un Node.js plus rapide ». C'est quatre outils dans un seul binaire :

- un **runtime** JavaScript, bâti sur JavaScriptCore (le moteur de Safari) et non sur V8 ;
- un **gestionnaire de paquets**, souvent plus rapide que npm d'un ordre de grandeur ;
- un **bundler** ;
- un **lanceur de tests**.

```bash
# les quatre casquettes, une seule commande
bun install
bun test
bun build ./src/index.ts --compile --outfile monapp
bun run monapp
```

C'est ce `--compile` qui intéresse Anthropic : il transforme un projet TypeScript en exécutable autonome, sans demander à l'utilisateur d'installer quoi que ce soit. Pour distribuer un outil en ligne de commande à des millions de développeurs, c'est difficile à battre.

## Les engagements — et ce qu'ils valent

Anthropic a pris les engagements attendus : licence MIT conservée, développement public sur GitHub, feuille de route inchangée, équipe maintenue.

Sur le papier, tout va bien. Une analyse de RedMonk publiée en juin 2026 nuance sérieusement le tableau : sur environ sept employés d'Oven identifiables avant le rachat, **au moins quatre sont partis ou ont cessé de contribuer**. Un committer actif est passé de 745 commits à… un.

Le projet reste ouvert, la licence reste MIT. Mais ce n'est plus la même équipe qui l'écrit.

## Ce que ça change pour nous

Je n'en tire pas de conclusion catastrophiste — j'y vois surtout un déplacement des lignes qu'il vaut mieux voir venir.

**L'outillage JS devient une infrastructure d'IA.** Bun n'est plus un projet communautaire qui cherche sa place face à Node et Deno : c'est une dépendance stratégique d'un acteur majeur de l'IA. Cela lui garantit des moyens, et l'expose à des priorités qui ne sont pas forcément les nôtres. Si demain un arbitrage oppose « ce dont Claude Code a besoin » à « ce dont les applications serveur ont besoin », on sait déjà qui gagne.

**La licence protège le code, pas la trajectoire.** MIT garantit que tu pourras toujours forker. Elle ne garantit ni que le projet ira dans la direction qui t'arrange, ni qu'il restera assez de monde pour maintenir un fork sérieux. C'est exactement la leçon que la communauté avait tirée d'autres rachats, et elle se répète.

**En pratique, aujourd'hui, rien ne brûle.** `bun install` et l'image Docker `oven/bun:1` livrent toujours le runtime 1.3.x écrit en Zig ; la réécriture Rust reste expérimentale. Si tu utilises Bun en production, tu peux continuer sereinement — en gardant, comme toujours, une porte de sortie testée vers Node.

## Ma position

J'utilise Node pour tout ce qui doit tourner longtemps et sans surprise, et Bun là où sa vitesse fait une vraie différence : installation de dépendances et scripts de build. C'est une position tiède, et c'est volontaire.

> Ce que je retiens surtout, c'est le renversement : pendant vingt ans, l'outillage JavaScript a été construit par des entreprises du web pour le web. Il commence à être construit par des entreprises d'IA pour l'IA. Le code source reste ouvert, mais la question « à qui sert cet outil ? » n'a plus la même réponse.

Ça vaut le coup d'y penser avant de mettre une brique au centre de son architecture — pas pour s'en priver, juste pour savoir ce qu'on signe.
