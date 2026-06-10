---
stepsCompleted:
  - 1
  - 2
inputDocuments:
  - /home/thomas/perso/git/training-trade/_bmad-output/planning-artifacts/briefs/brief-training-trade-2026-06-08/brief.md
  - /home/thomas/perso/git/training-trade/_bmad-output/planning-artifacts/briefs/brief-training-trade-2026-06-08/addendum.md
  - /home/thomas/perso/git/training-trade/_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md
  - /home/thomas/perso/git/training-trade/_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md
  - /home/thomas/perso/git/training-trade/_bmad-output/planning-artifacts/architecture.md
workflowType: 'epics-and-stories'
lastStep: 2
status: 'in_progress'
project_name: training-trade
user_name: Thomas
date: '2026-06-08'
---

# training-trade - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for training-trade, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: L'utilisateur doit pouvoir créer une session de trading simulé.
FR2: L'utilisateur doit pouvoir ouvrir, reprendre et clôturer une session.
FR3: Chaque session doit conserver un historique des décisions enregistrées.
FR4: Chaque session doit être associée à un ou plusieurs actifs suivis pendant l'exercice.
FR5: La session doit pouvoir être utilisée pendant un replay TradingView sans intégration automatique obligatoire en V1.
FR6: L'utilisateur doit pouvoir enregistrer une décision d'achat ou de vente.
FR7: En V1, une décision doit être modélisée uniquement comme `achat` ou `vente`.
FR8: Chaque décision doit être liée à une session donnée.
FR9: Chaque décision doit au minimum contenir le type d'action, l'actif concerné, la quantité, le prix de référence, et un horodatage logique de la session.
FR10: L'utilisateur doit pouvoir ajouter un commentaire court ou un motif de décision.
FR11: L'utilisateur doit pouvoir corriger ou annuler une décision selon des règles explicites.
FR12: Le système doit maintenir un portefeuille virtuel à partir des décisions enregistrées.
FR13: Le portefeuille doit gérer plusieurs actifs dès la V1.
FR14: Le système doit suivre le cash disponible, les positions ouvertes et la valeur totale du portefeuille.
FR15: Le système doit refléter l'effet de chaque décision sur le portefeuille simulé.
FR16: Le système doit conserver l'état du portefeuille au fil du temps pour permettre la comparaison entre sessions.
FR17: La V1 doit utiliser un capital initial fixe et une devise de référence unique.
FR18: La V1 doit calculer la performance avec une logique de coût moyen simple et sans automatisation broker.
FR19: Le système doit afficher l'évolution du capital simulé.
FR20: Le système doit produire une courbe d'équité ou un équivalent lisible.
FR21: Le système doit calculer des statistiques de base sur les trades.
FR22: Les statistiques de V1 doivent au minimum permettre de voir le nombre de trades, le taux de réussite, le gain ou la perte nette, le drawdown maximum, la durée moyenne des trades et l'évolution globale de la performance.
FR23: Le système doit permettre de filtrer ou regrouper les performances par session.
FR24: L'utilisateur doit pouvoir relire une session et voir les décisions dans l'ordre.
FR25: L'utilisateur doit pouvoir visualiser le résultat d'une session et son impact sur le portefeuille.
FR26: L'utilisateur doit pouvoir comparer au moins une vue globale du portefeuille et une vue par session.

### NonFunctional Requirements

NFR1: Le produit doit rester orienté usage personnel avec un utilisateur principal.
NFR2: Le produit doit être utilisé principalement sur desktop.
NFR3: La saisie doit rester rapide pendant une session de replay.
NFR4: Le portefeuille simulé doit rester lisible et cohérent dans le temps.
NFR5: Les corrections de décisions doivent conserver une traçabilité si elles affectent les statistiques.
NFR6: La V1 doit rester simple avant tout enrichissement.
NFR7: Le produit ne doit pas dépendre du trading réel, d'un broker ou d'une automatisation d'ordres.
NFR8: L'intégration automatique TradingView ne doit pas être requise en V1.
NFR9: Le produit doit séparer clairement le journal narratif externe de la mécanique de simulation.

### Additional Requirements

