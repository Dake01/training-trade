---
story_id: "1.5"
story_key: "1-5-ajouter-un-commentaire-et-corriger-une-decision"
epic: "1"
status: "review"
baseline_commit: "8424f71"
created: "2026-06-09T12:31:06+02:00"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 1.5: Ajouter un commentaire et corriger une décision

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,  
I want ajouter un commentaire court et corriger ou annuler une décision,  
so that je garde le contexte de mes choix et une trace fiable des modifications.

## Acceptance Criteria

1. **Ajout d'un commentaire court ou d'un motif**
   - Given une décision existante dans une session ouverte
   - When l'utilisateur ajoute un commentaire court ou un motif
   - Then le commentaire est persisté avec la décision
   - And le commentaire reste consultable dans l'historique de la session et lors de la relecture après clôture
   - And la longueur reste volontairement courte et validée côté shared/API

2. **Correction ou annulation explicite d'une décision**
   - Given une décision existante modifiable
   - When l'utilisateur la corrige ou l'annule
   - Then le système applique une règle explicite et stable, sans suppression silencieuse ni réécriture destructrice de l'historique
   - And la modification reste auditable si elle impacte les statistiques futures
   - And l'ancienne version reste traçable avec un état lisible dans l'historique

3. **Historique consultable et ordre stable**
   - Given une session déjà clôturée
   - When l'utilisateur consulte l'historique
   - Then les décisions, commentaires et corrections restent visibles en lecture seule
   - And l'ordre affiché reste stable et cohérent même après plusieurs modifications

## Tasks / Subtasks

- [x] Étendre les contrats partagés de décision et d'amendement dans `packages/shared` (AC: 1, 2, 3)
  - [x] Étendre `packages/shared/src/schemas/decision.ts` ou créer un module voisin dédié aux amendements, exporté depuis `packages/shared/src/index.ts`.
  - [x] Garder le DTO public de décision en `camelCase` compatible avec la story 1.4, puis ajouter au minimum les métadonnées nécessaires pour afficher le commentaire et l'état effectif (`comment`, `revisionStatus`, ou équivalent stable).
  - [x] Définir un schéma de commentaire court avec une limite explicite et validée côté API/shared.
  - [x] Définir un schéma d'amendement discriminé pour `comment`, `correction` et `cancellation`.
  - [x] Garder les timestamps API en ISO 8601 et les valeurs monétaires/quantitatives en chaînes décimales exactes.
  - [x] Ajouter les schémas de requête/réponse nécessaires pour les endpoints d'édition de décision.
  - [x] Réutiliser le format public `{ data, error, meta }` et les erreurs structurées existantes dès que possible.

- [x] Implémenter le modèle métier d'amendement de décision dans `packages/domain` (AC: 1, 2, 3)
  - [x] Créer un sous-module clair, par exemple `packages/domain/src/decisions/amendments/`, avec `types.ts`, `mappers.ts`, `addDecisionComment.ts`, `correctDecision.ts`, `cancelDecision.ts`, `listDecisionTimeline.ts`, `deps.ts` et les tests associés.
  - [x] Faire porter la logique métier au domaine, pas aux route handlers ni aux composants React.
  - [x] Garder la décision d'origine intacte: les corrections et annulations doivent être append-only et traçables, pas destructrices.
  - [x] N'autoriser les écritures que sur une session `open`; une session `closed` reste consultable mais ne doit pas accepter de nouveaux amendements sans reprise explicite.
  - [x] Refuser un amendement si la décision n'existe pas, si elle n'appartient pas à la session cible, ou si elle n'est plus modifiable selon la règle choisie.
  - [x] Garder un ordre stable et explicite pour la timeline de décision: événement d'origine puis amendements triés de façon déterministe.
  - [x] Ne pas calculer ici le portefeuille final, les statistiques globales ou les métriques de performance de l'epic 2, mais préparer les marqueurs d'audit nécessaires.

