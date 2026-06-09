---
story_id: "1.4"
story_key: "1-4-capturer-une-decision-buy-sell"
epic: "1"
status: "review"
baseline_commit: "d3ca9f7"
created: "2026-06-09T11:47:13+02:00"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 1.4: Capturer une décision buy/sell

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,  
I want enregistrer une décision d'achat ou de vente avec ses informations minimales,  
so that chaque action de simulation devienne un événement exploitable.

## Acceptance Criteria

1. **Capture d'une décision sur une session ouverte**
   - Given une session ouverte et un actif associé ou sélectionné
   - When l'utilisateur enregistre une décision
   - Then la décision est limitée à `achat` ou `vente`
   - And la décision contient au minimum le type d'action, l'actif, la quantité, le prix de référence et un horodatage logique de session
   - And la décision est liée à la session active

2. **Consultation de l'historique de session**
   - Given une décision enregistrée
   - When l'utilisateur consulte l'historique de la session
   - Then la décision apparaît dans l'ordre chronologique de saisie
   - And l'historique reste consultable même après clôture de la session

## Tasks / Subtasks

- [x] Définir les contrats partagés de décision dans `packages/shared` (AC: 1, 2)
  - [x] Créer un module dédié, par exemple `packages/shared/src/schemas/decision.ts`, exporté depuis `packages/shared/src/index.ts`.
  - [x] Définir un DTO `Decision` en `camelCase` avec les champs minimaux attendus: `id`, `sessionId`, `assetId`, `side`, `quantity`, `referencePrice`, `logicalTimestamp`, `createdAt`.
  - [x] Garder les timestamps API en ISO 8601.
  - [x] Valider `side` sur deux valeurs seulement. Garder une représentation canonique unique et stable dans tout le stack; ne pas introduire d'autres états.
  - [x] Valider l'identifiant d'actif comme référence à un actif déjà lié à la session, pas comme texte libre non vérifié.
  - [x] Valider `quantity` et `referencePrice` comme valeurs positives exactes; ne pas dépendre de flottants JS comme source de vérité de persistence.
  - [x] Ajouter les schémas de requête/réponse nécessaires pour `POST /api/sessions/[id]/decisions` et `GET /api/sessions/[id]/decisions`.
  - [x] Réutiliser le format public `{ data, error, meta }` et les erreurs structurées existantes dès que possible.

- [x] Implémenter le modèle métier de décision dans `packages/domain` (AC: 1, 2)
  - [x] Créer un sous-module clair, par exemple `packages/domain/src/decisions/`, avec `types.ts`, `mappers.ts`, `captureDecision.ts`, `listSessionDecisions.ts`, `deps.ts` et les tests associés.
  - [x] Faire porter la logique métier au domaine, pas aux route handlers ni aux composants React.
  - [x] Autoriser la capture seulement sur une session existante et `open`.
  - [x] Refuser une décision si l'actif n'appartient pas à la session cible. L'UI ne doit jamais être la seule ligne de défense.
  - [x] Utiliser l'actif déjà catalogué et lié à la session via le travail de la story 1.3; ne pas recréer un second catalogue.
  - [x] Enregistrer chaque décision comme un événement append-only. Ne pas dédupliquer silencieusement deux soumissions identiques.
  - [x] Retourner les décisions dans un ordre stable et explicite, recommandé `logicalTimestamp ASC, createdAt ASC, id ASC`.
  - [x] Ne pas calculer le portefeuille, le PnL, l'equity curve ou les statistiques dans cette story; cela appartient à l'epic 2.
  - [x] Ne pas ajouter encore les corrections, annulations ou commentaires; cela appartient à la story 1.5.

