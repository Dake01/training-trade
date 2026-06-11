---
story_id: "1.8"
story_key: "1-8-simplifier-l-interface-web-pour-les-performances-et-l-historique"
epic: "1"
status: "review"
baseline_commit: "638063a"
created: "2026-06-11T10:44:44+02:00"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 1.8: Simplifier l'interface web et retirer l'historique du portefeuille

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,
I want une interface web plus simple, plus lisible et plus ergonomique, avec l'historique du portefeuille retiré de l'écran principal,
so that je puisse lire rapidement les performances et l'historique des actions (achat, vente et date) sans me perdre dans l'interface.

## Acceptance Criteria

1. **Hiérarchie visuelle orientée lecture**
   - Given l'utilisateur ouvre l'application web de revue sur une session active ou clôturée
   - When la page se charge
   - Then la zone la plus visible met en avant l'état de la session et les indicateurs de performance utiles à la lecture rapide
   - And les sections secondaires ne rivalisent pas visuellement avec les indicateurs et l'historique
   - And le tableau d'historique du portefeuille n'est plus affiché car il n'apporte pas de valeur supplémentaire par rapport au graphique
   - And la page donne une impression plus calme, plus dense et plus facile à scanner qu'avant

2. **Historique des actions plus lisible**
   - Given une session contient des décisions buy/sell
   - When l'utilisateur consulte l'historique
   - Then chaque ligne permet d'identifier rapidement le sens, l'actif, la quantité, le prix de référence et la date/heure logique
   - And la lecture chronologique reste naturelle et stable
   - And les badges de correction/annulation et les commentaires restent accessibles sans alourdir la lecture principale

3. **Fonctions existantes préservées**
   - Given l'utilisateur crée, reprend, clôture, associe des actifs ou capture une décision
   - When l'interface a été simplifiée
   - Then tous les flux existants continuent de fonctionner
   - And aucun endpoint, calcul métier ou règle de persistance n'est modifié par cette story
   - And l'interface reste pilotée par l'API review, sans accès direct à la base

4. **Lisibilité sur desktop et largeur réduite**
   - Given la page est affichée sur un écran desktop classique ou une largeur plus réduite
   - When l'utilisateur parcourt la session
   - Then le contenu reste lisible sans débordement horizontal
   - And les blocs se réorganisent de manière cohérente
   - And les éléments importants restent accessibles sans zoom ni micro-lecture

## Tasks / Subtasks

- [x] Repenser le shell visuel de l'app web pour clarifier la hiérarchie de lecture (AC: 1, 4)
  - [x] Mettre à jour `apps/review/src/app/page.tsx` pour introduire une structure de page plus lisible, avec un titre plus explicite, un espacement plus généreux et une hiérarchie visuelle plus nette.
  - [x] Ajuster `apps/review/src/app/layout.tsx` si nécessaire pour améliorer le fond, la typographie de base et le contraste général sans introduire de dépendance de design system.
  - [x] Conserver l'identité visuelle actuelle du projet, mais réduire le bruit visuel et les zones sans rôle de lecture.

- [x] Réorganiser `SessionPanel` autour des informations de lecture prioritaires (AC: 1, 3, 4)
  - [x] Refactorer `apps/review/src/components/SessionPanel.tsx` pour distinguer clairement les zones de synthèse, d'historique et d'actions.
  - [x] Donner davantage de poids visuel à `PortfolioSummary`, `PortfolioPerformanceChart` et `PortfolioStatsSummary` afin qu'elles servent la lecture rapide de la performance.
  - [x] Retirer le tableau `PortfolioHistoryTimeline` de l'écran principal, puisqu'il duplique l'information du graphique sans apporter de lecture supplémentaire.
  - [x] Déplacer les contrôles d'ajout d'actifs, de capture et de clôture dans des blocs secondaires mieux identifiés, sans supprimer de fonctionnalité.
  - [x] Garder les appels API, les états React et les règles de rafraîchissement tels qu'ils existent.

- [x] Rendre l'historique des décisions beaucoup plus scannable (AC: 2, 4)
  - [x] Revoir le rendu de `DecisionHistory`, `DecisionRow` et des sous-éditeurs d'amendement pour favoriser une lecture immédiate des champs clés.
  - [x] Mettre en avant le sens (`Achat` / `Vente`), le symbole, la quantité, le prix de référence et l'horodatage logique dans un ordre stable.
  - [x] Conserver les badges de statut (`Corrigé`, `Annulé`) et les commentaires, mais les reléguer au second plan visuel.
  - [x] Éviter que les détails d'amendement, les formulaires de correction et les actions secondaires noient la ligne principale.

- [x] Maintenir l'ergonomie des actions de session sans surcharger l'écran (AC: 3, 4)
  - [x] Simplifier la présentation de `SessionAssets` et `DecisionCapture` afin qu'ils restent faciles à utiliser tout en se faisant discrets quand la lecture prime.
  - [x] Conserver les interactions existantes pour créer, reprendre, clôturer et capturer une décision.
  - [x] Vérifier que les inputs et boutons restent utilisables au clavier et lisibles sur des largeurs plus faibles.

