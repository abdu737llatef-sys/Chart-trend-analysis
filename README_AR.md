# Chart Trend Analyzer — Mobile PWA

هذه النسخة مصممة للعمل على هاتف Android من Chrome بدون Windows وبدون Flutter.

## ماذا تعمل؟
- Binance Spot
- Binance USD-M Futures
- D1 / H1 / M15
- EMA20 / EMA50 / EMA200
- RSI14
- ADX14 + DI+/DI-
- ATR14
- Volume / MA20
- HH / HL / LH / LL
- BOS
- Support / Resistance
- Breakout + Retest
- Trend Score لكل فريم
- Master Trend Score
- Candlestick chart
- PWA installable on Android
- OpenAI image verification اختياري عبر Backend آمن

## مهم جدًا
ملفات PWA تحتاج أن تكون على موقع HTTPS حتى يظهر خيار "تثبيت التطبيق".
فتح index.html مباشرة من ملفات الهاتف لن يعطي تجربة PWA كاملة.

## أسهل طريقة من الهاتف فقط

### الخيار 1: Netlify Drop
1. فك ZIP على الهاتف.
2. ادخل إلى Netlify من المتصفح.
3. أنشئ حسابًا أو سجّل الدخول.
4. استخدم أداة نشر موقع Static Site / Drop.
5. ارفع مجلد PWA كاملًا أو محتوياته.
6. بعد النشر ستحصل على رابط HTTPS.
7. افتح الرابط في Chrome.
8. من قائمة Chrome اختر:
   - Install app
   - أو Add to Home screen

### الخيار 2: GitHub Pages
1. أنشئ Repository جديدًا من الهاتف.
2. ارفع كل ملفات هذا المجلد إلى جذر Repository.
3. افتح Settings → Pages.
4. اختر Deploy from branch.
5. اختر main / root.
6. افتح رابط GitHub Pages من Chrome.
7. اختر Install app أو Add to Home screen.

## استخدام التطبيق
اكتب مثلًا:
BTCUSDT
ADAUSDT
ETHUSDT

ثم اختر Spot أو Futures واضغط "تحليل السوق".

## OpenAI
ميزة تحليل صورة TradingView لا تعمل بمفتاح داخل PWA لأن هذا غير آمن.
ضع Backend URL لخادم آمن يحتوي endpoint:
POST /api/verify-image

يمكن استخدام Backend V3 السابق إذا قمت بنشره على خادم HTTPS.

## ملاحظة
Trend Score هو تقييم فني تعليمي وليس احتمالًا مضمونًا ولا توصية شراء/بيع.
