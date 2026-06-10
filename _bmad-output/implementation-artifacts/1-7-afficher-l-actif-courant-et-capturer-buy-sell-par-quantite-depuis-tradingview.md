---
story_id: "1.7"
story_key: "1-7-afficher-l-actif-courant-et-capturer-buy-sell-par-quantite-depuis-tradingview"
epic: "1"
status: "review"
baseline_commit: "aa677ea"
created: "2026-06-10T10:39:52+02:00"
source_epics: "_bmad-output/planning-artifacts/epics.md"
source_architecture: "_bmad-output/planning-artifacts/architecture.md"
source_prd: "_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md"
---

# Story 1.7: Afficher l'actif courant et capturer buy/sell par quantite depuis TradingView

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a trader amateur,  
I want que l'extension affiche automatiquement l'actif courant de TradingView et me laisse seulement saisir la quantite avant de cliquer sur acheter ou vendre,  
so that je puisse enregistrer une decision sans ajouter manuellement l'actif dans la session.

## Acceptance Criteria

1. **Affichage clair de l'actif courant**
   - Given une session ouverte dans l'extension et un graphique TradingView actif
   - When la popup s'ouvre
   - Then l'extension affiche l'actif courant detecte depuis TradingView de facon visible dans la capture
   - And le prix courant / de reference detecte est affiche comme contexte de la saisie
   - And l'utilisateur comprend immédiatement sur quel instrument il agit sans ouvrir la liste des actifs

2. **Capture rapide avec seulement la quantite et les boutons buy/sell**
   - Given l'actif courant est detecte correctement
   - When l'utilisateur veut enregistrer une decision
   - Then le chemin normal de capture ne demande que la quantite desiree
   - And l'utilisateur peut cliquer directement sur `Acheter` ou `Vendre`
   - And il n'a pas a choisir manuellement un actif dans la popup tant que la detection TradingView fonctionne

3. **Auto-liaison de l'actif courant a la session**
   - Given l'actif courant n'est pas encore lie a la session active
   - When la popup prepare la capture
   - Then l'extension lie automatiquement cet actif a la session via l'API review existante
   - And si l'actif est deja lie, l'entree existante est reutilisee sans duplication
   - And la capture peut continuer sans passage manuel par l'app de revue

4. **Comportement degrade si TradingView ne fournit pas assez de contexte**
   - Given la popup est ouverte hors TradingView, ou le DOM de TradingView a change, ou le prix / symbole ne peut pas etre lu de facon fiable
   - When l'extension ne peut pas determiner l'actif courant
   - Then la popup reste utilisable sans etat bloquant
   - And elle n'invente pas un actif incorrect a partir d'une lecture partielle
   - And un fallback manuel reste possible si necessaire

## Tasks / Subtasks

- [x] Etendre le content script TradingView pour remonter le symbole et le prix en plus du contexte deja detecte (AC: 1, 3, 4)
  - [x] Faire evoluer `apps/extension/src/contents/tradingview.ts` pour extraire l'actif courant et le prix visible / courant du graphique.
  - [x] Garder la detection de timestamp deja en place si elle aide au contexte de capture.
  - [x] Encapsuler tout acces DOM dans des gardes `try/catch` et renvoyer `null` en cas d'echec silencieux.
  - [x] Ne jamais bloquer le flux si TradingView change de DOM.

- [x] Restructurer la popup pour afficher l'actif courant et simplifier la saisie (AC: 1, 2, 3, 4)
  - [x] Faire afficher l'actif detecte dans la zone principale de capture de `apps/extension/src/popup/index.tsx`.
  - [x] Retirer du chemin normal le selecteur manuel d'actif: dans le cas nominal, l'utilisateur ne saisit plus que la quantite.
  - [x] Conserver uniquement les actions `Acheter` et `Vendre` comme commandes principales.
  - [x] Afficher le prix detecte comme contexte lisible de la capture, sans alourdir l'interface.
  - [x] Garder un fallback manuel si aucun contexte TradingView ne peut etre determine.

- [x] Brancher l'auto-liaison sur l'API review existante (AC: 3)
  - [x] S'appuyer sur `GET /api/sessions/[id]/assets` pour reconnaitre un actif deja lie.
  - [x] S'appuyer sur `POST /api/sessions/[id]/assets` pour lier automatiquement l'actif courant quand il manque.
  - [x] Preserver le comportement idempotent du lien session-actif pour eviter les doublons.
  - [x] Ne jamais acceder a `packages/db` depuis l'extension.