- [x] Étendre la persistance SQLite/Drizzle dans `packages/db` (AC: 1, 2, 3)
  - [x] Ajouter les tables nécessaires pour stocker les amendements de décision de manière append-only, avec un schéma clair en `snake_case`.
  - [x] Préserver le mapping `snake_case` DB vers `camelCase` domaine/API.
  - [x] Ajouter les clefs étrangères nécessaires vers `sessions`, `decisions` et, si nécessaire, la décision racine amendée.
  - [x] Choisir une représentation exacte pour les champs de correction, de commentaire et les champs quantitatifs de remplacement.
  - [x] Ajouter les index nécessaires pour relire la timeline d'une décision et l'historique d'une session dans un ordre stable.
  - [x] Créer ou étendre le repository SQLite dédié, avec `transaction`, `insert`, `findByDecisionId`, `findBySessionId` et les accès relationnels requis.
  - [x] Mettre à jour `packages/db/src/client.ts` pour créer le schéma sans casser les bases existantes déjà remplies par la story 1.4.
  - [x] Préserver `foreign_keys = ON`, le client `better-sqlite3` synchrone, et la migration légère via `ensureSchema`.

- [x] Exposer les endpoints Next.js nécessaires (AC: 1, 2, 3)
  - [x] Ajouter des handlers pour commenter une décision et pour appliquer une correction ou une annulation explicite.
  - [x] Garder les route handlers minces et testables, avec la logique métier dans `packages/domain` et la persistance dans `packages/db`.
  - [x] Conserver `export const runtime = "nodejs"` et `export const dynamic = "force-dynamic"` sur les handlers SQLite.
  - [x] Retourner `200` ou `201` pour un amendement accepté selon la forme choisie, et des erreurs structurées pour décision introuvable, session non active, payload invalide et erreur inattendue.
  - [x] Éviter de réécrire l'historique en place: le handler doit renvoyer un état lisible qui reflète l'audit trail.

- [x] Rendre les commentaires et corrections utilisables dans l'UX existante (AC: 1, 2, 3)
  - [x] Dans `apps/review/src/components/SessionPanel.tsx`, ajouter une UI compacte pour commenter une décision directement depuis l'historique.
  - [x] Ajouter des actions explicites pour corriger ou annuler une décision sans alourdir la page ni créer une navigation supplémentaire.
  - [x] Conserver la liste des décisions dans un ordre stable avec les statuts ou badges nécessaires pour distinguer les versions.
  - [x] Garder l'UX desktop-first, dense et rapide: interactions directes, formulaires courts, rafraîchissement immédiat, pas d'intégration automatique TradingView en V1.
  - [x] Si la popup extension expose ces informations, rester API-only et ne jamais toucher à `packages/db` directement.

- [x] Couvrir la story par des tests ciblés (AC: 1, 2, 3)
  - [x] Tests shared: validation du commentaire court, du discriminant d'amendement, des réponses request/response et des cas invalides.
  - [x] Tests domaine: ajout de commentaire, correction réussie, annulation réussie, refus décision inconnue, refus session non active, ordre stable de la timeline.
  - [x] Tests DB en mémoire: création du schéma, clés étrangères, lecture ordonnée de la timeline, persistance exacte des amendements.
  - [x] Tests API: commentaire, correction, annulation, validation 400, décision inconnue 404, session non active 409, enveloppe structurée.
  - [x] Ajouter au minimum un test vertical complet: session ouverte -> décision capturée -> commentaire -> correction ou annulation -> relecture ordonnée -> clôture de session -> historique toujours consultable.

- [x] Valider la tranche verticale
  - [x] Exécuter `pnpm test`.
  - [x] Exécuter `pnpm typecheck`.
  - [x] Exécuter `pnpm lint`.
  - [x] Exécuter `pnpm build`.
  - [x] Vérifier par test ou revue manuelle que la story 1.5 ne casse pas la capture de la story 1.4, la liste d'actifs de la story 1.3, ni la fermeture/reprise des sessions.
  - [x] Mettre à jour le `Dev Agent Record` et la `File List` une fois l'implémentation terminée.

