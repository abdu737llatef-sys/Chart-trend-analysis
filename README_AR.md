# Chart Trend Analyzer V5.6.7
## Historical Lifecycle Simulator + A/B Entry Validator

يحافظ V5.6.7 على دورة السيناريو الحية من V5.6.6.1 ويستخدم نفس مفتاح localStorage:
`cta_v566_paper_scenarios`

وبذلك يستمر سيناريو Paper القديم عند التحديث ما دام المستخدم لم يحذف بيانات الموقع.

## طرق الدخول
A — Breakout Close:
إغلاق بعد مستوى الاختراق/الكسر ثم Paper execution عند Open الشمعة التالية.

B — Breakout + Retest:
إغلاق الاختراق ثم Retest ناجح وإغلاق تأكيدي ثم Paper execution عند Open الشمعة التالية.

C — Adaptive:
يستخدم منطق V5.6.6.1:
- مستوى قوي أو Momentum/Volume غير كافيين -> Retest.
- Momentum + Trend Strength + Volume قوية -> Continuation بدون Retest.

## المقاييس
Trigger rate, Resolved N, Win rate, PF after costs, Average net R, Wilson 95%, Max Drawdown R, Average bars to trigger, TP2 reach rate, Ambiguous OHLC.

## Paired trade-off
يحسب على نفس الإشارات:
- خسائر A التي تم تجنبها لأن B لم يسمح بالدخول.
- حركات A الرابحة التي ضاعت لأن B لم يحصل على Retest.
- حالات دخلت فيها الطريقتان وتحولت النتيجة من خسارة إلى ربح أو العكس.

## Folds
آخر ~60% من التاريخ مقسّم إلى 4 Chronological Folds مع Purge وlook-ahead buffer.

## Execution integrity
لا يستخدم Close شمعة التأكيد كسعر تعبئة.
التنفيذ البحثي = Open الشمعة التالية.

كل النتائج Paper Research فقط وليست توقعات أو تعليمات تداول حقيقية.
