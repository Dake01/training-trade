---
story_id: "1.2"
story_key: "1-2-reprendre-et-cloturer-une-session"
epic: "1"
status: "review"
baseline_commit: "234b2cc382d6feda2d60f9d590520438320d8382"
created: "2026-06-08T19:05:55+02:00"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 1.2: Reprendre et clôturer une session

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,  
I want reprendre une session existante et la clôturer quand la session est terminée,  
so that je puisse gérer proprement mon cycle de pratique.

## Acceptance Criteria

1. **Reprise d'une session ouverte ou suspendue**
   - Given une session existante en statut ouvert ou suspendu
   - When l'utilisateur la reprend
   - Then la session redevient active pour la saisie
   - And l'historique de ses décisions reste intact

2. **Clôture d'une session active**
   - Given une session active
   - When l'utilisateur la clôture
   - Then la session passe en statut clôturé
   - And aucune nouvelle décision ne peut y être ajoutée tant qu'elle n'est pas rouverte explicitement selon les règles du produit

## Tasks / Subtasks

- [x] Étendre les contrats partagés de session sans casser ceux de 1.1 (AC: 1, 2)
  - [x] Conserver `SESSION_STATUSES = ["open", "suspended", "closed"]` et `isActiveStatus(status) === status === "open"` dans `packages/shared/src/schemas/sessionStatus.ts`.
  - [x] Ajouter les schémas de réponse nécessaires dans `packages/shared/src/schemas/session.ts`, par exemple `resumeSessionResponseSchema` et `closeSessionResponseSchema`, en réutilisant le DTO `sessionSchema`.
  - [x] Ajouter des erreurs publiques structurées dans `packages/shared/src/errors.ts`: au minimum `SESSION_NOT_FOUND`, `SESSION_ALREADY_CLOSED` et `SESSION_NOT_ACTIVE` ou équivalents stables. Garder le format `{ data, error, meta }`.
  - [x] Ne pas renommer ni retirer `activeSessionResponseSchema`, `createSessionResponseSchema`, `ApiResponse`, `ok`, `fail`, `ACTIVE_SESSION_EXISTS` ou `NO_ACTIVE_SESSION`.

- [x] Étendre le port repository session dans `packages/domain` (AC: 1, 2)
  - [x] Ajouter à `SessionRepository` / `SessionStore` les opérations nécessaires aux transitions atomiques: `findById(id)` et `update(record)` ou une méthode équivalente testable.
  - [x] Préserver l'invariant existant: une seule session `open` à la fois. Une reprise de session suspendue doit vérifier dans la même transaction qu'aucune autre session `open` n'existe.
  - [x] Mettre à jour `packages/domain/src/sessions/__tests__/fakeRepo.ts` pour supporter les nouvelles opérations sans changer les tests 1.1.

- [x] Implémenter la règle métier de reprise dans `packages/domain` (AC: 1)
  - [x] Créer `resumeSession(repo, deps, sessionId)` dans `packages/domain/src/sessions/resumeSession.ts`.
  - [x] Si la session est `open`, retourner la session active sans perte de données; comportement idempotent autorisé.
  - [x] Si la session est `suspended`, la passer à `open`, mettre `updatedAt` à l'instant courant, conserver `createdAt`, `openedAt` et `closedAt = null`.
  - [x] Si une autre session `open` existe déjà, retourner le même conflit métier que la création (`ACTIVE_SESSION_EXISTS`) plutôt que produire deux sessions actives.
  - [x] Si la session est `closed`, refuser la reprise avec une erreur structurée; les règles de réouverture explicite d'une session clôturée ne sont pas définies dans cette story.
  - [x] Si la session n'existe pas, retourner une erreur `SESSION_NOT_FOUND`.
  - [x] Garantir que l'historique futur des décisions reste attaché à la même session `id`; ne pas créer une nouvelle session pendant une reprise.

- [x] Implémenter la règle métier de clôture dans `packages/domain` (AC: 2)
  - [x] Créer `closeSession(repo, deps, sessionId)` dans `packages/domain/src/sessions/closeSession.ts`.
  - [x] Autoriser la clôture uniquement si la session ciblée est `open`.
  - [x] Passer la session à `closed`, mettre `updatedAt` et `closedAt` à l'instant courant, conserver `createdAt` et `openedAt`.
  - [x] Retourner un DTO dont `canReceiveDecisions` vaut `false`.
  - [x] Si la session est déjà `closed`, renvoyer une erreur métier explicite et stable.
  - [x] Si la session est `suspended`, renvoyer `SESSION_NOT_ACTIVE` ou équivalent; cette story ne définit pas la clôture d'une session suspendue.
  - [x] Si la session n'existe pas, renvoyer `SESSION_NOT_FOUND`.

