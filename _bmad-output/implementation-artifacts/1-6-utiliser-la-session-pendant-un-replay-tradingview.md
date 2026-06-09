---
story_id: "1.6"
story_key: "1-6-utiliser-la-session-pendant-un-replay-tradingview"
epic: "1"
status: "review"
baseline_commit: "1cfd572"
created: "2026-06-09"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 1.6: Utiliser la session pendant un replay TradingView

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,
I want utiliser la session pendant un replay TradingView sans intégration automatique obligatoire,
so that je puisse rester concentré sur la pratique sans dépendre d'une intégration lourde.

## Acceptance Criteria

1. **Capture possible sans synchronisation automatique**
   - Given une session ouverte
   - When l'utilisateur utilise la popup d'extension pendant un replay TradingView
   - Then le flux de capture reste possible sans synchronisation automatique obligatoire
   - And l'utilisateur peut saisir manuellement un horodatage logique (heure du graphique TradingView) au moment de capturer une décision
   - And si le champ horodatage logique est laissé vide, le domaine utilise l'heure courante comme fallback (comportement déjà implémenté dans le domaine)

2. **Session exploitable sans données TradingView automatiques**
   - Given une session ouverte
   - When TradingView n'envoie aucune donnée automatique (extension ne détecte rien ou n'est pas sur tradingview.com)
   - Then la session reste exploitable : capture buy/sell, affichage des actifs, historique des décisions
   - And aucun état d'erreur ni dépendance bloquante sur TradingView

3. **Détection optionnelle du contexte TradingView**
   - Given l'utilisateur est sur tradingview.com avec un replay actif
   - When le content script lit le timestamp du graphique depuis la page
   - Then la popup affiche le timestamp auto-détecté comme valeur pré-remplie dans le champ horodatage logique
   - And l'utilisateur peut le modifier ou l'effacer avant de capturer
   - Given TradingView change de DOM ou que la détection échoue
   - When la popup ne reçoit pas de timestamp de la page
   - Then la popup fonctionne normalement sans pré-remplissage, sans message d'erreur

## Tasks / Subtasks

- [x] Ajouter le champ `logicalTimestamp` dans la popup de capture (AC: 1, 2)
  - [x] Dans `apps/extension/src/popup/index.tsx`, ajouter un champ texte optionnel pour `logicalTimestamp` au format ISO 8601 (ex: `2025-01-15T09:30:00Z`)
  - [x] Valider côté popup : si non vide, le format doit être ISO 8601 (utiliser le même regex que `isoDateTime` de `packages/shared`)
  - [x] Si le champ est vide ou invalide, ne pas l'inclure dans le payload POST — le domaine utilise l'heure courante comme fallback
  - [x] Si le champ est valide, l'inclure dans le payload `CaptureDecisionRequest` sous la clé `logicalTimestamp`
  - [x] Afficher l'horodatage de chaque décision dans la liste "Décisions récentes" pour que l'utilisateur puisse vérifier l'alignement replay

