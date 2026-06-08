---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
inputDocuments:
  - /home/thomas/perso/git/training-trade/_bmad-output/planning-artifacts/briefs/brief-training-trade-2026-06-08/brief.md
  - /home/thomas/perso/git/training-trade/_bmad-output/planning-artifacts/briefs/brief-training-trade-2026-06-08/addendum.md
  - /home/thomas/perso/git/training-trade/_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md
  - /home/thomas/perso/git/training-trade/_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/addendum.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-06-08'
project_name: training-trade
user_name: Thomas
date: '2026-06-08'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Le PRD contient 26 exigences fonctionnelles, réparties en 5 blocs:

- Session Management: 5 FRs
- Decision Capture: 6 FRs
- Portfolio Simulation: 7 FRs
- Performance Tracking: 5 FRs
- Review and Analysis: 3 FRs

Architecturalement, cela décrit une application orientée session avec un noyau métier centré sur l'enregistrement d'événements de trading, la simulation d'un portefeuille virtuel multi-actifs, puis l'agrégation d'indicateurs de performance.

Les implications principales sont:
- un modèle de données événementiel ou semi-événementiel pour les décisions,
- un état de portefeuille dérivé et cohérent dans le temps,
- une notion de session comme unité de travail et de lecture,
- des vues de synthèse pour equity curve, stats, historique et comparaison,
- une gestion explicite des corrections et annulations pour garder l'auditabilité.

**Non-Functional Requirements:**
Le PRD ne formule pas de NFR formels, mais plusieurs contraintes implicites sont fortes:

- Usage personnel, probablement un seul utilisateur principal.
- Usage surtout desktop.
- Saisie rapide pendant une session de replay.
- Lisibilité et cohérence du portefeuille prioritaires.
- Traçabilité des corrections si elles affectent les statistiques.
- Simplicité de V1 avant enrichissement.
- Pas de trading réel, pas de broker, pas d'automatisation d'ordres.
- Pas d'intégration automatique TradingView requise en V1.

**Scale & Complexity:**
Le produit est de complexité faible à moyenne, avec un coeur métier modéré mais peu de complexité organisationnelle.

- Primary domain: application web full-stack orientée outil personnel
- Complexity level: medium
- Estimated architectural components: 5 à 7 composants principaux

Les composants probables à prévoir seront:
- session management,
- decision capture,
- portfolio engine,
- performance/statistics engine,
- persistence layer,
- UI de consultation,
- éventuellement une couche d'intégration ou d'assistance autour de TradingView.

### Technical Constraints & Dependencies

Contraintes et dépendances connues à ce stade:

- Notion reste hors périmètre produit et sert uniquement de journal narratif externe.
- Le produit doit fonctionner sans dépendance obligatoire à un broker.
- La V1 doit accepter des saisies manuelles pendant le replay de marché.
- Le support multi-actifs est requis dès la V1.
- La devise de référence doit rester unique en V1.
- Les décisions doivent rester auditables si elles changent les métriques.
- La mécanique de calcul doit rester simple au départ.

Point important pour la suite:
- TradingView est mentionné comme contexte d'usage, mais le PRD n'exige pas d'intégration automatique en V1.
- La direction validée pour l'architecture est une combinaison:
  - extension navigateur TradingView pour rester collé au chart pendant le replay,
  - backend compagnon pour la persistance, les sessions, le portefeuille et les stats,
  - web app de revue pour relire les sessions hors replay.

### Cross-Cutting Concerns Identified

- Cohérence du modèle de portefeuille et des calculs de performance.
- Auditabilité des corrections, suppressions et révisions de décisions.
- Lisibilité des données historiques par session.
- Gestion du multi-actifs dès la V1.
- Séparation nette entre journal narratif et mécanique de simulation.
- Simplicité d'usage pendant une session de replay.
- Intégration TradingView limitée à l'expérience de saisie, sans dépendance produit forte.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web + browser extension based on the project requirements analysis.

### Starter Options Considered

**Plasmo**
- Best fit for the browser extension part of the product.
- Strong support for TypeScript, React, live reload, HMR, storage and messaging.
- Well suited for content scripts, popup UI and page injection.
- Official create flow: `pnpm create plasmo`

**Next.js**
- Best fit for the review UI and backend-for-frontend layer.
- Supports TypeScript, App Router, ESLint and route handlers.
- Good for exposing lightweight HTTP endpoints for sessions and analytics.
- Official create flow: `npx create-next-app@latest [project-name] [options]`

