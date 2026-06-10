---
title: PRD - Trading Simulation Tracker
status: final
created: 2026-06-08
updated: 2026-06-10
---

# PRD - Trading Simulation Tracker

## Overview

Ce produit est un outil personnel de trading simulé. Il ne remplace pas Notion, qui reste le journal narratif de référence; il sert à tracer les décisions, simuler un portefeuille virtuel multi-actifs et suivre son évolution dans le temps.

L'objectif principal est de transformer des sessions de pratique en données exploitables. Chaque décision d'achat ou de vente alimente un portefeuille simulé, puis des statistiques simples permettent d'évaluer la progression, la discipline et la qualité des choix. Le produit est volontairement centré sur l'exécution de la simulation et la mesure, pas sur le trading réel.

[ASSUMPTION] Le produit sera une application web orientée usage desktop.

## Problem Statement

Aujourd'hui, l'entraînement au trading se fait dans un mélange de replay de marché, de notes dispersées et de reconstruction mentale a posteriori. Notion est utile pour garder le récit et le contexte, mais il n'est pas optimisé pour faire tourner une simulation structurée de portefeuille et produire des métriques fiables.

Sans outil dédié, il devient difficile de relier une décision à son impact réel sur le portefeuille simulé. La conséquence est double: la progression est moins mesurable et l'apprentissage reste flou, car les performances ne sont pas consolidées dans un format suffisamment rigoureux pour dégager des patterns.

## Goals

- Permettre la saisie rapide de décisions de trading pendant une session simulée.
- Maintenir un portefeuille virtuel cohérent à partir des décisions enregistrées.
- Suivre l'évolution du capital et de la courbe d'équité.
- Fournir des statistiques de base sur les trades et la performance.
- Garder la mécanique de simulation distincte du journal narratif dans Notion.

## Non-Goals

- Trading réel.
- Connexion directe à un broker.
- Exécution automatisée d'ordres.
- Analyse quantitative avancée au lancement.
- Partage social, gamification ou coaching IA poussé.
- Remplacer Notion comme journal principal.

## Users and Use Context

L'utilisateur principal est un trader amateur qui veut progresser par la pratique répétée et l'analyse de ses décisions.

Le contexte d'usage attendu est une session d'entraînement personnelle, en particulier en replay de marché. L'utilisateur observe un actif, prend une décision, enregistre l'action, puis laisse le système refléter l'effet de cette décision sur un portefeuille simulé multi-actifs.

[ASSUMPTION] Le produit n'est pas conçu d'abord pour un usage d'équipe, un cadre pédagogique, ou un public large.

## Product Principles

- Séparer clairement le journal narratif et la simulation opérationnelle.
- Réduire la friction de saisie pendant une session.
- Préserver la lisibilité du portefeuille et de l'historique.
- Rendre les performances comparables dans le temps.
- Commencer simple, puis enrichir après validation de l'usage de base.

## Core User Journey

1. L'utilisateur ouvre une session d'entraînement.
2. Il choisit un actif et lance ou consulte un replay de marché dans TradingView.
3. Il enregistre une décision d'achat ou de vente pendant la session.
4. Le portefeuille virtuel est mis à jour selon la décision enregistrée.
5. L'utilisateur continue la session jusqu'à clôture ou interruption.
6. Le système agrège les trades et affiche l'évolution du capital, les résultats et des statistiques simples.
7. L'utilisateur peut consulter la session plus tard pour comparer performance et discipline.

## Functional Requirements

### Session Management

- FR-1: L'utilisateur doit pouvoir créer une session de trading simulé.
- FR-2: L'utilisateur doit pouvoir ouvrir, reprendre et clôturer une session.
- FR-3: Chaque session doit conserver un historique des décisions enregistrées.
- FR-4: Chaque session doit être associée à un ou plusieurs actifs suivis pendant l'exercice.
- FR-5: La session doit pouvoir être utilisée pendant un replay TradingView sans intégration automatique obligatoire en V1.

### Decision Capture

- FR-6: L'utilisateur doit pouvoir enregistrer une décision d'achat ou de vente.
- FR-7: En V1, une décision doit être modélisée uniquement comme `achat` ou `vente`.
- FR-8: Chaque décision doit être liée à une session donnée.
- FR-9: Chaque décision doit au minimum contenir le type d'action, l'actif concerné, la quantité, le prix de référence, et un horodatage logique de la session.
- FR-10: L'utilisateur doit pouvoir ajouter un commentaire court ou un motif de décision.
- FR-11: L'utilisateur doit pouvoir corriger ou annuler une décision selon des règles explicites.

### Portfolio Simulation

- FR-12: Le système doit maintenir un portefeuille virtuel à partir des décisions enregistrées.
- FR-13: Le portefeuille doit gérer plusieurs actifs dès la V1.
- FR-14: Le système doit suivre le cash disponible, les positions ouvertes et la valeur totale du portefeuille.
- FR-15: Le système doit refléter l'effet de chaque décision sur le portefeuille simulé.
- FR-16: Le système doit conserver l'état du portefeuille au fil du temps pour permettre la comparaison entre sessions.
- FR-17: La V1 doit utiliser un capital initial fixe et une devise de référence unique.
- FR-18: La V1 doit calculer la performance avec une logique de coût moyen simple et sans automatisation broker.

### Performance Tracking

