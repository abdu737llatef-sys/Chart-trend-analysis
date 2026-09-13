# Chart Trend Analyzer V5.6.3 — Signal Lock & Decision Cards

## أهم إصلاح
في النسخ السابقة كان آخر Kline القادم من Binance قد يكون ما يزال مفتوحًا.
على H1 مثلًا تتغير High/Low/Close/Volume/RSI/MACD/ADX طوال الساعة، ولذلك قد يتغير Score والاتجاه والمستويات قبل إغلاق الشمعة.

V5.6.3:
- يستبعد الشمعة المفتوحة من التحليل الفني.
- Technical direction يُقفل على آخر شمعة مغلقة.
- Paper Entry / Stop / TP1 / TP2 تُقفل لنفس الشمعة.
- لا يعاد تحديد الاتجاه حتى تغلق الشمعة التالية.
- Market Integrity يبقى Live ويمكنه فقط حجب المرشح إذا تدهورت السيولة/البيانات.

## Strong Bullish / Strong Bearish الجديدة
المرشح النهائي يجب أن يمر:
1. Closed candle only
2. Technical threshold
3. MTF score
4. Higher-timeframe veto
5. OOS accuracy
6. Minimum resolved OOS sample
7. Wilson 95% lower confidence bound
8. Profit Factor
9. Integrity
10. Depth / source agreement / anomaly checks

Defaults:
- Bull >= 90
- Bear <= 10
- OOS accuracy >= 55%
- PF >= 1.20
- Resolved N >= 30
- Wilson 95% lower bound >= 50%
- Integrity >= 80

## Sample confidence
- Preliminary: >=30 resolved, Wilson95 >=50%, PF>=1.20
- Medium: >=50 resolved, Wilson95 >=50%, PF>=1.20
- High: >=100 resolved, Wilson95 >=53%, PF>=1.30

هذه ليست احتمالات نجاح للصفقة القادمة.

## Higher-TF veto
- M15: H1 لا يجوز أن يكون قويًا في الاتجاه المعاكس.
- H1: D1 لا يجوز أن يكون قويًا في الاتجاه المعاكس.
- D1: لا يوجد veto أعلى في النسخة الحالية.

## Mobile Decision Cards
لكل مرشح نهائي:
- Verification
- Live Integrity
- OOS accuracy
- Resolved N
- Wilson95 lower bound
- PF
- MTF + Higher-TF status
- Paper Entry
- Paper Stop
- Paper TP1
- Paper TP2
- R:R
- وقت الشمعة التي تم قفل الإشارة عليها

## Closest lists
تم إصلاح التكرار: العملة التي ظهرت في Strong Bullish/Bearish لن تظهر مرة أخرى في Top 3 Closest.

## Paper-only
كل Entry / TP / Stop في التطبيق للمحاكاة والبحث فقط.

## GitHub Pages
https://YOURNAME.github.io/YOUR-REPO/?v=5.6.3
https://YOURNAME.github.io/YOUR-REPO/scanner.html?v=5.6.3
