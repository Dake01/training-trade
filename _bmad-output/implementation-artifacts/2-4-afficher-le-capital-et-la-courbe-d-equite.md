---
story_id: "2.4"
story_key: "2-4-afficher-le-capital-et-la-courbe-d-equite"
epic: "2"
status: review
baseline_commit: "317448c"
created: "2026-06-10T13:44:25+02:00"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 2.4: Afficher le capital et la courbe d'équité

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,
I want visualiser l'évolution du capital simulé avec une courbe lisible,
so that je comprenne rapidement si ma session progresse ou se dégrade.

## Acceptance Criteria

1. **Affichage du capital simulé et de la courbe d'équité**
   - Given une session avec au moins une décision appliquée
   - When l'utilisateur ouvre la vue de performance
   - Then l'évolution du capital simulé est affichée
   - And une courbe d'équité ou un équivalent lisible est visible
   - And le capital courant, la devise de référence et le dernier point de la courbe restent cohérents avec l'état du portefeuille

2. **Recalcul déterministe à partir des snapshots**
   - Given une série de décisions appliquées à une session
   - When la vue de performance est recalculée ou rouverte
   - Then la courbe reflète les mises à jour de la simulation dans un ordre stable
   - And le résultat ne dépend pas d'un recalcul manuel côté UI
   - And les snapshots historiques servent de source de vérité pour la série temporelle

3. **Stabilité de lecture après nouvelles décisions**
   - Given une session déjà consultée puis enrichie par de nouvelles décisions
   - When l'utilisateur recharge la vue de performance
   - Then la courbe et le capital affichés prennent en compte les données les plus récentes
   - And les anciens points restent identifiables dans la série
   - And un refresh ne duplique pas les points de la courbe

4. **Compatibilité avec les corrections et annulations**
   - Given une session contenant des décisions corrigées ou annulées
   - When l'utilisateur consulte la vue de performance
   - Then la courbe reste cohérente avec la décision effective ordonnée
   - And le capital affiché reste auditable face aux amendements
   - And la vue n'expose pas les décisions brutes comme si elles étaient toutes actives

## Tasks / Subtasks

- [x] Définir les contrats partagés de la vue de performance (AC: 1, 2, 3, 4)
  - [x] Étendre `packages/shared/src/schemas/portfolio.ts` avec les DTO de performance, d'équity point et de série temporelle.
  - [x] Exporter les nouveaux contrats depuis `packages/shared/src/index.ts`.
  - [x] Réutiliser les constantes V1 de la story 2.1 et les snapshots/historiques des stories 2.2 et 2.3 sans redéfinir les mêmes champs.
  - [x] Représenter la série temporelle avec des montants exacts, des timestamps ISO et un ordre stable.
  - [x] Garder le contrat explicite mais minimal: capital courant, devise, points d'équité, valeur totale, drawdown éventuel de la courbe si utile à l'affichage, et métadonnées de session.

- [x] Implémenter le calcul de la courbe dans `packages/domain` (AC: 1, 2, 3, 4)
  - [x] Créer ou compléter `packages/domain/src/portfolio/` avec des helpers de projection de performance à partir des snapshots portefeuille.
  - [x] Faire porter la règle métier au domaine, pas au handler ni au composant React.
  - [x] Construire la série temporelle à partir de l'historique persistant de la session, pas à partir d'un recalcul local du front-end.
  - [x] Garantir un ordre stable et déterministe des points de courbe.
  - [x] Préserver la séparation entre état courant, historique de snapshots et visualisation de performance.

- [x] Exposer la vue de performance via l'API review (AC: 1, 2, 3, 4)
  - [x] Ajouter le route handler Next.js correspondant, par exemple `apps/review/src/app/api/sessions/[id]/portfolio/performance/route.ts`.
  - [x] Garder les handlers minces et testables; le calcul doit rester dans `packages/domain`.
  - [x] Réutiliser les données de portefeuille et d'historique déjà persistées pour produire la courbe.
  - [x] Exposer une réponse adaptée à la visualisation plutôt qu'un simple dump brut de snapshots.
  - [x] Ne pas mélanger ici les statistiques détaillées de la story 2.5.

