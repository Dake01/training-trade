---
story_id: "1.3"
story_key: "1-3-associer-des-actifs-a-une-session"
epic: "1"
status: "done"
baseline_commit: "50d5acd"
created: "2026-06-09T10:54:26+02:00"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 1.3: Associer des actifs à une session

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,  
I want associer un ou plusieurs actifs à une session,  
so that je puisse cadrer le replay autour des instruments suivis.

## Acceptance Criteria

1. **Ajout d'un actif suivi**
   - Given une session ouverte
   - When l'utilisateur ajoute un actif suivi
   - Then l'actif est enregistré comme lié à la session
   - And la session peut contenir plusieurs actifs

2. **Consultation des actifs associés**
   - Given une session avec des actifs déjà liés
   - When l'utilisateur consulte la session
   - Then les actifs associés sont visibles

## Tasks / Subtasks

- [x] Définir les contrats partagés d'actifs suivis (AC: 1, 2)
  - [x] Ajouter un DTO `TrackedAsset` dans `packages/shared/src/schemas/sessionAsset.ts` ou nom équivalent, exporté par `packages/shared/src/index.ts`.
  - [x] Champs minimaux recommandés: `id`, `symbol`, `name`, `createdAt`, `linkedAt`; tous les timestamps API restent ISO 8601.
  - [x] Ajouter `addSessionAssetRequestSchema`, `addSessionAssetResponseSchema` et `sessionAssetsResponseSchema`.
  - [x] Valider `symbol`: trim, non vide, longueur raisonnable, caractères compatibles symboles de marché (`AAPL`, `NASDAQ:AAPL`, `BTC/USDT`, `EURUSD`, etc.). Normaliser en uppercase côté domaine/service avant persistance.
  - [x] Réutiliser `VALIDATION_ERROR`, `SESSION_NOT_FOUND` et `SESSION_NOT_ACTIVE`; ne pas modifier les codes existants.

- [x] Implémenter le modèle métier d'association d'actifs dans `packages/domain` (AC: 1, 2)
  - [x] Créer des types domaine `AssetRecord`, `SessionAssetRecord`, `SessionAssetRepository` et `SessionAssetStore` dans `packages/domain/src/sessions/` ou un sous-module clair.
  - [x] Créer `addSessionAsset(repo, deps, sessionId, input)`:
    - [x] refuse une session inexistante avec `SessionNotFoundError`;
    - [x] refuse une session non `open` avec `SessionNotActiveError`;
    - [x] normalise le symbole avant toute comparaison;
    - [x] crée l'actif s'il n'existe pas encore;
    - [x] lie l'actif à la session;
    - [x] reste idempotent si le même actif est déjà lié à cette session, sans créer de doublon.
  - [x] Créer `listSessionAssets(repo, sessionId)`:
    - [x] refuse une session inconnue;
    - [x] retourne les actifs liés dans un ordre stable, recommandé `linkedAt ASC, symbol ASC`.
  - [x] Ne pas créer de décision buy/sell, de portefeuille, de prix de marché ou de synchronisation TradingView dans cette story.

- [x] Étendre la persistance SQLite/Drizzle (AC: 1, 2)
  - [x] Ajouter une table `assets` en `snake_case`: `id`, `symbol`, `name`, `created_at`.
  - [x] Ajouter une table de liaison `session_assets`: `session_id`, `asset_id`, `linked_at`.
  - [x] Contraintes minimales:
    - [x] `assets.id` clé primaire;
    - [x] `assets.symbol` unique après normalisation;
    - [x] `session_assets.session_id` référence `sessions.id`;
    - [x] `session_assets.asset_id` référence `assets.id`;
    - [x] unicité `(session_id, asset_id)` pour empêcher les doublons.
  - [x] Mettre à jour `ensureSchema` dans `packages/db/src/client.ts` avec `CREATE TABLE IF NOT EXISTS` et `CREATE UNIQUE INDEX IF NOT EXISTS`, sans casser les bases créées par les stories 1.1 et 1.2.
  - [x] Ajouter `createSqliteSessionAssetRepository` ou équivalent dans `packages/db/src/repository/`, en gardant le mapping DB `snake_case` -> domaine/API `camelCase`.
  - [x] Préserver `createSqliteSessionRepository`, `getDefaultSessionRepository` et l'index `uniq_active_session`.

