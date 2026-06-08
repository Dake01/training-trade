---
story_id: "1.1"
story_key: "1-1-creer-et-ouvrir-une-session"
epic: "1"
status: "done"
baseline_commit: "020231dba66da80808acaed394b8a8653dbaa520"
created: "2026-06-08T16:36:25+02:00"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 1.1: Créer et ouvrir une session

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,  
I want créer une nouvelle session de trading simulé et l'ouvrir immédiatement,  
so that je puisse commencer un replay sans friction.

## Acceptance Criteria

1. **Création persistée**
   - Given qu'aucune session active n'existe
   - When l'utilisateur crée une nouvelle session
   - Then la session est persistée avec un identifiant unique et un statut ouvert
   - And la session est disponible immédiatement pour la saisie de décisions

2. **Ouverture et contexte minimal**
   - Given qu'une session vient d'être créée
   - When l'utilisateur l'ouvre
   - Then le système affiche la session active et son contexte minimal
   - And la session peut recevoir des décisions liées à cette session

## Tasks / Subtasks

- [x] Initialiser la structure applicative minimale du monorepo (AC: 1, 2)
  - [x] Créer `package.json`, `pnpm-workspace.yaml`, configuration TypeScript partagée et scripts racine `build`, `test`, `lint`.
  - [x] Créer les dossiers `apps/review`, `apps/extension`, `packages/domain`, `packages/db`, `packages/shared` conformément à l'architecture.
  - [x] Installer ou déclarer les dépendances nécessaires à cette story uniquement: Next.js/App Router pour `apps/review`, Plasmo pour `apps/extension`, Drizzle + `better-sqlite3` pour `packages/db`, Zod pour `packages/shared`, Vitest pour les tests TypeScript.
  - [x] Documenter dans les fichiers de config que SQLite est la source de vérité locale V1.

- [x] Définir les contrats partagés de session (AC: 1, 2)
  - [x] Créer les types et schémas Zod de session dans `packages/shared/src/schemas/session.ts`.
  - [x] Exposer un DTO API en `camelCase`: `id`, `status`, `createdAt`, `updatedAt`, `openedAt`, et champs de contexte minimal utiles.
  - [x] Restreindre le statut V1 créé par cette story à `open`; prévoir l'enum domaine avec `open`, `suspended`, `closed` pour les stories suivantes sans implémenter leurs transitions.
  - [x] Créer un schéma de réponse API partagé `{ data, error, meta }` et des erreurs structurées.

- [x] Implémenter le noyau métier session dans `packages/domain` (AC: 1, 2)
  - [x] Créer une fonction métier `createSession` qui génère un identifiant unique, initialise une session `open`, et refuse la création si une session active existe déjà.
  - [x] Créer une fonction métier `openSession` ou `getActiveSessionContext` qui retourne le contexte minimal d'une session ouverte.
  - [x] Exposer explicitement un indicateur ou garde métier indiquant que la session `open` peut recevoir des décisions futures, sans implémenter la création de décisions dans cette story.
  - [x] Couvrir les règles métier avec des tests unitaires: identifiant unique, statut `open`, refus si active existante, contexte minimal retourné.

- [x] Implémenter la persistance SQLite avec Drizzle dans `packages/db` (AC: 1)
  - [x] Créer le schéma `sessions` en `snake_case`: `id`, `status`, `created_at`, `updated_at`, `opened_at`, `closed_at`.
  - [x] Ajouter les contraintes minimales: `id` clé primaire, `status` obligatoire, timestamps obligatoires pour création/ouverture.
  - [x] Créer un client SQLite local configurable par variable d'environnement, avec valeur par défaut de développement documentée.
  - [x] Créer un repository session qui mappe `snake_case` DB vers `camelCase` API/domaine.
  - [x] Garantir côté repository/service qu'une seule session active `open` peut exister à la fois; utiliser une transaction ou une vérification atomique adaptée au driver SQLite.
  - [x] Ajouter des tests d'intégration repository sur une base SQLite temporaire ou en mémoire.

- [x] Exposer les endpoints Next.js nécessaires dans `apps/review` (AC: 1, 2)
  - [x] Créer `POST /api/sessions` pour créer et ouvrir immédiatement une session.
  - [x] Créer `GET /api/sessions/active` pour retourner la session active et son contexte minimal.
  - [x] Forcer le runtime Node.js pour ces route handlers si nécessaire (`export const runtime = "nodejs"`) afin de supporter SQLite local.
  - [x] Retourner toutes les réponses publiques au format `{ data, error, meta }`.
  - [x] Utiliser des timestamps ISO 8601 dans les réponses API.
  - [x] Ne jamais importer directement du code DB depuis l'extension; l'accès DB passe par route handlers Next.js.
  - [x] Ajouter des tests d'intégration API pour succès, absence de session active, et conflit lorsqu'une session active existe déjà.