- [x] Créer le content script optionnel pour TradingView (AC: 3)
  - [x] Créer `apps/extension/src/contents/tradingview.ts` en tant que content script Plasmo
  - [x] Le script ne doit s'activer que sur les pages `https://*.tradingview.com/*`
  - [x] Tenter de lire le timestamp courant du graphique depuis le DOM TradingView (sélecteur à cibler : la barre d'état inférieure ou le label de date/heure de la barre courante)
  - [x] Envoyer le timestamp détecté à la popup via `chrome.runtime.sendMessage` au format `{ type: "TV_TIMESTAMP", isoTimestamp: string | null }`
  - [x] Gérer silencieusement tout échec de lecture DOM sans console.error ni throw — retourner `null` si non détecté
  - [x] La popup doit écouter ces messages et pré-remplir le champ `logicalTimestamp` si le message arrive et que le champ est vide

- [x] Mettre à jour le manifest de l'extension (AC: 3)
  - [x] Dans `apps/extension/package.json`, ajouter `"https://*.tradingview.com/*"` aux `host_permissions` pour autoriser le content script
  - [x] Vérifier que `plasmo build` reconstruit le manifest correctement

- [x] Valider la tranche verticale
  - [x] Exécuter `pnpm typecheck` (5 projets)
  - [x] Exécuter `pnpm lint`
  - [x] Exécuter `pnpm test` — les 214 tests existants restent verts (aucun test à modifier pour cette story)
  - [x] Exécuter `pnpm build`
  - [x] Vérifier que la popup build est correcte avec `pnpm --filter @training-trade/extension build`
  - [x] Vérifier manuellement que la popup fonctionne sans TradingView (ouvrir la popup sans être sur tradingview.com)
  - [x] Mettre à jour le `Dev Agent Record` et la `File List`

## Dev Notes

### Contexte métier

- Cette story couvre FR5 : la session doit pouvoir être utilisée pendant un replay TradingView sans intégration automatique obligatoire en V1. [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 1 > Story 1.6]
- L'architecture précise que `apps/extension/src/content` gère l'injection sur la page TradingView uniquement, et que `apps/extension/src/popup` gère la capture rapide et les actions de session. [Source: `_bmad-output/planning-artifacts/architecture.md` > Component Boundaries]
- L'extension ne doit JAMAIS accéder directement à `packages/db`. Elle reste API-only via `apps/review/app/api/*`. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- L'intégration TradingView est intentionnellement limitée à l'expérience de saisie, sans dépendance produit forte. [Source: `_bmad-output/planning-artifacts/architecture.md` > Cross-Cutting Concerns]

### Champ `logicalTimestamp` — état actuel et attendu

**État actuel de la popup** (`apps/extension/src/popup/index.tsx`) :
- Capture : `assetId`, `side`, `quantity`, `referencePrice`
- `logicalTimestamp` n'est pas dans le formulaire ni dans le payload POST
- Le domaine génère un timestamp courant par défaut quand `logicalTimestamp` est absent (comportement existant, ne pas modifier)

**Ce que cette story doit ajouter** :
- Un champ texte optionnel pour `logicalTimestamp` dans le formulaire de capture
- Si vide → ne pas l'inclure dans le payload (comportement actuel préservé)
- Si rempli avec un ISO 8601 valide → l'inclure dans `CaptureDecisionRequest`
- Le schéma `captureDecisionRequestSchema` de `packages/shared` supporte déjà `logicalTimestamp: isoDateTime.optional()` — aucune modification du shared n'est nécessaire

**Format attendu par l'API** : ISO 8601 strict, ex. `2025-01-15T09:30:00Z` ou `2025-01-15T09:30:00.000Z`. Le même regex `isoDateTime` défini dans `packages/shared/src/schemas/decision.ts` doit être réutilisé ou copié localement dans la popup pour la validation.

### Content script TradingView — approche technique

**Fichier à créer** : `apps/extension/src/content/tradingview.ts`

Plasmo charge automatiquement les fichiers dans `src/content/` comme content scripts. Le naming convention Plasmo pour cibler un domaine spécifique est de nommer le fichier après le domaine ou de déclarer les `matches` dans le fichier. Pour TradingView, utiliser l'export de config Plasmo :

```ts
// apps/extension/src/content/tradingview.ts
export const config: PlasmoCSConfig = {
  matches: ["https://*.tradingview.com/*"],
}
```

**Stratégie de lecture du timestamp** :
- TradingView expose l'heure de la barre courante dans la barre d'état inférieure du graphique
- Les sélecteurs DOM peuvent changer — implémenter avec `try/catch` autour de tout accès DOM
- Si la lecture échoue, envoyer `{ type: "TV_TIMESTAMP", isoTimestamp: null }`
- Ne pas bloquer sur l'absence de DOM ; observer avec un `MutationObserver` léger si nécessaire, mais garder simple pour la V1

**Communication content → popup** :
- `chrome.runtime.sendMessage({ type: "TV_TIMESTAMP", isoTimestamp: "..." })`
- La popup écoute via `chrome.runtime.onMessage.addListener`
- Stocker le timestamp reçu dans l'état local de la popup : `const [autoTimestamp, setAutoTimestamp] = useState<string | null>(null)`
- Pré-remplir `logicalTimestamp` si le champ est vide et si `autoTimestamp` est non null

**Permissions requises** dans `apps/extension/package.json` :
```json
"manifest": {
  "name": "Training Trade",
  "host_permissions": ["https://*.tradingview.com/*"]
}
```

### Fichiers existants à modifier et état actuel

- `apps/extension/src/popup/index.tsx`
  - État actuel : popup React, 239 lignes, captura buy/sell, affiche session/actifs/décisions, API-only
  - Changement attendu : ajouter état `logicalTimestamp` (string), champ input texte dans le formulaire, validation ISO 8601, inclusion conditionnelle dans le payload POST, écoute des messages content script, affichage de l'heure dans la liste des décisions récentes
  - À préserver : logique existante de chargement session/actifs/décisions, validation `amountsValid`, `canCapture`, gestion `cancelled` dans les useEffect, `API_BASE` env var, absence totale d'accès à `packages/db`

- `apps/extension/package.json`
  - État actuel : `"host_permissions": []`
  - Changement attendu : ajouter `"https://*.tradingview.com/*"` si le content script est implémenté
  - À préserver : dépendances `plasmo`, `react`, `@training-trade/shared`

### Pièges à éviter

1. **Ne pas réimplémenter `isoDateTime`** : copier le regex depuis `packages/shared/src/schemas/decision.ts` directement dans la popup, ou importer `isoDateTime` depuis `@training-trade/shared`. Ne pas inventer un nouveau format ou une nouvelle validation.

2. **Ne pas envoyer `logicalTimestamp` avec une chaîne vide** : l'API refusera un payload avec `logicalTimestamp: ""`. Soit ne pas inclure la clé (si vide), soit l'omettre. Le schéma Zod côté API attend `isoDateTime.optional()` — une chaîne vide n'est pas valide.

3. **Ne pas rendre le content script bloquant** : tout l'accès DOM TradingView doit être encapsulé dans `try/catch`. TradingView peut changer son DOM sans préavis. Si la détection échoue, la popup fonctionne sans ce champ.

4. **Ne pas modifier `packages/shared`, `packages/domain`, `packages/db`** : cette story est entièrement contenue dans `apps/extension`. Le domaine supporte déjà `logicalTimestamp` optionnel.

5. **Ordre stable des décisions dans la popup** : la liste de décisions récentes est déjà triée côté API par `logicalTimestamp`/`createdAt`. La popup ne doit pas retrier côté client — afficher dans l'ordre renvoyé par `GET /decisions`.

6. **`chrome.runtime.sendMessage` uniquement côté content script** : la popup ne doit pas envoyer de messages au content script en V1 (relation unidirectionnelle : content → popup).

### Architecture à respecter

- `apps/extension/src/content` : injection page TradingView uniquement, jamais de logique métier. [Source: `_bmad-output/planning-artifacts/architecture.md` > Component Boundaries]
- `apps/extension` ne touche jamais `packages/db`. [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries]
- `packages/shared` porte les schémas partagés. La popup peut importer `@training-trade/shared` pour réutiliser `isoDateTime`. [Source: `_bmad-output/planning-artifacts/architecture.md` > Data Boundaries]
- L'intégration TradingView reste optionnelle et non bloquante. [Source: `_bmad-output/planning-artifacts/epics.md` > Story 1.6 AC]

### Intelligence de la story précédente (1.5)

- La story 1.5 a ajouté le modèle append-only d'amendements, les badges Corrigé/Annulé dans `SessionPanel.tsx` et le champ `revisionStatus` dans le DTO de décision.
- La popup liste déjà les décisions récentes via `GET /api/sessions/[id]/decisions`. Avec la 1.5, cette route retourne désormais `revisionStatus` et `comment` sur chaque décision. La popup peut afficher un badge simple si `revisionStatus !== "original"` dans la liste récente (amélioration UX, non bloquant pour cette story).
- Risque d'ordre identifié en review 1.4 et corrigé en 1.5 : les timestamps sont triés avec `Date.parse`, pas `localeCompare`. La popup ne doit pas retrier côté client.
- Le contrat `CaptureDecisionRequest` de la 1.4 reste stable ; la 1.5 n'y a pas touché.

### Contrat API utilisé par la popup

`POST /api/sessions/[id]/decisions` — payload étendu avec le champ optionnel :

```json
{
  "assetId": "uuid",
  "side": "buy",
  "quantity": "10",
  "referencePrice": "123.45",
  "logicalTimestamp": "2025-01-15T09:30:00.000Z"
}
```

Le champ `logicalTimestamp` est **optionnel** — l'omettre est valide (comportement existant, le domaine utilise l'instant courant).