- [x] Exposer les endpoints Next.js nécessaires (AC: 1, 2)
  - [x] Ajouter `POST /api/sessions/[id]/assets` pour lier un actif à une session ouverte.
  - [x] Ajouter `GET /api/sessions/[id]/assets` pour consulter les actifs associés.
  - [x] Garder `export const runtime = "nodejs"` et `export const dynamic = "force-dynamic"` sur ces route handlers car SQLite local utilise `better-sqlite3`.
  - [x] Ajouter des handlers testables dans `apps/review/src/server/sessionHandlers.ts` ou un fichier serveur voisin: les route handlers restent minces.
  - [x] Retourner tous les succès au format `{ data, error, meta }`.
  - [x] Retourner `400 VALIDATION_ERROR` pour payload invalide, `404 SESSION_NOT_FOUND`, `409 SESSION_NOT_ACTIVE`, et `500 INTERNAL_ERROR` structuré pour erreur inattendue.

- [x] Rendre les actifs visibles dans l'expérience review et extension (AC: 1, 2)
  - [x] Dans `apps/review/src/components/SessionPanel.tsx`, charger les actifs de la session active et les afficher dans la carte de session.
  - [x] Ajouter une saisie rapide d'actif quand une session est active: champ symbole + bouton direct; aucun formulaire lourd.
  - [x] Après ajout, rafraîchir la liste d'actifs sans perdre l'état d'erreur ou de session active.
  - [x] Dans `apps/extension/src/popup/index.tsx`, conserver l'accès uniquement via l'API review; ne jamais importer `packages/db`.
  - [x] L'extension peut afficher la liste des actifs ou proposer l'ajout rapide, mais toute persistance passe par `POST /api/sessions/[id]/assets`.
  - [x] Garder l'UX desktop-first, dense et rapide. Pas de page de gestion complète d'actifs, pas de design system, pas d'intégration automatique TradingView.

- [x] Couvrir la story par des tests ciblés (AC: 1, 2)
  - [x] Tests shared: validation du symbole, réponses add/list, rejet des payloads invalides.
  - [x] Tests domaine: ajout sur session `open`, refus session `closed`/`suspended`, refus session inconnue, normalisation, idempotence, plusieurs actifs par session, même actif réutilisable dans plusieurs sessions.
  - [x] Tests DB en mémoire: création des tables, unicité `assets.symbol`, unicité `(session_id, asset_id)`, foreign keys, ordre de liste stable.
  - [x] Tests API: `POST` succès, `GET` liste, validation 400, session inconnue 404, session non active 409, enveloppe structurée.
  - [x] Adapter les tests existants de session sans les affaiblir, en particulier les tests du statut persisté et des transitions 1.2.

- [x] Valider la tranche verticale
  - [x] Exécuter `pnpm test`.
  - [x] Exécuter `pnpm typecheck`.
  - [x] Exécuter `pnpm lint`.
  - [x] Exécuter `pnpm build`.
  - [x] Vérifier manuellement ou par test: créer session -> ajouter deux actifs -> consulter liste -> clôturer session -> ajout d'actif refusé -> liste existante toujours consultable.
  - [x] Mettre à jour le `Dev Agent Record` et la `File List`.

### Review Findings

- [x] [Review][Patch] Traiter les erreurs structurées lors du chargement des actifs dans l'UI review [apps/review/src/components/SessionPanel.tsx:62]
- [x] [Review][Patch] Empêcher une réponse tardive d'assets d'une ancienne session d'écraser l'état courant [apps/review/src/components/SessionPanel.tsx:62]
- [x] [Review][Patch] Traiter les erreurs structurées de l'endpoint assets dans la popup extension [apps/extension/src/popup/index.tsx:37]
- [x] [Review][Patch] Rendre l'ajout concurrent du même symbole réellement idempotent [packages/db/src/repository/sessionAssetRepository.ts:78]