- [x] Étendre la persistance SQLite/Drizzle dans `packages/db` (AC: 1, 2)
  - [x] Garder la table `sessions` existante et ses colonnes `id`, `status`, `created_at`, `updated_at`, `opened_at`, `closed_at`.
  - [x] Ne pas ajouter de table décisions dans cette story. L'AC sur l'historique signifie ici que les transitions ne changent pas l'identifiant de session et ne suppriment aucune donnée future liée à cette session.
  - [x] Implémenter `findById` et `update` dans `packages/db/src/repository/sessionRepository.ts` en mappant strictement `snake_case` DB vers `camelCase` domaine.
  - [x] Conserver l'index unique partiel `uniq_active_session WHERE status = 'open'`.
  - [x] Mapper les collisions SQLite de l'index actif vers une erreur API `409 ACTIVE_SESSION_EXISTS`, comme dans 1.1.
  - [x] Vérifier que `ensureSchema` reste compatible avec les bases créées par 1.1.

- [x] Exposer les endpoints Next.js de cycle de vie session (AC: 1, 2)
  - [x] Ajouter `POST /api/sessions/[id]/resume` dans `apps/review/src/app/api/sessions/[id]/resume/route.ts`.
  - [x] Ajouter `POST /api/sessions/[id]/close` dans `apps/review/src/app/api/sessions/[id]/close/route.ts`.
  - [x] Garder `export const runtime = "nodejs"` et `export const dynamic = "force-dynamic"` sur ces route handlers, car `better-sqlite3` exige le runtime Node.
  - [x] Ajouter des handlers testables dans `apps/review/src/server/sessionHandlers.ts`: `handleResumeSession(repo, id)` et `handleCloseSession(repo, id)` ou noms équivalents.
  - [x] Réutiliser `ok`, `fail` et les factories `apiErrors`; ne pas construire des réponses JSON ad hoc avec un autre format.
  - [x] Retourner les succès au format `{ data: { session }, error: null, meta: {} }`.
  - [x] Retourner `404` pour session inconnue, `409` pour transition interdite ou conflit de session active, et `500` structuré pour erreur inattendue.
  - [x] Ne pas modifier le contrat de `POST /api/sessions` ni `GET /api/sessions/active`, sauf pour préserver leur cohérence après clôture.

- [x] Mettre à jour l'expérience review et popup sans surdimensionner l'UX (AC: 1, 2)
  - [x] Dans `apps/review/src/components/SessionPanel.tsx`, ajouter une action de clôture visible uniquement quand une session est active.
  - [x] Après clôture, rafraîchir l'état actif: `GET /api/sessions/active` doit retourner `{ session: null }`.
  - [x] Prévoir une action de reprise minimale par identifiant de session ou par session connue localement, sans créer une page de gestion complète des sessions.
  - [x] Afficher un état lisible pour une session clôturée: statut `closed`, `closedAt`, et `canReceiveDecisions = false`.
  - [x] Dans `apps/extension/src/popup/index.tsx`, continuer à lire uniquement l'API review. Le popup ne doit pas importer `packages/db` ni porter de logique métier.
  - [x] Garder l'expérience desktop-first et rapide: boutons directs, feedback immédiat, pas d'intégration automatique TradingView.

- [x] Couvrir les transitions par des tests ciblés (AC: 1, 2)
  - [x] Tests domaine pour `resumeSession`: `suspended -> open`, `open -> open` idempotent, `closed -> erreur`, `not found -> erreur`, conflit si une autre session est déjà `open`.
  - [x] Tests domaine pour `closeSession`: `open -> closed`, `closedAt` ISO 8601, `canReceiveDecisions = false`, `closed -> erreur`, `suspended -> erreur`, `not found -> erreur`.
  - [x] Tests DB en mémoire: `findById`, `update`, conservation des timestamps, `GET active` nul après clôture, index unique actif toujours respecté.
  - [x] Tests API dans `apps/review/__tests__/sessionHandlers.test.ts`: succès resume/close, session inconnue, session déjà clôturée, conflit actif, enveloppe d'erreur structurée.
  - [x] Tests UI/popup suffisants au niveau existant du repo; ne pas introduire Playwright sauf si une convention e2e existe déjà.