`GET /api/sessions/[id]/decisions` — retourne les décisions avec `logicalTimestamp` :

```json
{
  "data": {
    "decisions": [
      {
        "id": "uuid",
        "side": "buy",
        "quantity": "10",
        "referencePrice": "123.45",
        "logicalTimestamp": "2025-01-15T09:30:00.000Z",
        "createdAt": "2026-06-09T...",
        "comment": null,
        "revisionStatus": "original"
      }
    ]
  },
  "error": null,
  "meta": {}
}
```

### Project Structure Notes

- Seul `apps/extension` est touché par cette story.
- Plasmo détecte automatiquement `src/content/*.ts` et les traite comme des content scripts ; pas de configuration supplémentaire nécessaire sauf l'export `config` avec les `matches`.
- Si le content script s'avère trop complexe ou instable, il peut être livré vide (stub) ou omis : la story est complète dès que le champ `logicalTimestamp` est dans la popup (AC 1 et 2 couverts) et que le build passe.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 1 > Story 1.6]
- [Source: `_bmad-output/planning-artifacts/architecture.md` > Component Boundaries, API Boundaries]
- [Source: `apps/extension/src/popup/index.tsx`] — fichier principal à modifier
- [Source: `packages/shared/src/schemas/decision.ts`] — `isoDateTime`, `captureDecisionRequestSchema`
- [Source: `_bmad-output/implementation-artifacts/1-5-ajouter-un-commentaire-et-corriger-une-decision.md`] — File List et patterns établis

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Correction répertoire content script : Plasmo exige `src/contents/` (pluriel) et non `src/content/` (singulier). Premier build sans le script, corrigé après inspection du manifest généré.
- Erreur TS2532 `match[1]` possiblement undefined : ajout du guard `if (!rawStr) continue` après le guard `if (!match) continue`.
- Correction post-review : la popup affichait `Application de revue injoignable.` car le manifest source ne déclarait pas les permissions hôte locales nécessaires aux appels API depuis l extension MV3. Ajout de `http://localhost/*` et `http://127.0.0.1/*` dans `apps/extension/package.json`, en conservant TradingView.
- Correction CORS post-review : l app review ne renvoyait pas `Access-Control-Allow-Origin` aux appels venant de `chrome-extension://...`. Ajout d un proxy API Next et d un helper CORS partagé pour autoriser les origines extension Chrome et locales, y compris les prévols `OPTIONS`.