## Dev Notes

### Contexte métier

- Cette story couvre FR4: chaque session doit être associée à un ou plusieurs actifs suivis pendant l'exercice. [Source: `_bmad-output/planning-artifacts/epics.md` > Requirements Inventory, Epic 1, Story 1.3]
- Elle prépare FR9 et Story 1.4: une future décision buy/sell devra référencer l'actif concerné. Le modèle créé ici doit donc être réutilisable par les décisions, sans implémenter les décisions maintenant. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Decision Capture]
- Un actif peut être suivi dans plusieurs sessions. Le modèle conseillé est donc un catalogue `assets` + table de liaison `session_assets`, plutôt qu'une simple colonne texte dupliquée sur `sessions`. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Data and Domain Rules]
- La V1 reste manuelle et simple: pas de broker, pas de trading réel, pas de capture automatique TradingView, pas d'import automatique de prix. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories]

### Décisions de cadrage pour cette story

- Une session doit être `open` pour recevoir un nouvel actif suivi. Une session `closed` ou `suspended` conserve ses liens existants, mais l'ajout doit être refusé.
- L'ajout du même actif à la même session doit être idempotent: retourner l'actif déjà lié ou la liste mise à jour, sans erreur utilisateur ni doublon.
- Le symbole est l'identifiant métier V1 de l'actif. Il peut être saisi librement, normalisé en uppercase, et stocké sans tenter de vérifier son existence sur un marché externe.
- `name` est optionnel. Ne pas exiger un marché, une devise de cotation, un exchange ou un type d'actif tant que le PRD ne les fixe pas.
- Les IDs techniques peuvent rester générés par `crypto.randomUUID()` via un générateur injecté, comme les sessions.

### Architecture à respecter

- `apps/review/app/api/*` expose les endpoints consommés par l'extension et l'app de revue; `apps/extension` ne doit jamais accéder directement à `packages/db`. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- Les route handlers Next.js orchestrent validation, métier et persistance via `packages/domain` et `packages/db`; la logique métier ne va pas dans React ni dans les handlers. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- `packages/domain` contient les règles métier de sessions, décisions, portefeuille et statistiques. L'association d'actifs à une session appartient au domaine, pas à la DB seule. [Source: `_bmad-output/planning-artifacts/architecture.md` > Service Boundaries]
- SQLite reste la source de vérité V1; base en `snake_case`, domaine/API en `camelCase`; timestamps API en ISO 8601. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- Les réponses API publiques suivent toujours `{ data, error, meta }` avec erreurs structurées. [Source: `_bmad-output/planning-artifacts/epics.md` > Additional Requirements]

### Fichiers existants à modifier et état actuel

- `packages/shared/src/schemas/session.ts`
  - État actuel: DTO session, contexte actif, réponses create/active/resume/close.
  - Changement attendu: ne pas surcharger ce fichier si les actifs deviennent volumineux; préférer `sessionAsset.ts` et exporter depuis `packages/shared/src/index.ts`.
  - À préserver: les schémas durcis non commités de 1.2 (`resume` exige `open`, `close` exige `closed`) sont présents dans le worktree.

- `packages/shared/src/errors.ts`
  - État actuel: erreurs session et validation.
  - Changement attendu: réutiliser les erreurs existantes. Ajouter un code seulement si un comportement nouveau l'exige réellement.
  - À préserver: `ACTIVE_SESSION_EXISTS`, `NO_ACTIVE_SESSION`, `SESSION_NOT_FOUND`, `SESSION_ALREADY_CLOSED`, `SESSION_NOT_ACTIVE`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.

- `packages/domain/src/sessions/types.ts`
  - État actuel: port transactionnel de session avec `findActive`, `findById`, `insert`, `update`.
  - Changement attendu: créer un port dédié aux actifs ou une extension claire. Ne pas casser le port session utilisé par 1.1/1.2.
  - À préserver: l'invariant transactionnel "une seule session open" reste intact.

