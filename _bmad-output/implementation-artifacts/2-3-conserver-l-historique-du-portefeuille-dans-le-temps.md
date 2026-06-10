---
story_id: "2.3"
story_key: "2-3-conserver-l-historique-du-portefeuille-dans-le-temps"
epic: "2"
status: ready-for-dev
baseline_commit: "317448c"
created: "2026-06-10T13:44:25+02:00"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 2.3: Conserver l'historique du portefeuille dans le temps

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,
I want conserver l'état du portefeuille au fil du temps et pouvoir relire ses évolutions par session,
so that je puisse comparer la progression de ma simulation entre décisions et entre sessions.

## Acceptance Criteria

1. **Consultation de l'historique d'une session**
   - Given plusieurs décisions appliquées dans le temps sur une même session
   - When l'utilisateur consulte l'historique du portefeuille de cette session
   - Then les états successifs sont conservés et consultables dans un ordre stable
   - And chaque état est rattaché à la session correspondante
   - And l'historique expose suffisamment de contexte pour relier un snapshot à la décision ou à l'événement qui l'a produit

2. **Distinction entre sessions différentes**
   - Given deux sessions distinctes ayant chacune leur propre séquence de décisions
   - When l'utilisateur consulte ou compare leurs historiques de portefeuille
   - Then le système distingue clairement les évolutions de chaque session
   - And aucun snapshot d'une session n'apparaît dans une autre
   - And la comparaison reste lisible même si les sessions ont des durées ou des volumes de décisions différents

3. **Stabilité de lecture dans le temps**
   - Given une session déjà consultée puis enrichie par de nouvelles décisions
   - When l'utilisateur relit l'historique de la session
   - Then les snapshots antérieurs restent identifiables et consultables
   - And l'ordre de lecture reste déterministe
   - And les retrys de lecture ne modifient pas l'historique

4. **Compatibilité avec les corrections et annulations**
   - Given une session contenant des décisions corrigées ou annulées
   - When l'utilisateur consulte l'historique du portefeuille
   - Then l'historique reste cohérent avec la décision effective ordonnée
   - And les états affichés restent auditables face aux amendements
   - And la comparaison inter-session ne mélange pas l'état brut et l'état effectif

## Tasks / Subtasks

- [ ] Définir les contrats partagés de l'historique du portefeuille (AC: 1, 2, 3, 4)
  - [ ] Étendre `packages/shared/src/schemas/portfolio.ts` avec les DTO d'historique, de snapshot et de comparaison inter-session.
  - [ ] Exporter les nouveaux contrats depuis `packages/shared/src/index.ts`.
  - [ ] Réutiliser les constantes V1 de la story 2.1 et les DTO de base de la story 2.2 sans dupliquer les champs communs.
  - [ ] Représenter les montants, les timestamps et les index d'ordre comme des chaînes ou types exacts cohérents avec le reste du domaine.
  - [ ] Garder le contrat explicite mais lisible: sessionId, snapshotId, ordre, décision source éventuelle, cash, positions, valeur totale, devise, et métadonnées de consultation.

- [ ] Implémenter la lecture historique dans `packages/domain` (AC: 1, 2, 3, 4)
  - [ ] Créer ou compléter `packages/domain/src/portfolio/` avec des helpers de lecture d'historique, de regroupement par session et de comparaison entre sessions.
  - [ ] Faire porter la règle métier au domaine, pas au handler ni au composant React.
  - [ ] Réutiliser la timeline effective des décisions et les snapshots portefeuille pour reconstruire l'historique de façon déterministe.
  - [ ] Garantir un ordre stable de lecture, basé sur des clés métier ou des index persistés, pas sur un tri implicite côté UI.
  - [ ] Préserver la séparation entre état brut, décision effective et snapshot historique.