- Le starter architecture retenu combine Plasmo pour l'extension navigateur et Next.js pour l'application de revue et la couche backend-for-frontend.
- Le produit doit être structuré en monorepo avec `apps/extension`, `apps/review`, `packages/domain`, `packages/db` et `packages/shared`.
- L'extension ne doit jamais accéder directement à la base de données.
- Les route handlers Next.js doivent orchestrer validation, métier et persistance via `packages/domain` et `packages/db`.
- SQLite est la source de vérité pour les données persistantes de simulation.
- Drizzle doit porter le schéma SQL et l'accès aux données.
- `packages/domain` doit contenir les règles métier de sessions, décisions, portefeuille et statistiques.
- `packages/shared` doit contenir les schémas de validation, DTO et constantes partagées.
- Les réponses API publiques doivent suivre le format `{ data, error, meta }` avec erreurs structurées.
- Les horodatages à l'API doivent utiliser ISO 8601.
- La base de données doit utiliser `snake_case` tandis que les API exposent du `camelCase`.
- Les décisions doivent rester auditables si elles modifient les métriques.
- L'expérience TradingView doit être limitée à la capture et au contexte de saisie, sans dépendance produit forte.
- Le schéma détaillé SQLite, la liste exacte des endpoints et la stratégie de test restent des gaps à traiter dans l'implémentation.

### UX Design Requirements

Aucun document UX dédié n'a été trouvé. Aucun UX-DR spécifique n'est disponible à ce stade.

### FR Coverage Map

FR1: Epic 1 - Créer une session de trading simulé
FR2: Epic 1 - Ouvrir, reprendre et clôturer une session
FR3: Epic 1 - Conserver l’historique des décisions
FR4: Epic 1 - Associer un ou plusieurs actifs à la session
FR5: Epic 1 - Utiliser la session pendant un replay TradingView sans intégration auto
FR6: Epic 1 - Enregistrer une décision d’achat ou de vente
FR7: Epic 1 - Limiter les décisions V1 à achat/vente
FR8: Epic 1 - Lier chaque décision à une session
FR9: Epic 1 - Capturer les champs minimaux de la décision
FR10: Epic 1 - Ajouter un commentaire court ou un motif
FR11: Epic 1 - Corriger ou annuler une décision avec des règles explicites
FR12: Epic 2 - Maintenir le portefeuille virtuel
FR13: Epic 2 - Gérer plusieurs actifs dès la V1
FR14: Epic 2 - Suivre cash, positions ouvertes et valeur totale
FR15: Epic 2 - Refléter l’effet de chaque décision sur le portefeuille
FR16: Epic 2 - Conserver l’état du portefeuille dans le temps
FR17: Epic 2 - Utiliser un capital initial fixe et une devise unique
FR18: Epic 2 - Calculer la performance avec un coût moyen simple sans broker
FR19: Epic 2 - Afficher l’évolution du capital simulé
FR20: Epic 2 - Produire une courbe d’équité lisible
FR21: Epic 2 - Calculer des statistiques de base
FR22: Epic 2 - Exposer le nombre de trades, win rate, PnL net, drawdown max, durée moyenne et performance globale
FR23: Epic 2 - Filtrer ou regrouper les performances par session
FR24: Epic 3 - Relire une session et voir les décisions dans l’ordre
FR25: Epic 3 - Visualiser le résultat d’une session et son impact sur le portefeuille
FR26: Epic 3 - Comparer une vue globale du portefeuille et une vue par session

## Epic List

### Epic 1: Lancer et piloter une session de simulation
L’utilisateur peut créer, ouvrir, reprendre et clôturer une session, puis enregistrer rapidement ses décisions buy/sell pendant un replay.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11

### Epic 2: Maintenir le portefeuille simulé et mesurer la performance
L’utilisateur peut voir son portefeuille virtuel évoluer, suivre le capital, la courbe d’équité et les statistiques de base sur ses trades.
**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23

### Epic 3: Revoir et comparer ses sessions
L’utilisateur peut relire une session dans l’ordre, visualiser son impact sur le portefeuille, et comparer la vue globale avec les vues par session.
**FRs covered:** FR24, FR25, FR26

## Epic 1: Lancer et piloter une session de simulation

L’utilisateur peut créer, ouvrir, reprendre et clôturer une session, puis enregistrer rapidement ses décisions buy/sell pendant un replay.

### Story 1.1: Créer et ouvrir une session