- [x] Valider la tranche verticale (AC: 1, 2)
  - [x] Exécuter `pnpm test`.
  - [x] Exécuter `pnpm typecheck`.
  - [x] Exécuter `pnpm lint`.
  - [x] Exécuter `pnpm build`.
  - [x] Vérifier manuellement ou par test que: création `open` -> clôture `closed` -> `GET /api/sessions/active` retourne `null` -> nouvelle création possible.
  - [x] Mettre à jour le `Dev Agent Record` et la `File List` de cette story avec tous les fichiers modifiés.

## Dev Notes

### Contexte métier

- Cette story couvre la suite de FR2: l'utilisateur doit pouvoir ouvrir, reprendre et clôturer une session. [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 1 > Story 1.2]
- Le cycle de pratique attendu est: ouvrir une session, enregistrer des décisions, continuer jusqu'à clôture ou interruption, puis consulter plus tard. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Core User Journey]
- Une décision doit toujours être rattachée à une session; cette story doit donc préserver l'identifiant de session pendant reprise/clôture pour ne pas casser les futures stories décisions. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Data and Domain Rules]
- Le produit reste une simulation personnelle: pas de broker, pas de trading réel, pas d'automatisation d'ordres. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Non-Goals]
- Notion reste hors périmètre; ne pas créer de journal narratif ni synchronisation Notion dans cette story. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Notes on product boundary]

### Décisions de cadrage pour cette story

- `open` est le seul statut actif. C'est déjà codé dans `isActiveStatus(status)` et utilisé par `canReceiveDecisions`.
- `suspended` existe déjà dans le contrat partagé mais aucune story précédente n'a créé de transition vers `suspended`. Le dev agent doit supporter la reprise d'une session `suspended` persistée ou seedée en test, sans ajouter une feature de suspension complète si elle n'est pas requise par l'AC.
- `closed` bloque la saisie future via `canReceiveDecisions = false`. Les décisions n'existent pas encore, donc le garde-fou livrable est le statut, le DTO et les règles métier que la future story 1.4 devra consommer.
- La réouverture d'une session clôturée est explicitement hors périmètre tant que les règles produit ne sont pas définies. Ne pas transformer `resume` en `reopen closed`.

### Architecture à respecter

- `apps/review/app/api/*` expose les endpoints consommés par l'extension et l'app de revue. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- `apps/extension` ne doit jamais accéder directement à `packages/db`. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- Les route handlers Next.js orchestrent validation, métier et persistance via `packages/domain` et `packages/db`; la logique métier ne va pas dans React ni dans les handlers. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- `packages/domain` contient les règles métier de sessions, décisions, portefeuille et statistiques. [Source: `_bmad-output/planning-artifacts/architecture.md` > Service Boundaries]
- `packages/db` contient Drizzle schema, client SQLite, migrations légères et accès données. [Source: `_bmad-output/planning-artifacts/architecture.md` > Service Boundaries]
- `packages/shared` contient les schémas Zod, DTO, constantes et erreurs partagées. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- SQLite reste la source de vérité V1; base en `snake_case`, domaine/API en `camelCase`; timestamps API en ISO 8601. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- Les réponses API publiques suivent toujours `{ data, error, meta }` avec erreurs structurées. [Source: `_bmad-output/planning-artifacts/epics.md` > Additional Requirements]

### Fichiers existants à modifier et état actuel

- `packages/shared/src/schemas/sessionStatus.ts`
  - État actuel: déclare `open`, `suspended`, `closed`, `CREATABLE_SESSION_STATUS = "open"` et `isActiveStatus(status)`.
  - Changement attendu: conserver ce contrat; éventuellement ajouter commentaires ou exports nécessaires sans changer la sémantique.
  - À préserver: `isActiveStatus` doit rester la source unique pour `canReceiveDecisions`.