- [x] Étendre la persistance SQLite/Drizzle dans `packages/db` (AC: 1, 2)
  - [x] Ajouter une table `decisions` en `snake_case` avec un schéma clair et stable.
  - [x] Préserver le mapping `snake_case` DB vers `camelCase` domaine/API.
  - [x] Ajouter les clefs étrangères nécessaires vers `sessions` et `assets`.
  - [x] Choisir une représentation exacte pour les champs monétaires et quantitatifs afin d'éviter les erreurs de virgule flottante.
  - [x] Ajouter les index nécessaires pour la lecture ordonnée des décisions d'une session.
  - [x] Créer un repository SQLite dédié, par exemple `createSqliteDecisionRepository`, avec `transaction`, `insert`, `findBySessionId` et les accès de validation relationnelle requis.
  - [x] Mettre à jour `packages/db/src/client.ts` pour créer le schéma sans casser les bases existantes.
  - [x] Préserver les conventions déjà installées: `foreign_keys = ON`, client `better-sqlite3` synchrone, migration légère via `ensureSchema`.

- [x] Exposer les endpoints Next.js nécessaires (AC: 1, 2)
  - [x] Ajouter `POST /api/sessions/[id]/decisions` pour enregistrer une décision sur une session ouverte.
  - [x] Ajouter `GET /api/sessions/[id]/decisions` pour consulter l'historique d'une session, y compris après clôture.
  - [x] Garder les route handlers minces et testables, avec la logique métier dans `packages/domain` et la persistance dans `packages/db`.
  - [x] Conserver `export const runtime = "nodejs"` et `export const dynamic = "force-dynamic"` sur les handlers SQLite.
  - [x] Retourner `201` pour une création réussie et `200` pour une lecture réussie.
  - [x] Retourner une erreur structurée pour session introuvable, session non active, payload invalide et erreur inattendue.

- [x] Rendre la capture et la relecture utilisables dans l'UX existante (AC: 1, 2)
  - [x] Dans `apps/review/src/components/SessionPanel.tsx`, ajouter une capture compacte de décision pour la session active.
  - [x] Afficher la liste des décisions de la session active dans l'ordre attendu, sans page lourde ni surcouche de navigation.
  - [x] Dans `apps/extension/src/popup/index.tsx`, conserver un flux de saisie rapide basé sur l'API review, sans accès direct à `packages/db`.
  - [x] Réutiliser les actifs déjà chargés pour éviter une saisie de symbole libre lorsque la session a déjà des actifs associés.
  - [x] Conserver l'UX desktop-first, dense et rapide: boutons directs, champs compacts, rafraîchissement immédiat, pas d'intégration automatique TradingView en V1.

- [x] Couvrir la story par des tests ciblés (AC: 1, 2)
  - [x] Tests shared: validation du side, des champs numériques/monétaires, des timestamps ISO et des réponses request/response.
  - [x] Tests domaine: refus session inconnue, refus session non active, refus actif non lié à la session, capture réussie, ordre stable de la liste.
  - [x] Tests DB en mémoire: création du schéma, clés étrangères, ordre de lecture, persistance exacte des champs.
  - [x] Tests API: POST succès, GET historique, validation 400, session inconnue 404, session non active 409, enveloppe structurée.
  - [x] Ajouter au minimum un test vertical complet: session ouverte -> actifs liés -> capture d'une décision -> relecture ordonnée -> clôture de session -> historique toujours consultable.

- [x] Valider la tranche verticale
  - [x] Exécuter `pnpm test`.
  - [x] Exécuter `pnpm typecheck`.
  - [x] Exécuter `pnpm lint`.
  - [x] Exécuter `pnpm build`.
  - [x] Vérifier manuellement ou par test que la capture ne casse pas les story 1.1 à 1.3: session active, actifs liés, historique consultable.
  - [x] Mettre à jour le `Dev Agent Record` et la `File List` une fois l'implémentation terminée.

## Dev Notes

### Contexte métier

- Cette story couvre FR6, FR7, FR8 et FR9: enregistrer une décision d'achat ou de vente, la limiter à deux valeurs, l'attacher à une session, et conserver les champs minimaux exploitables. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Functional Requirements > Decision Capture]
- La décision est un événement de vérité du système. Elle n'est pas encore un calcul de portefeuille, ni une statistique, ni un correctif d'historique. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Data and Domain Rules]
- L'historique doit rester consultable après clôture de la session, comme pour les actifs suivis dans la story 1.3. [Source: `_bmad-output/planning-artifacts/epics.md` > Story 1.4 / Epic 1]
- La story 1.5 ajoutera commentaire, correction et annulation. Ne pas pré-coder ces usages dans 1.4, sauf pour garder le modèle extensible sans mutation destructrice. [Source: `_bmad-output/planning-artifacts/epics.md` > Story 1.5]
- L'epic 2 prendra ensuite le relais pour portefeuille, equity curve et statistiques; cette story doit seulement poser des événements propres et relisibles. [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 2]

