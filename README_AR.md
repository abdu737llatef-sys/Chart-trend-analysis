# Chart Trend Analyzer V5.3

V5.3 مبني فوق V5.2 ويضيف فصل النموذج حسب اتجاه الإشارة بدل تقييم Long وShort معًا فقط.

## الجديد

### Long / Short OOS split
يعرض لكل اتجاه:
- Resolved N
- OOS side accuracy
- Profit Factor
- Expectancy
- Wins / Losses
- Sample Reliability

### OOS Filter Engine
يعتمد فقط على الإشارات الموجودة في Test folds من Purged Walk‑Forward.
يبحث بالتدرج:
1. Side + Session + Regime
2. Side + Session
3. Side + Regime
4. Side overall

ولا يستخدم subgroup صغيرًا إذا كان أقل من الحد الأدنى للعينة.

### Confidence Tiers
- Tier A: عينة أكبر + Accuracy/PF أقوى + Calibration مناسب + Overfit gap منخفض
- Tier B: دعم تاريخي متوسط
- Tier C: يمر بالحد الأدنى فقط
- Tier X: Blocked

### Directional Calibration
Long وShort منفصلان:
65-70
70-75
75-80
80-100

### Paper Scenario Engine
على آخر شمعة مغلقة:
- يحسب Score بالوزن المحسن
- يحدد Side البحثي إن تجاوز Threshold
- يقرأ Session وRegime
- يبحث عن أقوى subgroup OOS صالح
- يعرض Allowed / Blocked وTier

إذا كان Allowed يعرض فقط مستويات محاكاة:
- Reference close
- Paper favorable barrier 1
- Paper adverse barrier
- Paper extension barrier

هذه ليست أوامر شراء/بيع أو مستويات تنفيذ بأموال حقيقية.

## إعداد الاختبار المقترح لمقارنة BTC / ETH / ADA
Spot
1h
2500 candles
Horizon 12
Favorable 1 ATR
Adverse 1 ATR
Embargo 2
Bull 65
Bear 35
Weight deviation ±35%
Ambiguous

Research filter:
Min OOS sample = 50
Min side accuracy = 52%
Min PF = 1.10
Calibration minimum = 30

## تحديث GitHub Pages
استبدل الملفات القديمة بكل ملفات V5.3 ثم Commit.

افتح:
https://YOURNAME.github.io/YOUR-REPO/?v=5.3

وتأكد أن أعلى الصفحة يعرض V5.3.