- [ ] Persister et indexer l'historique consultable dans SQLite/Drizzle (AC: 1, 2, 3, 4)
  - [ ] Ajouter le schéma DB nécessaire dans `packages/db/src/schema/` si les snapshots de 2.2 ne suffisent pas encore pour une lecture historique stable.
  - [ ] Prévoir des index adaptés à la lecture par session, par ordre chronologique et par comparaison de sessions.
  - [ ] Ajouter le repository SQLite dédié dans `packages/db/src/repository/`, avec lecture des snapshots, pagination éventuelle et filtrage par session.
  - [ ] Mettre à jour `packages/db/src/client.ts` pour `ensureSchema` sans casser les bases existantes.
  - [ ] Garder les montants et les timestamps en représentation exacte, comme pour les décisions et le portefeuille courant.

- [ ] Exposer l'historique dans l'app de revue (AC: 1, 2, 3, 4)
  - [ ] Ajouter le route handler Next.js correspondant pour consulter l'historique d'une session, par exemple `apps/review/src/app/api/sessions/[id]/portfolio/history/route.ts`.
  - [ ] Ajouter, si nécessaire, un endpoint de comparaison inter-session dans `apps/review/src/app/api/portfolio/` pour éviter de forcer ce besoin dans une route de session unique.
  - [ ] Garder les handlers minces et testables; la logique de regroupement doit rester dans `packages/domain`.
  - [ ] Exposer une lecture orientée historique plutôt qu'un simple état courant.
  - [ ] Ne pas ajouter de recalcul métier dans l'UI.

- [ ] Afficher l'historique de façon lisible dans l'interface de revue (AC: 1, 2, 3)
  - [ ] Étendre `apps/review/src/components/SessionPanel.tsx` ou la vue de session équivalente pour afficher une timeline compacte des snapshots de portefeuille.
  - [ ] Montrer assez d'information pour relire l'évolution sans surcharger la page: date/ordre, cash, valeur totale, nombre de positions et session associée.
  - [ ] Préserver l'UX desktop-first et garder la vue lisible même avec une longue session.
  - [ ] Ne pas construire ici la courbe d'équité complète ni les statistiques agrégées: ces éléments appartiennent aux stories 2.4 et 2.5.

- [ ] Couvrir la story par des tests ciblés (AC: 1, 2, 3, 4)
  - [ ] Tests shared: validation des DTO d'historique et de comparaison inter-session.
  - [ ] Tests domaine: lecture d'une timeline de snapshots stable, séparation stricte entre sessions, ordre déterministe, compatibilité avec corrections et annulations.
  - [ ] Tests DB: lecture filtrée par session, index/stabilité de tri, absence de contamination croisée entre sessions.
  - [ ] Tests API/UI: l'historique d'une session remonte les snapshots attendus, la comparaison de deux sessions distingue bien leurs trajectoires, et l'UI affiche une timeline lisible.
  - [ ] Ajouter au minimum un test vertical: deux sessions, plusieurs décisions chacune, consultation de l'historique de l'une puis comparaison des deux, avec snapshots séparés et ordre stable.

## Dev Notes

### Contexte métier

- Cette story couvre FR16 et FR23, avec un pont direct vers FR24 et FR26: le système doit conserver l'état du portefeuille au fil du temps et permettre une lecture comparative par session. [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 2 / Story 2.3]
- Le PRD insiste sur la lisibilité de la progression du portefeuille virtuel et sur la capacité de relire/comparer les performances. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Objectives, Success Metrics, Scope for V1]
- L'addendum rappelle que la V1 reste simple, avec un modèle à coût moyen et une devise de référence unique; l'historique doit rester un enregistrement stable de cette simulation, pas un moteur d'analytics avancé. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories]
- La story 2.2 pose l'application des décisions et la persistance des snapshots courants. Cette story transforme ces snapshots en historique consultable et comparable.
- Les corrections et annulations issues de la story 1.5 doivent rester visibles de façon cohérente via la décision effective ordonnée, pas via un simple dump brut des événements.

### État actuel à prendre en compte