- `packages/domain/src/sessions/mappers.ts`
  - État actuel: `toSession` et `toSessionContext` calculent `canReceiveDecisions` via `isActiveStatus`.
  - Changement attendu: ajouter des mappers d'actifs dans un fichier séparé si nécessaire.
  - À préserver: une session `closed` ne peut jamais recevoir de décisions ni de nouveaux actifs.

- `packages/db/src/schema/sessions.ts`
  - État actuel: table `sessions` et index unique partiel `uniq_active_session`.
  - Changement attendu: ajouter `assets` et `session_assets`, ou créer un module de schéma indexé proprement.
  - À préserver: ne pas renommer `sessions`, ne pas supprimer `uniq_active_session`, ne pas exposer `snake_case` aux API.

- `packages/db/src/client.ts`
  - État actuel: `ensureSchema` crée `sessions` et `uniq_active_session`; la DB locale résout les chemins relatifs depuis la racine du repo.
  - Changement attendu: créer les nouvelles tables avec compatibilité backward.
  - À préserver: `DEFAULT_DEV_DATABASE_PATH`, `resolveDatabasePath`, `foreign_keys = ON`, et le comportement `:memory:` pour tests.

- `packages/db/src/repository/sessionRepository.ts`
  - État actuel: mappe `SessionRow` vers `SessionRecord`; le worktree valide déjà les statuts persistés via `sessionStatusSchema.parse`.
  - Changement attendu: ne pas réintroduire de cast non validé; créer un repository d'actifs séparé si cela garde le code plus clair.

- `apps/review/src/server/sessionHandlers.ts`
  - État actuel: handlers testables `create`, `active`, `resume`, `close`; mapping erreurs domaine/SQLite vers enveloppe API.
  - Changement attendu: ajouter handlers add/list assets ou déplacer vers un fichier voisin si la taille devient excessive.
  - À préserver: `jsonResponse`, `ok`, `fail`, `apiErrors`, et le mapping structuré existant.

- `apps/review/src/components/SessionPanel.tsx`
  - État actuel: UI session active, clôture, reprise minimale; le worktree contient des corrections non commités: URLs dynamiques encodées, erreur conservée après refresh, usage du payload resume.
  - Changement attendu: ajouter liste et saisie rapide d'actifs sans écraser ces corrections.
  - À préserver: feedback immédiat, pas de formulaire lourd, pas de logique DB côté client.

- `apps/extension/src/popup/index.tsx`
  - État actuel: lit `GET /api/sessions/active` via `PLASMO_PUBLIC_API_BASE`.
  - Changement attendu: si modifié, rester API-only; ne pas ajouter storage/messaging Plasmo tant que l'AC ne l'exige pas.

### Contrats API recommandés

`POST /api/sessions/[id]/assets`

Requête:

```json
{
  "symbol": "NASDAQ:AAPL",
  "name": "Apple"
}
```

Succès `201` si lien créé, `200` si déjà lié:

```json
{
  "data": {
    "asset": {
      "id": "uuid",
      "symbol": "NASDAQ:AAPL",
      "name": "Apple",
      "createdAt": "2026-06-09T08:54:26.000Z",
      "linkedAt": "2026-06-09T08:54:26.000Z"
    }
  },
  "error": null,
  "meta": {}
}
```

`GET /api/sessions/[id]/assets`

Succès `200`:

```json
{
  "data": {
    "assets": [
      {
        "id": "uuid",
        "symbol": "NASDAQ:AAPL",
        "name": "Apple",
        "createdAt": "2026-06-09T08:54:26.000Z",
        "linkedAt": "2026-06-09T08:54:26.000Z"
      }
    ]
  },
  "error": null,
  "meta": {}
}
```

Erreurs:

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

- Story 1.1 a initialisé le monorepo et la tranche verticale session: contrats partagés, domaine pur, repository SQLite, handlers Next testables, UI review, popup Plasmo.
- Story 1.2 a ajouté les transitions `resume` et `close` sans créer de décisions. Les règles importantes à préserver:
  - `open` est le seul statut actif;
  - `closed` donne `canReceiveDecisions = false`;
  - `GET /api/sessions/active` retourne `null` après clôture;
  - la reprise ne crée jamais une nouvelle session;
  - l'index unique partiel empêche deux sessions `open`.
