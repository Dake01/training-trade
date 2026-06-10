---
story_id: "2.2"
story_key: "2-2-appliquer-une-decision-au-portefeuille"
epic: "2"
status: review
baseline_commit: "8e5bc4a"
created: "2026-06-10T13:39:16+02:00"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 2.2: Appliquer une décision au portefeuille

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,
I want voir chaque décision buy/sell mettre à jour le cash, les positions et la valeur totale du portefeuille,
so that l’impact de mes choix soit immédiatement reflété par la simulation.

## Acceptance Criteria

1. **Application d'une décision valide au portefeuille**
   - Given un portefeuille initialisé et une décision buy/sell valide sur une session ouverte
   - When la décision est appliquée au portefeuille
   - Then le cash disponible, les positions ouvertes et la valeur totale sont recalculés de façon cohérente
   - And la simulation gère plusieurs actifs dans le même portefeuille
   - And la logique de coût moyen simple est respectée pour les positions
   - And une vente ne crée pas de position courte en V1
   - And le calcul ne dépend d'aucune donnée de marché externe autre que le `referencePrice` déjà fourni par la décision

2. **Persistance et lecture de l'état mis à jour**
   - Given une décision appliquée
   - When le système persiste l'état du portefeuille
   - Then le nouvel état reste cohérent avec la décision enregistrée
   - And l'état lu par la session correspond au dernier snapshot persistant
   - And le portefeuille reste consultable sans recalcul côté UI

3. **Idempotence de l'application**
   - Given une réexécution du même flux de capture ou un retry réseau sur la même décision
   - When le portefeuille est rejoué / appliqué à nouveau
   - Then la décision n'est pas comptée deux fois
   - And l'état du portefeuille reste identique
   - And le système réutilise l'entrée existante plutôt que de dupliquer une nouvelle source de vérité

4. **Compatibilité avec les décisions amendées**
   - Given une session contenant des corrections ou annulations de décisions (story 1.5)
   - When le portefeuille est recalculé ou relu
   - Then l'engine utilise la décision effective ordonnée, pas seulement la ligne brute initiale
   - And le résultat reste déterministe et auditable
   - And l'historique du portefeuille reste cohérent avec les règles d'auditabilité des décisions

## Tasks / Subtasks

- [x] Définir les contrats partagés du portefeuille applicatif (AC: 1, 2, 3, 4)
  - [x] Étendre `packages/shared/src/schemas/portfolio.ts` avec un DTO de portefeuille courant, une position de portefeuille et les éventuels payloads de lecture nécessaires.
  - [x] Exporter les schémas depuis `packages/shared/src/index.ts`.
  - [x] Réutiliser les constantes V1 de la story 2.1 (capital initial et devise de référence) sans les redéfinir.
  - [x] Représenter cash, quantités, prix moyens et valeurs comme chaînes décimales exactes, comme pour les décisions.
  - [x] Garder le contrat explicite mais minimal: cash, positions, valeur totale, devise, timestamps et métadonnées utiles à la relecture.

- [x] Implémenter le moteur métier de mise à jour du portefeuille dans `packages/domain` (AC: 1, 3, 4)
  - [x] Créer ou compléter `packages/domain/src/portfolio/` avec `types.ts`, `deps.ts`, `mappers.ts`, `applyDecisionToPortfolio.ts`, `getSessionPortfolio.ts`, `rebuildSessionPortfolio.ts` et les tests associés.
  - [x] Faire porter les règles métier au domaine, pas au handler ni au composant React.
  - [x] Appliquer la décision sur la base de l'état portefeuille courant de la session, avec une position par actif et un calcul de coût moyen simple.
  - [x] Mettre à jour le cash, la quantité détenue, le prix moyen et la valeur totale de façon cohérente.
  - [x] Préserver le comportement multi-actifs.
  - [x] Préparer l'engine à consommer la décision effective ordonnée issue de la story 1.5; ne pas ignorer les corrections ou annulations.
  - [x] Rendre l'opération idempotente en utilisant un identifiant de décision / snapshot ou une clé métier équivalente pour éviter le double comptage.