- [x] Afficher la performance dans l'interface de revue (AC: 1, 2, 3)
  - [x] Étendre `apps/review/src/components/SessionPanel.tsx` ou la vue de session équivalente pour afficher le capital courant et une courbe d'équité lisible.
  - [x] Préserver une lecture rapide: axe temporel simple, dernier point visible, variation du capital compréhensible en un coup d'œil.
  - [x] Garder l'UX desktop-first et éviter une visualisation surchargée.
  - [x] Ne pas ajouter ici les indicateurs de performance avancés ou les agrégats détaillés de la story 2.5.

- [x] Couvrir la story par des tests ciblés (AC: 1, 2, 3, 4)
  - [x] Tests shared: validation des DTO de performance et de courbe.
  - [x] Tests domaine: projection d'une courbe stable depuis snapshots/historique, recalcul déterministe, compatibilité avec corrections et annulations.
  - [x] Tests API/UI: la vue de performance renvoie et affiche le capital + la courbe attendus, et un refresh après nouvelle décision met à jour la série sans duplication.
  - [x] Ajouter au minimum un test vertical: session ouverte -> portefeuille initialisé -> plusieurs décisions -> consultation de la vue de performance -> courbe cohérente avec les snapshots.

## Dev Notes

### Contexte métier

- Cette story couvre FR19 et FR20: le système doit afficher l'évolution du capital simulé et une courbe d'équité lisible. [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 2 / Story 2.4]
- Le PRD insiste sur la lisibilité de la progression du portefeuille virtuel et sur la capacité à mesurer rapidement l'évolution de la simulation. [Source: `_bmad-output/planning-artifacts/prd*.md` > Objectives, Success Metrics, Scope for V1]
- L'addendum rappelle que la V1 reste simple, avec une seule devise de référence et un modèle à coût moyen; la courbe doit être une visualisation de cette simulation, pas un moteur d'analyse avancée. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories]
- Les stories 2.1, 2.2 et 2.3 ont déjà posé le bootstrap du portefeuille, l'application des décisions et l'historique consultable. Cette story transforme ces données en représentation de performance.
- Les corrections et annulations de décisions doivent déjà être intégrées via la décision effective ordonnée; la courbe doit refléter cet état effectif.

### État actuel à prendre en compte

- `packages/domain/src/portfolio/` n'existe pas encore ou n'expose pas encore de projection de courbe d'équité.
- `packages/db/src/schema/` n'a pas besoin d'un nouveau concept métier si les snapshots existants suffisent pour la série temporelle.
- `apps/review/src/app/api/sessions/[id]/portfolio/performance/` n'existe pas encore.
- `apps/review/src/components/SessionPanel.tsx` affiche déjà la session, les actifs, les décisions et potentiellement l'état portefeuille, mais pas une courbe de performance.
- `packages/domain/src/decisions/amendments/listDecisionTimeline.ts` et les snapshots portefeuille constituent la base de vérité pour la projection de performance.

### Décisions de cadrage pour cette story

- La courbe d'équité doit être calculée à partir des données persistées, pas à partir d'un calcul du front-end.
- La vue doit être simple et lisible: capital courant, courbe lisible, dernier point mis en évidence.
- La courbe doit rester stable au rechargement, même si la session continue d'évoluer.
- L'affichage doit refléter la décision effective ordonnée et non un flux brut non filtré.
- Cette story ne doit pas introduire les statistiques de performance détaillées. Le nombre de trades, win rate, drawdown max complet et durée moyenne relèvent de la story 2.5.

### Architecture à respecter

- `packages/domain` contient les règles métier de sessions, décisions, portefeuille et stats; le calcul de performance appartient donc au domaine, pas au handler React ni à la DB seule. [Source: `_bmad-output/planning-artifacts/architecture.md` > Service Boundaries]
- `packages/db` contient le schéma Drizzle, le client SQLite et les repositories. Garder le mapping `snake_case` -> `camelCase` à cette couche. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- `apps/review/src/app/api/*` est la couche d'exposition HTTP. Les handlers doivent rester minces et testables, avec le maximum de logique dans `packages/domain` et `packages/db`. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- Le repo réel utilise `apps/review/src/app/api/sessions/...` et `apps/review/src/server/...`; suivre cette structure actuelle plutôt que les exemples conceptuels plus anciens du document d'architecture.
- `packages/shared` porte les contrats publics et les schémas de validation. Si la vue de performance devient visible via API, garder un DTO explicite et stable dès cette story.