**Vite**
- Good frontend starter, but weaker fit for a browser-extension-first workflow.
- Better suited as a generic UI tool than as the foundation of this product.
- Official create flow: `npm create vite@latest`

### Selected Starter: Plasmo + Next.js

**Rationale for Selection:**
The product must stay close to the TradingView chart during replay, so the extension experience is the primary concern. Plasmo directly supports that workflow, while Next.js gives a clean and familiar place for session review and backend-for-frontend endpoints.

**Initialization Command:**

```bash
pnpm create plasmo tradingview-extension
npx create-next-app@latest trading-sim-review --ts --tailwind --eslint --app --api
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript across the stack.
- React for extension and web UI.
- Node.js for the web app and API layer.

**Styling Solution:**
- Tailwind in Next.js.
- Component-based UI injection in Plasmo.
- Good fit for compact, chart-adjacent workflows.

**Build Tooling:**
- Plasmo provides bundling, live reload, extension runtime conventions and browser-targeted packaging.
- Next.js provides App Router, route handlers and production web builds.

**Testing Framework:**
- Not enforced by the starters.
- Needs to be defined separately for the portfolio engine and session workflows.

**Code Organization:**
- Plasmo establishes extension entry points like popup, content scripts and background.
- Next.js establishes `app/` and route handlers for review and API endpoints.

**Development Experience:**
- Plasmo gives the right extension DX for content injection and rapid iteration.
- Next.js gives a standard web DX for review screens and API routes.

**Note:** Project initialization using this combination should be the first implementation story.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
training-trade/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── .gitignore
├── .env.example
├── apps/
│   ├── extension/
│   │   ├── package.json
│   │   ├── plasmo.config.ts
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── background/
│   │   │   ├── content/
│   │   │   ├── popup/
│   │   │   ├── options/
│   │   │   ├── ui/
│   │   │   └── shared/
│   │   └── assets/
│   └── review/
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── sessions/
│       │   ├── portfolio/
│       │   └── api/
│       ├── components/
│       ├── lib/
│       │   ├── server/
│       │   └── client/
│       └── styles/
├── packages/
│   ├── domain/
│   │   ├── package.json
│   │   └── src/
│   │       ├── sessions/
│   │       ├── decisions/
│   │       ├── portfolio/
│   │       ├── stats/
│   │       └── index.ts
│   ├── db/
│   │   ├── package.json
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── schema/
│   │       ├── client.ts
│   │       ├── migrations.ts
│   │       └── index.ts
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── schemas/
│           ├── types/
│           ├── constants/
│           └── index.ts
└── docs/
    ├── architecture/
    └── decisions/
```

### Architectural Boundaries

**API Boundaries:**
- `apps/review/app/api/*` exposes REST endpoints consumed by the extension and the review UI.
- No component in `apps/extension` talks to `packages/db` directly.
- API route handlers orchestrate validation and delegate to `packages/domain` and `packages/db`.
- Public endpoints return `{ data, error, meta }` with structured errors.

**Component Boundaries:**
- `apps/extension/src/content` handles TradingView page injection only.
- `apps/extension/src/popup` handles quick capture and session actions.
- `apps/review/app` handles review dashboards and historical exploration.
- Shared UI is intentionally minimal; shared contracts live in `packages/shared`, not shared React components.

**Service Boundaries:**
- `packages/domain` contains business rules for sessions, decisions, portfolio math, and stats.
- `packages/db` contains Drizzle schema, SQLite client setup, migrations, and data access.
- `apps/review/lib/server` contains API orchestration and service composition.
- `packages/shared` contains Zod schemas, DTO types, constants, and shared enums.

**Data Boundaries:**
- SQLite is the source of truth for persistent simulation data.
- `packages/db/src/schema` owns the SQL schema in `snake_case`.
- `packages/domain` never imports UI code or framework-specific APIs.
- `packages/shared` owns validation schemas shared across extension and review.
- All timestamps use ISO 8601 at the API boundary.

### Requirements to Structure Mapping

**Session Management**
- Components: `packages/domain/src/sessions/`
- API Routes: `apps/review/app/api/sessions/`
- UI: `apps/extension/src/popup/`, `apps/review/app/sessions/`
- Tests: co-located in `packages/domain/src/sessions/*.test.ts`

**Decision Capture**
- Components: `packages/domain/src/decisions/`
- API Routes: `apps/review/app/api/decisions/`
- UI: `apps/extension/src/content/`, `apps/extension/src/popup/`
- Tests: co-located in `packages/domain/src/decisions/*.test.ts`