## Dev Notes

### Contexte métier

- Cette story couvre FR10 et FR11: ajouter un commentaire court ou un motif, puis corriger ou annuler une décision avec une trace auditable si cela impacte les statistiques futures. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Functional Requirements > Decision Capture]
- Le PRD et l'architecture insistent sur la traçabilité: les corrections et suppressions doivent rester auditables, et la mécanique de base doit rester simple en V1. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Data and Domain Rules]
- L'historique de session doit rester lisible après clôture. Les écritures doivent être conservées en lecture seule sur une session fermée, sauf si la session est explicitement rouverte selon les règles existantes. [Source: `_bmad-output/planning-artifacts/epics.md` > Story 1.2, Story 1.4, Story 1.5]
- La story 1.4 a déjà posé le socle capture/listing. La story 1.5 doit l'étendre sans casser le flux buy/sell ni le replay ordonné.
- Choix recommandé pour cette story: modèle append-only des amendements. Ne pas écraser la décision d'origine; enregistrer les commentaires, corrections et annulations comme événements reliés à la décision racine.

### Décisions de cadrage pour cette story

- Les amendements doivent rester auditables. Le lecteur doit pouvoir distinguer la décision d'origine, le commentaire ajouté et la correction/annulation appliquée.
- Les écritures d'amendement ne doivent pas dépendre d'un calcul de portefeuille déjà finalisé. L'epic 2 consommera ensuite les événements corrigés pour calculer cash, positions et stats.
- Un commentaire est court par conception. Fixer une limite explicite et courte côté validation plutôt que laisser un texte libre illimité.
- Une correction doit pouvoir remplacer les champs métier pertinents de la décision d'origine: au minimum `assetId`, `side`, `quantity`, `referencePrice` et, si nécessaire, `logicalTimestamp`.
- Une annulation doit laisser l'historique intact mais marquer la décision comme neutralisée pour les calculs futurs.
- L'ordre d'affichage doit être déterministe. Ne pas se fier à un tri lexicographique brut sur des timestamps ISO avec fuseaux horaires; parser ou normaliser avant comparaison.
- Si plusieurs écritures concurrentes peuvent toucher la même décision, le repository doit encapsuler le tout dans une transaction SQLite synchrone.

### Architecture à respecter

- `apps/review/app/api/*` expose les endpoints consommés par l'extension et l'app de revue. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- `apps/extension` ne doit jamais accéder directement à `packages/db`. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- Les route handlers Next.js orchestrent validation, métier et persistance via `packages/domain` et `packages/db`; la logique métier ne va ni dans React ni dans les handlers. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- `packages/domain` contient les règles métier de sessions, décisions, portefeuille et stats. L'édition de décision appartient au domaine, pas à la DB seule. [Source: `_bmad-output/planning-artifacts/architecture.md` > Service Boundaries]
- `packages/db` contient Drizzle schema, SQLite client, migrations légères et accès données. `packages/shared` contient les schémas Zod, DTO, constantes et erreurs partagées. [Source: `_bmad-output/planning-artifacts/architecture.md` > Service Boundaries / Data Boundaries]
- SQLite reste la source de vérité V1; base en `snake_case`, domaine/API en `camelCase`; timestamps API en ISO 8601. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- Les réponses API publiques suivent toujours `{ data, error, meta }` avec erreurs structurées. [Source: `_bmad-output/planning-artifacts/epics.md` > Additional Requirements]

### Fichiers existants à modifier et état actuel

