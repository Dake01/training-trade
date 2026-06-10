---
story_id: "2.1"
story_key: "2-1-initialiser-le-portefeuille-simule"
epic: "2"
status: ready-for-dev
baseline_commit: "317448c"
created: "2026-06-10T13:32:54+02:00"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 2.1: Initialiser le portefeuille simulé

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,
I want démarrer une simulation avec un capital initial fixe et une devise de référence unique,
so that le cadre financier de la session soit défini clairement dès le départ.

## Acceptance Criteria

1. **Bootstrap du portefeuille au démarrage d'une nouvelle session**
   - Given une nouvelle session de simulation
   - When le portefeuille simulé est initialisé
   - Then un état initial unique est créé pour la session
   - And le cash initial est égal au capital initial V1
   - And la devise de référence est unique et stable sur toute la session
   - And aucune position ouverte n'est présente au démarrage
   - And la valeur totale initiale est cohérente avec le capital initial

2. **Consultation de l'état de départ**
   - Given un portefeuille initialisé
   - When l'utilisateur consulte l'état de départ
   - Then le cash initial et la devise sont visibles
   - And l'état lu correspond à la session consultée
   - And le résultat ne dépend pas d'un calcul côté UI

3. **Idempotence et cohérence du bootstrap**
   - Given une réouverture, un refresh ou un retry réseau sur la même session
   - When l'initialisation du portefeuille est rejouée
   - Then le système réutilise l'état initial existant sans dupliquer le portefeuille
   - And il ne crée pas une seconde source de vérité pour la même session

## Tasks / Subtasks

- [x] Définir les contrats partagés de portefeuille et les constantes V1 (AC: 1, 2, 3)
  - [x] Créer `packages/shared/src/schemas/portfolio.ts` (ou un module équivalent clairement nommé) pour le DTO du portefeuille initial.
  - [x] Exporter le contrat depuis `packages/shared/src/index.ts`.
  - [x] Centraliser le capital initial V1 et la devise de référence dans une seule source partagée ou domaine; ne pas les hard-coder dans plusieurs fichiers.
  - [x] Valider les montants comme chaînes décimales exactes, cohérentes avec les décisions (pas de flottants JS comme source de vérité).
  - [x] Garder le contrat minimal pour cette story: cash initial, devise, valeur totale initiale, sessionId, timestamps utiles; ne pas introduire ici la logique de positions, de PnL ou d'equity curve.

- [x] Implémenter le bootstrap métier du portefeuille dans `packages/domain` (AC: 1, 3)
  - [x] Créer un sous-module dédié, par exemple `packages/domain/src/portfolio/`, avec `types.ts`, `deps.ts`, `mappers.ts`, `initializePortfolio.ts`, `getSessionPortfolio.ts` et les tests associés.
  - [x] Faire porter la règle métier au domaine, pas au handler ni au composant React.
  - [x] Exiger que la session existe et soit `open` au moment du bootstrap.
  - [x] Démarrer avec un état vide en positions et un cash égal au capital initial.
  - [x] Préparer le modèle pour les stories 2.2 et 2.3: le bootstrap doit pouvoir devenir la première entrée d'un historique de portefeuille, sans faire ici la valorisation dynamique.
  - [x] Rendre l'opération idempotente: si l'état initial existe déjà pour la session, le domaine doit le réutiliser.

- [x] Persister l'état initial dans SQLite/Drizzle (AC: 1, 2, 3)
  - [x] Ajouter le schéma DB correspondant dans `packages/db/src/schema/` avec `snake_case` en base et mapping `camelCase` côté TypeScript.
  - [x] Utiliser une structure qui pourra évoluer vers un historique de portefeuille sans réécrire le design de la story 2.3 (éviter d'empiler l'état dans `sessions`).
  - [x] Ajouter le repository SQLite dédié dans `packages/db/src/repository/`, avec transaction atomique et lecture du bootstrap par session.
  - [x] Mettre à jour `packages/db/src/client.ts` pour `ensureSchema` sans casser les bases existantes.
  - [x] Garder les montants/cash en TEXT décimal exact, comme pour les décisions.
  - [x] Préserver `foreign_keys = ON` et le pattern `better-sqlite3` synchrone.