- [x] Couvrir la story par des tests et une validation ciblee (AC: 1, 2, 3, 4)
  - [x] Ajouter ou etendre des tests sur la detection TradingView si la logique est extraite dans un helper testable.
  - [x] Ajouter des tests review sur le chemin d'auto-liaison d'actif pour confirmer qu'un actif detecte peut etre rattache avant capture.
  - [x] Verifier que la popup reste utilisable quand TradingView est absent ou non lisible.
  - [x] Executer la validation de build/typecheck/lint sur la tranche concernee.

## Dev Notes

### Contexte metier

- Cette story couvre principalement FR4 et renforce FR5, FR6, FR8 et FR9: l'actif suit l'exercice sans saisie manuelle repetitive, la session reste utilisable pendant TradingView, et la capture continue de reposer sur un actif lie a la session. [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 1 / Story 1.3, Story 1.4, Story 1.6]
- L'objectif UX est simple: ouvrir l'extension pendant le replay, voir l'actif courant, saisir la quantite, puis cliquer `Acheter` ou `Vendre`.
- La detection TradingView reste une aide UX, pas une source de verite metier. La source de verite reste l'API review et la persistence SQLite derriere elle.
- Le systeme doit rester coherent si TradingView ne fournit rien ou si le DOM change. La V1 doit privilegier un fallback propre plutot qu'une automation fragile.

### Etat actuel a prendre en compte

- `apps/extension/src/popup/index.tsx` lit deja la session active, les actifs lies et l'historique des decisions via l'API review.
- La popup sait deja auto-prefiller `logicalTimestamp` depuis le content script TradingView existant, mais elle n'affiche pas encore l'actif courant de facon dominante et elle depend encore d'un choix d'actif manuel dans le chemin courant.
- Quand aucun actif n'est lie a la session, l'UI actuelle demande encore un ajout manuel dans l'app de revue. Cette story doit supprimer ce passage dans le chemin nominal.
- `apps/extension/src/contents/tradingview.ts` existe deja pour remonter le contexte temporel. La nouvelle fonctionnalite doit rester dans le meme esprit: best-effort, silencieuse et legere.

### Decision de cadrage pour cette story

- Le symbole TradingView detecte doit etre normalise de facon canonique avant comparaison avec les actifs de session, pour eviter les doublons dus a la casse ou aux variations de format.
- Le prix detecte doit etre affiche comme contexte et servir de base a `referencePrice` si le flux de capture conserve ce champ, mais l'utilisateur ne doit pas avoir a le saisir dans le chemin normal.
- Si un symbole detecte correspond a un actif deja lie, la popup doit reutiliser cet actif plutot que d'en creer un nouveau.
- Si aucun symbole ne peut etre detecte de facon fiable, ne rien auto-lier et ne rien auto-remplir de faux. L'utilisateur garde la possibilite de saisir manuellement.
- Ne pas inventer un stockage local permanent du contexte TradingView comme source de verite. Le contexte detecte doit rester derive de la page et de l'etat API de la session.

### Architecture a respecter

- `apps/extension/src/contents` sert a l'injection TradingView uniquement et ne doit porter aucune logique metier.
- `apps/extension/src/popup` reste le point de capture rapide et reste `API-only`.
- `apps/review/app/api/*` reste le seul point d'entree vers la persistence et les regles de session.
- `packages/shared` porte les contrats. Si le message content-script/popup change de forme, garder un schema explicite et stable.
- `packages/domain` et `packages/db` ne doivent pas etre touches par l'extension directement.
- La logique d'auto-liaison doit reutiliser l'endpoint existant d'association d'actifs plutot que recreer un second catalogue.

### Fichiers existants a modifier et etat actuel

- `apps/extension/src/contents/tradingview.ts`
  - Etat actuel: lit un timestamp TradingView et l'envoie periodiquement a la popup.
  - Changement attendu: extraire aussi l'actif courant et le prix visible / courant, avec le meme niveau de robustesse silencieuse.
  - A preserver: detection best-effort, absence d'erreur UI, et fonctionnement hors TradingView.