- Les corrections de review 1.2 présentes dans le worktree ne sont pas encore commités. Le dev agent doit lire les fichiers avant édition et ne pas les écraser.
- Les validations précédentes attendues restent `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

### Git Intelligence

- Dernier commit pertinent: `50d5acd feat(sessions): reprendre et clôturer une session (story 1.2)`.
- Fichiers modifiés par ce commit: handlers API session, routes Next resume/close, `SessionPanel`, repository session, tests domaine/DB/API/shared, erreurs et schémas partagés.
- Pattern établi:
  - domaine pur et testé dans `packages/domain`;
  - repository SQLite dans `packages/db`;
  - handlers serveur testables dans `apps/review/src/server`;
  - route handlers minces dans `apps/review/src/app/api`;
  - contrats Zod et erreurs publiques dans `packages/shared`.
- Le dev agent ne doit pas introduire un autre style de service, un autre ORM, ni de fetch direct DB côté extension.

### Recherche technique actuelle à prendre en compte

- Next.js: `next/latest` est `16.2.7` au moment de cette story, avec Node `>=20.9.0`, ce qui correspond déjà au `package.json` du projet. Ne pas upgrader dans cette story. [Source: npm registry `https://registry.npmjs.org/next/latest` consulté le 2026-06-09]
- Next.js Route Handlers: la doc officielle indique que `route.ts` crée des handlers personnalisés avec les Web `Request`/`Response`, et supporte `GET`/`POST`. Continuer sous `app/api`, pas `pages/api`. [Source: Next.js docs `https://nextjs.org/docs/app/api-reference/file-conventions/route` consulté le 2026-06-09]
- Drizzle SQLite: la doc officielle confirme le support SQLite avec `better-sqlite3`; le projet utilise déjà `drizzle-orm ^0.45.2` et `better-sqlite3 ^12.10.0`. Ne pas remplacer par `libsql`, Turso ou service externe. [Source: Drizzle docs `https://orm.drizzle.team/docs/get-started-sqlite` consulté le 2026-06-09]
- Zod: Zod 4 est stable et le projet utilise déjà `zod ^4.4.3`; continuer les schémas partagés avec `import { z } from "zod"`. [Source: Zod docs `https://zod.dev/packages/zod` consulté le 2026-06-09]
- Plasmo: la doc officielle confirme le support TypeScript/React et `.env`; pour cette story, `PLASMO_PUBLIC_API_BASE` suffit. Ne pas introduire storage/messaging tant que l'association d'actifs peut passer par l'API review. [Source: Plasmo docs `https://docs.plasmo.com/` consulté le 2026-06-09]

### Hors périmètre strict

- Pas de capture de décision buy/sell: story 1.4.
- Pas de portefeuille simulé, cash, positions, PnL, coût moyen ou equity curve: Epic 2.
- Pas de statistiques de performance.
- Pas d'intégration broker, TradingView automatique, Notion ou service de marché.
- Pas de validation externe du symbole.
- Pas de page complète CRUD actifs ou référentiel avancé d'instruments.
- Pas de modification du comportement `create/resume/close` hors adaptation nécessaire aux actifs.

### Risques et garde-fous pour le dev agent

- Ne pas stocker les actifs comme JSON dans `sessions`: cela compliquerait la réutilisation d'un actif entre sessions et la future liaison des décisions.
- Ne pas permettre l'ajout d'actifs à une session `closed`; cela contredirait le cycle de pratique et `canReceiveDecisions = false`.
- Ne pas créer de doublons si l'utilisateur clique deux fois ou saisit `aapl` puis `AAPL`.
- Ne pas rendre l'asset catalog global visible comme une feature complète; la valeur V1 est la liste d'actifs de la session.
- Ne pas exposer `snake_case` (`created_at`, `linked_at`, `session_id`) dans les réponses API.
- Ne pas casser les corrections non commités du worktree, notamment l'encodage des URLs dans `SessionPanel`.
- Ne pas affaiblir les tests existants pour faire passer les nouveaux tests.

