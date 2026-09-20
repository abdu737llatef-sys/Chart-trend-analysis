# V5.6.7.2.2 — Validation Consistency Fix

## 1) Higher-TF veto
تم تحويل Live engine إلى ثلاث مراحل:
1. حساب Base Technical Core لكل M15/H1/D1.
2. حساب Final MTF score لكل الفريمات.
3. بعد اكتمال الدرجات الثلاث فقط يتم حساب Higher‑TF veto.

هذا يمنع حالة H1 Bearish بينما D1 Bullish>=65 من إظهار veto=NO بسبب أن D1 لم يكن قد حُسب بعد.

## 2) Live OOS أصبح MTF-aware
Purged Walk-Forward الحي يستخدم الآن الإشارة التاريخية بعد MTF score ويطبق Higher-TF veto تاريخيًا، بدل single-timeframe base score فقط.
يظهر أيضًا Effective MTF overlap المتاح فعليًا.

## 3) Research MTF overlap
عند H1 Research يتم جلب تقريبًا:
- 16,500 M15 candles
- 4,000 H1 candles
- 1,000 D1 candles

وتعرض الواجهة Effective MTF overlap الحقيقي والتاريخ الفعلي، بدل الادعاء أن كل H1 loaded candles لها نفس تغطية M15/D1.

## 4) PF والعينات الصغيرة
لا يتم استخدام PF=99 كرقم بديل عند عدم وجود خسائر.
إذا كان Fold N<10 تظهر:
INSUFFICIENT SAMPLE

## 5) Adaptive diagnostics
تم الإبقاء على Live rule دون تغيير.
Research يقارن ثلاث سياسات ثابتة فقط:
- Live Conservative: Strong>=65, Momentum>=70, Strength>=65, Volume>=60
- Research Balanced: Strong>=75, Momentum>=62, Strength>=58, Volume>=50
- Research Momentum: Strong>=85, Momentum>=55, Strength>=50, Volume>=45

لا يتم اختيار "فائز" تلقائيًا ولا يتم تعديل Live thresholds من نتيجة عملة واحدة.

## 6) Consensus wording
Direction Agreement أصبح:
Net Direction Consensus

كما تمت إضافة:
Majority Direction = Bullish/Bearish X/3

حتى تكون حالة مثل M15 Bearish + H1 Bearish + D1 Bullish واضحة:
Net Consensus = 33.3%
Majority Direction = Bearish 2/3

## Paper Research only
كل النتائج والمستويات لأغراض المحاكاة والتحقق التاريخي فقط.


## V5.6.7.2.2 Hotfix
- Restore `metric()` used by Live and Research rendering.
- Restore `statusClass()` used by Final Decision cards.
- Add a small UI helper self-check before Live rendering.
- No strategy thresholds, OOS rules, Adaptive profiles, entry logic, TP/SL logic, or Higher-TF veto rules were changed.


## V5.6.7.2.2 Hotfix
- Fixed `displayPF is not defined`.
- `displayPF()` now handles:
  - normal PF values,
  - Infinity as `∞`,
  - small samples as `INSUFFICIENT SAMPLE`.
- Added Live UI helper self-check for `metric`, `statusClass`, and `displayPF`.
- Added Research UI helper self-check for `metric`, `displayPF`, and `researchMetric`.
- No trading/research thresholds or signal logic were changed.