- [x] Exposer et afficher l'état initial dans l'app de revue (AC: 2)
  - [x] Ajouter le route handler Next.js correspondant dans `apps/review/src/app/api/sessions/[id]/portfolio/route.ts` (ou l'équivalent de la convention actuelle du repo) avec runtime Node et réponse dynamique.
  - [x] Ajouter la couche serveur associée dans `apps/review/src/server/` pour garder les handlers minces.
  - [x] Brancher la création de session pour garantir que le bootstrap du portefeuille existe dès qu'une session est ouverte.
  - [x] Afficher au moins un résumé compact du cash initial et de la devise dans `apps/review/src/components/SessionPanel.tsx` ou la vue de session équivalente.
  - [x] Ne pas construire ici l'equity curve, les stats, ni la vue portfolio complète: cette story initialise seulement la base financière.

- [x] Couvrir la story par des tests ciblés (AC: 1, 2, 3)
  - [x] Tests shared: validation du DTO portefeuille et des constantes V1.
  - [x] Tests domaine: bootstrap sur session ouverte, rejet des sessions invalides, idempotence du bootstrap, lecture de l'état initial.
  - [x] Tests DB: création de la table, contrainte d'unicité/absence de doublon pour un bootstrap de session, persistance exacte des montants et de la devise.
  - [x] Tests API/UI: `POST /api/sessions` ou le flux d'ouverture crée bien le portefeuille initial, `GET` renvoie l'état attendu, et l'UI affiche cash + devise sans casser les stories 1.x.
  - [x] Ajouter un test vertical minimal: créer une session -> initialiser le portefeuille -> consulter l'état initial -> vérifier qu'aucune donnée de positions n'est inventée.

## Dev Notes

### Contexte métier

- Cette story couvre FR12, FR13, FR14, FR15, FR16 et FR17 au niveau bootstrap: elle pose la base du portefeuille, mais pas le moteur de valorisation, pas la courbe d'équité, et pas les statistiques. [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 2 / Story 2.1]
- Le PRD et son addendum fixent la direction: V1 doit utiliser un portefeuille multi-actifs simple, un modèle de coût moyen, et une seule devise de référence. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Scope for V1, Data and Domain Rules; `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories]
- Le capital initial doit être une constante V1 centralisée, pas une valeur recalculée dans l'UI ni un champ libre saisi par l'utilisateur.
- La devise de référence doit être unique et stable pour toute la session. Ne pas l'inférer depuis la locale, un symbole TradingView ou un actif de marché.
- L'objectif produit reste la mesure, pas le trading réel, pas le broker, pas l'automatisation d'ordres, et pas l'analyse avancée. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Overview, Non-Goals]

### État actuel à prendre en compte

- `packages/domain/src/portfolio/` n'existe pas encore.
- `packages/db/src/schema/` ne contient pas encore de table portfolio.
- `apps/review/src/app/api/sessions/[id]/portfolio/` n'existe pas encore.
- `apps/review/src/components/SessionPanel.tsx` affiche déjà la session, les actifs et les décisions, mais aucune base financière.
- `packages/domain/src/sessions/createSession.ts` crée seulement la session ouverte; il n'initialise pas encore de portefeuille.
- `packages/domain/src/decisions/captureDecision.ts` dit explicitement que le portefeuille, le PnL et les statistiques ne sont pas calculés dans la story 1.4. Garder cette séparation intacte.

### Décisions de cadrage pour cette story

- Ne pas stocker le capital initial ou la devise dans la table `sessions`. Le portefeuille doit vivre dans son propre module et dans sa propre persistance pour préparer la story 2.3 (historique de l'état du portefeuille).
- Préférer un bootstrap de portefeuille qui peut devenir la première entrée d'un historique de snapshots. Même si la V1 n'expose qu'un seul état initial, le design doit permettre d'enchaîner les snapshots plus tard sans refactor de schéma.
- L'état initial doit être déterministe: cash = capital initial, positions = vide, valeur totale = capital initial, devise = devise unique V1.
- L'opération doit être idempotente. Un retry réseau, un refresh de page ou un double appel ne doit pas créer deux portefeuilles pour une même session.
- Le bootstrap doit rester atomique avec la création / ouverture de session autant que possible dans l'orchestration serveur. Une session ne doit pas rester durablement visible sans portefeuille initial.
- Cette story doit rester minimale côté UI: un résumé compact cash + devise suffit. Les charts, stats et vues portfolio dédiées appartiennent aux stories 2.4 et 2.5.

### Architecture à respecter

- `packages/domain` contient les règles métier de sessions, décisions, portefeuille et stats; le bootstrap du portefeuille appartient donc au domaine, pas au handler React ni à la DB seule. [Source: `_bmad-output/planning-artifacts/architecture.md` > Service Boundaries]
- `packages/db` contient le schéma Drizzle, le client SQLite et les repositories. Garder le mapping `snake_case` -> `camelCase` à cette couche. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- `apps/review/src/app/api/*` est la couche d'exposition HTTP. Les handlers doivent rester minces et testables, avec le maximum de logique dans `packages/domain` et `packages/db`. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- Le repo réel utilise `apps/review/src/app/api/sessions/...` et `apps/review/src/server/...`; suivre cette structure actuelle plutôt que les exemples conceptuels plus anciens du document d'architecture. [Source: codebase actuel]
- `packages/shared` porte les contrats publics et les schémas de validation. Si le portefeuille devient visible via API, garder un DTO explicite et stable dès cette story. [Source: `_bmad-output/planning-artifacts/architecture.md` > Architecture Validation Results]

### Fichiers existants à modifier et état actuel

- `packages/domain/src/sessions/createSession.ts`
  - État actuel: crée et ouvre la session, puis retourne le DTO session. Aucun bootstrap portefeuille n'est encore déclenché.
  - Changement attendu: brancher ou composer l'initialisation portefeuille de façon atomique ou au moins déterministe.
  - À préserver: invariant d'une seule session ouverte, timestamps ISO et tests existants.

- `packages/domain/src/sessions/types.ts`
  - État actuel: port de session transactionnel avec `findActive`, `findById`, `insert`, `update`.
  - Changement attendu: ne pas casser ce port; si un nouveau port portfolio est ajouté, le faire dans un sous-module séparé.
  - À préserver: la séparation nette des responsabilités entre session et futur portefeuille.

- `packages/db/src/client.ts`
  - État actuel: `ensureSchema` crée les tables `sessions`, `assets`, `session_assets`, `decisions` et `decision_amendments`.
  - Changement attendu: ajouter le schéma portfolio sans casser les bases déjà créées.
  - À préserver: `DEFAULT_DEV_DATABASE_PATH`, `resolveDatabasePath`, `:memory:` en tests, `foreign_keys = ON`, `better-sqlite3` synchrone.

- `packages/db/src/schema/index.ts`
  - État actuel: exporte les schémas sessions/assets/decisions/decision_amendments.
  - Changement attendu: exporter le futur schéma portfolio.
  - À préserver: le mapping Drizzle existant et les conventions de nommage.

- `packages/db/src/repository/sessionRepository.ts`
  - État actuel: repository SQLite des sessions, avec transaction, lecture et update.
  - Changement attendu: ne pas y entasser le portefeuille; créer un repository dédié au portfolio.
  - À préserver: le modèle transactionnel et la logique d'une seule session active.

- `apps/review/src/server/sessionHandlers.ts`
  - État actuel: handlers minces pour create/active/resume/close.
  - Changement attendu: si le bootstrap portefeuille doit être orchestré lors de la création de session, garder la logique minces et testable ici ou dans un handler dédié.
  - À préserver: le contrat d'erreurs structurées et le style des handlers.

- `apps/review/src/components/SessionPanel.tsx`
  - État actuel: affiche la session active, les actifs et l'historique de décisions.
  - Changement attendu: afficher un résumé financier minimal (cash + devise) sans construire une vue portfolio complète.
  - À préserver: UX compacte, desktop-first, rafraîchissement simple et lisible.

- `apps/review/src/app/api/sessions/route.ts`
  - État actuel: crée une session via `handleCreateSession`.
  - Changement attendu: s'assurer que le flux de création déclenche bien le bootstrap du portefeuille.
  - À préserver: runtime Node, route dynamique, réponse JSON structurée.

### Contrats API recommandés

`GET /api/sessions/[id]/portfolio`
- Sert à lire l'état initial du portefeuille pour une session donnée.
- Retourne un DTO explicite en camelCase.
- Doit être consultable juste après la création de session.

Réponse de lecture recommandée:

```json
{
  "data": {
    "portfolio": {
      "sessionId": "uuid",
      "referenceCurrency": "EUR",
      "initialCapital": "10000",
      "cash": "10000",
      "totalValue": "10000",
      "positions": [],
      "initializedAt": "2026-06-10T13:32:54.000Z"
    }
  },
  "error": null,
  "meta": {}
}
```

Notes:
- Le montant exact du capital initial V1 doit rester une constante centralisée du projet.
- La devise de référence doit être unique et ne pas varier par session.
- Les positions restent vides au bootstrap.
- Le total initial doit rester cohérent avec le cash initial.

### Pièges à éviter

1. Ne pas ajouter le capital initial ou la devise dans `sessions`. Le portefeuille doit rester dans son propre modèle pour préparer l'historique de la story 2.3.
2. Ne pas implémenter ici la logique de coût moyen, le PnL, la courbe d'équité ou les statistiques. Cette story ne fait que poser la base financière.
3. Ne pas faire dépendre le bootstrap de l'UI. La vue doit lire l'état, pas le fabriquer.
4. Ne pas laisser une session visible sans portefeuille initial si le flux de création a réussi.
5. Ne pas dupliquer la constante de capital ou la devise dans plusieurs couches.
6. Ne pas introduire de dépendance directe à `packages/db` depuis `apps/review` ou `apps/extension` en dehors du pattern repository/handler déjà en place.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 2 > Story 2.1]
- [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Functional Requirements, Data and Domain Rules, Scope for V1]
- [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories]
- [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries, Service Boundaries, Requirements to Structure Mapping]
- [Source: `packages/domain/src/sessions/createSession.ts`]
- [Source: `packages/domain/src/decisions/captureDecision.ts`]
- [Source: `packages/db/src/client.ts`]
- [Source: `packages/db/src/schema/sessions.ts`]
- [Source: `apps/review/src/app/api/sessions/route.ts`]
- [Source: `apps/review/src/app/api/sessions/[id]/assets/route.ts`]
- [Source: `apps/review/src/app/api/sessions/[id]/decisions/route.ts`]
- [Source: `apps/review/src/components/SessionPanel.tsx`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Analyse réalisée à partir des artefacts de planning, de l'architecture et des modules sessions/décisions/db existants.
- Aucune implémentation n'a encore été lancée pour cette story au moment de la création du fichier.

### Completion Notes List

- Story créée comme fondation du portefeuille simulé V1 et de son futur historique.
- La story est volontairement orientée bootstrap + lecture, pas moteur de PnL, pas courbe d'équité, pas stats.
- Les constantes V1 (capital initial et devise de référence) doivent être centralisées et réutilisées partout.
- Le repo réel suit `apps/review/src/app/api/...` et `apps/review/src/server/...`; la story documente ce chemin réel pour éviter une implémentation au mauvais endroit.

### File List

- _bmad-output/implementation-artifacts/2-1-initialiser-le-portefeuille-simule.md

## Open Questions

- Quel est le montant exact du capital initial V1 et le code devise de référence à figer si aucun constant partagé n'existe encore ?