### Project Structure Notes

- Aucun `project-context.md` n'a été trouvé.
- Aucun document UX dédié n'a été trouvé; appliquer les principes PRD: usage desktop, saisie rapide, simplicité V1.
- Aucun `_bmad-output/implementation-artifacts/sprint-status.yaml` n'existe actuellement; aucun statut sprint ne peut être mis à jour automatiquement.
- Le worktree contient des modifications non commités dans:
  - `_bmad-output/implementation-artifacts/1-2-reprendre-et-cloturer-une-session.md`
  - `apps/review/src/components/SessionPanel.tsx`
  - `packages/db/src/repository/__tests__/sessionRepository.test.ts`
  - `packages/db/src/repository/sessionRepository.ts`
  - `packages/shared/src/schemas/__tests__/session.test.ts`
  - `packages/shared/src/schemas/session.ts`

### References

- `_bmad-output/planning-artifacts/epics.md` > Requirements Inventory, Epic 1, Story 1.3.
- `_bmad-output/planning-artifacts/architecture.md` > Project Structure & Boundaries, Requirements to Structure Mapping, Architecture Validation Results.
- `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Functional Requirements, Data and Domain Rules, Scope for V1.
- `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories.
- `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/.decision-log.md` > décisions de cadrage V1.
- `_bmad-output/implementation-artifacts/1-1-creer-et-ouvrir-une-session.md` > Completion Notes List, Review Findings.
- `_bmad-output/implementation-artifacts/1-2-reprendre-et-cloturer-une-session.md` > Dev Notes, Previous Story Intelligence, Review Findings.
- Next.js Route Handlers: `https://nextjs.org/docs/app/api-reference/file-conventions/route`.
- Drizzle SQLite docs: `https://orm.drizzle.team/docs/get-started-sqlite`.
- Zod package docs: `https://zod.dev/packages/zod`.
- Plasmo docs: `https://docs.plasmo.com/`.
- npm registry metadata: `https://registry.npmjs.org/next/latest`.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8)

### Debug Log References