- `packages/shared/src/schemas/decision.ts`
  - État actuel: DTO décision minimal, validation des montants en chaînes, schéma de capture et réponses list/capture.
  - Changement attendu: étendre le contrat pour afficher le commentaire et l'état effectif, sans casser la story 1.4.
  - À préserver: la représentation canonique `buy`/`sell`, les dates ISO 8601 et les montants exacts en chaîne.

- `packages/shared/src/errors.ts`
  - État actuel: erreurs publiques structurées pour session, validation, actif et interne.
  - Changement attendu: ajouter seulement les codes indispensables aux amendements de décision si une validation relationnelle ou métier ne peut pas se réexprimer avec les erreurs existantes.
  - À préserver: le format `{ data, error, meta }` et les messages français stables.

- `packages/domain/src/decisions/*`
  - État actuel: capture append-only et listing ordonné d'une session.
  - Changement attendu: ajouter un sous-module d'amendements ou une extension claire du module existant.
  - À préserver: la séparation nette entre validation métier, mapping et persistance.

- `packages/db/src/client.ts`
  - État actuel: `ensureSchema` crée `sessions`, `assets`, `session_assets` et `decisions`.
  - Changement attendu: ajouter les tables d'amendement sans casser les bases déjà créées par les stories 1.1 à 1.4.
  - À préserver: `DEFAULT_DEV_DATABASE_PATH`, `resolveDatabasePath`, le comportement `:memory:` pour les tests et l'exécution synchrone.

- `packages/db/src/index.ts`
  - État actuel: expose les repositories SQLite singleton et le client DB.
  - Changement attendu: ajouter ou étendre les exports du repository de décision si l'implémentation l'exige.
  - À préserver: les singletons lazy et la séparation des responsabilités.

- `apps/review/src/server/decisionHandlers.ts`
  - État actuel: handlers testables pour capturer et lister les décisions.
  - Changement attendu: ajouter des handlers d'amendement ou déplacer la logique dans un voisin dédié si la taille devient trop importante.
  - À préserver: `ok`, `fail`, `jsonResponse`, `errorResponse` et la discipline de handlers minces.

- `apps/review/src/components/SessionPanel.tsx`
  - État actuel: panneau de session active avec capture buy/sell, liste d'actifs et historique des décisions.
  - Changement attendu: ajouter des affordances compactes pour commenter, corriger ou annuler une décision sans créer une page de gestion lourde.
  - À préserver: feedback immédiat, état actif cohérent, et absence de logique DB côté client.

- `apps/extension/src/popup/index.tsx`
  - État actuel: lit la session active et capture des décisions via l'API review.
  - Changement attendu: si la popup expose des informations d'amendement, elle doit rester API-only et ne jamais toucher à `packages/db`.
  - À préserver: UX rapide, desktop-first, sans intégration automatique TradingView.

### Contrats API recommandés

`POST /api/sessions/[id]/decisions/[decisionId]/amendments`

Requête recommandée pour un commentaire:

```json
{
  "kind": "comment",
  "comment": "Contexte de saisie ou motif court"
}
```

Requête recommandée pour une correction:

```json
{
  "kind": "correction",
  "reason": "Quantite saisie trop faible",
  "replacement": {
    "assetId": "uuid",
    "side": "sell",
    "quantity": "12",
    "referencePrice": "123.45",
    "logicalTimestamp": "2026-06-09T09:00:00.000Z"
  }
}
```

Requête recommandée pour une annulation:

```json
{
  "kind": "cancellation",
  "reason": "Saisie accidentelle"
}
```

Succès recommandé:

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
      "createdAt": "2026-06-09T09:00:00.000Z",
      "comment": "Contexte de saisie ou motif court",
      "revisionStatus": "corrected"
    }
  },
  "error": null,
  "meta": {}
}
```

`GET /api/sessions/[id]/decisions`

Succès recommandé:

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
        "createdAt": "2026-06-09T09:00:00.000Z",
        "comment": "Contexte de saisie ou motif court",
        "revisionStatus": "corrected"
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
    "code": "DECISION_NOT_FOUND",
    "message": "Decision introuvable.",
    "status": 404
  },
  "meta": {}
}
```

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

