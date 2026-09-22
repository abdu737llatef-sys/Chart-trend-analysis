# V5.6.7.5 — Adaptive Execution Validation Gate

هذا الإصدار يعالج أهم فجوة ظهرت في اختبار V5.6.7.4: **صحة الاتجاه التاريخية لا تعني أن طريقة الدخول والتنفيذ نفسها مربحة**.

## الجديد
- إضافة طبقة **Adaptive Entry Execution Validation** مشتركة بين Live MTF وMarket Scanner.
- المحاكاة تستخدم نفس دورة Paper: تأكيد اختراق/Retest على شمعة مغلقة، ثم تنفيذ بحثي عند **Open الشمعة التالية**، مع Effective Stop وTP1 وتكلفة Round-trip.
- تعرض Execution PF وAverage net R وWilson95 وResolved N وMax Drawdown.
- اختبار استقرار عبر 4 Chronological/Purged folds، مع منع اعتماد نتيجة ناتجة من Fold واحد.
- **Regime Gate** للحالة الحالية: ALLOW / WAIT_DEVELOPING / INSUFFICIENT_SAMPLE / SKIP_SETUP.
- نقص عينة النظام السوقي لا يُعامل كدليل؛ يخفض الثقة إلى PRELIMINARY بدل إعطاء ثقة زائفة.
- إذا كان النظام السوقي الحالي تاريخيًا ضعيفًا (`SKIP_SETUP`) يتم الحجب.
- Scanner وLive يستخدمان نفس Execution Gate لمنع مفارقة ظهور عملة Qualified في الماسح ثم BLOCKED في Live بسبب اختلاف منطق التحقق.
- السيناريو Paper المعلّق يتوقف في `PAUSED_VALIDATION` إذا انهارت بوابات التحقق قبل التفعيل.

## مهم
- Directional OOS ما زال موجودًا كطبقة مستقلة.
- Execution Validation لا يستبدل Market Integrity؛ بل يسبقها.
- جميع Entry / Stop / TP مستويات **Paper/Research فقط**.
- لا تمثل النتائج احتمال نجاح مستقبلي أو توصية تداول حقيقي.

## التثبيت على GitHub Pages
ارفع جميع الملفات إلى جذر المستودع ثم افتح الرابط مع `?v=5.6.7.5`. إذا ظل الإصدار القديم ظاهرًا، امسح Site Data أو أزل الـPWA ثم ثبّته من جديد.
