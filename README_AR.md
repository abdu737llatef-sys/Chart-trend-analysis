# Chart Trend Analyzer V5 — Backtesting & Walk‑Forward

## الهدف
V5 لا يضيف أوامر تداول. هدفه اختبار ما إذا كانت طبقات التحليل السابقة لها قيمة تاريخية فعلية، وتقليل خطر اختيار الأوزان بالحدس فقط.

## يعمل على الهاتف عبر PWA
### Crypto
يجلب 1000–7500 شمعة من Binance Spot أو USD-M Futures على:
- 15m
- 1h
- 1d

### Forex
يقرأ CSV تاريخي مباشرة من الهاتف:
Time, Open, High, Low, Close, Volume(optional)

## ما يختبره
- EMA trend
- Ichimoku
- RSI
- MACD
- ADX/DI
- VWAP
- Volume
- Market Structure باستخدام pivots لا تدخل في الحساب إلا بعد تأكيد right-bars لتقليل look-ahead bias
- Session context

## نتائج V5
- Directional accuracy
- Signal count
- Coverage
- Bull / Bear accuracy
- Average signed forward return
- MFE
- MAE
- Unresolved outcomes
- Threshold sweep من 55/45 إلى 80/20
- Performance by session
- Performance by regime: Trending / Mixed / Ranging

## Walk‑Forward
يستخدم 4 folds تقريبًا:
1. Optimize weights على البيانات السابقة فقط.
2. يختبر الأوزان على الجزء التالي الذي لم يدخل في التدريب.
3. يكرر ذلك عبر الزمن.
4. يعرض Train accuracy وOut-of-sample accuracy وOverfit gap.
5. يعرض متوسط الأوزان الفائزة عبر folds.

هذه ليست ضمانة للقدرة المستقبلية، لكنها أقوى من Backtest واحد على كامل التاريخ.

## تحديث تطبيق GitHub Pages الحالي
1. فك ZIP.
2. في Repository الحالي احذف/استبدل ملفات V4:
   - index.html
   - app.js
   - style.css
   - manifest.webmanifest
   - service-worker.js
   - icon-192.png
   - icon-512.png
3. ارفع ملفات V5 بنفس الأسماء.
4. Commit changes.
5. انتظر GitHub Pages دقيقة أو عدة دقائق.
6. افتح الموقع من Chrome.
7. إذا ظهر V4 بسبب cache:
   - أغلق التطبيق المثبت.
   - افتح رابط GitHub Pages من Chrome.
   - حدّث الصفحة.
   - أعد فتح التطبيق.

## إعداد مقترح لأول اختبار
BTCUSDT
Spot
1h
2500 candles
Forward 6 bars
Minimum move 0.20%
Bull 65
Bear 35

ثم جرّب نفس الإعداد على:
- ETHUSDT
- ADAUSDT
ومقارنة النتائج.

## تنبيه
Backtesting وWalk‑Forward أدوات بحثية. النتائج التاريخية لا تضمن المستقبل ولا تمثل توصية شراء أو بيع.
