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

## Potential implementation concerns to push downstream

- Price reference source and how it is captured.
- Treatment of fees, slippage, and fills.
- Data model for multi-asset positions.
- Session lifecycle details and whether sessions can branch or be resumed.