As a trader amateur,
I want créer une nouvelle session de trading simulé et l’ouvrir immédiatement,
So that je puisse commencer un replay sans friction.

**Acceptance Criteria:**

**Given** qu’aucune session active n’existe
**When** l’utilisateur crée une nouvelle session
**Then** la session est persistée avec un identifiant unique et un statut ouvert
**And** la session est disponible immédiatement pour la saisie de décisions

**Given** qu’une session vient d’être créée
**When** l’utilisateur l’ouvre
**Then** le système affiche la session active et son contexte minimal
**And** la session peut recevoir des décisions liées à cette session

### Story 1.2: Reprendre et clôturer une session

As a trader amateur,
I want reprendre une session existante et la clôturer quand la session est terminée,
So that je puisse gérer proprement mon cycle de pratique.

**Acceptance Criteria:**

**Given** une session existante en statut ouvert ou suspendu
**When** l’utilisateur la reprend
**Then** la session redevient active pour la saisie
**And** l’historique de ses décisions reste intact

**Given** une session active
**When** l’utilisateur la clôture
**Then** la session passe en statut clôturé
**And** aucune nouvelle décision ne peut y être ajoutée tant qu’elle n’est pas rouverte explicitement selon les règles du produit

### Story 1.3: Associer des actifs à une session

As a trader amateur,
I want associer un ou plusieurs actifs à une session,
So that je puisse cadrer le replay autour des instruments suivis.

**Acceptance Criteria:**

**Given** une session ouverte
**When** l’utilisateur ajoute un actif suivi
**Then** l’actif est enregistré comme lié à la session
**And** la session peut contenir plusieurs actifs

**Given** une session avec des actifs déjà liés
**When** l’utilisateur consulte la session
**Then** les actifs associés sont visibles

### Story 1.4: Capturer une décision buy/sell

As a trader amateur,
I want enregistrer une décision d’achat ou de vente avec ses informations minimales,
So that chaque action de simulation devienne un événement exploitable.

**Acceptance Criteria:**

**Given** une session ouverte et un actif associé ou sélectionné
**When** l’utilisateur enregistre une décision
**Then** la décision est limitée à `achat` ou `vente`
**And** la décision contient au minimum le type d’action, l’actif, la quantité, le prix de référence et un horodatage logique de session
**And** la décision est liée à la session active

**Given** une décision enregistrée
**When** l’utilisateur consulte l’historique de la session
**Then** la décision apparaît dans l’ordre chronologique de saisie

### Story 1.5: Ajouter un commentaire et corriger une décision

As a trader amateur,
I want ajouter un commentaire court et corriger ou annuler une décision,
So that je garde le contexte de mes choix et une trace fiable des modifications.

**Acceptance Criteria:**

**Given** une décision existante dans une session
**When** l’utilisateur ajoute un commentaire court ou un motif
**Then** le commentaire est persisté avec la décision
**And** il reste consultable lors de la relecture

**Given** une décision existante modifiable
**When** l’utilisateur la corrige ou l’annule
**Then** le système applique la règle explicite prévue par le produit
**And** la modification reste auditable si elle impacte les statistiques

### Story 1.6: Utiliser la session pendant un replay TradingView

As a trader amateur,
I want utiliser la session pendant un replay TradingView sans intégration automatique obligatoire,
So that je puisse rester concentré sur la pratique sans dépendre d’une intégration lourde.

**Acceptance Criteria:**

**Given** une session ouverte
**When** l’utilisateur l’utilise pendant un replay TradingView
**Then** le flux de capture reste possible sans synchronisation automatique obligatoire
**And** la session reste exploitable même si TradingView n’envoie aucune donnée automatique

### Story 1.7: Afficher l’actif courant et capturer buy/sell par quantité depuis TradingView

As a trader amateur,
I want l’extension affiche automatiquement l’actif courant de TradingView et me laisse seulement saisir la quantité avant de cliquer sur acheter ou vendre,
So that je puisse enregistrer une décision sans ajouter manuellement l’actif dans la session.

**Acceptance Criteria:**

**Given** une session ouverte dans l’extension et un graphique TradingView actif
**When** la popup s’ouvre
**Then** l’extension affiche l’actif courant détecté depuis TradingView de façon visible dans la capture
**And** le prix courant / de référence détecté est affiché comme contexte de la saisie
**And** l’utilisateur comprend immédiatement sur quel instrument il agit sans ouvrir la liste des actifs

