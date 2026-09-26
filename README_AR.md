# V5.6.7.8 — Hard Execution Gate + Regime Validation

هذا الإصدار يشدد الفاصل بين **اتجاه فني جيد** وبين **ميزة تنفيذ قابلة للدفاع عنها بحثيًا**. لا يكفي أن ينجح Directional OOS؛ يجب أن ينجح نموذج Adaptive Entry V2 نفسه بعد التكاليف وأن يكون مستقرًا زمنيًا وفي حالة السوق الحالية.

## V5.6.7.8 — Closed-Candle Research Watch Fix
- Research Watch لم يعد يعتمد على تغيّر الشمعة المفتوحة فقط؛ بل يجلب آخر عدة شموع ويحدد **آخر شمعة مغلقة فعليًا** لكل من M15/H1/D1.
- عند ظهور شمعة مغلقة جديدة يعيد Live MTF التحليل تلقائيًا، ثم يقارن Paper Lifecycle قبل/بعد التحديث ويرسل تنبيهًا عند انتقال الحالة.
- إغلاق M15 فوق/أسفل مستوى سيناريو H1 يولّد **Early M15 observation** فقط. لا يتم تحويل H1 إلى READY/TRIGGERED قبل إغلاق H1 نفسه.
- WATCHLIST / Near-qualified أصبحت **مرجعية فقط**: يمكن رصد الاختراق، لكن لا تتحول إلى Paper Trigger حتى تصبح بوابة التنفيذ CONFIRMED/HIGH CONFIDENCE على شمعة مغلقة. الترقية تكون prospective ولا تستعمل اختراقًا تاريخيًا سابقًا كدخول متأخر.
- polling خفيف كل 15 ثانية أثناء عمل الصفحة، مع catch-up فوري عند العودة للتطبيق عبر visibility/focus/pageshow.
- أضيف Watch Diagnostics لإظهار آخر poll، إذن الإشعارات، وحالة ظهور الصفحة.

> ملاحظة تقنية: GitHub Pages/PWA ثابتة لا تضمن مؤقتات مستمرة عندما يجمّد Android/Chrome التطبيق في الخلفية. V5.6.7.8 يعالج الاستئناف والـcatch-up، أما تنبيه خلفي مضمون 24/7 فيحتاج لاحقًا Backend/Push service مستقل.

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
ارفع جميع الملفات إلى جذر المستودع ثم افتح الرابط مع `?v=5.6.7.8`. إذا ظل الإصدار القديم ظاهرًا، امسح Site Data أو أزل الـPWA ثم ثبّته من جديد.


## V5.6.7.8 — Tactical M15 Parallel Path

أضيف مسار Tactical M15 داخل نفس زر Live MTF. هذا المسار لا يشترط توافق M15/H1/D1 بالكامل. يبحث عن اندفاع M15 محلي قوي، ثم يستخدم H1 وD1 فقط كحارس تعارض قوي، مع Late-entry guard لمنع مطاردة الحركة بعد امتدادها.

لكل فرصة Tactical يتم تشغيل تحقق تاريخي مستقل على M15 بتقسيم زمني إلى 4 Folds، تنفيذ بحثي عند Open الشمعة التالية، تكاليف Round-trip، PF، Average R، Wilson 95% وMax Drawdown. المستويات المعروضة Paper/Research فقط، وTP1/TP2 يتكيفان مع ATR والبنية بدل فرض نسبة ثابتة 1–2%.

تم أيضًا إظهار Research Watch في الواجهة. يمكنه التنبيه عند اقتراب السعر من Tactical Paper Entry أو عند إغلاق شمعة M15 جديدة وإعادة تشغيل التحليل. تنبيهات المتصفح ليست خدمة خلفية مضمونة؛ قد يوقف Android المؤقت إذا علّق التطبيق أو المتصفح في الخلفية.