- `apps/extension/src/popup/index.tsx`
  - Etat actuel: charge la session active, les actifs lies, et permet de capturer une decision via l'API review; si aucun actif n'est lie, la popup demande encore une action manuelle ailleurs.
  - Changement attendu: afficher l'actif courant dans la zone principale, auto-selectionner ou auto-lier l'actif, et supprimer le selecteur manuel du chemin nominal.
  - A preserver: capture buy/sell existante, validation des montants, logique `API_BASE`, et absence d'acces direct a la base.

- `apps/review/src/server/assetHandlers.ts`
  - Etat actuel: ajoute et liste les actifs lies a une session, avec un comportement idempotent deja utilise par l'UX de revue.
  - Changement attendu: probablement aucun changement structurel, sauf si un ajustement mineur de reponse aide l'auto-liaison cote extension.
  - A preserver: validation, orchestration mince, et respect du contrat public `{ data, error, meta }`.

- `apps/review/src/components/SessionPanel.tsx`
  - Etat actuel: permet encore l'ajout manuel d'actifs dans l'app de revue.
  - Changement attendu: pas de gros refactor requis pour cette story, mais l'UX ne doit pas regresser si l'extension commence a lier automatiquement les actifs.
  - A preserver: le workflow manuel existant comme fallback.

### Contrats API recommandes

`GET /api/sessions/[id]/assets`
- Sert a reconnaitre un actif deja lie a la session.

`POST /api/sessions/[id]/assets`
- Sert a lier automatiquement un actif detecte lorsque le symbole n'existe pas encore dans la session.
- Doit rester idempotent: une relecture du meme symbole ne doit pas creer de doublon.

`POST /api/sessions/[id]/decisions`
- Continue a recevoir `assetId`, `side`, `quantity`, `referencePrice`, et eventuellement `logicalTimestamp`.
- Le prix detecte par TradingView doit alimenter `referencePrice` sans changer le contrat public de la decision.

### Pièges a éviter