- `packages/shared/src/schemas/session.ts`
  - État actuel: `sessionSchema`, `sessionContextSchema`, `createSessionResponseSchema`, `activeSessionResponseSchema`.
  - Changement attendu: ajouter les schémas des réponses `resume` et `close`, ou réutiliser proprement `sessionSchema`.
  - À préserver: timestamps ISO 8601, `closedAt` nullable, `canReceiveDecisions` boolean.

- `packages/shared/src/errors.ts`
  - État actuel: `ACTIVE_SESSION_EXISTS`, `NO_ACTIVE_SESSION`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
  - Changement attendu: ajouter les erreurs de transition session. Ne pas changer les codes existants ni leurs statuts HTTP.

- `packages/domain/src/sessions/types.ts`
  - État actuel: `SessionRepository` expose `findActive()` et `transaction(fn)`, `SessionStore` expose `findActive()` et `insert()`.
  - Changement attendu: ajouter les opérations de lecture par id et mise à jour atomique.
  - À préserver: l'invariant atomique check + write via `repo.transaction`.

- `packages/domain/src/sessions/createSession.ts`
  - État actuel: crée une session `open`, refuse si une session active existe.
  - Changement attendu: aucun changement fonctionnel sauf adaptation au port repository si nécessaire.
  - À préserver: `POST /api/sessions` doit continuer à répondre `409 ACTIVE_SESSION_EXISTS` si une active existe.

- `packages/domain/src/sessions/getActiveSession.ts`
  - État actuel: retourne le contexte minimal de la session `open` ou `null`.
  - Changement attendu: après clôture, doit naturellement retourner `null`.
  - À préserver: ne pas retourner une session `closed` comme active.

- `packages/domain/src/sessions/mappers.ts`
  - État actuel: `toSession` et `toSessionContext` calculent `canReceiveDecisions` via `isActiveStatus`.
  - Changement attendu: vérifier par tests que `toSession(closed).canReceiveDecisions === false`.

- `packages/db/src/schema/sessions.ts`
  - État actuel: table `sessions` avec index unique partiel `uniq_active_session` sur `status = 'open'`.
  - Changement attendu: pas de nouvelle colonne obligatoire. `closed_at` existe déjà.
  - À préserver: compatibilité avec les bases 1.1 et unicité active.

- `packages/db/src/repository/sessionRepository.ts`
  - État actuel: mappe rows Drizzle vers `SessionRecord`, implémente `findActive`, `insert`, `transaction`.
  - Changement attendu: ajouter `findById` et `update`, mapper les colonnes existantes, garder transaction synchrone `better-sqlite3`.

- `apps/review/src/server/sessionHandlers.ts`
  - État actuel: handlers testables pour create et get active; mapping conflit SQLite vers `409`.
  - Changement attendu: ajouter handlers resume/close et mapping des nouvelles erreurs domaine vers erreurs API structurées.
  - À préserver: `jsonResponse`, `ok`, `fail`, enveloppe `{ data, error, meta }`.

- `apps/review/src/components/SessionPanel.tsx`
  - État actuel: bouton de création, chargement de la session active, carte active.
  - Changement attendu: action clôturer, affichage statut clôturé, reprise minimale par id ou session connue.
  - À préserver: UI simple, desktop-first, feedback immédiat, pas de dépendance TradingView.

- `apps/extension/src/popup/index.tsx`
  - État actuel: lit `GET /api/sessions/active` via `PLASMO_PUBLIC_API_BASE`.
  - Changement attendu: afficher correctement l'absence de session active après clôture; optionnellement exposer une action légère si elle passe par l'API review.
  - À préserver: aucun import DB, aucune intégration automatique TradingView.

### Contrats API recommandés

`POST /api/sessions/[id]/resume`

Succès `200`:

```json
{
  "data": {
    "session": {
      "id": "uuid",
      "status": "open",
      "createdAt": "2026-06-08T14:00:00.000Z",
      "updatedAt": "2026-06-08T14:30:00.000Z",
      "openedAt": "2026-06-08T14:00:00.000Z",
      "closedAt": null,
      "canReceiveDecisions": true
    }
  },
  "error": null,
  "meta": {}
}
```

`POST /api/sessions/[id]/close`

Succès `200`:

```json
{
  "data": {
    "session": {
      "id": "uuid",
      "status": "closed",
      "createdAt": "2026-06-08T14:00:00.000Z",
      "updatedAt": "2026-06-08T15:10:00.000Z",
      "openedAt": "2026-06-08T14:00:00.000Z",
      "closedAt": "2026-06-08T15:10:00.000Z",
      "canReceiveDecisions": false
    }
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
    "code": "SESSION_NOT_FOUND",
    "message": "Session introuvable.",
    "status": 404
  },
  "meta": {}
}
```