**Given** l’actif courant est détecté correctement
**When** l’utilisateur veut enregistrer une décision
**Then** le chemin normal de capture ne demande que la quantité désirée
**And** l’utilisateur peut cliquer directement sur `Acheter` ou `Vendre`
**And** il n’a pas à choisir manuellement un actif dans la popup tant que la détection TradingView fonctionne

**Given** l’actif courant n’est pas encore lié à la session active
**When** la popup prépare la capture
**Then** l’extension lie automatiquement cet actif à la session via l’API review existante
**And** si l’actif est déjà lié, l’entrée existante est réutilisée sans duplication
**And** la capture peut continuer sans passage manuel par l’app de revue

**Given** la popup est ouverte hors TradingView, ou le DOM de TradingView a changé, ou le prix / symbole ne peut pas être lu de façon fiable
**When** l’extension ne peut pas déterminer l’actif courant
**Then** la popup reste utilisable sans état bloquant
**And** elle n’invente pas un actif incorrect à partir d’une lecture partielle
**And** un fallback manuel reste possible si nécessaire

<!-- Epic sections follow -->

## Epic 2: Maintenir le portefeuille simulé et mesurer la performance

L’utilisateur peut voir son portefeuille virtuel évoluer, suivre le capital, la courbe d’équité et les statistiques de base sur ses trades.

### Epic 2 Data Contract

Epic 2 relies on a single accounting truth. The UI can read derived views, but it must not invent portfolio state.

**Source of truth**
- A portfolio is derived from the ordered sequence of effective decisions plus the initial portfolio snapshot.
- The canonical state lives in the portfolio ledger / snapshots, not in the chart component and not in the session record.
- Every read model in 2.3, 2.4, and 2.5 must derive from the same underlying data.

**Canonical terms**
- `capital initial`: starting capital defined by story 2.1.
- `cash`: liquid balance available in the reference currency.
- `position`: quantity held for one asset, with its average cost basis.
- `portfolio value`: `cash + market value of positions`.
- `equity`: the time series representation of `portfolio value`.
- `PnL réalisé`: profit or loss realized when closing or reducing positions.
- `PnL non réalisé`: profit or loss implied by open positions at the latest reference price.
- `drawdown`: decline from a prior equity peak, expressed from the same equity series used by the curve.

**Ordering and timing**
- A decision becomes effective when the system records it as an applied portfolio event, in the order defined by the session timeline.
- The V1 calculation is long-only, uses the decision `referencePrice`, and does not rely on broker execution, partial fills, fees, slippage, or hidden market data.
- The UI must not reinterpret timing or recompute values from scratch.

**Invariants**
- `cash + market value = portfolio value`
- historical snapshots do not rewrite the past
- charting does not change accounting values
- stats read the same effective decision timeline as the portfolio views

**Story responsibilities**
- Story 2.1 defines the starting capital and reference currency.
- Story 2.2 mutates the portfolio from each buy/sell decision.
- Story 2.3 persists and compares historical snapshots by session.
- Story 2.4 visualizes the derived equity series only.
- Story 2.5 computes metrics from the same effective data, grouped by session.

**Must-not-skip example shape**
- start from the initial portfolio snapshot
- apply one buy decision
- apply one later reference price / market value update
- apply one sell decision
- read the resulting history, equity curve, and stats from the same underlying ledger

### Story 2.1: Initialiser le portefeuille simulé

As a trader amateur,
I want démarrer une simulation avec un capital initial fixe et une devise de référence unique,
So that le cadre financier de la session soit défini clairement dès le départ.

**Acceptance Criteria:**

**Given** une nouvelle session de simulation
**When** le portefeuille simulé est initialisé
**Then** le capital initial est défini selon la règle de V1
**And** une seule devise de référence est utilisée

**Given** un portefeuille initialisé
**When** l’utilisateur consulte l’état de départ
**Then** le cash initial et la devise sont visibles

### Story 2.2: Appliquer une décision au portefeuille

As a trader amateur,
I want voir chaque décision buy/sell mettre à jour le cash, les positions et la valeur totale du portefeuille,
So that l’impact de mes choix soit immédiatement reflété par la simulation.

**Acceptance Criteria:**