- [x] Afficher la session active et son contexte minimal (AC: 2)
  - [x] Dans `apps/review`, créer une page minimale qui permet de créer une session et d'afficher la session active.
  - [x] Afficher au minimum l'identifiant, le statut `open`, la date d'ouverture et un état lisible indiquant que la session peut recevoir des décisions.
  - [x] Préparer un point d'entrée `apps/extension/src/popup` léger qui consomme l'API ou affiche un état de session active selon la configuration locale, sans logique TradingView automatique.
  - [x] Garder l'UX desktop-first et rapide: un seul bouton de création, feedback immédiat, pas de formulaire non requis pour cette story.

- [x] Valider la tranche verticale de bout en bout (AC: 1, 2)
  - [x] Exécuter les tests unitaires domaine.
  - [x] Exécuter les tests d'intégration DB/API.
  - [x] Exécuter `build`, `lint` et `test` depuis la racine si les scripts sont disponibles.
  - [x] Vérifier manuellement ou par test que créer une session rend immédiatement `GET /api/sessions/active` cohérent.
  - [x] Vérifier que la File List de la story est mise à jour par le dev agent avec tous les fichiers créés/modifiés.

### Review Findings

- [x] [Review][Patch] Le schéma partagé de session active rejette l'état sans session [packages/shared/src/schemas/session.ts:47]
- [x] [Review][Patch] Les erreurs de lecture de session active échappent à l'enveloppe API structurée [apps/review/src/server/sessionHandlers.ts:40]
- [x] [Review][Patch] Un conflit capturé par l'index unique SQLite peut être retourné en 500 au lieu de 409 [apps/review/src/server/sessionHandlers.ts:27]
- [x] [Review][Patch] Le chemin SQLite relatif dépend du répertoire de lancement [packages/db/src/client.ts:24]
- [x] [Review][Patch] Le fichier next-env.d.ts importe un fichier .next ignoré et fragile en checkout propre [apps/review/next-env.d.ts:3]

## Dev Notes

### Contexte métier

- Cette story couvre FR1 et le premier comportement de FR2: créer une session de trading simulé, puis l'ouvrir immédiatement. [Source: `_bmad-output/planning-artifacts/epics.md` > Story 1.1]
- Une session est l'unité de travail de la simulation: les décisions futures doivent toujours pouvoir être rattachées à une session. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Data and Domain Rules]
- Le produit V1 reste un outil personnel de simulation et de mesure, sans broker, sans trading réel, sans automatisation d'ordres. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Non-Goals]
- Notion reste hors périmètre produit; ne pas créer de synchronisation ou modèle de journal narratif dans cette story. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Notes on product boundary]

### Décision importante pour cette première story

Le repo ne contient pas encore de code applicatif. L'architecture indique explicitement que l'initialisation Plasmo + Next.js devrait être la première story. Comme la story 1.1 est la première story fonctionnelle disponible, le dev agent doit créer le scaffolding minimal strictement nécessaire pour livrer la création/ouverture de session, sans implémenter les stories suivantes.

### Architecture à respecter

- Monorepo attendu:
  - `apps/extension`: extension navigateur Plasmo.
  - `apps/review`: application Next.js de revue + backend-for-frontend.
  - `packages/domain`: règles métier sessions, décisions, portefeuille, stats.
  - `packages/db`: schéma Drizzle, client SQLite, migrations, accès données.
  - `packages/shared`: Zod schemas, DTO, constantes, types partagés.
  [Source: `_bmad-output/planning-artifacts/architecture.md` > Project Structure & Boundaries]
- `apps/extension` ne doit jamais accéder directement à `packages/db`. Toute persistance passe par les route handlers Next.js. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- Les route handlers Next.js orchestrent validation, métier et persistance via `packages/domain` et `packages/db`. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- SQLite est la source de vérité persistante V1. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- La base utilise `snake_case`; API et domaine exposent du `camelCase`. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- Les réponses API publiques suivent `{ data, error, meta }` avec erreurs structurées. [Source: `_bmad-output/planning-artifacts/epics.md` > Additional Requirements]
- Les timestamps API utilisent ISO 8601. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]