```json
{
  "data": null,
  "error": {
    "code": "SESSION_ALREADY_CLOSED",
    "message": "La session est deja cloturee.",
    "status": 409
  },
  "meta": {}
}
```

### Previous Story Intelligence

- Story 1.1 est terminée et a initialisé le monorepo complet: `apps/review`, `apps/extension`, `packages/domain`, `packages/db`, `packages/shared`.
- Les corrections de review 1.1 ont stabilisé des points à préserver:
  - `GET /api/sessions/active` retourne une enveloppe structurée même sans session active.
  - Les erreurs de stockage sont capturées et mappées en `500` structuré.
  - Les conflits SQLite de l'index unique sont mappés en `409 ACTIVE_SESSION_EXISTS`.
  - Le chemin SQLite relatif est résolu depuis la racine du repo.
  - `next-env.d.ts` ne doit pas dépendre d'un fichier `.next` fragile.
- `pnpm@9.15.4` est fixé dans `package.json` parce que le `latest` pnpm observé pendant 1.1 exigeait une version Node plus récente que l'environnement initial.
- Les validations 1.1 étaient vertes: 14 tests Vitest, `typecheck`, `lint`, `build`, smoke test HTTP réel.
- Le dev agent doit prolonger les mêmes patterns de tests au lieu d'introduire un framework e2e ou un autre style de service.

### Git Intelligence

- Dernier commit pertinent: `234b2cc feat: initialize training trade workspace`.
- Ce commit a créé la tranche verticale sessions 1.1 avec la séparation suivante:
  - domaine pur et testable dans `packages/domain`;
  - repository SQLite dans `packages/db`;
  - handlers Next testables dans `apps/review/src/server`;
  - route handlers minces sous `apps/review/src/app/api`;
  - contrats partagés et erreurs dans `packages/shared`.
- La story 1.2 doit conserver ce découpage. Ajouter directement des écritures SQLite dans `apps/review` ou `apps/extension` serait une régression architecturale.

### Recherche technique actuelle à prendre en compte

- Next.js `latest` observé le 2026-06-08: `16.2.7`, Node `>=20.9.0`. Le projet utilise déjà `next ^16.2.7` et `node >=20.9.0`, donc ne pas upgrader dans cette story. [Source: npm registry `https://registry.npmjs.org/next/latest` consulté le 2026-06-08]
- Next.js App Router utilise les fichiers `route.ts` / `route.js` pour les route handlers et les Web `Request` / `Response`; continuer sous `app/api`, pas `pages/api`. [Source: Next.js docs `https://nextjs.org/docs/app/building-your-application/routing/router-handlers` consulté le 2026-06-08]
- Les Route Handlers supportent `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, etc. `POST /resume` et `POST /close` sont acceptables pour des commandes métier non idempotentes ou transitionnelles. [Source: Next.js glossary `https://nextjs.org/docs/app/glossary` consulté le 2026-06-08]
- Drizzle supporte SQLite avec `better-sqlite3`; le projet utilise déjà `drizzle-orm ^0.45.2` et `better-sqlite3 ^12.10.0`. Ne pas remplacer par `libsql` ou un service externe pour cette story. [Source: Drizzle SQLite docs `https://orm.drizzle.team/docs/get-started-sqlite` consulté le 2026-06-08]
- Zod 4 est stable et le package racine `zod` exporte Zod 4; le projet utilise déjà `zod ^4.4.3`. Continuer les imports existants `import { z } from "zod"`. [Source: Zod docs `https://zod.dev/packages/zod` et `https://zod.dev/v4/versioning` consultés le 2026-06-08]
- Plasmo documente TypeScript/React, HMR, storage/messaging et support `.env`. Pour cette story, le popup doit rester une interface API légère via `PLASMO_PUBLIC_API_BASE`; ne pas introduire storage/messaging tant que l'AC ne l'exige pas. [Source: Plasmo docs `https://docs.plasmo.com/` consulté le 2026-06-08]

### Hors périmètre strict

