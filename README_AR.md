# Chart Trend Analyzer V5.6.6.1
## Execution Integrity Fix

هذه نسخة تصحيحية قبل V5.6.7 A/B Entry Validator.

### 1. Direction Agreement
المحايد لم يعد يُحذف من المقام.
مثال:
- M15 Neutral
- H1 Bullish
- D1 Bullish

يعرض:
- Direction Agreement = 66.7%
- Directional Frames = 2/3

بدل 100%.

### 2. Expiry display
تم فصل:
- Bars elapsed
- Maximum pending bars

لمنع انعكاس RTL مثل 8 / 0.

### 3. لماذا ينتظر Retest؟
تم فصل السببين:
- STRONG_LEVEL: مستوى قوي يحتاج إغلاق + Retest.
- INSUFFICIENT_MOMENTUM_VOLUME: المستوى ليس قويًا بالضرورة، لكن الزخم/الحجم غير كافيين لقبول continuation.

إذا كان:
Momentum >= 70
ADX/DI strength >= 65
Volume >= 60
يمكن للنموذج اختيار closed-candle continuation بدون Retest عندما تسمح بقية الشروط.

### 4. Planned vs Actual Paper Trigger
قبل التفعيل:
- Planned Entry Reference
- Planned Stop / TP1 / TP2

بعد شمعة تأكيد الاختراق أو Retest:
الحالة تصبح READY_NEXT_OPEN.

سعر التنفيذ البحثي:
- Actual Paper Trigger = Open الشمعة التالية بعد شمعة التأكيد.

هذا يمنع استخدام Close شمعة التأكيد نفسها كسعر تعبئة افتراضي بعد أن أصبح معلومًا.

### 5. Effective levels
بعد Actual Paper Trigger:
- Effective Stop = مستوى الإبطال البنيوي المخطط
- Effective TP1 = 1.20R من سعر التنفيذ الفعلي
- Effective TP2 = 2.00R من سعر التنفيذ الفعلي

ويحتفظ Journal بالمستويات المخططة والمستويات الفعلية للمقارنة.

### 6. Lifecycle
PENDING_BREAKOUT
→ WAITING_RETEST (عند الحاجة)
→ READY_NEXT_OPEN
→ TRIGGERED
→ TP1_HIT / TP2_HIT / STOPPED / INVALIDATED / EXPIRED / AMBIGUOUS

### 7. ملاحظة
لا توجد مراقبة Push في الخلفية في GitHub Pages.
تتحدث الحالة عند فتح التطبيق أو تشغيل التحليل.
كل المستويات Paper Research فقط.