1. Ne pas confondre le symbole visible du graphique avec un identifiant interne de base de donnees. Le symbole TradingView doit d'abord etre normalise puis rattache a un actif de session via l'API.
2. Ne pas auto-creer un actif sur la base d'une lecture partielle ou incertaine. Une detection faible doit echouer proprement.
3. Ne pas dupliquer la logique d'idempotence de `addSessionAsset` dans la popup. L'API review doit rester la source de verite pour le lien session-actif.
4. Ne pas casser le flux de capture existant si TradingView est absent, si l'onglet est different, ou si le content script n'arrive pas a lire le DOM.
5. Ne pas ajouter de dependance directe a `packages/db` depuis l'extension.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` > Epic 1 > Story 1.3, Story 1.4, Story 1.6]
- [Source: `_bmad-output/planning-artifacts/architecture.md` > API Boundaries, Component Boundaries, Service Boundaries]
- [Source: `_bmad-output/planning-artifacts/prds/prd-training-trade-2026-06-08/prd.md` > Functional Requirements, Data and Domain Rules, Scope for V1]
- [Source: `apps/extension/src/popup/index.tsx`]
- [Source: `apps/extension/src/contents/tradingview.ts`]
- [Source: `apps/review/src/server/assetHandlers.ts`]
- [Source: `packages/shared/src/schemas/sessionAsset.ts`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Aucune execution d'implementation pour cette story au moment de la creation du fichier.

### Completion Notes List

- Story creee comme point de depart pour l'affichage de l'actif courant et la capture rapide buy/sell par quantite dans l'extension.
- `tradingview.ts` : ajout de `readSymbol()` (selectors DOM multi-candidats) et `readPrice()` ; message renomme `TV_CONTEXT` avec les 3 champs `isoTimestamp / symbol / price`, toujours best-effort et silencieux.
- `packages/shared/src/schemas/tvContext.ts` : nouveau contrat `TvContext` / `TvContextMessage` exporte depuis `@training-trade/shared`.
- `popup/index.tsx` : chemin nominal (TV actif) — affichage du symbole + prix detecte, saisie reduite a la quantite, auto-liaison via `POST /api/sessions/[id]/assets` avec idempotence. Chemin fallback (pas de TV) conserve intact avec selecteur, quantite, prix et horodatage.
- `apps/review/__tests__/autoLinkFlow.test.ts` : 4 nouveaux tests couvrant detect → link → capture, idempotence du second POST, actif pre-lie, et degradation propre (session inconnue → 404, pas de capture).

#### Correctif detection TradingView (la detection auto ne remontait ni l'actif ni le prix)

- Cause racine : TradingView est une SPA aux classes CSS obscurcies/changeantes ; les selecteurs DOM du content script ne tombaient jamais juste, et la messagerie content-script→popup etait fragile (service worker MV3 dormant, timing de reload).
- Nouvelle approche de capture : la popup interroge directement l'onglet TradingView actif via `chrome.scripting.executeScript` (permissions `scripting` + `tabs` ajoutees au manifest), polling toutes les 3 s. Plus de dependance a la messagerie pour symbole/prix ; le content script ne sert plus qu'au timestamp.
- Separation scraping / parsing : `scrapeTvSignals()` (injecte, ne fait que lire le DOM brut : `document.title`, bouton `#header-toolbar-symbol-search`, legende, param URL `symbol`, prix DOM) et `parseTvContext()` (pur, dans `@training-trade/shared`, donc testable sans DOM).
- Signaux robustes privilegies : le bouton de recherche de symbole (id stable) et `document.title` qui porte le ticker live et souvent le prix live ; l'URL ne sert qu'en dernier recours (elle peut ne pas refleter l'actif courant). Gestion des decimales `,` et `.`.
- Anti-faux-positif (AC 4) : liste de stopwords (`TRADINGVIEW`) pour ne pas confondre le nom de marque du titre avec un ticker — bug reel attrape par un test unitaire.
- Affichage de diagnostic dans la popup (`<details>` « Diagnostic detection ») montrant les valeurs brutes vues dans la page quand on est sur TradingView sans detection, plus remontee de l'erreur d'injection eventuelle.
- 18 tests unitaires `parseTvContext` (resolution symbole, prix, timestamp, snapshots realistes, degradation a blanc).

#### Suppression du content script (erreur `sendMessage` en boucle)

- Symptome : `tradingview.<hash>.js` jetait une erreur a chaque tick (`chrome.runtime.sendMessage` sans recepteur quand la popup est fermee ; en MV3 le rejet de Promise echappe au `try/catch`).
- Le content script ne servait plus qu'au timestamp depuis le passage a `executeScript`. Son scraping (date du status bar) a ete rapatrie dans `scrapeTvSignals`, et le parsing ISO dans `parseTvContext` (pur, teste). Le fichier `apps/extension/src/contents/tradingview.ts` et le dossier `contents/` ont ete supprimes, ainsi que les types `TvContext`/`TvContextMessage` et le listener `onMessage` de la popup, devenus inutiles.
- Architecture finale : la popup est le seul point d'integration TradingView (lecture via `executeScript`, parsing via le helper partage). Plus aucune messagerie content-script ↔ popup.

#### Correctif bundling Zod (`(0, _zod.z).enum is not a function` dans la popup)

- Cause : importer `parseTvContext` (valeur runtime) depuis le barrel `@training-trade/shared` tirait tout l'`index.ts`, donc tous les schemas Zod ; Plasmo/Parcel ne sait pas bundler Zod dans la popup (`z.enum` jette au runtime). Avant, la popup n'importait que des `import type` (effaces a la compilation), d'ou l'absence du probleme.
- Fix : ajout d'une sous-export sans Zod `"./tv": "./src/schemas/tvContext.ts"` dans `packages/shared/package.json` ; la popup importe `parseTvContext` / `TvRawSignals` depuis `@training-trade/shared/tv`. Les `import type` restants viennent toujours du barrel (types only, erases).
- Verifie au build : `plasmo build` OK, et le bundle popup de prod ne contient plus aucune reference Zod tout en conservant la logique de detection.

#### Correctif resolution du symbole (`0IAX` detecte comme `THOMAS`)

- Cause 1 : le regex ticker exigeait une lettre en 1re position, donc rejetait les symboles a chiffre initial (`0IAX`, `52C`) ; le parser retombait alors sur le titre de page et y pechait un mot parasite (nom de layout/compte « THOMAS »).
- Cause 2 : le titre (peu fiable) etait teste avant l'URL.
- Fix : un ticker peut commencer par une lettre OU un chiffre mais doit contenir au moins une lettre (accepte `0IAX`/`52C`, rejette les nombres purs `300`/`10.10`). Ordre de resolution durci : header (instrument affiche) → ticker de l'URL canonique → titre en dernier recours.
- 5 tests ajoutes (ticker a chiffre initial, header prioritaire sur titre bruite, URL avant titre, rejet des nombres purs).

#### Correctif prix en mode Replay (prix live capture au lieu du prix du graphique)

- Cause : en Replay, `document.title` porte toujours le prix LIVE du marche (ex. 5,70), pas le prix de la barre rejouee ; le parser lisait le titre en premier.
- Fix : nouvelle priorite prix → Close de la legende OHLC du graphique (`O2,310 H2,370 B2,210 C2,370` → 2,370) en premier, puis prix DOM generique, puis titre live en dernier recours. La legende reflete la barre affichee, donc correcte en Replay comme en live.
- Extraction robuste : `closeFromLegend` ancre sur l'Open (`O<nombre>`) avant de capturer le Close, pour ne pas confondre un « C » de nom de societe avec le close ; gere les locales `,`/`.` et les legendes concatenees sans espaces.
- Scraping `scrapeTvSignals` : recupere le texte du conteneur de legende OHLC (`[data-name="legend-series-item"]` puis globs de classe), nouveau champ `legendOhlc` dans `TvRawSignals`.
- 5 tests ajoutes (Close prioritaire sur titre live en Replay, legende concatenee, anti-faux-positif nom de societe, locale point, fallback titre sans legende).

### File List

- _bmad-output/implementation-artifacts/1-7-afficher-l-actif-courant-et-capturer-buy-sell-par-quantite-depuis-tradingview.md
- packages/shared/src/schemas/tvContext.ts (nouveau — `TvRawSignals` + `parseTvContext` pur, symbole/prix/timestamp)
- packages/shared/src/index.ts (export tvContext)
- packages/shared/src/schemas/__tests__/tvContext.test.ts (nouveau, 18 tests)
- packages/shared/package.json (sous-export sans Zod `./tv` → `tvContext.ts`)
- apps/extension/package.json (permissions manifest `scripting` + `tabs`)
- apps/extension/src/contents/tradingview.ts (SUPPRIME — remplace par le scraping executeScript de la popup)
- apps/extension/src/popup/index.tsx (capture via executeScript, parsing partage, auto-liaison, fallback manuel, diagnostic)
- apps/review/__tests__/autoLinkFlow.test.ts (nouveau, 4 tests)

## Change Log

- 2026-06-10: Story initiale creee.
- 2026-06-10: Implementation complete — detection TradingView, auto-liaison, popup remaniee, 4 tests d'integration.
- 2026-06-10: Correctif detection — passage a `chrome.scripting.executeScript`, parsing pur testable `parseTvContext` (15 tests), anti-faux-positif, panneau de diagnostic. 237 tests verts.
- 2026-06-10: Suppression du content script (erreur `sendMessage` en boucle) ; timestamp rapatrie dans le scraping/parsing partage. 240 tests verts.
- 2026-06-10: Correctif bundling Zod — sous-export `@training-trade/shared/tv` pour importer `parseTvContext` sans tirer les schemas Zod dans la popup. Build Plasmo verifie sans Zod.
- 2026-06-10: Correctif resolution symbole — tickers a chiffre initial acceptes (`0IAX`), ordre header → URL → titre. 245 tests verts.
- 2026-06-10: Correctif prix Replay — priorite au Close de la legende OHLC du graphique plutot qu'au prix live du titre. 250 tests verts.
- 2026-06-10: Scraping legende durci — remontee des parents depuis `legend-source-title` pour trouver l'ancetre contenant l'OHLC ; panneau de diagnostic rendu aussi dans le chemin TV nominal.
- 2026-06-10: Injection `allFrames: true` (le graphique/legende vit dans une iframe) + fusion des signaux multi-frames ; scan page entiere du plus petit element OHLC.
- 2026-06-10: Extraction Close robuste aux valeurs collees sans separateur (`C2,1802,180`) — nombre de decimales derive de l'Open. Validee sur capture diagnostic reelle. 251 tests verts.
