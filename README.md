# training-trade

Outil **personnel** de simulation et de mesure de trading (replay). V1 locale, sans
broker, sans trading réel, sans automatisation d'ordres.

## Source de vérité (V1)

**SQLite est la source de vérité locale en V1.** La base est gérée par
`packages/db` (Drizzle + `better-sqlite3`). Le chemin est configurable via la
variable d'environnement `DATABASE_URL` (défaut de développement :
`.data/training-trade.sqlite`).

L'extension (`apps/extension`) ne doit **jamais** accéder directement à
`packages/db` : toute persistance passe par les route handlers Next.js de
`apps/review`.

## Structure du monorepo

| Espace de travail   | Rôle                                                        |
| ------------------- | ----------------------------------------------------------- |
| `apps/review`       | App Next.js (App Router) + backend-for-frontend (API).      |
| `apps/extension`    | Extension navigateur Plasmo (point d'entrée léger).         |
| `packages/domain`   | Règles métier (sessions…), pures et testables.              |
| `packages/db`       | Schéma Drizzle, client SQLite, repository.                  |
| `packages/shared`   | Schémas Zod, DTO, enveloppe API `{ data, error, meta }`.    |

## Scripts racine

```bash
pnpm install      # installer les dépendances du workspace
pnpm test         # exécuter la suite Vitest (domaine + db + API)
pnpm typecheck    # vérification de types par package
pnpm lint         # idem (qualité)
pnpm build        # build de chaque package/app
```

> pnpm est fourni via corepack. Sur Node 20, activez une version compatible :
> `corepack enable --install-directory ~/.local/bin pnpm` puis ajoutez
> `~/.local/bin` au `PATH`.

## API V1 (story 1.1)

- `POST /api/sessions` — crée et ouvre immédiatement une session (`201`).
  Conflit structuré `409 ACTIVE_SESSION_EXISTS` si une session active existe.
- `GET /api/sessions/active` — retourne le contexte minimal de la session active
  (`{ session: null }` si aucune).

Toutes les réponses suivent l'enveloppe `{ data, error, meta }` avec des
timestamps ISO 8601.
