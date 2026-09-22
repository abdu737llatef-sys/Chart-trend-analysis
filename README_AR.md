# V5.6.7.6 — Hard Execution Gate + Regime Validation

هذا الإصدار يشدد الفاصل بين **اتجاه فني جيد** وبين **ميزة تنفيذ قابلة للدفاع عنها بحثيًا**. لا يكفي أن ينجح Directional OOS؛ يجب أن ينجح نموذج Adaptive Entry V2 نفسه بعد التكاليف وأن يكون مستقرًا زمنيًا وفي حالة السوق الحالية.

## الجديد
- نفس Unified Decision Engine في Live MTF وMarket Scanner.
- Directional OOS يبقى طبقة مستقلة عن Execution Validation.
- بوابة تنفيذ فعلية لـ Adaptive Entry V2: `Execution PF >= 1.10`، `Average net R >= 0.020R`، `Wilson95 >= 42%`، وحجم عينة مناسب للفريم.
- Fold Stability Gate: يلزم 3 Folds مؤهلة رابحة على الأقل وMedian PF >= 1.05.
- **Hard Regime Gate**: حالة السوق الحالية يجب أن تكون `ALLOW`.
  - `INSUFFICIENT_SAMPLE` أو `WAIT_DEVELOPING` => WATCHLIST فقط.
  - `SKIP_SETUP` => BLOCKED.
- Edge Readiness داخل Live: `NO ROBUST EXECUTION EDGE` / `DEVELOPING` / `RESEARCH EDGE` / `STRONG RESEARCH EDGE CANDIDATE`.
- المرشح القوي بحثيًا يتطلب عينة تنفيذ أكبر واستقرارًا أعلى، لكنه يظل بحاجة إلى Holdout مستقل وForward Paper قبل وصفه بأنه Robust.
- Scanner لا يعرض مرشحًا نهائيًا ما لم يجتز نفس Execution + Regime gate المستخدم في Live.
- السيناريو Paper المعلّق يمكن أن يبقى PAUSED/WATCHLIST إذا انهارت بوابات التحقق.

## متى نقترب من Strong Research Edge؟
داخل هذا الإصدار، التصنيف القوي لا يظهر إلا عندما يحقق نموذج التنفيذ تقريبًا: `Resolved N >= 200`، `PF >= 1.20`، `AvgR >= 0.05R`، `Wilson95 >= 50%`، استقرار Folds قوي، وحالة Regime الحالية ذات عينة كافية وأداء موجب. هذا **ليس إثباتًا نهائيًا**؛ بعده نحتاج Sealed Holdout مستقل وForward Paper دون تغيير القواعد.

## مهم
- Final Status وTechnical Score ليسا احتمال ربح.
- كل Entry / Stop / TP مستويات **Paper/Research فقط**.
- لا تمثل النتائج توصية تداول حقيقي أو ضمانًا للأداء المستقبلي.

## التثبيت على GitHub Pages
ارفع جميع الملفات إلى جذر المستودع ثم افتح الرابط مع `?v=5.6.7.6`. إذا ظل الإصدار القديم ظاهرًا، امسح Site Data أو أزل الـPWA ثم ثبّته من جديد.