- [x] Valider l'absence de régression fonctionnelle et visuelle (AC: 1, 2, 3, 4)
  - [x] Vérifier que les écrans existants continuent de charger les mêmes données et de déclencher les mêmes actions.
  - [x] Exécuter `pnpm typecheck`, `pnpm lint`, `pnpm test` et `pnpm build` après les changements.
  - [x] Faire un smoke test manuel de l'app review en local pour confirmer que la hiérarchie visuelle aide vraiment à lire la performance et l'historique.

## Dev Notes

### Contexte métier

- Cette story ne change pas la logique métier; elle améliore la manière dont les données existantes sont présentées à l'écran.
- Le besoin utilisateur porte sur la lisibilité des performances et sur la lecture rapide de l'historique des actions (achat, vente, date/heure), pas sur une nouvelle règle de calcul.
- Le périmètre correspond à une amélioration UX du front de revue, utile pour les vues déjà présentes dans les epics 2 et 3.
- Aucun document UX dédié n'a été trouvé dans les artefacts du projet; le cadrage doit donc partir du PRD, de l'architecture et de l'UI actuelle.

### État actuel à prendre en compte

- `apps/review/src/app/page.tsx` rend une page très simple: logo, titre, texte d'intro et `SessionPanel`.
- `apps/review/src/app/layout.tsx` utilise encore un shell minimal avec police système, fond sombre uniforme et couleur de texte neutre.
- `apps/review/src/components/SessionPanel.tsx` concentre toute la lecture de session dans une seule colonne: résumé de session, métriques, historique du portefeuille, actifs, capture, historique des décisions et bouton de clôture.
- Le rendu actuel est fonctionnel mais très uniforme visuellement: tous les blocs ont approximativement le même poids, ce qui nuit à la lecture rapide.
- Les lignes d'historique montrent déjà le sens, l'actif, la quantité, le prix et l'horodatage, mais la hiérarchie visuelle reste compacte et peut être améliorée sans changer le modèle de données.
- Le tableau d'historique du portefeuille est présent mais redondant avec le graphique de performance; l'objectif est de le retirer de l'écran principal pour alléger la lecture.

### Décisions de cadrage pour cette story

- La story doit rester strictement côté interface web de revue; aucun changement de schéma, de route API, de repository ou de logique de domaine n'est attendu.
- Il faut conserver les flux de session et de capture existants; la simplification ne doit pas masquer les actions disponibles.
- La direction visuelle doit privilégier la lecture de performance puis l'historique des décisions, avant les actions annexes.
- Les sections secondaires peuvent être visuellement réduites, regroupées ou déplacées plus bas tant que leur fonctionnalité reste intacte.
- Le tableau d'historique du portefeuille doit être retiré de l'écran principal si le graphique remplit déjà ce rôle de lecture.
- L'ergonomie doit rester desktop-first, mais la page ne doit pas casser sur une largeur plus étroite.
- Il ne faut pas introduire de design system externe ou de dépendance lourde juste pour cette story.

### Architecture à respecter

- `apps/review` reste une app Next.js légère, pilotée par les mêmes données API et les mêmes composants existants.
- Les changements doivent rester dans la couche présentation: React, styles, mise en page et éventuels helpers purement visuels.
- Les données de performance et d'historique doivent continuer à venir des mêmes endpoints et à être calculées de la même manière.
- L'interface ne doit pas réimplémenter les calculs métier côté client.
- Le code doit rester compatible avec le style actuel du repo, qui privilégie des composants simples et peu de dépendances.

### Fichiers existants à modifier et état actuel

- `apps/review/src/app/page.tsx`
  - État actuel: page d'accueil très compacte avec logo, titre, texte d'intro et `SessionPanel`.
  - Changement attendu: améliorer le shell, la hiérarchie et le message d'entrée sans alourdir la page.
  - À préserver: affichage simple, point d'entrée direct vers la session.

- `apps/review/src/app/layout.tsx`
  - État actuel: shell global minimal, police système, fond sombre uniforme.
  - Changement attendu: ajuster le cadre global si nécessaire pour soutenir une lecture plus confortable.
  - À préserver: rendu simple, pas de dépendance design supplémentaire.

- `apps/review/src/components/SessionPanel.tsx`
  - État actuel: composant très dense, avec beaucoup de sections alignées dans une seule colonne.
  - Changement attendu: clarifier les niveaux de lecture, les espacements, les regroupements et la présentation de l'historique, tout en supprimant le tableau d'historique du portefeuille de l'écran principal.
  - À préserver: toutes les interactions et tous les flux existants.

### Pièges à éviter