- La story 1.4 a déjà ajouté la capture buy/sell, les actifs associés, le listing des décisions et la persistance SQLite/Drizzle de base. Cette story doit réutiliser ce socle, pas le réinventer.
- La revue de 1.4 a relevé deux risques d'ordre à corriger en priorité pendant la suite du travail:
  - ne pas comparer les timestamps ISO par simple `localeCompare` si des fuseaux horaires peuvent apparaître;
  - ne pas laisser un `createdAt` à la milliseconde servir de substitut unique au timestamp logique sans tie-break déterministe.
- La revue de 1.4 a aussi pointé un risque d'état UI: les rafraîchissements concurrents peuvent écraser un état plus récent si la vue n'est pas protégée par un garde-fou de version ou d'abort.
- Conserver la séparation actuelle: domaine pour les règles, repository pour la persistance, handlers pour l'orchestration, UI pour l'interaction.

### Latest Tech Notes

- Next.js route handlers utilisent les APIs natives `Request` et `Response` dans `app/**/route.ts`, et les segments dynamiques sont supportés directement dans ce format. Garder `runtime = "nodejs"` et `dynamic = "force-dynamic"` pour les handlers SQLite reste le bon choix. [Source: https://nextjs.org/docs/app/building-your-application/routing/router-handlers]
- Drizzle supporte SQLite avec le driver `better-sqlite3`, des transactions synchrones et un schéma portable. Les colonnes `TEXT` restent le bon choix pour conserver des décimaux exacts sans flottants. [Source: https://orm.drizzle.team/docs/get-started-sqlite]
- Zod 4 fournit `trim`, `regex` et `refine` pour les validations de chaîne et de commentaire. Continuer à valider côté shared/API avant d'entrer dans le domaine. [Source: https://zod.dev/api?id=sets]

### Project Structure Notes

- Le repo est déjà organisé en monorepo avec `apps/extension`, `apps/review`, `packages/domain`, `packages/db` et `packages/shared`.
- La story 1.5 doit rester cohérente avec les fichiers de la story 1.4 et ne pas introduire un second modèle de décision.
- Si un nouveau sous-module d'amendement est créé, il doit rester dans `packages/domain/src/decisions/` ou un voisin immédiat, pas dans les handlers ou les composants React.
- Aucun document `project-context.md` ni `CLAUDE.md` n'a été trouvé dans le workspace; les règles de cette story reposent donc sur le PRD, l'architecture et les artefacts d'implémentation existants.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, dev-story workflow)

### Debug Log References

- `pnpm typecheck` — OK (5 projets)
- `pnpm lint` — OK (5 projets)
- `pnpm test` — 214 tests OK (21 fichiers)
- `pnpm build` — OK ; la route `/api/sessions/[id]/decisions/[decisionId]/amendments` est bien enregistrée

### Completion Notes List

- **Modèle append-only** : les amendements (commentaire, correction, annulation) sont
  des événements distincts stockés dans une nouvelle table `decision_amendments` reliée
  à la décision racine. La ligne `decisions` d'origine n'est jamais mutée ni supprimée,
  donc la trace reste auditable (AC 2).
- **Décision effective** : `applyAmendments` replie la timeline d'amendements sur la
  décision pour produire l'état lisible exposé par l'API (`comment`, `revisionStatus`
  parmi `original`/`corrected`/`cancelled`). Le dernier commentaire l'emporte ; une
  correction restitue explicitement asset/side/quantity/referencePrice (+ logicalTimestamp
  optionnel) ; une annulation est terminale et neutralise la décision sans la détruire.
- **DTO 1.4 préservé** : `comment` et `revisionStatus` sont ajoutés en `optional` au
  schéma décision, donc les contrats et tests de la story 1.4 restent verts. Le domaine
  émet toujours ces champs (`null` / `"original"` par défaut).
- **Règles métier** (dans `packages/domain`, pas dans les handlers ni React) : écriture
  refusée si la session n'est pas `open` (`SESSION_NOT_ACTIVE`), décision inconnue ou
  appartenant à une autre session (`DECISION_NOT_FOUND`), décision déjà annulée
  (`DECISION_NOT_AMENDABLE`), actif de remplacement non lié à la session
  (`ASSET_NOT_IN_SESSION`).
- **Ordre stable** : le tri des décisions et des amendements compare les timestamps ISO
  comme des instants (`Date.parse`) et non par `localeCompare`, ce qui corrige le risque
  d'ordre relevé à la revue de la story 1.4 (fuseaux horaires) ; tie-break déterministe
  sur `createdAt` puis `id`. `GET /decisions` renvoie désormais l'état effectif ordonné.
- **UX** : l'historique de `SessionPanel` affiche les badges Corrigé/Annulé, le commentaire,
  et expose des affordances compactes Commenter / Corriger / Annuler uniquement sur une
  session active. La carte de session clôturée reste en lecture seule (AC 3).
- **Frontières** : `apps/extension` n'est pas modifié et reste API-only ; aucune logique
  DB côté client. Les handlers Next.js restent minces (validation + dispatch).
- **Interprétation AC 2 (« ancienne version traçable »)** : la version d'origine est
  conservée intacte et auditable en base (append-only) ; l'état lisible dans l'historique
  est porté par `revisionStatus` + le commentaire. La timeline complète des amendements
  est calculée et testée dans le domaine (`listDecisionTimeline`) et disponible pour une
  vue détaillée ultérieure, conformément au contrat recommandé.

### File List

**Créés**
- packages/shared/src/schemas/decisionAmendment.ts
- packages/shared/src/schemas/__tests__/decisionAmendment.test.ts
- packages/domain/src/decisions/amendments/types.ts
- packages/domain/src/decisions/amendments/errors.ts
- packages/domain/src/decisions/amendments/mappers.ts
- packages/domain/src/decisions/amendments/loadAmendable.ts
- packages/domain/src/decisions/amendments/addDecisionComment.ts
- packages/domain/src/decisions/amendments/correctDecision.ts
- packages/domain/src/decisions/amendments/cancelDecision.ts
- packages/domain/src/decisions/amendments/listDecisionTimeline.ts
- packages/domain/src/decisions/amendments/__tests__/fakeAmendmentRepo.ts
- packages/domain/src/decisions/amendments/__tests__/amendments.test.ts
- packages/db/src/schema/decisionAmendments.ts
- packages/db/src/repository/decisionAmendmentRepository.ts
- packages/db/src/repository/__tests__/decisionAmendmentRepository.test.ts
- apps/review/src/app/api/sessions/[id]/decisions/[decisionId]/amendments/route.ts
- apps/review/__tests__/decisionAmendmentHandlers.test.ts

**Modifiés**
- packages/shared/src/schemas/decision.ts
- packages/shared/src/errors.ts
- packages/shared/src/index.ts
- packages/domain/src/decisions/mappers.ts
- packages/domain/src/index.ts
- packages/db/src/schema/index.ts
- packages/db/src/client.ts
- packages/db/src/index.ts
- apps/review/src/server/http.ts
- apps/review/src/server/decisionHandlers.ts
- apps/review/src/app/api/sessions/[id]/decisions/route.ts
- apps/review/src/components/SessionPanel.tsx
- apps/review/__tests__/decisionHandlers.test.ts

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-06-09 | 0.1 | Implémentation de la story 1.5 : amendements append-only (commentaire, correction, annulation), décision effective avec `comment`/`revisionStatus`, table `decision_amendments`, endpoint d'amendement, UX historique avec badges et actions, ordre ISO robuste. | Dev (Opus 4.8) |