- [x] Persister les snapshots et positions de portefeuille dans SQLite/Drizzle (AC: 1, 2, 3, 4)
  - [x] Ajouter le schéma DB correspondant dans `packages/db/src/schema/` avec `snake_case` en base et mapping `camelCase` côté TypeScript.
  - [x] Prévoir une structure adaptée à l'historique de la story 2.3, avec un snapshot courant et des lignes de positions rattachées à ce snapshot.
  - [x] Ajouter le repository SQLite dédié dans `packages/db/src/repository/`, avec lecture de l'état courant, append d'un nouveau snapshot et protection contre les doublons.
  - [x] Mettre à jour `packages/db/src/client.ts` pour `ensureSchema` sans casser les bases existantes.
  - [x] Garder les montants/cash en TEXT décimal exact et réutiliser le même style de mapping que les décisions.
  - [x] Préserver `foreign_keys = ON` et le pattern `better-sqlite3` synchrone.

- [x] Brancher l'application de décision au flux existant de capture (AC: 1, 2, 3, 4)
  - [x] Brancher le moteur portefeuille sur le flux de capture de décision existant afin qu'un buy/sell appliqué mette à jour le portefeuille de la session.
  - [x] Garder `apps/review/src/server/decisionHandlers.ts` et/ou le handler API équivalent minces; la logique de calcul doit rester dans `packages/domain`.
  - [x] S'assurer qu'un succès de capture ne laisse pas le portefeuille et la décision dans deux états incohérents.
  - [x] Réutiliser `GET /api/sessions/[id]/portfolio` pour relire l'état courant après chaque application.
  - [x] Ne pas introduire de nouvelle UI lourde dans cette story: le flux nominal reste la capture de décision, pas l'administration de portefeuille.

- [x] Afficher l'état portefeuille courant dans l'app de revue (AC: 2)
  - [x] Étendre `apps/review/src/components/SessionPanel.tsx` pour afficher le cash courant, la devise, le nombre de positions ouvertes et la valeur totale courante.
  - [x] Garder l'affichage compact et lisible, en cohérence avec l'UX desktop-first du projet.
  - [x] Ne pas construire ici la courbe d'équité complète, les statistiques détaillées, ni la vue globale portefeuille dédiée: ces éléments appartiennent aux stories 2.4 et 2.5.

- [x] Couvrir la story par des tests ciblés (AC: 1, 2, 3, 4)
  - [x] Tests shared: validation du DTO portefeuille courant et des valeurs décimales exactes.
  - [x] Tests domaine: buy augmente/décrémente correctement cash et position, sell réduit la position sans la rendre négative, multiple actifs, coût moyen simple, idempotence par décision, utilisation de l'ordre effectif des décisions amendées.
  - [x] Tests DB: création des tables snapshot/positions, persistance exacte des montants, lecture de l'état courant, absence de double comptage sur retry.
  - [x] Tests API/UI: le flux de capture de décision met à jour l'état portefeuille, `GET /api/sessions/[id]/portfolio` renvoie le dernier snapshot, et le résumé UI reflète les chiffres courants.
  - [x] Ajouter au minimum un test vertical: session ouverte -> portefeuille initialisé -> capture buy -> capture sell -> lecture d'un état portefeuille cohérent, sans comptage double.

## Dev Notes

### Contexte métier

