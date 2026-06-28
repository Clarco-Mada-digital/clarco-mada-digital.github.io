---
title: "L'IA accélère le dev… et les failles aussi"
description: "Les agents de code vont vite, parfois trop : patterns non sécurisés, dépendances cachées, attaques sur la supply chain. La sécurité open-source devient un enjeu majeur en 2026."
date: 2026-06-14
tags: ["Sécurité", "Open-source", "IA"]
cover: /blog/news-securite.webp
---

J'aime bricoler la sécurité de mes projets (ce portfolio a sa propre CSP, son garde-fou admin…). Alors le sujet brûlant de 2026 me parle : **la sécurité de la chaîne logicielle à l'ère de l'IA**.

## Le problème

Les outils de code IA font gagner un temps fou. Mais ils peuvent aussi :

- **reproduire des patterns non sécurisés** vus dans leurs données d'entraînement ;
- **introduire des dépendances cachées** qu'on n'a pas vraiment auditées ;
- **accélérer les attaques** contre des paquets vulnérables.

Au point que la sécurité de l'open-source est désormais traitée comme un enjeu d'**infrastructure**, pas juste un détail technique.

## Ce que je fais concrètement

Rien de magique, juste de la discipline :

```bash
# Auditer ses dépendances régulièrement
npm audit

# Verrouiller les versions (lockfile commité)
# Limiter la surface : moins de paquets = moins de risques
```

Et côté navigateur, des garde-fous simples mais efficaces :

- une **Content-Security-Policy** pour cadrer ce qui peut s'exécuter ;
- l'**isolation** du code non fiable dans des iframes `sandbox` ;
- ne jamais committer de **secrets** (variables d'environnement, pas le dépôt).

> Règle d'or : le code généré par une IA, je le **relis comme du code d'un inconnu**. Parce que c'en est un.

## La vraie leçon

L'IA ne remplace pas la vigilance, elle la rend **plus nécessaire**. Plus on produit vite, plus il faut des filets de sécurité automatiques (audit, CI, revues). Aller vite, oui — mais pas les yeux fermés.