### Décisions de cadrage pour cette story

- La session cible doit exister et être `open` pour la capture. Une session `closed` ou `suspended` peut rester consultable en lecture, mais ne doit pas accepter de nouvelles décisions.
- L'actif d'une décision doit provenir du catalogue déjà associé à la session. Le lien `session -> asset` a déjà été posé par la story 1.3; ne le duplique pas.
- La capture doit rester append-only. Chaque POST réussi produit un nouvel événement, même si l'utilisateur soumet deux fois la même valeur.
- Le champ d'ordre de la session doit être stable. Si un timestamp logique est utilisé, il doit rester distinct du timestamp d'audit et servir à la relecture ordonnée.
- Les champs monétaires doivent rester exacts à la persistance. Si le format technique choisi est un texte décimal ou des unités mineures, il faut le garder cohérent partout; ne pas basculer entre plusieurs représentations.
- Les corrections, annulations et commentaires n'appartiennent pas à cette story. Les préparer mentalement dans le modèle de données est acceptable, les implémenter ne l'est pas.
- Aucun calcul de portefeuille ne doit être déclenché par la capture dans cette story. La décision est persistée, pas valorisée.

### Architecture à respecter

- `apps/review/app/api/*` expose les endpoints consommés par l'extension et l'app de revue. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- `apps/extension` ne doit jamais accéder directement à `packages/db`. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- Les route handlers Next.js orchestrent validation, métier et persistance via `packages/domain` et `packages/db`; la logique métier ne va ni dans React ni dans les handlers. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- `packages/domain` contient les règles métier de sessions, décisions, portefeuille et stats. La capture de décision appartient au domaine, pas à la DB seule. [Source: `_bmad-output/planning-artifacts/architecture.md` > Service Boundaries]
- `packages/db` contient Drizzle schema, SQLite client, migrations légères et accès données. `packages/shared` contient les schémas Zod, DTO, constantes et erreurs partagées. [Source: `_bmad-output/planning-artifacts/architecture.md` > Service Boundaries / Data Boundaries]
- SQLite reste la source de vérité V1; base en `snake_case`, domaine/API en `camelCase`; timestamps API en ISO 8601. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- Les réponses API publiques suivent toujours `{ data, error, meta }` avec erreurs structurées. [Source: `_bmad-output/planning-artifacts/epics.md` > Additional Requirements]
- La structure `packages/domain/src/decisions/` et `apps/review/app/api/sessions/[id]/decisions/` est cohérente avec le découpage d'architecture prévu pour la capture de décision. [Source: `_bmad-output/planning-artifacts/architecture.md` > Requirements to Structure Mapping]

### Fichiers existants à modifier et état actuel

- `packages/shared/src/schemas/sessionAsset.ts`
  - État actuel: contrats de symbole, d'actif suivi et d'association session-actif. Le modèle montre comment la V1 normalise en amont puis expose un DTO stable en camelCase.
  - Changement attendu: s'inspirer de ce style pour les schémas de décision sans réutiliser à tort le fichier lui-même.
  - À préserver: les règles de validation broad mais strictes sur les symboles de marché.

- `packages/shared/src/errors.ts`
  - État actuel: erreurs publiques structurées pour session, validation et interne.
  - Changement attendu: ajouter seulement les codes indispensables à la capture de décision si une validation relationnelle ou métier ne peut pas se réexprimer avec les erreurs existantes.
  - À préserver: le format `{ data, error, meta }` et les messages français stables.

- `packages/domain/src/sessions/types.ts`
  - État actuel: ports de session transactionnels avec `findActive`, `findById`, `insert`, `update`.
  - Changement attendu: ne pas casser ces ports; la décision doit vivre dans un nouveau sous-module avec son propre repository port.
  - À préserver: l'invariant d'une seule session `open` à la fois.