- 2026-06-09: Story créée depuis `bmad-create-story` pour story 1.3.
- 2026-06-09: Discovery input: epics 1 fichier, architecture 1 fichier, PRD 3 fichiers, UX 0 fichier, project context 0 fichier.
- 2026-06-09: `sprint-status.yaml` absent au chemin configuré; aucun statut sprint mis à jour.
- 2026-06-09: Worktree dirty détecté; story inclut les fichiers à préserver avant édition.
- 2026-06-09 (dev): Worktree propre au démarrage du dev; les corrections non commitées de 1.2 mentionnées dans les Dev Notes ont déjà été intégrées au commit `d3ca9f7`. Aucune correction écrasée.
- 2026-06-09 (dev): Implémentation en TDD (red-green-refactor) tâche par tâche. 96 tests verts; `pnpm test`, `typecheck`, `lint`, `build` tous OK.
- 2026-06-09 (dev): Test d'ordre de liste rendu déterministe via horloge contrôlée (le clock système provoquait des `linkedAt` à égalité avec le tie-break `symbol`).
- 2026-06-09 (review): Code review 1.3 appliquée: erreurs structurées de chargement d'actifs traitées dans l'UI review et la popup extension; réponses tardives d'assets ignorées après changement de session; insertions concurrentes `assets`/`session_assets` rendues idempotentes via `INSERT OR IGNORE` + relecture. 98 tests verts; `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` OK.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 1.3 prête pour implémentation; elle définit une association d'actifs minimale, durable et compatible avec la future capture de décisions.
- **AC1 satisfait**: `POST /api/sessions/[id]/assets` enregistre l'actif lié à une session `open`; une session peut contenir plusieurs actifs (catalogue `assets` + liaison `session_assets`). Idempotence garantie (symbole normalisé uppercase, pas de doublon) — `201` au lien créé, `200` si déjà lié.
- **AC2 satisfait**: `GET /api/sessions/[id]/assets` retourne les actifs liés en ordre stable (`linkedAt ASC, symbol ASC`); la `SessionPanel` et le popup d'extension affichent la liste. Une session `closed` reste consultable mais refuse l'ajout (`409 SESSION_NOT_ACTIVE`).
- Architecture respectée: contrats Zod + erreurs dans `packages/shared`, règles métier pures dans `packages/domain`, repository SQLite dans `packages/db`, handlers serveur testables dans `apps/review/src/server`, route handlers minces, extension API-only (jamais d'import `packages/db`).
- Refactor: les helpers HTTP partagés (`jsonResponse`, `toApiError`, `errorResponse`) extraits dans `apps/review/src/server/http.ts` pour réutilisation par `sessionHandlers` et `assetHandlers`; `jsonResponse`/`ok`/`fail`/`apiErrors` et le mapping structuré existant préservés.
- Schéma DB rétro-compatible: `ensureSchema` ajoute `assets`, `session_assets` et leurs index via `CREATE TABLE/INDEX IF NOT EXISTS`; `sessions` et `uniq_active_session` intacts; `foreign_keys = ON` actif.
- Écart mineur vs contrat recommandé: `addSessionAsset` (domaine) retourne `{ asset, created }` afin de distinguer `201`/`200` au niveau handler; tests domaine/DB adaptés en conséquence.
- Hors périmètre respecté: aucune décision buy/sell, portefeuille, prix de marché, intégration TradingView/broker, ni validation externe du symbole.
- Code review appliquée: les erreurs API assets ne sont plus masquées en listes vides, les réponses tardives ne peuvent plus écraser les assets de la session courante, et les conflits d'insertion concurrente du même actif/lien restent idempotents.

### File List

Nouveaux fichiers:
- `packages/shared/src/schemas/sessionAsset.ts`
- `packages/shared/src/schemas/__tests__/sessionAsset.test.ts`
- `packages/domain/src/sessions/assetTypes.ts`
- `packages/domain/src/sessions/assetMappers.ts`
- `packages/domain/src/sessions/addSessionAsset.ts`
- `packages/domain/src/sessions/listSessionAssets.ts`
- `packages/domain/src/sessions/__tests__/fakeAssetRepo.ts`
- `packages/domain/src/sessions/__tests__/addSessionAsset.test.ts`
- `packages/domain/src/sessions/__tests__/listSessionAssets.test.ts`
- `packages/db/src/schema/assets.ts`
- `packages/db/src/schema/index.ts`
- `packages/db/src/repository/sessionAssetRepository.ts`
- `packages/db/src/repository/__tests__/sessionAssetRepository.test.ts`
- `apps/review/src/server/http.ts`
- `apps/review/src/server/assetHandlers.ts`
- `apps/review/src/app/api/sessions/[id]/assets/route.ts`
- `apps/review/__tests__/assetHandlers.test.ts`

Fichiers modifiés:
- `packages/shared/src/index.ts` (export `sessionAsset`)
- `packages/domain/src/index.ts` (exports actifs)
- `packages/db/src/client.ts` (`ensureSchema` + import schéma combiné)
- `packages/db/src/index.ts` (export repository + `getDefaultSessionAssetRepository`, export schéma combiné)
- `apps/review/src/server/sessionHandlers.ts` (réutilise `./http`)
- `apps/review/src/components/SessionPanel.tsx` (liste + saisie rapide d'actifs)
- `apps/extension/src/popup/index.tsx` (affichage liste d'actifs, API-only)
- `_bmad-output/implementation-artifacts/1-3-associer-des-actifs-a-une-session.md` (suivi story)

### Change Log

- 2026-06-09: Implémentation story 1.3 — association d'actifs à une session (catalogue `assets` + liaison `session_assets`, endpoints `POST`/`GET /api/sessions/[id]/assets`, UI review + popup). 24 nouveaux tests (96 au total). `test`/`typecheck`/`lint`/`build` verts. Status → review.
- 2026-06-09: Corrections de code review appliquées et validées: 4 findings patch résolus, 2 tests ajoutés (98 au total), `test`/`typecheck`/`lint`/`build` verts. Status → done.
