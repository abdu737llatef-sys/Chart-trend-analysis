# V5.6.7.1 — Research & Lifecycle Integrity Fix

## تم إصلاح خطأ Research
الخطأ:
`fold is not defined`

كان سببه حفظ `fold` بدل `fold:f` داخل Historical Simulator.

## Historical MTF parity
Research على M15/H1 يبني الإشارة التاريخية باستخدام M15/H1/D1 المغلقة عند نفس النقطة الزمنية، بنفس وزن MTF المستخدم في Live.

D1 Research معطّل مؤقتًا لأن MTF parity الحقيقي لـ D1 يحتاج أرشيف M15 أعمق بكثير من ميزانية المتصفح الحالية.

## Exit benchmark الموحد
A/B/C تقارن طرق الدخول فقط:
- التنفيذ = Open الشمعة التالية بعد التأكيد.
- الخروج الإحصائي الكامل = TP1 عند +1.20R.
- TP2 لا يرفع PF أو Average R؛ يتم تسجيله كـ "TP2 potential after TP1" فقط.
- Stop/TP1 في نفس شمعة OHLC = AMBIGUOUS.

## Live Scenario
تمت إضافة:
- PAUSED_TECHNICAL إذا أصبح Current Setup محايدًا قبل التفعيل.
- السيناريو لا يُحذف، ويمكن استئنافه إذا عاد نفس الاتجاه قبل Expiry.
- الاتجاه المعاكس أو Higher-TF veto = INVALIDATED.
- Level Drift بين breakout الأصلي وS/R الحالي بوحدة ATR.
- REVALIDATION REQUIRED إذا أصبح drift >= 1 ATR.
- STALE_REVALIDATION يمنع تفعيل دخول جديد حتى يعود drift أقل من 0.75 ATR.
- Bars elapsed يُحفظ في كل تحليل حتى لو لم تتغير State.

## فصل الاتجاه عن Setup
يظهر الآن:
- Primary Trend
- Current Setup
- Market Structure

مثال:
Primary Trend = Bullish
Current Setup = Neutral / Compression

وهذا يفسر لماذا قد يصبح H1 Neutral دون كسر الدعم.

## Paper Research only
كل المستويات والاختبارات بحثية ومحاكاة فقط.