- `packages/domain/src/sessions/addSessionAsset.ts`
  - État actuel: exemple concret de règle métier session-scoped, avec transaction, normalisation, idempotence et erreurs structurées.
  - Changement attendu: réutiliser le même style pour la capture de décision, mais sans copier l'idempotence si elle n'est pas requise.
  - À préserver: la séparation nette entre validation métier et persistance.

- `packages/db/src/client.ts`
  - État actuel: `ensureSchema` crée les tables `sessions`, `assets` et `session_assets`, avec `foreign_keys = ON` et `better-sqlite3`.
  - Changement attendu: ajouter `decisions` sans casser les bases déjà créées.
  - À préserver: `DEFAULT_DEV_DATABASE_PATH`, `resolveDatabasePath`, le comportement `:memory:` pour les tests et l'exécution synchrone.

- `packages/db/src/index.ts`
  - État actuel: expose les repositories SQLite singleton et le client DB.
  - Changement attendu: ajouter l'export du nouveau repository décision si l'implémentation l'exige.
  - À préserver: les singletons lazy et la séparation des responsabilités.

- `apps/review/src/server/sessionHandlers.ts`
  - État actuel: handlers testables pour create, active, resume et close, avec mapping d'erreurs structuré.
  - Changement attendu: ne pas alourdir ce fichier avec la logique de décision si un voisin dédié garde le code lisible.
  - À préserver: `ok`, `fail`, `jsonResponse`, `errorResponse` et la discipline de handlers minces.

- `apps/review/src/components/SessionPanel.tsx`
  - État actuel: panneau de session active avec création, reprise, clôture et liste d'actifs.
  - Changement attendu: ajouter une capture compacte de décision et l'historique ordonné, sans créer une page de gestion complète.
  - À préserver: feedback immédiat, état actif cohérent, et absence de logique DB côté client.

- `apps/extension/src/popup/index.tsx`
  - État actuel: lit la session active et la liste des actifs suivis via l'API review.
  - Changement attendu: si la popup capture la décision dans cette story, elle doit rester API-only et réutiliser la session active plus ses actifs.
  - À préserver: aucun accès à `packages/db`, aucune intégration automatique TradingView, UX rapide.

### Contrats API recommandés

`POST /api/sessions/[id]/decisions`

Requête recommandée:

```json
{
  "assetId": "uuid",
  "side": "buy",
  "quantity": "10",
  "referencePrice": "123.45",
  "logicalTimestamp": "2026-06-09T09:00:00.000Z"
}
```

Notes:
- `assetId` doit référencer un actif déjà lié à la session.
- `side` doit rester sur deux valeurs seulement.
- `quantity` et `referencePrice` doivent conserver une représentation exacte jusqu'à la persistance.
- Le `logicalTimestamp` doit être stable pour le tri et distinct du timestamp d'audit si le modèle choisit de garder les deux.

Succès `201`:

```json
{
  "data": {
    "decision": {
      "id": "uuid",
      "sessionId": "uuid",
      "assetId": "uuid",
      "side": "buy",
      "quantity": "10",
      "referencePrice": "123.45",
      "logicalTimestamp": "2026-06-09T09:00:00.000Z",
      "createdAt": "2026-06-09T09:00:00.000Z"
    }
  },
  "error": null,
  "meta": {}
}
```

`GET /api/sessions/[id]/decisions`

Succès `200`:

```json
{
  "data": {
    "decisions": [
      {
        "id": "uuid",
        "sessionId": "uuid",
        "assetId": "uuid",
        "side": "buy",
        "quantity": "10",
        "referencePrice": "123.45",
        "logicalTimestamp": "2026-06-09T09:00:00.000Z",
        "createdAt": "2026-06-09T09:00:00.000Z"
      }
    ]
  },
  "error": null,
  "meta": {}
}
```

Erreurs recommandées:

```json
{
  "data": null,
  "error": {
    "code": "SESSION_NOT_ACTIVE",
    "message": "La session n'est pas active.",
    "status": 409
  },
  "meta": {}
}
```

### Previous Story Intelligence

