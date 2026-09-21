# V5.6.7.3 — Unified + Timeframe-Specific Validation Engine

## الهدف
إنهاء المفارقة بين Market Scanner و Live MTF.

## Unified Decision Engine
تم إنشاء ملف مشترك:
`decision-engine.js`

وهو المصدر المشترك لـ:
- Technical Core
- Timeframe hierarchy
- Higher-TF veto
- Purged Walk-Forward
- Cost-adjusted PF
- Wilson 95%
- Paper Entry / Stop / TP1 / TP2

Live وScanner يستدعيان نفس المحرك بدل امتلاك نسختين مستقلتين من القرار.

## Timeframe-specific hierarchy
### H1
- H1 = signal frame
- D1 = directional confirmation / veto
- M15 = timing only
- M15 historical coverage لا تقصّر تاريخ H1 بعد الآن

### M15
- M15 = timing / execution research
- H1 = main confirmation
- D1 = higher context / veto

### D1
- D1 = primary direction
- Lower timeframes لا تعيد كتابة اتجاه D1

## Scanner
Stage 1 ما زال سريعًا لاكتشاف المرشحين.
أي finalist يعاد تحليله كاملًا بواسطة Unified Engine.

أضيف:
- Spot / USD-M Futures selector
- Research round-trip cost
- Auto required sample:
  M15=80 / H1=50 / D1=30
- Scanner final OOS هو نفس Purged Walk-Forward المستخدم في Live
- PF هو cost-adjusted R-based PF وليس wins/losses
- Paper levels من نفس الدالة المستخدمة في Live

Scanner Integrity يبقى طبقة إضافية أكثر صرامة؛ لذلك قد يرفض Scanner شيئًا يمر في Live بسبب السيولة/العمق، لكن لا ينبغي أن يؤهل Scanner مرشحًا يفشل في نفس Historical Validation على Live لنفس السوق ونفس الشمعة.

## Paper Research
المستويات والنتائج للبحث والمحاكاة فقط. Technical Score وOOS ليست احتمالات نجاح مستقبلية.
