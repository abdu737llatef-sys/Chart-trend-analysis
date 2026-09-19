# V5.6.6 — Scenario Lifecycle + Smart Retest Entry

## 1) Scenario Persistence
Paper scenarios are stored in localStorage and are no longer deleted when a new analysis is run.

States:
- PENDING_BREAKOUT
- WAITING_RETEST
- PAUSED_INTEGRITY
- TRIGGERED
- TP1_HIT
- TP2_HIT
- STOPPED
- INVALIDATED
- EXPIRED
- AMBIGUOUS

The app keeps a Paper Scenario Journal per symbol.

## 2) Smart Entry Model
The system no longer treats a wick above resistance as sufficient confirmation.

For strong levels:
- require a CLOSED candle above resistance / below support;
- then prefer a successful retest before triggering.

For strong momentum + adequate volume/ADX:
- the model may use a closed-candle continuation entry without waiting for a retest.

The model records:
- level strength 0-100;
- historical touch count;
- breakout level;
- retest zone;
- expiry bars.

## 3) Ambiguous OHLC Handling
If the same closed candle reaches both an adverse and favorable barrier after trigger, state becomes AMBIGUOUS because OHLC data cannot prove the intrabar order.

## 4) RTL Fix
Resolved OOS N and Minimum Required are now displayed in separate boxes.

## 5) Forex / Gold architecture recommendation
The technical core is transferable, but crypto-specific context/integrity is not.

Recommended single-app architecture:
- Crypto profile
- Forex profile
- Gold/Metals profile

Forex/Gold should use:
- 24/5 session logic and DST-aware London/New York;
- broker tick volume or futures-volume proxy instead of centralized spot volume;
- pip/tick-aware spread and slippage;
- rollover/swap and weekend gaps;
- economic-news blackout windows;
- pair-specific costs;
- DXY / rates / currency-strength context where relevant;
- walk-forward calibration by pair and timeframe.

A live Forex module should not be faked with Binance data. It needs a dedicated FX data provider or broker feed.

## Paper-only
All levels remain research/reference levels, not live-trading instructions.