### Completion Notes List

- Champ `logicalTimestamp` (optionnel, ISO 8601) ajouté dans la popup. Validation via `isoDateTime.safeParse()` importé de `@training-trade/shared` — aucune duplication du regex.
- Capture bloquée si le champ contient une valeur invalide (`canCapture` inclut `logicalTimestampValid`). Si vide, le domaine génère le timestamp (comportement existant préservé).
- Chaque décision dans "Décisions récentes" affiche désormais son `logicalTimestamp` formaté (YYYY-MM-DD HH:MM:SS UTC).
- Content script `src/contents/tradingview.ts` créé : s'active sur `https://*.tradingview.com/*`, lit le timestamp DOM (barre d'état inférieure), envoie `{ type: "TV_TIMESTAMP", isoTimestamp }` toutes les 2 s. Tout accès DOM est protégé par try/catch — aucun console.error, aucun throw.
- Popup écoute via `chrome.runtime.onMessage` et pré-remplit le champ uniquement s'il est vide.
- `host_permissions` mis à jour dans `apps/extension/package.json`. Le manifest généré contient bien `content_scripts` et `host_permissions`.
- Correction manifest locale : la popup peut maintenant joindre l app de revue locale via `http://localhost/*` ou `http://127.0.0.1/*`; le manifest généré `chrome-mv3-prod` contient ces permissions.
- Correction CORS API : `apps/review/src/proxy.ts` ajoute les headers CORS sur `/api/*` et répond aux prévols `OPTIONS`; `apps/review/src/server/cors.ts` centralise les origines autorisées.
- 5 projets typecheck OK — lint OK — 218 tests OK — build workspace OK — build extension OK.

### File List

**Créés**
- apps/extension/src/contents/tradingview.ts
- apps/review/__tests__/cors.test.ts
- apps/review/src/proxy.ts
- apps/review/src/server/cors.ts

**Modifiés**
- apps/extension/src/popup/index.tsx
- apps/extension/package.json
- apps/review/src/server/http.ts