- `packages/domain/src/portfolio/` n'existe pas encore ou n'expose pas encore de lecture historique.
- `packages/db/src/schema/` ne contient pas encore de structure explicitement orientée historique de portefeuille consultable.
- `apps/review/src/app/api/sessions/[id]/portfolio/history/` n'existe pas encore.
- `apps/review/src/components/SessionPanel.tsx` affiche déjà la session, les actifs et les décisions, mais pas une timeline de portefeuille.
- `packages/domain/src/decisions/amendments/listDecisionTimeline.ts` fournit déjà la timeline effective des décisions; c'est le point de départ naturel pour assurer une lecture historique cohérente.

### Décisions de cadrage pour cette story

- L'historique doit être consultable sans recalcul manuel côté UI. La vue lit des snapshots ordonnés, elle ne reconstruit pas la timeline.
- Chaque session conserve son propre historique. La comparaison entre sessions doit rester un overlay de lectures distinctes, pas un mélange de données.
- L'ordre des snapshots doit être déterministe et stable, même si la session continue d'évoluer après une première consultation.
- Les snapshots antérieurs doivent rester consultables après les décisions suivantes; l'historique n'est pas un état écrasé.
- La lecture historique doit être compatible avec les décisions corrigées ou annulées: on compare l'état effectif final, pas les événements bruts isolés.
- Cette story ne doit pas introduire la courbe d'équité complète ni les statistiques détaillées; elle pose la base de consultation temporelle.

### Architecture à respecter

- `packages/domain` contient les règles métier de sessions, décisions, portefeuille et stats; la lecture historique du portefeuille appartient donc au domaine, pas au handler React ni à la DB seule. [Source: `_bmad-output/planning-artifacts/architecture.md` > Service Boundaries]
- `packages/db` contient le schéma Drizzle, le client SQLite et les repositories. Garder le mapping `snake_case` -> `camelCase` à cette couche. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- `apps/review/src/app/api/*` est la couche d'exposition HTTP. Les handlers doivent rester minces et testables, avec le maximum de logique dans `packages/domain` et `packages/db`. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- Le repo réel utilise `apps/review/src/app/api/sessions/...` et `apps/review/src/server/...`; suivre cette structure actuelle plutôt que les exemples conceptuels plus anciens du document d'architecture.
- `packages/shared` porte les contrats publics et les schémas de validation. Si l'historique du portefeuille devient visible via API, garder un DTO explicite et stable dès cette story.

### Fichiers existants à modifier et état actuel

- `packages/domain/src/decisions/amendments/listDecisionTimeline.ts`
  - État actuel: expose la timeline effective ordonnée des décisions d'une session.
  - Changement attendu: réutiliser cette timeline comme base de la lecture historique du portefeuille.
  - À préserver: ordre stable, auditabilité et séparation entre décision brute et état effectif.

- `packages/domain/src/decisions/captureDecision.ts`
  - État actuel: capture la décision sans calculer portefeuille, PnL ou stats.
  - Changement attendu: brancher proprement le flux qui alimente les snapshots historiques sans déplacer la logique métier dans le handler.
  - À préserver: validation session/actif, atomicité de la capture, séparation des responsabilités.

- `packages/domain/src/sessions/createSession.ts`
  - État actuel: crée et ouvre la session.
  - Changement attendu: garantir qu'une session dispose d'un historique de portefeuille lisible dès qu'elle commence à accumuler des décisions.
  - À préserver: invariants de session, timestamps ISO, tests existants.

- `packages/db/src/client.ts`
  - État actuel: `ensureSchema` crée les tables sessions, assets, session_assets, decisions et decision_amendments.
  - Changement attendu: ajouter les structures nécessaires à la lecture historique du portefeuille sans casser les bases déjà créées.
  - À préserver: `DEFAULT_DEV_DATABASE_PATH`, `resolveDatabasePath`, `:memory:` en tests, `foreign_keys = ON`, `better-sqlite3` synchrone.

- `packages/db/src/schema/index.ts`
  - État actuel: exporte les schémas sessions/assets/decisions/decision_amendments.
  - Changement attendu: exporter le futur schéma portfolio/historique.
  - À préserver: le mapping Drizzle existant et les conventions de nommage.

- `apps/review/src/server/decisionHandlers.ts`
  - État actuel: orchestre la capture et la lecture des décisions.
  - Changement attendu: exposer ou consommer les services de lecture historique sans alourdir le handler.
  - À préserver: responses structurées, runtime Node, handlers minces.