### Fichiers existants à modifier et état actuel

- `packages/domain/src/decisions/amendments/listDecisionTimeline.ts`
  - État actuel: expose la timeline effective ordonnée des décisions d'une session.
  - Changement attendu: réutiliser cette timeline et les snapshots portefeuille pour construire la courbe de performance.
  - À préserver: ordre stable, auditabilité et séparation entre décision brute et état effectif.

- `packages/domain/src/decisions/captureDecision.ts`
  - État actuel: capture la décision sans calculer portefeuille, PnL ou stats.
  - Changement attendu: brancher proprement le flux qui alimente la lecture de performance sans déplacer la logique métier dans le handler.
  - À préserver: validation session/actif, atomicité de la capture, séparation des responsabilités.

- `packages/domain/src/sessions/createSession.ts`
  - État actuel: crée et ouvre la session.
  - Changement attendu: garantir qu'une session dispose d'un portefeuille et d'un historique exploitables pour la visualisation de performance.
  - À préserver: invariants de session, timestamps ISO, tests existants.

- `packages/db/src/client.ts`
  - État actuel: `ensureSchema` crée les tables sessions, assets, session_assets, decisions et decision_amendments.
  - Changement attendu: si nécessaire, ajouter les structures permettant de lire rapidement l'historique utile à la courbe sans casser les bases déjà créées.
  - À préserver: `DEFAULT_DEV_DATABASE_PATH`, `resolveDatabasePath`, `:memory:` en tests, `foreign_keys = ON`, `better-sqlite3` synchrone.

- `packages/db/src/schema/index.ts`
  - État actuel: exporte les schémas sessions/assets/decisions/decision_amendments.
  - Changement attendu: exporter le futur schéma portfolio si la lecture de performance y dépend.
  - À préserver: le mapping Drizzle existant et les conventions de nommage.

- `apps/review/src/server/decisionHandlers.ts`
  - État actuel: orchestre la capture et la lecture des décisions.
  - Changement attendu: exposer ou consommer les services de lecture de performance sans alourdir le handler.
  - À préserver: responses structurées, runtime Node, handlers minces.

- `apps/review/src/app/api/sessions/[id]/portfolio/route.ts`
  - État actuel: lit l'état courant du portefeuille.
  - Changement attendu: rester la lecture du snapshot courant, tout en servant de base à la performance.
  - À préserver: runtime Node, route dynamique, réponse JSON structurée.

- `apps/review/src/components/SessionPanel.tsx`
  - État actuel: affiche la session, les actifs et les décisions.
  - Changement attendu: afficher le capital courant et une courbe d'équité lisible.
  - À préserver: UX compacte, desktop-first, rafraîchissement simple et lisible.

### Contrats API recommandés

`GET /api/sessions/[id]/portfolio/performance`
- Sert à lire la série de performance d'une session donnée.
- Retourne le capital courant et les points de courbe nécessaires au rendu.
- Doit être consultable juste après qu'une décision a modifié le portefeuille.

Réponse de lecture recommandée:

```json
{
  "data": {
    "performance": {
      "sessionId": "uuid",
      "referenceCurrency": "EUR",
      "initialCapital": "10000",
      "currentCapital": "10031.20",
      "points": [
        {
          "index": 0,
          "snapshotId": "uuid",
          "timestamp": "2026-06-10T13:32:54.000Z",
          "equity": "10000"
        },
        {
          "index": 1,
          "snapshotId": "uuid",
          "timestamp": "2026-06-10T13:40:02.000Z",
          "equity": "10031.20"
        }
      ]
    }
  },
  "error": null,
  "meta": {}
}
```