- FR-19: Le système doit afficher l'évolution du capital simulé.
- FR-20: Le système doit produire une courbe d'équité ou un équivalent lisible.
- FR-21: Le système doit calculer des statistiques de base sur les trades.
- FR-22: Les statistiques de V1 doivent au minimum permettre de voir le nombre de trades, le taux de réussite, le gain ou la perte nette, le drawdown maximum, la durée moyenne des trades et l'évolution globale de la performance.
- FR-23: Le système doit permettre de filtrer ou regrouper les performances par session.

### Review and Analysis

- FR-24: L'utilisateur doit pouvoir relire une session et voir les décisions dans l'ordre.
- FR-25: L'utilisateur doit pouvoir visualiser le résultat d'une session et son impact sur le portefeuille.
- FR-26: L'utilisateur doit pouvoir comparer au moins une vue globale du portefeuille et une vue par session.

## Data and Domain Rules

- Le portefeuille simulé est une représentation virtuelle, sans transfert d'argent réel.
- Les décisions sont les événements de vérité du système.
- Une décision doit toujours pouvoir être rattachée à une session.
- Un actif peut être suivi dans plusieurs sessions.
- Le système doit conserver une cohérence entre cash, positions et valeur totale.
- La mécanique exacte de calcul des prix, des entrées et des sorties doit rester simple au départ.
- Les corrections et suppressions de décisions doivent conserver une trace auditables si elles affectent les statistiques.

### Epic 2 Data Contract

Epic 2 is treated as a single accounting pipeline. The same ordered decision timeline and the same portfolio snapshots must feed the current portfolio view, the equity curve, and the session stats.

#### Canonical words

- `capital initial`: the fixed V1 starting capital from story 2.1.
- `cash`: liquid balance in the reference currency.
- `position`: quantity held for one asset, with average cost basis.
- `portfolio value`: `cash + market value of positions`.
- `equity`: the time series of `portfolio value`.
- `PnL réalisé`: realized profit or loss from closed or reduced positions.
- `PnL non réalisé`: mark-to-market profit or loss on open positions.
- `drawdown`: decline from a prior equity peak.

#### Required rules

- A decision becomes effective only when it is recorded as an applied portfolio event in the session timeline.
- V1 stays long-only. It uses the decision `referencePrice` and does not rely on broker execution, partial fills, fees, slippage, or hidden market data.
- Comparison in Epic 2 means comparing sessions and snapshots within the product, not introducing an external benchmark requirement.
- The UI must read derived data only; it must not recompute cash, equity, or stats independently.
- The same data model must back stories 2.3, 2.4, and 2.5 so that charts and stats cannot drift apart.

#### Invariants

- `cash + market value = portfolio value`
- the historical ledger is append-only
- a visualization never rewrites accounting state
- stats consume the same effective decision timeline as the portfolio views

#### Story boundaries

- 2.1 sets the starting capital and currency.
- 2.2 mutates the portfolio from each buy/sell decision.
- 2.3 persists and compares historical snapshots by session.
- 2.4 visualizes the derived equity series only.
- 2.5 computes metrics from the same effective data, grouped by session.

[ASSUMPTION] Les frais, glissements de prix et contraintes avancées de sizing ne sont pas obligatoires en V1.

## Success Metrics

- Le nombre de sessions simulées réellement complétées.
- Le nombre de décisions enregistrées par session.
- La régularité d'usage dans le temps.
- La capacité de l'utilisateur à relire et comparer ses performances.
- La lisibilité de la progression du portefeuille virtuel.
- La perception d'utilité par rapport au journal Notion, qui doit rester séparé.

## Scope for V1

In scope:
- création et gestion de sessions d'entraînement,
- saisie de décisions buy/sell,
- portefeuille virtuel générique multi-actifs,
- mise à jour du capital et des positions,
- courbe d'équité et stats de base,
- consultation de l'historique d'une session,
- saisie manuelle pendant une session de replay.

Out of scope:
- exécution réelle,
- intégration broker,
- automatisation du trading,
- scoring avancé des stratégies,
- fonctionnalités sociales,
- remplacement de Notion,
- synchronisation automatique avec TradingView en V1.

## Assumptions

- Le produit est personnel et centré sur un seul utilisateur principal.
- Le produit sera utilisé surtout sur desktop.
- Le besoin principal est la mesure et non l'exécution.
- La V1 doit rester simple malgré le support multi-actifs.
- Notion reste le journal narratif, le produit n'a pas vocation à le dupliquer.
- Les décisions sont saisies pendant le replay, mais la capture automatique du replay n'est pas requise en V1.

## Open Questions

- Quel niveau de détail exact doit être conservé par décision pour la V1: simple achat/vente + quantité + prix de référence, ou aussi stop, cible, raison et contexte?
- Faut-il une importation manuelle ou semi-automatique des prix de référence dans une version ultérieure?
- Les corrections de décision doivent-elles réécrire l'historique affiché ou seulement créer une version dérivée?
- Les actifs supportés en V1 doivent-ils être librement saisis ou limités à une liste configurable?

## Future Vision

Si le produit fonctionne, il devient un tableau de bord personnel de progression. Chaque session simulée alimente une mémoire structurée des décisions et de leur impact sur le capital, ce qui permet d'identifier des patterns par stratégie, horizon, actif ou contexte de marché.

À plus long terme, l'outil peut devenir une base d'analyse plus fine pour le trader amateur, mais seulement après validation du flux de base et de la qualité du suivi de portefeuille.
