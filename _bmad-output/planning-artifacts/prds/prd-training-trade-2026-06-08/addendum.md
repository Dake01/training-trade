# Addendum

## Notes on product boundary

- Notion is explicitly outside the product boundary and remains the narrative journal.
- The product is a measurement and simulation tool first, not a broker integration layer.
- Advanced analytics, strategy scoring, and social features are intentionally deferred.

## Implementation decisions carried into stories

- V1 uses manual session-driven entry during replay.
- V1 does not require automatic capture from TradingView.
- V1 uses a simple cost-average portfolio model with a single reference currency.
- Decision edits should remain auditable if they change performance metrics.
- A decision is represented as either buy or sell, with quantity and price.


## Epic 2 Data Contract

Epic 2 is treated as a single accounting pipeline. The same ordered decision timeline and the same portfolio snapshots must feed the current portfolio view, the equity curve, and the session stats.

### Canonical words

- `capital initial`: the fixed V1 starting capital from story 2.1.
- `cash`: liquid balance in the reference currency.
- `position`: quantity held for one asset, with average cost basis.
- `portfolio value`: `cash + market value of positions`.
- `equity`: the time series of `portfolio value`.
- `PnL réalisé`: realized profit or loss from closed or reduced positions.
- `PnL non réalisé`: mark-to-market profit or loss on open positions.
- `drawdown`: decline from a prior equity peak.

### Required rules

- A decision becomes effective only when it is recorded as an applied portfolio event in the session timeline.
- V1 stays long-only. It uses the decision `referencePrice` and does not rely on broker execution, partial fills, fees, slippage, or hidden market data.
- Comparison in Epic 2 means comparing sessions and snapshots within the product, not introducing an external benchmark requirement.
- The UI must read derived data only; it must not recompute cash, equity, or stats independently.
- The same data model must back stories 2.3, 2.4, and 2.5 so that charts and stats cannot drift apart.

### Invariants

- `cash + market value = portfolio value`
- the historical ledger is append-only
- a visualization never rewrites accounting state
- stats consume the same effective decision timeline as the portfolio views

### Story boundaries

- 2.1 sets the starting capital and currency.
- 2.2 mutates the portfolio from each buy/sell decision.
- 2.3 persists and compares historical snapshots by session.
- 2.4 visualizes the derived equity series only.
- 2.5 computes metrics from the same effective data, grouped by session.

## Potential implementation concerns to push downstream

- Price reference source and how it is captured.
- Treatment of fees, slippage, and fills.
- Data model for multi-asset positions.
- Session lifecycle details and whether sessions can branch or be resumed.