1. Ne pas supprimer ou cacher des informations utiles au motif de simplifier. Le but est de hiérarchiser, pas d'appauvrir.
2. Ne pas modifier les calculs de performance, les données renvoyées par l'API ou la forme des décisions.
3. Ne pas introduire une nouvelle bibliothèque UI ou un système de composants externe sans nécessité.
4. Ne pas transformer cette story en refactor backend: l'effort doit rester purement visuel et ergonomique.
5. Ne pas perdre la lisibilité clavier / accessibilité de base pour les inputs et boutons.
6. Ne pas casser les layouts existants sur des largeurs desktop plus petites.

### Références

- [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 1] - contexte de l'app de session et de capture.
- [Source: `_bmad-output/planning-artifacts/epics.md` > FR19-26] - performance, historique et comparaison que l'UI doit rendre lisibles.
- [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Goals, Functional Requirements, Product Principles, Core User Journey] - lisibilité, usage desktop et réduction de friction.
- [Source: `_bmad-output/planning-artifacts/architecture.md` > Component Boundaries, API Boundaries, Data Boundaries] - interface client simple, API-only, sans logique métier côté UI.
- [Source: `apps/review/src/app/page.tsx`]
- [Source: `apps/review/src/app/layout.tsx`]
- [Source: `apps/review/src/components/SessionPanel.tsx`]

## File List

- `apps/review/src/app/page.tsx` — Improved header layout with better spacing and typography
- `apps/review/src/app/layout.tsx` — Added line-height for improved readability
- `apps/review/src/components/SessionPanel.tsx` — Major refactor:
  - Reorganized ActiveSessionCard layout hierarchy
  - Removed PortfolioHistoryTimeline from main view
  - Improved visual prominence of performance metrics
  - Made DecisionHistory more scannable with better typography
  - Reorganized SessionAssets and DecisionCapture as secondary sections
  - Improved PortfolioSummary, PortfolioPerformanceChart, PortfolioStatsSummary styling
  - Enhanced DecisionRow rendering for better readability
  - Improved ClosedSessionCard layout to match ActiveSessionCard hierarchy

## Dev Agent Record

### Agent Model Used

Claude Haiku 4.5

### Debug Log References

- ✅ TypeCheck: All packages passed without errors
- ✅ Lint: All packages passed without errors
- ✅ Tests: 328/328 passed
- ✅ Build: Production build succeeded (apps/review built with Next.js 16)
- ✅ Server: Dev server responsive and serving updated UI

### Implementation Notes

**Visual Hierarchy Changes:**
1. Session summary section simplified and moved to top
2. Performance metrics (Portfolio Summary, Equity Chart, Statistics) now primary focus
3. Decision History moved before secondary actions
4. SessionAssets and DecisionCapture relocated to secondary block below history
5. PortfolioHistoryTimeline removed entirely (redundant with equity chart)

**DecisionRow Improvements:**
- Changed from flex single-row to grid layout (side, symbol) | (qty, price) | (timestamp, badge)
- Increased padding and vertical spacing for better scanability
- Made "ACHAT"/"VENTE" badges more prominent with uppercase text
- Moved status badges to right side with timestamp
- Improved amendments display with background container

**Color & Spacing:**
- Adjusted section titles from lighter to more prominent color (#7a8087 for secondary headings)
- Better padding and margins between major sections
- More generous whitespace in portfolio summary grid layout

### Completion Notes List

1. ✅ Retrait du tableau d'historique portefeuille (AC 1)
2. ✅ Amélioration de la hiérarchie visuelle avec performance en avant-plan (AC 1, 4)
3. ✅ Historique des décisions plus scannable avec meilleure typographie (AC 2, 4)
4. ✅ Actions de session (ajout actifs, capture) mieux placées et moins envahissantes (AC 3, 4)
5. ✅ Absence de régression: tous les tests passent, build valide
6. ✅ Fonctionnalité existante préservée: aucun changement d'API ou de logique métier

## Change Log

- 2026-06-11: Story créée et marquée `ready-for-dev`
- 2026-06-11: Implémentation complète — refonte de la hiérarchie visuelle, retrait du tableau portefeuille, amélioration de la scannabilité de l'historique
  - TypeCheck: ✓ | Lint: ✓ | Tests: 328/328 ✓ | Build: ✓
- 2026-06-11: Amélioration des timestamps — format compact JJ/MM/YY HH:MM appliqué partout
  - Historique des décisions: `11/06/26 14:32` au lieu de timestamp ISO complet
  - "Ouverte le" et "Cloturee le": même format standardisé avec année
  - Tests: 328/328 ✓
- 2026-06-11: Ajout de tooltips explicatifs pour les statistiques
  - Win rate: "Pourcentage de trades profitables (gagnants / total)"
  - Drawdown max: "Perte maximale du portefeuille depuis son sommet"
  - Duree moy: "Temps moyen entre ouverture et fermeture d'une position"
  - Cursor change en "help" pour indiquer la présence de tooltip
  - Tests: 328/328 ✓