### Modèle de données minimal conseillé

Table `sessions` dans `packages/db/src/schema/sessions.ts`:

```text
id text primary key
status text not null
created_at text not null
updated_at text not null
opened_at text not null
closed_at text nullable
```

Contraintes de comportement:

- `id` doit être unique, généré côté domaine ou service d'application, par exemple avec `crypto.randomUUID()`.
- `status` doit être `open` à la création.
- Une session active signifie `status = "open"` pour cette story.
- Si une session active existe déjà, `POST /api/sessions` doit répondre avec une erreur structurée de conflit plutôt que créer une seconde session active.
- `closed_at` reste `null` dans cette story; la clôture appartient à la story 1.2.

### Contrat API minimal conseillé

`POST /api/sessions`

```json
{
  "data": {
    "session": {
      "id": "uuid",
      "status": "open",
      "createdAt": "2026-06-08T14:00:00.000Z",
      "updatedAt": "2026-06-08T14:00:00.000Z",
      "openedAt": "2026-06-08T14:00:00.000Z",
      "canReceiveDecisions": true
    }
  },
  "error": null,
  "meta": {}
}
```

`GET /api/sessions/active`

```json
{
  "data": {
    "session": {
      "id": "uuid",
      "status": "open",
      "openedAt": "2026-06-08T14:00:00.000Z",
      "canReceiveDecisions": true
    }
  },
  "error": null,
  "meta": {}
}
```

Conflit recommandé si une session active existe déjà:

```json
{
  "data": null,
  "error": {
    "code": "ACTIVE_SESSION_EXISTS",
    "message": "Une session active existe deja.",
    "status": 409
  },
  "meta": {}
}
```

### Tests requis

- Tests unitaires `packages/domain/src/sessions/*.test.ts`:
  - création avec statut `open`;
  - génération d'identifiants distincts;
  - refus de création si session active existante;
  - contexte minimal avec `canReceiveDecisions = true`.
- Tests intégration DB `packages/db/src/**/*.test.ts`:
  - insertion et relecture d'une session;
  - mapping `snake_case` vers `camelCase`;
  - persistance des timestamps ISO 8601.
- Tests API `apps/review/**/*.test.ts` ou convention équivalente:
  - `POST /api/sessions` crée et retourne une session ouverte;
  - `GET /api/sessions/active` retourne la session créée;
  - conflit structuré si une session active existe déjà.

### Recherche technique actuelle à prendre en compte

- Next.js: la version `latest` npm observée le 2026-06-08 est `16.2.7`; elle exige Node `>=20.9.0`. Si le scaffolding utilise cette version, vérifier la version locale de Node avant installation. [Source: npm registry `https://registry.npmjs.org/next/latest` consulté le 2026-06-08]
- Next.js App Router: utiliser des route handlers `route.ts` sous `app/api/*`, pas les anciennes API routes `pages/api` pour cette architecture. [Source: Next.js Docs App Router API Reference `https://nextjs.org/docs/app/api-reference` consulté le 2026-06-08]
- Plasmo: l'architecture retient Plasmo pour l'extension; le flux officiel reste `pnpm create plasmo`. Ne pas faire dépendre cette story d'une intégration automatique TradingView. [Source: Plasmo Docs `https://docs.plasmo.com/` consulté le 2026-06-08]
- Drizzle SQLite: Drizzle documente le support SQLite via `libsql`, `node:sqlite` et `better-sqlite3`. Utiliser `better-sqlite3` pour cette story afin d'obtenir une persistance locale simple et explicite; ne pas introduire de service externe. [Source: Drizzle SQLite Docs `https://orm.drizzle.team/docs/get-started/sqlite-new` consulté le 2026-06-08]
- Zod: utiliser le package `zod` actuel pour les schémas partagés; Zod v4 est le package principal documenté. [Source: Zod Docs `https://zod.dev/packages/zod` consulté le 2026-06-08]
- pnpm: la version `latest` npm observée le 2026-06-08 est `11.5.2` et exige Node `>=22.13`; si l'environnement local n'est pas compatible, utiliser la version pnpm déjà installée plutôt que bloquer la story. [Source: npm registry `https://registry.npmjs.org/pnpm/latest` consulté le 2026-06-08]

### Hors périmètre strict

