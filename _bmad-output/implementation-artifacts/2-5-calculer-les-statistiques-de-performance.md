---
story_id: "2.5"
story_key: "2-5-calculer-les-statistiques-de-performance"
epic: "2"
status: ready-for-dev
baseline_commit: "317448c"
created: "2026-06-10T13:47:50+02:00"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 2.5: Calculer les statistiques de performance

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,
I want consulter les statistiques de base de ma simulation,
so that je puisse mesurer la qualité et la régularité de mes trades.

## Acceptance Criteria

1. **Calcul des statistiques de base**
   - Given une session ou un portefeuille contenant des trades
   - When l'utilisateur consulte les statistiques
   - Then le système affiche au minimum le nombre de trades, le taux de réussite, le gain ou la perte nette, le drawdown maximum, la durée moyenne des trades et l'évolution globale de la performance
   - And les valeurs affichées restent cohérentes avec l'état du portefeuille et la courbe d'équité
   - And les statistiques restent lisibles avec des montants et des pourcentages arrondis de façon cohérente

2. **Regroupement et filtrage par session**
   - Given plusieurs sessions de simulation
   - When l'utilisateur filtre ou regroupe les performances par session
   - Then le système peut isoler les statistiques d'une session donnée
   - And le système peut aussi produire un regroupement global si la vue le demande
   - And aucune session ne doit contaminer les résultats d'une autre session

3. **Compatibilité avec les décisions corrigées ou annulées**
   - Given des décisions corrigées ou annulées
   - When les statistiques sont recalculées
   - Then le résultat reste cohérent avec les règles d'auditabilité définies
   - And le calcul utilise la décision effective ordonnée, pas seulement les événements bruts
   - And le recalcul reste déterministe à données identiques

4. **Stabilité de lecture et de restitution**
   - Given une session déjà calculée puis enrichie par de nouvelles décisions
   - When l'utilisateur relit les statistiques
   - Then les indicateurs reflètent l'état le plus récent de la session
   - And un refresh ne duplique pas les trades ou les points de performance
   - And la vue reste cohérente avec l'historique et la courbe d'équité

## Tasks / Subtasks

- [ ] Définir les contrats partagés des statistiques (AC: 1, 2, 3, 4)
  - [ ] Étendre `packages/shared/src/schemas/portfolio.ts` ou un module partagé dédié avec les DTO de performance et de statistiques.
  - [ ] Exporter les nouveaux contrats depuis `packages/shared/src/index.ts`.
  - [ ] Réutiliser les constantes V1 de la story 2.1 et les données portefeuille/historique des stories 2.2 à 2.4 sans dupliquer les champs communs.
  - [ ] Représenter les montants, pourcentages, durées et compteurs avec des types exacts cohérents avec le reste du domaine.
  - [ ] Garder le contrat explicite mais minimal: sessionId, devise, nombre de trades, win rate, PnL net, drawdown max, durée moyenne, performance globale et métadonnées utiles à la lecture.

- [ ] Implémenter le moteur de calcul des statistiques dans `packages/domain` (AC: 1, 2, 3, 4)
  - [ ] Créer ou compléter `packages/domain/src/stats/` avec `types.ts`, `deps.ts`, `mappers.ts`, `calculateSessionStats.ts`, `calculatePortfolioStats.ts` et les tests associés.
  - [ ] Faire porter la règle métier au domaine, pas au handler ni au composant React.
  - [ ] Calculer les statistiques à partir de la décision effective ordonnée et des snapshots portefeuille, pas à partir d'un état UI.
  - [ ] Définir clairement ce qu'est un trade dans V1 pour éviter les ambiguïtés de calcul.
  - [ ] Garantir un résultat déterministe à données identiques et compatible avec les corrections et annulations.

- [ ] Exposer les statistiques via l'API review (AC: 1, 2, 3, 4)
  - [ ] Ajouter le route handler Next.js correspondant, par exemple `apps/review/src/app/api/sessions/[id]/stats/route.ts`.
  - [ ] Ajouter, si utile, un endpoint global pour agréger plusieurs sessions sans forcer la logique dans une route de session unique.
  - [ ] Garder les handlers minces et testables; le calcul doit rester dans `packages/domain`.
  - [ ] Réutiliser les données portefeuille et historique déjà persistées pour produire les métriques.
  - [ ] Ne pas mélanger ici la courbe d'équité de la story 2.4 avec les statistiques détaillées.

- [ ] Afficher les statistiques dans l'interface de revue (AC: 1, 2, 4)
  - [ ] Étendre `apps/review/src/components/SessionPanel.tsx` ou la vue de session équivalente pour afficher les statistiques clés de la session.
  - [ ] Mettre en avant les chiffres essentiels: nombre de trades, win rate, PnL net, drawdown max, durée moyenne et performance globale.
  - [ ] Garder l'affichage compact, lisible et orienté comparaison de session.
  - [ ] Préserver l'UX desktop-first et éviter une densité visuelle excessive.