- Story 1.1 a posé la base session: création d'une session ouverte, réponse API structurée, route handlers minces, repository SQLite synchrone et UI de session active.
- Story 1.2 a ajouté la reprise et la clôture sans casser l'invariant d'une seule session active.
- Story 1.3 a ajouté l'association des actifs à une session. Ce précédent est critique pour 1.4, car la décision doit réutiliser l'actif déjà catalogué plutôt que réinventer un second modèle d'instrument.
- Les règles qui reviennent à chaque story sont stables: validation partagée dans `packages/shared`, métier dans `packages/domain`, persistance SQLite dans `packages/db`, UI légère dans `apps/review` et `apps/extension`, réponse API enveloppée.
- Les handlers et tests existants montrent le style attendu: transaction synchrone, mapping d'erreurs structuré, et vérifications d'order/stability plutôt que tests opportunistes.

### Git Intelligence

- Le HEAD courant est `d3ca9f7` (`feat(sessions): finalize session lifecycle updates`).
- Les commits les plus récents montrent un pattern clair: la logique métier vit dans `packages/domain`, les route handlers restent minces, et les tests visent des tranches verticales plutôt que des unit tests isolés sans contexte.
- Le worktree contient déjà des changements non committés liés à la story 1.3 (assets). Ne pas les remettre en cause: ils sont le socle fonctionnel que 1.4 doit consommer.

### Latest Tech Information

- Next.js Route Handlers vivent dans `app/**/route.ts`, utilisent les Web `Request`/`Response` APIs, et les paramètres dynamiques sont accessibles via le contexte de route. Les handlers qui touchent SQLite doivent rester en runtime Node, pas en edge.
- Next.js indique que les route handlers ne sont pas cachés par défaut; le pattern local `runtime = "nodejs"` + `dynamic = "force-dynamic"` reste le bon choix pour les routes SQLite.
- Drizzle ORM documente le support SQLite avec indexes, contraintes et mappings explicites. Utiliser un index unique et des clés étrangères est la voie standard pour un catalogue d'actifs et un historique de décisions.
- `better-sqlite3` reste synchrone; garder les transactions de décision synchrones évite les divergences entre lecture, écriture et ordre de saisie.
- La consigne produit sur la V1 reste inchangée: pas de broker, pas d'automatisation d'ordres, pas d'intégration automatique TradingView obligatoire.

### Project Context Reference

- Le produit est un outil personnel de trading simulé, centré sur la saisie rapide pendant un replay de marché, avec Notion conservé comme journal narratif externe.
- Le support multi-actifs est requis dès la V1, mais la mécanique de calcul reste simple au départ.
- La capture de décision doit rester séparée du portefeuille et des stats: l'epic 2 prendra le relais pour la valorisation et l'analyse.
- L'usage attendu est desktop-first et individuel; les interfaces doivent rester compactes, lisibles et rapides à manipuler.
- Les décisions doivent rester auditables lorsque les stories futures introduiront les corrections et annulations.

## Dev Agent Record

### Implementation Plan

Tranche verticale construite dans l'ordre des dépendances, en miroir exact de la story 1.3 (actifs) :

