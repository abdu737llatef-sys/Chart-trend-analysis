# Chart Trend Analyzer V5.2

هذه النسخة تعالج المشاكل التي ظهرت في نتائج BTC / ETH / ADA في V5.

## أهم التغييرات

### 1) Triple‑Barrier بدل إغلاق بعد N شموع
لكل إشارة:
- Favorable barrier = ATR × multiplier
- Adverse barrier = ATR × multiplier
- Time barrier = أقصى عدد شموع

النتيجة:
- Win
- Loss
- Timeout
- Ambiguous إذا لمست الشمعة الحاجزين معًا

### 2) Metrics الجديدة
- Resolved Accuracy
- Balanced Accuracy
- Bull Precision
- Bear Precision
- Resolution Rate
- Expectancy
- Profit Factor
- MFE / MAE
- Signal-sequence Drawdown

### 3) Purged Walk‑Forward + Embargo
قبل كل Test fold يتم حذف عدد من شموع التدريب يساوي:
Horizon + Embargo

لمنع تداخل Labels المستقبلية بين Train وTest.

### 4) Regularized Adaptive Weights
الأوزان لا يسمح لها بالابتعاد بلا حدود عن Default.
الإعداد الافتراضي ±35%.

### 5) Multi‑Timeframe بدون Look‑Ahead
Crypto يجلب الفريم الأعلى منفصلًا:
- 15m → H1 + D1
- H1 → D1
- D1 → W1

ولا يستخدم شمعة الفريم الأعلى إلا بعد وقت إغلاقها.

### 6) Historical Smart Structure
- Confirmed pivots
- BOS-like breaks
- CHoCH
- Liquidity Sweep
- FVG
وكلها محسوبة زمنيًا بدون استخدام Pivot قبل تأكيده.

### 7) Relative Strength
Crypto يقارن تاريخيًا مع BTC وETH على نفس الفريم.

### 8) Score Calibration
يعرض هل Score 80–100 يحقق فعلًا نتائج أفضل من 65–70.

### 9) Cross‑Asset Robustness
يحفظ آخر نتائج BTC / ETH / ADA محليًا داخل الهاتف للمقارنة.

## أول اختبار مقترح
استخدم نفس الإعدادات على العملات الثلاث:

BTCUSDT
ETHUSDT
ADAUSDT

Spot
1h
2500 candles

Horizon: 12
TP: 1 ATR
SL: 1 ATR
Embargo: 2
Bull: 65
Bear: 35
Weight deviation: ±35%
Same-bar: Ambiguous

قارن خصوصًا:
- Out-of-sample Balanced Accuracy
- Test Profit Factor
- Test Expectancy
- Overfit Gap
- Score Calibration
- London وLondon/NY Overlap

## تحديث GitHub Pages
استبدل جميع ملفات النسخة القديمة بملفات هذا ZIP ثم Commit.

افتح الموقع لأول مرة بهذا الشكل:
https://YOURNAME.github.io/YOUR-REPO/?v=5.2

إذا كان التطبيق المثبت قديمًا:
- افتح رابط GitHub Pages في Chrome.
- امسح بيانات الموقع عند الحاجة.
- تأكد أن أعلى الصفحة يظهر V5.2.
- أعد تثبيت PWA.

## تنبيه
V5.2 أداة بحث تاريخي وPaper Research. النتائج التاريخية لا تضمن المستقبل ولا تمثل توصية شراء أو بيع.