- Pas de création ou modification de décisions buy/sell: story 1.4.
- Pas d'association d'actifs: story 1.3.
- Pas de portefeuille simulé, cash, positions, PnL ou equity curve: Epic 2.
- Pas de statistiques de trading: Epic 2.
- Pas de synchronisation automatique TradingView.
- Pas de réouverture d'une session clôturée tant que les règles produit ne sont pas définies.
- Pas de feature complète de suspension si elle n'est pas nécessaire pour reprendre une session `suspended` existante.
- Pas de refonte UI ou design system.

### Risques et garde-fous pour le dev agent

- Ne pas créer une nouvelle session pour "reprendre" une session. La reprise conserve le même `id`.
- Ne pas considérer `closed` comme actif. `GET /api/sessions/active` doit retourner `null` après clôture.
- Ne pas supprimer ou recréer la ligne `sessions` pendant une transition; utiliser une mise à jour.
- Ne pas rendre possible deux sessions `open`; garder la vérification transactionnelle et l'index unique partiel.
- Ne pas exposer `snake_case` à l'API publique.
- Ne pas laisser les transitions dépendre seulement de l'UI; les règles doivent vivre dans `packages/domain`.
- Ne pas introduire une dépendance à TradingView, broker, Notion ou service externe.
- Ne pas casser les tests 1.1; les endpoints existants doivent rester compatibles.

### Project Structure Notes

- Aucun `project-context.md` n'a été trouvé.
- Aucun document UX dédié n'a été trouvé; appliquer les principes PRD: usage desktop, saisie rapide, simplicité V1.
- Aucun `_bmad-output/implementation-artifacts/sprint-status.yaml` n'existe actuellement; aucun statut sprint ne peut être mis à jour automatiquement.
- Le worktree contient déjà des modifications BMad hors de cette story (`_bmad/_config/*`, `_bmad/bmm/config.yaml`, `_bmad/core/config.yaml`). Ne pas les réinitialiser.

### References

- `_bmad-output/planning-artifacts/epics.md` > Requirements Inventory, Epic 1, Story 1.2.
- `_bmad-output/planning-artifacts/architecture.md` > Project Structure & Boundaries, Requirements to Structure Mapping, Architecture Validation Results.
- `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Core User Journey, Functional Requirements, Data and Domain Rules, Scope for V1.
- `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories.
- `_bmad-output/implementation-artifacts/1-1-creer-et-ouvrir-une-session.md` > Review Findings, Completion Notes List, File List.
- Next.js Route Handlers: `https://nextjs.org/docs/app/building-your-application/routing/router-handlers`.
- Next.js Glossary: `https://nextjs.org/docs/app/glossary`.
- Drizzle SQLite docs: `https://orm.drizzle.team/docs/get-started-sqlite`.
- Zod package docs: `https://zod.dev/packages/zod`.
- Zod versioning: `https://zod.dev/v4/versioning`.
- Plasmo docs: `https://docs.plasmo.com/`.
- npm registry metadata: `https://registry.npmjs.org/next/latest`.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, dev-story workflow)

### Debug Log References

