# Chart Trend Analyzer V5.6.2 — Calibration Fix

## لماذا هذا التحديث؟
V5.6 كان صارمًا، لكن الاختبار أظهر أن:
- Abnormal Wick Density يظهر كثيرًا.
- Extreme Long/Short Crowding قد يكون حساسًا جدًا.
- Depth كرقم ثابت وحده غير كافٍ.
- جداول الهاتف كانت واسعة.
- نحتاج رؤية أقرب المرشحين حتى عند عدم وجود فرصة نهائية.

## التحسينات

### 1) ATR-normalized wick anomaly
بدل عد الويكات الطويلة فقط:
- يقيس wick ratio.
- يقارن Range مع ATR.
- يستخدم P90 داخل تاريخ العملة نفسه.
- لا يعاقب العملة إلا إذا كان الويك غير طبيعي مقارنة بسلوكها التاريخي.

### 2) Fake breakouts adjusted by volatility
يحسب تكرار الاختراقات الكاذبة ضمن سياق التذبذب بدل Threshold ثابت فقط.

### 3) Volume rejection percentile
لا يعتبر الحجم مرتفعًا لمجرد رقم ثابت؛ يستخدم 95th percentile من تاريخ العملة.

### 4) Derivatives percentiles
Funding / Long-Short / OI:
- يقارن القيمة الحالية بتاريخها الحديث.
- يظهر flag فقط إذا كانت في المنطقة القصوى تقريبًا >95th percentile.

### 5) Relative Depth
Depth الآن يقاس بطريقتين:
- قيمة مطلقة داخل ±0.5%.
- Depth / 24h Quote Volume.
وبالتالي لا يعامل كل العملات بنفس الرقم الثابت فقط.

### 6) Top 3 Closest Bullish / Bearish
إذا لم توجد فرص نهائية:
- يعرض أقرب 3 صاعدة.
- أقرب 3 هابطة.
- يوضح الشرط الناقص.
- لا يعرض Entry/TP/Stop لهم.

### 7) Mobile UI
تقليل عرض جداول diagnostics وإضافة بطاقات مختصرة للمرشحين القريبين.

## قاعدة Paper levels
Paper Entry / TP1 / TP2 / Stop تظهر فقط في Strong Bullish / Strong Bearish بعد اجتياز كل الفلاتر النهائية.

## التحديث
افتح:
https://YOURNAME.github.io/YOUR-REPO/?v=5.6.2

والـScanner:
https://YOURNAME.github.io/YOUR-REPO/scanner.html?v=5.6.2
