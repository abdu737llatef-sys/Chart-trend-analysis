# Chart Trend Analyzer V5.6.4 — Decision Architecture

## الفكرة الأساسية
لم يعد OOS وIntegrity جزءًا من Technical Score.
القرار النهائي يمر بثلاث طبقات مستقلة:

1. Technical Engine
2. Historical Validation Engine
3. Market Integrity Engine

## Technical Engine
الأوزان:
- Market Structure 25%
- Trend: EMA + Ichimoku 20%
- Momentum: RSI + MACD 12%
- ADX/DI strength 10%
- Volume/Participation 12%
- Support/Resistance + Breakout/Retest 11%
- MTF context 10%

دمج EMA+Ichimoku وRSI+MACD يمنع احتساب نفس معلومة السعر كأدلة مستقلة كاملة.

## MTF
- M15: H1 هو السياق الأكبر الأساسي، وD1 سياق ثانوي.
- H1: D1 هو Higher-TF veto الأساسي؛ M15 توقيت مساعد.
- D1: H1/M15 سياق فقط ولا يوجد veto أعلى.

## Historical Validation
Side-specific:
- Resolved N
- OOS Accuracy
- Profit Factor
- Wilson 95% Lower Bound

Defaults:
- N >= 50
- Accuracy >= 55%
- PF >= 1.20
- Wilson95 >= 50%

## Market Integrity
Live:
- Spread
- Depth ±0.5%
- Coinbase cross-source price when available
- Closed-candle anomaly check
- Coverage

Integrity can BLOCK a scenario but does not flip the locked technical direction inside the same candle.

## Final Status
- BLOCKED: one or more minimum gates failed
- PRELIMINARY: minimum gates passed but sample/statistical strength not enough for Confirmed
- CONFIRMED: stronger history (N >=100)
- HIGH CONFIDENCE: N >=100, Wilson>=53%, PF>=1.30, Integrity>=80 and strong technical score

These labels are research confidence labels, not probabilities.

## Closed Candle Lock
Open candles are excluded from Technical analysis.
Technical direction and Paper levels change only after the selected timeframe closes another candle.

## Paper levels
If Final Status = BLOCKED:
Paper Entry / TP1 / TP2 / Stop are hidden.

Otherwise they are shown as Paper Research levels only.

## GitHub Pages
https://YOURNAME.github.io/YOUR-REPO/?v=5.6.4
https://YOURNAME.github.io/YOUR-REPO/scanner.html?v=5.6.4