**Given** un portefeuille initialisé et une décision valide
**When** la décision est appliquée
**Then** le cash disponible, les positions ouvertes et la valeur totale sont recalculés
**And** la simulation gère plusieurs actifs
**And** la logique de coût moyen simple est respectée

**Given** une décision appliquée
**When** le système persiste l’état du portefeuille
**Then** le nouvel état reste cohérent avec la décision enregistrée

### Story 2.3: Conserver l’historique du portefeuille dans le temps

As a trader amateur,
I want conserver l’état du portefeuille au fil du temps,
So that je puisse comparer l’évolution de ma simulation entre décisions et entre sessions.

**Acceptance Criteria:**

**Given** plusieurs décisions appliquées dans le temps
**When** l’utilisateur consulte l’historique du portefeuille
**Then** les états successifs sont conservés et consultables
**And** chaque état peut être rattaché à la session correspondante

**Given** deux sessions distinctes
**When** l’utilisateur compare leurs états
**Then** le système peut distinguer les évolutions de portefeuille de chaque session

### Story 2.4: Afficher le capital et la courbe d’équité

As a trader amateur,
I want visualiser l’évolution du capital simulé avec une courbe lisible,
So that je comprenne rapidement si ma session progresse ou se dégrade.

**Acceptance Criteria:**

**Given** une session avec au moins une décision appliquée
**When** l’utilisateur ouvre la vue de performance
**Then** l’évolution du capital simulé est affichée
**And** une courbe d’équité ou un équivalent lisible est visible

**Given** une série de décisions
**When** la vue de performance est recalculée
**Then** la courbe reflète les mises à jour de la simulation

### Story 2.5: Calculer les statistiques de performance

As a trader amateur,
I want consulter les statistiques de base de ma simulation,
So that je puisse mesurer la qualité et la régularité de mes trades.

**Acceptance Criteria:**

**Given** une session ou un portefeuille contenant des trades
**When** l’utilisateur consulte les statistiques
**Then** le système affiche au minimum le nombre de trades, le taux de réussite, le gain ou la perte nette, le drawdown maximum, la durée moyenne des trades et l’évolution globale de la performance
**And** les statistiques peuvent être regroupées ou filtrées par session

**Given** des décisions corrigées ou annulées
**When** les statistiques sont recalculées
**Then** le résultat reste cohérent avec les règles d’auditabilité définies

## Epic 3: Revoir et comparer ses sessions

L’utilisateur peut relire une session dans l’ordre, visualiser son impact sur le portefeuille, et comparer la vue globale avec les vues par session.

### Story 3.1: Relire la chronologie d’une session

As a trader amateur,
I want voir les décisions d’une session dans l’ordre exact où elles ont été saisies,
So that je puisse retrouver le fil de ma pratique sans ambiguïté.

**Acceptance Criteria:**

**Given** une session contenant plusieurs décisions
**When** l’utilisateur ouvre la vue de relecture
**Then** les décisions sont affichées dans l’ordre chronologique de saisie
**And** chaque décision reste rattachée à sa session

**Given** une session avec des décisions corrigées ou annulées
**When** l’utilisateur consulte la chronologie
**Then** l’historique affiché reste cohérent avec les règles d’auditabilité

### Story 3.2: Visualiser l’impact d’une session sur le portefeuille

As a trader amateur,
I want voir le résultat d’une session et son effet sur le portefeuille simulé,
So that je comprenne ce que mes décisions ont produit concrètement.

**Acceptance Criteria:**

**Given** une session terminée
**When** l’utilisateur ouvre sa vue récapitulative
**Then** le système affiche le résultat de la session
**And** l’impact sur le portefeuille simulé est visible
**And** les principaux indicateurs de la session restent consultables

### Story 3.3: Comparer vue globale et vue par session

As a trader amateur,
I want comparer une vue globale du portefeuille avec une vue par session,
So that je puisse relier mes performances locales à l’évolution d’ensemble.

**Acceptance Criteria:**

**Given** plusieurs sessions enregistrées
**When** l’utilisateur ouvre la vue de comparaison
**Then** le système affiche une vue globale du portefeuille
**And** il affiche au moins une vue par session

**Given** des sessions avec des performances différentes
**When** l’utilisateur compare les vues
**Then** les différences de performance sont lisibles et attribuées à la bonne session