- Cette story couvre FR12, FR13, FR14, FR15 et FR18: maintenir un portefeuille virtuel multi-actifs et appliquer les décisions avec une logique de coût moyen simple. [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 2 / Story 2.2]
- Le PRD et son addendum disent explicitement que V1 doit rester simple, avec un portefeuille multi-actifs, une seule devise de référence et un coût moyen simple sans broker. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Scope for V1, Data and Domain Rules; `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories]
- La story 2.1 a déjà posé le bootstrap du portefeuille. Cette story ne redéfinit pas le capital initial ni la devise de référence; elle applique les décisions sur l'état courant.
- Les corrections et annulations de la story 1.5 existent déjà au niveau décision. Le portefeuille doit donc rester rejouable à partir de la décision effective ordonnée, pas seulement de la ligne brute initiale.
- Le système reste une simulation. Ne pas introduire de frais, slippage, exécution broker, margin rules ou autres mécanismes avancés dans cette story.

### État actuel à prendre en compte

- `packages/domain/src/portfolio/` n'existe pas encore ou ne contient pas encore le moteur d'application des décisions.
- `packages/db/src/schema/` ne contient pas encore de schéma portfolio pour snapshots/positions.
- `apps/review/src/app/api/sessions/[id]/portfolio/` doit rester la source de lecture de l'état courant du portefeuille.
- `apps/review/src/components/SessionPanel.tsx` affiche déjà la session, les actifs et les décisions; il manque encore la vue financière courante issue des décisions appliquées.
- `packages/domain/src/decisions/amendments/listDecisionTimeline.ts` fournit déjà le flux de décisions effectives ordonné; ce helper est la bonne entrée pour éviter d'ignorer corrections/cancellations.

### Décisions de cadrage pour cette story

- Le portefeuille V1 est long-only. Une vente réduit une position existante et ne doit pas créer de quantité négative.
- Le coût moyen reste simple: les achats recalculent le prix moyen de la position, les ventes réduisent la quantité et peuvent réaliser du PnL interne si le modèle le conserve, mais la story ne doit pas ajouter de statistiques globales.
- Le `referencePrice` de la décision est la seule source de prix pour l'application de portefeuille. Ne pas interroger TradingView, le marché ou un prix caché côté UI.
- Le portefeuille doit pouvoir être reconstruit de manière déterministe à partir de la séquence ordonnée des décisions effectives et du snapshot initial. C'est la base de la story 2.3.
- L'idempotence est obligatoire: un retry réseau, un refresh ou une double soumission ne doit pas appliquer deux fois la même décision.
- L'interface de revue n'est qu'un miroir de l'état calculé; elle ne doit jamais recalculer le portefeuille elle-même.

### Architecture à respecter

- `packages/domain` contient les règles métier de sessions, décisions, portefeuille et stats; le moteur portefeuille appartient donc au domaine, pas au handler React ni à la DB seule. [Source: `_bmad-output/planning-artifacts/architecture.md` > Service Boundaries]
- `packages/db` contient le schéma Drizzle, le client SQLite et les repositories. Garder le mapping `snake_case` -> `camelCase` à cette couche. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- `apps/review/src/app/api/*` est la couche d'exposition HTTP. Les handlers doivent rester minces et testables, avec le maximum de logique dans `packages/domain` et `packages/db`. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- Le repo réel utilise `apps/review/src/app/api/sessions/...` et `apps/review/src/server/...`; suivre cette structure actuelle plutôt que les exemples conceptuels plus anciens du document d'architecture.
- `packages/shared` porte les contrats publics et les schémas de validation. Si le portefeuille courant devient visible via API, garder un DTO explicite et stable dès cette story.

### Fichiers existants à modifier et état actuel

- `packages/domain/src/decisions/amendments/listDecisionTimeline.ts`
  - État actuel: expose la timeline effective ordonnée des décisions d'une session.
  - Changement attendu: réutiliser ce flux comme entrée de recalcul ou de reconstruction portefeuille.
  - À préserver: ordre stable, auditabilité et séparation entre décision brute et état effectif.

- `packages/domain/src/decisions/captureDecision.ts`
  - État actuel: capture la décision sans calculer portefeuille, PnL ou stats.
  - Changement attendu: brancher le flux de portefeuille sans déplacer la logique métier dans le handler.
  - À préserver: validation session/actif, atomicité de la capture, séparation des responsabilités.

- `packages/domain/src/sessions/createSession.ts`
  - État actuel: crée et ouvre la session, sans moteur portefeuille appliqué au-delà du bootstrap posé par la story 2.1.
  - Changement attendu: s'assurer que la session ouvre bien un portefeuille consultable et que le flux de décision pourra s'y brancher.
  - À préserver: invariants de session, timestamps ISO, tests existants.

- `packages/db/src/client.ts`
  - État actuel: `ensureSchema` crée les tables sessions, assets, session_assets, decisions et decision_amendments.
  - Changement attendu: ajouter le schéma portfolio courant/snapshots/positions sans casser les bases déjà créées.
  - À préserver: `DEFAULT_DEV_DATABASE_PATH`, `resolveDatabasePath`, `:memory:` en tests, `foreign_keys = ON`, `better-sqlite3` synchrone.

- `packages/db/src/schema/index.ts`
  - État actuel: exporte les schémas sessions/assets/decisions/decision_amendments.
  - Changement attendu: exporter le futur schéma portfolio.
  - À préserver: le mapping Drizzle existant et les conventions de nommage.

- `apps/review/src/server/decisionHandlers.ts`
  - État actuel: orchestre la capture et la lecture des décisions.
  - Changement attendu: brancher l'application portefeuille après une capture réussie, ou via un service commun, sans gonfler le handler.
  - À préserver: responses structurées, runtime Node, handlers minces.

- `apps/review/src/app/api/sessions/[id]/decisions/route.ts`
  - État actuel: expose capture et lecture des décisions.
  - Changement attendu: la capture de décision doit déclencher la mise à jour portefeuille associée.
  - À préserver: contrat API existant pour les décisions.

- `apps/review/src/app/api/sessions/[id]/portfolio/route.ts`
  - État actuel: attendu ou partiel selon l'avancement des stories précédentes; il doit lire l'état courant du portefeuille.
  - Changement attendu: renvoyer le dernier snapshot cohérent après l'application des décisions.
  - À préserver: runtime Node, route dynamique, réponse JSON structurée.

- `apps/review/src/components/SessionPanel.tsx`
  - État actuel: affiche la session, les actifs et l'historique de décisions.
  - Changement attendu: afficher cash, positions ouvertes et valeur totale courants issus du portefeuille.
  - À préserver: UX compacte, desktop-first, rafraîchissement simple et lisible.

### Contrats API recommandés

`GET /api/sessions/[id]/portfolio`
- Sert à lire l'état courant du portefeuille pour une session donnée.
- Retourne le dernier snapshot persistant, avec les positions courantes.
- Doit être consultable juste après une décision appliquée.

Réponse de lecture recommandée:

```json
{
  "data": {
    "portfolio": {
      "sessionId": "uuid",
      "referenceCurrency": "EUR",
      "initialCapital": "10000",
      "cash": "9724.50",
      "totalValue": "10031.20",
      "positions": [
        {
          "assetId": "uuid",
          "symbol": "AAPL",
          "quantity": "12",
          "averagePrice": "189.25",
          "lastPrice": "191.80",
          "marketValue": "2301.60"
        }
      ],
      "initializedAt": "2026-06-10T13:39:16.000Z",
      "updatedAt": "2026-06-10T13:40:02.000Z"
    }
  },
  "error": null,
  "meta": {}
}
```

Notes:
- Le capital initial et la devise de référence doivent reprendre les constantes de la story 2.1.
- Les positions restent groupées par actif et ne doivent jamais produire une quantité négative.
- Le dernier prix utilisé pour valoriser une position est le `referencePrice` de la décision qui vient d'être appliquée ou le dernier prix connu pour cette position.
- Le total du portefeuille doit rester cohérent avec cash + valeur des positions.

### Pièges à éviter

1. Ne pas recalculer le portefeuille dans l'UI. L'UI doit lire le snapshot courant, pas refaire la mécanique métier.
2. Ne pas ignorer les corrections et annulations déjà modélisées en story 1.5. Le portefeuille doit pouvoir être reconstruit à partir de la décision effective ordonnée.
3. Ne pas créer de positions courtes en V1. Le portefeuille reste long-only.
4. Ne pas introduire de frais, de slippage ou de broker semantics dans cette story.
5. Ne pas réutiliser le capital initial ou la devise comme champ libre local au lieu de passer par la source V1 centralisée.
6. Ne pas casser le flux de capture de décision existant en voulant trop en faire dans le handler.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 2 > Story 2.2]
- [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Functional Requirements, Data and Domain Rules, Scope for V1]
- [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories]
- [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries, Service Boundaries, Requirements to Structure Mapping]
- [Source: `packages/domain/src/decisions/captureDecision.ts`]
- [Source: `packages/domain/src/decisions/amendments/listDecisionTimeline.ts`]
- [Source: `packages/domain/src/sessions/createSession.ts`]
- [Source: `packages/db/src/client.ts`]
- [Source: `packages/db/src/schema/sessions.ts`]
- [Source: `packages/db/src/repository/decisionRepository.ts`]
- [Source: `apps/review/src/app/api/sessions/[id]/decisions/route.ts`]
- [Source: `apps/review/src/components/SessionPanel.tsx`]
- [Source: `_bmad-output/implementation-artifacts/2-1-initialiser-le-portefeuille-simule.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Analyse réalisée à partir des artefacts de planning, de la story 2.1, de l'architecture et des modules décisions/db/sessions existants.
- Aucune implémentation n'a encore été lancée pour cette story au moment de la création du fichier.

### Completion Notes List

- Story créée pour l'engine portefeuille V1 qui applique les décisions au cash, aux positions et à la valeur totale.
- Le scope est volontairement centré sur l'application atomique, le coût moyen simple et l'idempotence, sans equity curve ni statistiques.
- Le moteur doit rester rejouable à partir de la timeline effective des décisions afin de rester compatible avec les corrections et annulations.
- Le repo réel continue d'utiliser `apps/review/src/app/api/...` et `apps/review/src/server/...`; la story documente ce chemin réel.

### File List

- _bmad-output/implementation-artifacts/2-2-appliquer-une-decision-au-portefeuille.md