Notes:
- Le capital courant doit reprendre la source de vérité de la story 2.2/2.3, pas un calcul UI ad hoc.
- Les points de courbe doivent rester ordonnés, stables et rattachés à la session.
- L'équity curve peut être un tracé simple tant qu'elle permet de visualiser la progression ou la dégradation du capital.
- Les statistiques détaillées et les agrégats analytiques ne doivent pas être ajoutés ici.

### Pièges à éviter

1. Ne pas recalculer la courbe dans l'UI. La vue doit lire une série de performance persistée ou projetée par le domaine.
2. Ne pas confondre équity curve et statistiques de performance. Cette story n'implémente pas les métriques avancées.
3. Ne pas introduire de données de marché externes. La courbe doit rester issue du portefeuille simulé.
4. Ne pas mélanger les points de plusieurs sessions.
5. Ne pas casser la stabilité de la courbe lors d'un refresh ou d'une nouvelle décision.
6. Ne pas surcharger les handlers API avec la logique de calcul de la courbe.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 2 > Story 2.4]
- [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Functional Requirements, Success Metrics, Scope for V1]
- [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories]
- [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries, Service Boundaries, Requirements to Structure Mapping]
- [Source: `packages/domain/src/decisions/amendments/listDecisionTimeline.ts`]
- [Source: `packages/domain/src/decisions/captureDecision.ts`]
- [Source: `packages/domain/src/sessions/createSession.ts`]
- [Source: `packages/db/src/client.ts`]
- [Source: `packages/db/src/schema/sessions.ts`]
- [Source: `apps/review/src/app/api/sessions/[id]/decisions/route.ts`]
- [Source: `apps/review/src/components/SessionPanel.tsx`]
- [Source: `_bmad-output/implementation-artifacts/2-1-initialiser-le-portefeuille-simule.md`]
- [Source: `_bmad-output/implementation-artifacts/2-2-appliquer-une-decision-au-portefeuille.md`]
- [Source: `_bmad-output/implementation-artifacts/2-3-conserver-l-historique-du-portefeuille-dans-le-temps.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Analyse réalisée à partir des artefacts de planning, des stories 2.1 à 2.3, de l'architecture et des modules sessions/décisions/db existants.
- Aucune implémentation n'a encore été lancée pour cette story au moment de la création du fichier.

### Completion Notes List

- Story créée pour l'affichage de la performance du portefeuille simulé sous forme de capital courant et de courbe d'équité.
- Le scope reste volontairement centré sur la visualisation déterministe et lisible, sans entrer dans les statistiques détaillées de la story 2.5.
- La courbe doit s'appuyer sur les données persistées de portefeuille et rester stable au rechargement.
- Le repo réel continue d'utiliser `apps/review/src/app/api/...` et `apps/review/src/server/...`; la story documente ce chemin réel.
- Ajout des DTO `portfolioEquityPoint`, `portfolioPerformance` et `sessionPortfolioPerformanceResponse`.
- Ajout de `getSessionPortfolioPerformance` côté domaine, projeté depuis l'historique persistant de snapshots.
- Ajout du handler et de la route `GET /api/sessions/[id]/portfolio/performance`.
- Ajout de l'affichage UI compact: capital courant et courbe SVG d'équité rafraîchie au chargement, après capture et après amendement.
- Validations exécutées: `pnpm test` (318 tests), `pnpm typecheck`, `pnpm lint` — toutes vertes.

### Change Log

- 2026-06-10: Implémentation story 2.4 — contrats performance, projection domaine, endpoint API, visualisation UI et tests ciblés.

### File List

- _bmad-output/implementation-artifacts/2-4-afficher-le-capital-et-la-courbe-d-equite.md
- apps/review/__tests__/portfolioHandlers.test.ts
- apps/review/src/app/api/sessions/[id]/portfolio/performance/route.ts
- apps/review/src/components/SessionPanel.tsx
- apps/review/src/server/portfolioHandlers.ts
- packages/domain/src/index.ts
- packages/domain/src/portfolio/getSessionPortfolioPerformance.ts
- packages/domain/src/portfolio/__tests__/getSessionPortfolioPerformance.test.ts
- packages/shared/src/schemas/portfolio.ts
- packages/shared/src/schemas/__tests__/portfolio.test.ts