- `apps/review/src/app/api/sessions/[id]/portfolio/route.ts`
  - État actuel: lit l'état courant du portefeuille.
  - Changement attendu: rester le point d'entrée du résumé courant tout en coexistants avec une route dédiée à l'historique.
  - À préserver: runtime Node, route dynamique, réponse JSON structurée.

- `apps/review/src/components/SessionPanel.tsx`
  - État actuel: affiche la session, les actifs et l'historique des décisions.
  - Changement attendu: afficher une timeline de portefeuille ou un résumé historique compact.
  - À préserver: UX compacte, desktop-first, rafraîchissement simple et lisible.

### Contrats API recommandés

`GET /api/sessions/[id]/portfolio/history`
- Sert à lister les snapshots historiques d'une session donnée.
- Retourne les états successifs du portefeuille, ordonnés de façon stable.
- Doit rester lisible après de nouvelles décisions sur la même session.

Réponse de lecture recommandée:

```json
{
  "data": {
    "history": {
      "sessionId": "uuid",
      "referenceCurrency": "EUR",
      "snapshots": [
        {
          "snapshotId": "uuid",
          "sequence": 1,
          "decisionId": null,
          "cash": "10000",
          "totalValue": "10000",
          "positionsCount": 0,
          "recordedAt": "2026-06-10T13:32:54.000Z"
        },
        {
          "snapshotId": "uuid",
          "sequence": 2,
          "decisionId": "uuid",
          "cash": "9724.50",
          "totalValue": "10031.20",
          "positionsCount": 1,
          "recordedAt": "2026-06-10T13:40:02.000Z"
        }
      ]
    }
  },
  "error": null,
  "meta": {}
}
```

`GET /api/portfolio/compare?leftSessionId=...&rightSessionId=...`
- Sert à comparer deux sessions distinctes sans mélanger leurs snapshots.
- Retourne deux historiques séparés, avec un résumé de divergence lisible.
- Peut rester minimal en V1 tant qu'il permet d'identifier la session et sa trajectoire.

Notes:
- Les snapshots doivent conserver un ordre stable par session.
- Une session ne doit jamais exposer un snapshot appartenant à une autre.
- Le comparatif doit s'appuyer sur les mêmes sources de vérité que la lecture historique de session.
- Le point d'entrée global de comparaison peut rester plus simple que la vue complète de performance de la story 2.4.

### Pièges à éviter

1. Ne pas reconstruire l'historique uniquement dans l'UI. La vue doit lire une source de vérité persistée et ordonnée.
2. Ne pas mélanger les snapshots de plusieurs sessions dans une même liste sans marquage clair de session.
3. Ne pas introduire la courbe d'équité ou les statistiques détaillées dans cette story. Elles appartiennent aux stories 2.4 et 2.5.
4. Ne pas ignorer les corrections et annulations déjà modélisées dans les décisions effectives.
5. Ne pas rendre l'ordre dépendant d'un tri implicite basé sur le front-end ou sur un champ non déterministe.
6. Ne pas alourdir les handlers API avec la logique métier de regroupement historique.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 2 > Story 2.3]
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

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Analyse réalisée à partir des artefacts de planning, de la story 2.1, de la story 2.2, de l'architecture et des modules sessions/décisions/db existants.
- Aucune implémentation n'a encore été lancée pour cette story au moment de la création du fichier.

### Completion Notes List

- Story créée pour rendre l'historique du portefeuille consultable et comparable par session.
- Le scope se concentre sur les lectures historiques, la stabilité d'ordre et la séparation des sessions, sans ajouter la courbe d'équité ni les statistiques.
- Les snapshots et la timeline effective des décisions doivent rester les sources de vérité de lecture.
- Le repo réel continue d'utiliser `apps/review/src/app/api/...` et `apps/review/src/server/...`; la story documente ce chemin réel.

### File List

- _bmad-output/implementation-artifacts/2-3-conserver-l-historique-du-portefeuille-dans-le-temps.md