1. **`packages/shared`** — nouveau module `schemas/decision.ts` : `decisionSideSchema` (deux valeurs `buy`/`sell`), `positiveAmountSchema` (chaîne décimale exacte, strictement positive), DTO `decisionSchema`, et les schémas request/response. Ajout du code d'erreur `ASSET_NOT_IN_SESSION` + fabrique `apiErrors.assetNotInSession()`.
2. **`packages/domain`** — sous-module `decisions/` avec `types.ts`, `errors.ts` (`AssetNotInSessionError`), `mappers.ts` (`toDecision`, `compareDecisions`), `captureDecision.ts`, `listSessionDecisions.ts`, `deps.ts`. La règle métier vit ici : session existante + `open`, actif déjà lié, capture append-only.
3. **`packages/db`** — table `decisions` (`snake_case`, FK vers `sessions` et `assets`, montants en TEXT décimal), index composite `idx_decisions_session_order`, `createSqliteDecisionRepository`, mise à jour de `ensureSchema` et des singletons.
4. **`apps/review`** — handlers minces `decisionHandlers.ts`, route `app/api/sessions/[id]/decisions/route.ts` (runtime Node, dynamic), mapping d'erreur `ASSET_NOT_IN_SESSION` dans `http.ts`.
5. **UX** — `SessionPanel.tsx` (capture compacte par boutons Acheter/Vendre + sélecteur d'actif réutilisant les actifs chargés + historique ordonné, consultable après clôture) et popup extension (saisie rapide API-only).

### Completion Notes

- **AC 1 satisfait** : la capture exige une session `open`, limite `side` à `buy`/`sell`, exige un actif déjà lié à la session (refus `ASSET_NOT_IN_SESSION` sinon), persiste type/actif/quantité/prix de référence + `logicalTimestamp` (par défaut l'instant de capture) et `createdAt` d'audit, et lie la décision à la session.
- **AC 2 satisfait** : l'historique est trié de façon stable `logicalTimestamp ASC, createdAt ASC, id ASC` (prouvé en domaine, DB et API) et reste consultable après clôture (`GET` accepté sur session `closed`, carte UI dédiée en lecture seule).
- **Exactitude monétaire** : `quantity` et `referencePrice` voyagent en chaîne décimale de bout en bout (DTO → domaine → SQLite TEXT). Test DB dédié vérifiant le round-trip exact (`0.000001`, `19999.99`).
- **Append-only** : aucune déduplication ; deux soumissions identiques créent deux événements (testé en domaine, DB et API).
- **Hors périmètre respecté** : aucun calcul de portefeuille/PnL/stats (epic 2), aucune correction/annulation/commentaire (story 1.5).
- **Non-régression** : les 98 tests des stories 1.1–1.3 restent verts ; total 162 tests. `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` passent tous.

### Debug Log

- Aucun blocage. Suite complète verte du premier coup après chaque couche ; build Next.js enregistre bien la route `ƒ /api/sessions/[id]/decisions`.

## File List

**Créés**
- `packages/shared/src/schemas/decision.ts`
- `packages/shared/src/schemas/__tests__/decision.test.ts`
- `packages/domain/src/decisions/types.ts`
- `packages/domain/src/decisions/errors.ts`
- `packages/domain/src/decisions/mappers.ts`
- `packages/domain/src/decisions/captureDecision.ts`
- `packages/domain/src/decisions/listSessionDecisions.ts`
- `packages/domain/src/decisions/deps.ts`
- `packages/domain/src/decisions/__tests__/fakeDecisionRepo.ts`
- `packages/domain/src/decisions/__tests__/captureDecision.test.ts`
- `packages/domain/src/decisions/__tests__/listSessionDecisions.test.ts`
- `packages/db/src/schema/decisions.ts`
- `packages/db/src/repository/decisionRepository.ts`
- `packages/db/src/repository/__tests__/decisionRepository.test.ts`
- `apps/review/src/server/decisionHandlers.ts`
- `apps/review/src/app/api/sessions/[id]/decisions/route.ts`
- `apps/review/__tests__/decisionHandlers.test.ts`

**Modifiés**
- `packages/shared/src/index.ts` (export du module décision)
- `packages/shared/src/errors.ts` (code + fabrique `ASSET_NOT_IN_SESSION`)
- `packages/domain/src/index.ts` (exports du sous-module `decisions`)
- `packages/db/src/schema/index.ts` (export du schéma `decisions`)
- `packages/db/src/client.ts` (table `decisions` + index dans `ensureSchema`)
- `packages/db/src/index.ts` (singleton `getDefaultDecisionRepository`)
- `apps/review/src/server/http.ts` (mapping erreur `ASSET_NOT_IN_SESSION`)
- `apps/review/src/components/SessionPanel.tsx` (capture + historique)
- `apps/extension/src/popup/index.tsx` (capture rapide API-only + décisions récentes)

## Change Log

- 2026-06-09 — Implémentation story 1.4 (capture de décision buy/sell) : contrats partagés, modèle métier append-only, persistance SQLite exacte, endpoints `POST`/`GET /api/sessions/[id]/decisions`, UX de capture/relecture review + extension. 162 tests verts ; typecheck, lint et build OK. Statut → review.