- Pas de clôture, reprise ou suspension de session: story 1.2.
- Pas d'association d'actifs: story 1.3.
- Pas de capture buy/sell: story 1.4.
- Pas de portefeuille simulé: Epic 2.
- Pas de statistiques ou courbe d'équité: Epic 2.
- Pas de synchronisation automatique TradingView: explicitement hors V1.
- Pas d'authentification multi-utilisateur: usage personnel V1.

### Risques et garde-fous pour le dev agent

- Ne pas implémenter une DB en mémoire seule: l'AC exige une session persistée. Les tests peuvent utiliser une base temporaire, mais l'application doit avoir une persistance SQLite locale.
- Ne pas créer une seconde session active silencieusement. La règle la plus sûre pour cette story est `409 ACTIVE_SESSION_EXISTS`.
- Ne pas laisser l'unicité de session active à la seule UI. Le repository ou service applicatif doit vérifier l'absence de session `open` avant insertion dans une section critique/transaction testée.
- Ne pas mettre la logique métier dans les composants React ou les route handlers. Les route handlers orchestrent; `packages/domain` porte les règles.
- Ne pas exposer `snake_case` à l'API publique.
- Ne pas créer de modèle de décisions complet maintenant. Fournir uniquement le garde `canReceiveDecisions` ou équivalent pour prouver que la session ouverte est prête à recevoir des décisions futures.
- Si le scaffolding officiel génère une structure légèrement différente, adapter seulement si les frontières monorepo restent respectées.

### Project Structure Notes

- Aucun fichier applicatif existant à modifier n'a été trouvé; cette story créera principalement de nouveaux fichiers.
- Aucun `project-context.md` n'a été trouvé.
- Aucun fichier UX séparé n'a été trouvé; appliquer les principes produit du PRD: usage desktop, saisie rapide, simplicité V1.
- Aucun `sprint-status.yaml` n'existe actuellement; la progression sera suivie par le statut de cette story.
- Git contient uniquement `020231d Initial commit`; il n'y a pas de patterns d'implémentation précédents à réutiliser.

### References

- `_bmad-output/planning-artifacts/epics.md` > Requirements Inventory, Epic 1, Story 1.1.
- `_bmad-output/planning-artifacts/architecture.md` > Starter Template Evaluation, Project Structure & Boundaries, Requirements to Structure Mapping, Gap Analysis Results.
- `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Functional Requirements, Data and Domain Rules, Scope for V1.
- `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories.
- `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/.decision-log.md` > décisions de cadrage V1.
- Next.js App Router API Reference: `https://nextjs.org/docs/app/api-reference`.
- Plasmo Docs: `https://docs.plasmo.com/`.
- Drizzle SQLite Docs: `https://orm.drizzle.team/docs/get-started/sqlite-new`.
- Zod package docs: `https://zod.dev/packages/zod`.
- npm registry metadata: `https://registry.npmjs.org/next/latest`, `https://registry.npmjs.org/pnpm/latest`.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (Claude Code — workflow `bmad-dev-story`)

### Debug Log References