- [ ] Couvrir la story par des tests ciblés (AC: 1, 2, 3, 4)
  - [ ] Tests shared: validation des DTO de statistiques et des types de performance.
  - [ ] Tests domaine: calcul stable du nombre de trades, du win rate, du PnL net, du drawdown max, de la durée moyenne et de la performance globale, avec correction/annulation des décisions.
  - [ ] Tests API/UI: les statistiques renvoyées par la route correspondent aux données simulées et la vue les affiche correctement pour une session donnée.
  - [ ] Ajouter au minimum un test vertical: session ouverte -> portefeuille initialisé -> plusieurs trades -> recalcul des statistiques -> vérification des chiffres et du filtrage par session.

## Dev Notes

### Contexte métier

- Cette story couvre FR21, FR22 et FR23: le système doit calculer des statistiques de base sur les trades et permettre un regroupement ou filtrage par session. [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 2 / Story 2.5]
- Le PRD demande de fournir des statistiques simples pour évaluer la qualité, la régularité et la progression, avec une lecture comparable dans le temps. [Source: `_bmad-output/planning-artifacts/prd*.md` > Objectives, Functional Requirements, Success Metrics]
- L'addendum rappelle que les décisions doivent rester auditables si elles modifient les métriques de performance. [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories]
- Les stories 2.1 à 2.4 ont déjà posé le portefeuille, les décisions appliquées, l'historique et la courbe d'équité. Cette story transforme ces données en indicateurs synthétiques.
- Les corrections et annulations doivent être prises en compte via la décision effective ordonnée, sinon les métriques ne seraient pas fiables.

### État actuel à prendre en compte

- `packages/domain/src/stats/` n'existe pas encore ou ne contient pas encore le moteur de calcul des statistiques.
- `packages/db/src/schema/` ne contient pas forcément de nouvelle table si les statistiques peuvent être calculées à la lecture depuis les décisions et snapshots existants.
- `apps/review/src/app/api/sessions/[id]/stats/` n'existe pas encore.
- `apps/review/src/components/SessionPanel.tsx` affiche déjà la session, les actifs, les décisions et éventuellement le portefeuille, mais pas un résumé statistique complet.
- `packages/domain/src/decisions/amendments/listDecisionTimeline.ts` et les snapshots portefeuille constituent la base de vérité pour les calculs.

### Décisions de cadrage pour cette story

- Les statistiques doivent être calculées à partir des données persistées, pas à partir d'un état UI.
- Le calcul doit rester simple et explicable: V1 ne doit pas introduire de métriques avancées ou d'hypothèses opaques.
- La définition du trade doit être claire et documentée dans le domaine pour éviter les divergences entre implémentations.
- Le regroupement par session doit être natif, pas un simple filtre opportuniste côté front-end.
- La courbe d'équité de la story 2.4 et les statistiques doivent être cohérentes entre elles sans dupliquer la logique.

### Architecture à respecter

- `packages/domain` contient les règles métier de sessions, décisions, portefeuille et stats; le moteur de statistiques appartient donc au domaine, pas au handler React ni à la DB seule. [Source: `_bmad-output/planning-artifacts/architecture.md` > Service Boundaries]
- `packages/db` contient le schéma Drizzle, le client SQLite et les repositories. Garder le mapping `snake_case` -> `camelCase` à cette couche. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- `apps/review/src/app/api/*` est la couche d'exposition HTTP. Les handlers doivent rester minces et testables, avec le maximum de logique dans `packages/domain` et `packages/db`. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- Le repo réel utilise `apps/review/src/app/api/sessions/...` et `apps/review/src/server/...`; suivre cette structure actuelle plutôt que les exemples conceptuels plus anciens du document d'architecture.
- `packages/shared` porte les contrats publics et les schémas de validation. Si les statistiques deviennent visibles via API, garder un DTO explicite et stable dès cette story.

### Fichiers existants à modifier et état actuel

- `packages/domain/src/decisions/amendments/listDecisionTimeline.ts`
  - État actuel: expose la timeline effective ordonnée des décisions d'une session.
  - Changement attendu: réutiliser cette timeline comme base de calcul des métriques.
  - À préserver: ordre stable, auditabilité et séparation entre décision brute et état effectif.

- `packages/domain/src/decisions/captureDecision.ts`
  - État actuel: capture la décision sans calculer portefeuille, PnL ou stats.
  - Changement attendu: brancher proprement le flux qui alimente les statistiques sans déplacer la logique métier dans le handler.
  - À préserver: validation session/actif, atomicité de la capture, séparation des responsabilités.

- `packages/domain/src/sessions/createSession.ts`
  - État actuel: crée et ouvre la session.
  - Changement attendu: garantir qu'une session possède des données exploitables pour le calcul des statistiques.
  - À préserver: invariants de session, timestamps ISO, tests existants.

- `packages/domain/src/portfolio/` 
  - État actuel: porte le portefeuille, l'historique et la performance courbe.
  - Changement attendu: fournir des entrées cohérentes pour le calcul des statistiques.
  - À préserver: cohérence du cash, des positions et de la valeur totale.