- 2026-06-08: Story créée depuis `bmad-create-story`; `sprint-status.yaml` absent, donc aucun statut sprint mis à jour.
- 2026-06-08: Discovery input: epics 1 fichier, architecture 1 fichier, PRD 2 fichiers utiles, UX 0 fichier, project context 0 fichier.
- 2026-06-08: Analyse précédente: story 1.1 terminée, patterns shared/domain/db/API/UI à réutiliser.
- 2026-06-08: `pnpm` indisponible au démarrage; activé via `corepack prepare pnpm@9.15.4 --activate`. `pnpm install` recompile `better-sqlite3` (node-gyp) sans erreur.
- 2026-06-08: Baseline 1.1 verte avant dev (18 tests). Après dev: 41 tests verts, `typecheck`, `lint`, `build` OK.
- 2026-06-08: Smoke test HTTP réel (`next start`, DB `:memory:`): cycle create→409→close→active null→409 already-closed→resume closed 409→resume unknown 404→nouvelle création 201, tous conformes.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 1.2 cadrée comme extension directe de la tranche verticale session 1.1.
- AC1 (reprise): `resumeSession` dans `packages/domain` — `suspended -> open`, `open -> open` idempotent, refus `closed` (`SESSION_ALREADY_CLOSED`), `SESSION_NOT_FOUND`, conflit `ACTIVE_SESSION_EXISTS` si une autre session `open` existe. Même `id` conservé, historique préservé.
- AC2 (clôture): `closeSession` dans `packages/domain` — clôture uniquement si `open`, `closedAt`/`updatedAt` à l'instant courant, `createdAt`/`openedAt` préservés, DTO `canReceiveDecisions = false`; `SESSION_ALREADY_CLOSED` si déjà clôturée, `SESSION_NOT_ACTIVE` si `suspended`, `SESSION_NOT_FOUND` sinon.
- Contrats partagés étendus sans rupture 1.1: nouveaux `resumeSessionResponseSchema`, `closeSessionResponseSchema` et erreurs `SESSION_NOT_FOUND` (404), `SESSION_ALREADY_CLOSED` (409), `SESSION_NOT_ACTIVE` (409). `ACTIVE_SESSION_EXISTS`, `NO_ACTIVE_SESSION`, `ok`, `fail`, `ApiResponse`, `isActiveStatus`, `SESSION_STATUSES` inchangés.
- Port repository étendu (`findById`, `update` sur `SessionStore`/`SessionRepository`); transitions atomiques via `repo.transaction`, ligne mise à jour en place (jamais supprimée/recréée), index unique partiel `uniq_active_session` conservé.
- Endpoints Next.js minces ajoutés: `POST /api/sessions/[id]/resume` et `POST /api/sessions/[id]/close` (`runtime = nodejs`, `dynamic = force-dynamic`), handlers testables `handleResumeSession`/`handleCloseSession`, mapping erreurs domaine→API centralisé (`toApiError`). Contrats `POST /api/sessions` et `GET /api/sessions/active` inchangés.
- UI review (`SessionPanel`): bouton Clôturer visible seulement si session active, carte « Session cloturee » lisible (`closed`, `closedAt`, décisions indisponibles), reprise minimale par identifiant. `apps/extension` popup inchangé: lit uniquement l'API review, gère `session: null` après clôture, aucun import `packages/db`.
- Niveau de test aligné sur 1.1 (Vitest, pas de e2e/Playwright introduit). UI couverte par `typecheck`/`lint`/`build` comme en 1.1 (pas de framework de test React dans le repo).

### File List

- `_bmad-output/implementation-artifacts/1-2-reprendre-et-cloturer-une-session.md` (modifié)
- `packages/shared/src/schemas/session.ts` (modifié)
- `packages/shared/src/errors.ts` (modifié)
- `packages/shared/src/schemas/__tests__/session.test.ts` (modifié)
- `packages/domain/src/sessions/types.ts` (modifié)
- `packages/domain/src/sessions/errors.ts` (modifié)
- `packages/domain/src/sessions/resumeSession.ts` (ajouté)
- `packages/domain/src/sessions/closeSession.ts` (ajouté)
- `packages/domain/src/index.ts` (modifié)
- `packages/domain/src/sessions/__tests__/fakeRepo.ts` (modifié)
- `packages/domain/src/sessions/__tests__/resumeSession.test.ts` (ajouté)
- `packages/domain/src/sessions/__tests__/closeSession.test.ts` (ajouté)
- `packages/db/src/repository/sessionRepository.ts` (modifié)
- `packages/db/src/repository/__tests__/sessionRepository.test.ts` (modifié)
- `apps/review/src/server/sessionHandlers.ts` (modifié)
- `apps/review/src/app/api/sessions/[id]/resume/route.ts` (ajouté)
- `apps/review/src/app/api/sessions/[id]/close/route.ts` (ajouté)
- `apps/review/src/components/SessionPanel.tsx` (modifié)
- `apps/review/__tests__/sessionHandlers.test.ts` (modifié)

## Change Log

- 2026-06-08: Création de la story contextualisée 1.2 avec tâches, contrats API, règles de transition, exigences DB/UI/tests et garde-fous.
- 2026-06-08: Implémentation de la tranche verticale reprise/clôture: contrats partagés et erreurs structurées, règles métier `resumeSession`/`closeSession`, port repository `findById`/`update`, persistance SQLite, endpoints `POST /api/sessions/[id]/resume` et `/close`, UI review clôture + reprise. 41 tests verts (18 → 41), `typecheck`/`lint`/`build` OK, smoke test HTTP réel conforme. Statut → review.