**Portfolio Simulation**
- Components: `packages/domain/src/portfolio/`
- DB Schema: `packages/db/src/schema/`
- API Routes: `apps/review/app/api/portfolio/`
- Tests: co-located in `packages/domain/src/portfolio/*.test.ts`

**Performance Tracking**
- Components: `packages/domain/src/stats/`
- API Routes: `apps/review/app/api/stats/`
- UI: `apps/review/app/portfolio/`, `apps/review/app/sessions/`
- Tests: co-located in `packages/domain/src/stats/*.test.ts`

**Review and Analysis**
- UI: `apps/review/app/sessions/`, `apps/review/app/portfolio/`
- API Routes: `apps/review/app/api/*`
- Shared contracts: `packages/shared/src/schemas/`
- Tests: `apps/review/**/*.test.ts`

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
Les choix s'emboîtent correctement: Plasmo gère l'expérience TradingView, Next.js gère la revue et les route handlers, SQLite garde la V1 légère, Drizzle structure l'accès aux données, et `packages/domain` concentre la logique métier. Il n'y a pas de contradiction entre l'usage personnel, l'absence d'auth V1 et le besoin d'auditabilité des décisions.

**Pattern Consistency:**
Les patterns sont alignés avec la stack: `snake_case` en base, `camelCase` aux API, JSON enveloppé, erreurs structurées, Zod pour la validation, schémas stricts par cas d'usage. Cela réduit les divergences possibles entre agents.

**Structure Alignment:**
La structure monorepo supporte bien les frontières choisies. L'extension reste indépendante de la DB, l'app de revue orchestre les appels API, `packages/domain` porte le métier, `packages/db` porte la persistance, et `packages/shared` porte les contrats.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
Le projet n'a pas d'épics formels, mais les 5 catégories de FR sont bien couvertes par les modules prévus: sessions, décisions, portefeuille, stats, revue.

**Functional Requirements Coverage:**
Les 26 FR du PRD sont supportés: création et gestion de sessions, saisie buy/sell, simulation multi-actifs, suivi du capital, courbe d'équité, statistiques de base, consultation et comparaison des sessions.

**Non-Functional Requirements Coverage:**
Les contraintes implicites sont prises en compte: usage desktop, saisie rapide, traçabilité, simplicité V1, pas de trading réel, pas de broker, pas d'automatisation, pas d'intégration automatique TradingView en V1.

### Implementation Readiness Validation ✅

**Decision Completeness:**
Les décisions critiques sont documentées: starter, stack, persistance, ORM, migrations, auth, API, validation, conventions de nommage, organisation monorepo et frontières de modules.

**Structure Completeness:**
Le tree est assez précis pour démarrer l'implémentation sans ambiguïté majeure. Les apps, packages et points d'intégration sont identifiés.

**Pattern Completeness:**
Les principaux points de conflit sont adressés: nommage base/API/code, structure projet, format de réponse, erreurs, validation, limites de responsabilité.

### Gap Analysis Results

**Important Gaps:**
- Le schéma détaillé des tables SQLite n'est pas encore défini.
- Les endpoints exacts de l'API n'ont pas encore été listés un par un.
- La stratégie de tests n'est pas encore finalisée au niveau outil/framework.
- La stratégie de déploiement et d'environnement n'est pas encore détaillée.

**Nice-to-Have Gaps:**
- Une convention explicite pour l'export des packages pourrait être ajoutée si plusieurs agents travaillent en parallèle.
- Une note de workflow dev local / build / release serait utile avant l'implémentation.

### Validation Issues Addressed

Les principaux risques identifiés ont été traités pendant la conception:
- l'intégration TradingView n'a pas été surdimensionnée;
- l'extension reste une interface de capture, pas le cœur métier;
- la base locale SQLite évite d'ajouter trop tôt de l'infrastructure;
- les frontières entre UI, métier et persistance sont explicites.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Starter template selected and justified
- [x] Data architecture decided
- [x] Authentication and security decided
- [x] API and communication patterns decided
- [x] Naming and format patterns defined

**Project Structure**

- [x] Complete project tree defined
- [x] Component boundaries specified
- [x] Integration boundaries defined
- [x] Requirements mapped to structure

**Implementation Readiness**

- [x] Critical gaps identified
- [x] Patterns sufficiently detailed for consistent implementation
- [x] Architecture ready for handoff to implementation
- [x] Validation complete

**Overall Status:** READY FOR IMPLEMENTATION