- 2026-06-08: Story créée depuis `bmad-create-story`; aucun fichier code existant à préserver.
- 2026-06-08: Discovery input: epics 1 fichier, architecture 1 fichier, PRD 3 fichiers, UX 0 fichier, project context 0 fichier.
- 2026-06-08: `sprint-status.yaml` absent; aucun statut sprint mis à jour.
- 2026-06-08 (dev): pnpm absent et incompatible Node 20 en `latest`; activé via corepack `pnpm@9.15.4` dans `~/.local/bin` (garde-fou story respecté: ne pas bloquer).
- 2026-06-08 (dev): versions npm vérifiées et alignées (Next 16.2.7, React 19.2.7, Plasmo 0.90.5, better-sqlite3 12.10.0, drizzle-orm 0.45.2, zod 4.4.3, vitest 3.2.6).
- 2026-06-08 (dev): `pnpm install` OK (better-sqlite3 compilé nativement). Peer warnings Plasmo (react 18 attendu) non bloquants.
- 2026-06-08 (dev): build Next OK; build Plasmo nécessitait une icône → ajout `apps/extension/assets/icon.png`.
- 2026-06-08 (dev): smoke test HTTP réel confirmé (POST 201 → GET active cohérent → 2e POST 409 ACTIVE_SESSION_EXISTS).

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 1.1 cadrée comme première tranche verticale parce que le repo ne contient pas encore le scaffolding applicatif attendu par l'architecture.
- Monorepo pnpm initialisé (apps/review, apps/extension, packages/domain, packages/db, packages/shared) avec scripts racine `build`/`test`/`lint`/`typecheck`.
- Contrats partagés (`packages/shared`): enum statut (`open`/`suspended`/`closed`, seul `open` créé en V1), DTO camelCase + Zod, enveloppe `{ data, error, meta }`, erreurs structurées (`ACTIVE_SESSION_EXISTS`).
- Domaine pur (`packages/domain`): `createSession` (id unique, statut `open`, refus si session active via transaction du port repository) et `getActiveSession` (contexte minimal avec garde `canReceiveDecisions`). Aucune logique de décisions implémentée.
- Persistance (`packages/db`): schéma Drizzle `sessions` en snake_case, client `better-sqlite3` configurable par `DATABASE_URL`, repository mappant snake_case↔camelCase, unicité de session active garantie par transaction + index unique partiel `WHERE status='open'`. Schéma bootstrapé via `ensureSchema` (migrations drizzle-kit préparées pour plus tard).
- API (`apps/review`): `POST /api/sessions` (201) et `GET /api/sessions/active` (200, `session:null` si aucune), runtime Node forcé, logique métier dans le domaine, handlers seulement orchestrateurs et testables sans Next.
- UI desktop-first: page minimale (un seul bouton de création + carte session active). Point d'entrée Plasmo léger (popup) lisant l'API via `PLASMO_PUBLIC_API_BASE`, sans intégration TradingView.
- L'extension n'accède jamais à `packages/db` (frontière respectée; accès DB uniquement via route handlers Next).
- Validation: 14 tests Vitest (domaine + db SQLite en mémoire + API) verts; `typecheck`/`lint` verts sur tous les workspaces; `build` OK (5 workspaces, dont Next et Plasmo); smoke test HTTP réel cohérent.

### File List

Racine:
- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `tsconfig.base.json`
- `vitest.config.ts`
- `.gitignore`
- `.env.example`
- `README.md`

`packages/shared`:
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/api/response.ts`
- `packages/shared/src/errors.ts`
- `packages/shared/src/schemas/sessionStatus.ts`
- `packages/shared/src/schemas/session.ts`

`packages/domain`:
- `packages/domain/package.json`
- `packages/domain/tsconfig.json`
- `packages/domain/src/index.ts`
- `packages/domain/src/sessions/types.ts`
- `packages/domain/src/sessions/errors.ts`
- `packages/domain/src/sessions/mappers.ts`
- `packages/domain/src/sessions/createSession.ts`
- `packages/domain/src/sessions/getActiveSession.ts`
- `packages/domain/src/sessions/deps.ts`
- `packages/domain/src/sessions/__tests__/fakeRepo.ts`
- `packages/domain/src/sessions/__tests__/createSession.test.ts`
- `packages/domain/src/sessions/__tests__/getActiveSession.test.ts`

`packages/db`:
- `packages/db/package.json`
- `packages/db/tsconfig.json`
- `packages/db/drizzle.config.ts`
- `packages/db/src/index.ts`
- `packages/db/src/client.ts`
- `packages/db/src/schema/sessions.ts`
- `packages/db/src/repository/sessionRepository.ts`
- `packages/db/src/repository/__tests__/sessionRepository.test.ts`

`apps/review`:
- `apps/review/package.json`
- `apps/review/next.config.mjs`
- `apps/review/tsconfig.json`
- `apps/review/next-env.d.ts`
- `apps/review/src/server/sessionHandlers.ts`
- `apps/review/src/app/api/sessions/route.ts`
- `apps/review/src/app/api/sessions/active/route.ts`
- `apps/review/src/app/layout.tsx`
- `apps/review/src/app/page.tsx`
- `apps/review/src/components/SessionPanel.tsx`
- `apps/review/__tests__/sessionHandlers.test.ts`

`apps/extension`:
- `apps/extension/package.json`
- `apps/extension/tsconfig.json`
- `apps/extension/src/popup/index.tsx`
- `apps/extension/assets/icon.png`

Story:
- `_bmad-output/implementation-artifacts/1-1-creer-et-ouvrir-une-session.md`

## Change Log

- 2026-06-08: Création de la story contextualisée 1.1 avec tâches, contraintes architecture, contrats API, modèle SQLite, exigences de tests et garde-fous.
- 2026-06-08: Implémentation de la tranche verticale 1.1 (monorepo pnpm, shared/domain/db, API Next.js, UI + popup). 14 tests verts, typecheck/lint/build OK, smoke test HTTP cohérent. Statut → review.
