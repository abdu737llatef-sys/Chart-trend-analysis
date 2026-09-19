# Chart Trend Analyzer V5.6.5 — Statistical Validation Upgrade

## الجديد
- تاريخ أطول: M15/H1 حتى 4000 شمعة، D1 حتى 2500 عند توفرها.
- Purged Walk-Forward OOS بأربع نوافذ زمنية.
- حدود عينة تلقائية: M15=80، H1=50، D1=30 أو Custom.
- Wilson 95% + OOS Accuracy + cost-adjusted Profit Factor.
- تكلفة بحثية Round-trip قابلة للاختيار (الافتراضي 10 bps).
- Direction Agreement منفصل عن Weighted MTF Strength.
- D1 لا يعرض Session آسيا/لندن؛ يعرض Daily timeframe.
- BLOCKED القريب يمكن أن يعرض Paper Reference Entry/Stop/TP1/TP2 مع وسم واضح NOT QUALIFIED.
- BLOCKED الضعيف لا يعرض مستويات.

## Near-qualified reference
المستويات المرجعية لا تحول السيناريو إلى توصية. هي لاختبار ما إذا كان نموذج Entry/Stop/TP الذي كنا سنستخدمه كان سيعمل بعد ذلك.

## Paper level model
- تأكيد Breakout/Breakdown أو Retest حسب موضع الإغلاق.
- S/R + ATR trigger.
- Stop risk محصور تقريبًا بين 0.9 و1.8 ATR لتجنب مستوى بعيد بصورة غير عملية.
- TP1 = 1.2R، TP2 = 2R.

## GitHub Pages
`/?v=5.6.5`
`/scanner.html?v=5.6.5`