- `packages/db/src/client.ts`
  - État actuel: `ensureSchema` crée les tables sessions, assets, session_assets, decisions et decision_amendments.
  - Changement attendu: ajouter des structures seulement si un cache ou un agrégat persistant s'avère nécessaire, sans casser les bases déjà créées.
  - À préserver: `DEFAULT_DEV_DATABASE_PATH`, `resolveDatabasePath`, `:memory:` en tests, `foreign_keys = ON`, `better-sqlite3` synchrone.

- `packages/db/src/schema/index.ts`
  - État actuel: exporte les schémas sessions/assets/decisions/decisionAmendments.
  - Changement attendu: exporter le futur schéma stats si persistance dédiée est requise.
  - À préserver: le mapping Drizzle existant et les conventions de nommage.

- `apps/review/src/server/decisionHandlers.ts`
  - État actuel: orchestre la capture et la lecture des décisions.
  - Changement attendu: exposer ou consommer les services de calcul de statistiques sans alourdir le handler.
  - À préserver: responses structurées, runtime Node, handlers minces.

- `apps/review/src/app/api/sessions/[id]/portfolio/performance/route.ts`
  - État actuel: lit la courbe de performance.
  - Changement attendu: servir de base d'entrée ou de complément aux statistiques de session.
  - À préserver: runtime Node, route dynamique, réponse JSON structurée.

- `apps/review/src/components/SessionPanel.tsx`
  - État actuel: affiche la session, les actifs, les décisions et potentiellement la courbe.
  - Changement attendu: afficher les statistiques clés de la session.
  - À préserver: UX compacte, desktop-first, rafraîchissement simple et lisible.

### Contrats API recommandés

`GET /api/sessions/[id]/stats`
- Sert à lire les statistiques d'une session donnée.
- Retourne les indicateurs de base calculés à partir des trades effectifs.
- Doit être consultable juste après une décision ou un amendement qui change les métriques.

Réponse de lecture recommandée:

```json
{
  "data": {
    "stats": {
      "sessionId": "uuid",
      "referenceCurrency": "EUR",
      "tradeCount": 12,
      "winRate": "58.33",
      "netPnL": "312.40",
      "maxDrawdown": "-4.20",
      "averageTradeDurationMinutes": "42.5",
      "performanceChange": "3.12",
      "calculatedAt": "2026-06-10T13:47:50.000Z"
    }
  },
  "error": null,
  "meta": {}
}
```

Notes:
- Les valeurs de pourcentage peuvent être renvoyées en chaîne décimale pour conserver la précision.
- Le calcul doit rester cohérent avec les sessions filtrées ou regroupées.
- Les trades corrigés ou annulés doivent disparaître du calcul s'ils ne sont plus effectifs.
- Les statistiques détaillées supplémentaires doivent rester hors scope de cette story.

### Pièges à éviter

1. Ne pas compter deux fois les trades après un retry, un refresh ou un amendement.
2. Ne pas calculer les métriques à partir d'événements bruts sans tenir compte de la décision effective.
3. Ne pas mélanger les statistiques de plusieurs sessions sans séparation explicite.
4. Ne pas introduire de métriques avancées ou de scoring stratégique dans cette story.
5. Ne pas faire dépendre le calcul du front-end.
6. Ne pas casser la cohérence avec la courbe d'équité et l'historique de portefeuille.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 2 > Story 2.5]
- [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Functional Requirements, Success Metrics, Scope for V1]
- [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md` > Implementation decisions carried into stories]
- [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries, Service Boundaries, Requirements to Structure Mapping]
- [Source: `packages/domain/src/decisions/amendments/listDecisionTimeline.ts`]
- [Source: `packages/domain/src/decisions/captureDecision.ts`]
- [Source: `packages/domain/src/sessions/createSession.ts`]
- [Source: `apps/review/src/components/SessionPanel.tsx`]
- [Source: `apps/review/src/app/api/sessions/[id]/portfolio/performance/route.ts`]
- [Source: `_bmad-output/implementation-artifacts/2-1-initialiser-le-portefeuille-simule.md`]
- [Source: `_bmad-output/implementation-artifacts/2-2-appliquer-une-decision-au-portefeuille.md`]
- [Source: `_bmad-output/implementation-artifacts/2-3-conserver-l-historique-du-portefeuille-dans-le-temps.md`]
- [Source: `_bmad-output/implementation-artifacts/2-4-afficher-le-capital-et-la-courbe-d-equite.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Analyse réalisée à partir des artefacts de planning, des stories 2.1 à 2.4, de l'architecture et des modules sessions/décisions/db existants.
- Aucune implémentation n'a encore été lancée pour cette story au moment de la création du fichier.

### Completion Notes List

- Story créée pour les statistiques de performance V1 avec regroupement par session.
- Le scope reste centré sur les métriques de base auditables, pas sur le scoring stratégique ou l'analyse avancée.
- Les statistiques doivent rester cohérentes avec les décisions effectives, l'historique portefeuille et la courbe d'équité.
- Le repo réel continue d'utiliser `apps/review/src/app/api/...` et `apps/review/src/server/...`; la story documente ce chemin réel.

### File List

- _bmad-output/implementation-artifacts/2-5-calculer-les-statistiques-de-performance.md
