# Chart Trend Analyzer V5.6 — Anti-Manipulation & Market Integrity Engine

V5.6 تضيف طبقة مستقلة لاكتشاف مخاطر الشذوذ والتلاعب المحتمل قبل قبول أي مرشح من Market Scanner.

## الفلاتر الأساسية
- Top Market Cap
- Binance USDT Spot only
- 24h Quote Volume
- Bid/Ask Spread
- Stablecoin / leveraged-token exclusion

## Market Integrity Engine

### 1. Cross-source price validation
يقارن عند توفر المصادر:
- Binance
- CoinGecko
- Coinbase

ويحسب Maximum Source Deviation.
الافتراضي يمنع المرشح إذا كان الاختلاف أكبر من 0.75%.

### 2. Order-book depth
يحسب قيمة Bid + Ask داخل ±0.5% من السعر الأوسط.
الافتراضي:
Minimum Depth = $500K.

### 3. Book imbalance
يراقب الاختلال الشديد بين عمق الشراء والبيع.
لا يستخدمه كإشارة شراء/بيع؛ يستخدمه فقط كمؤشر جودة/شذوذ.

### 4. Candle anomaly detector
يراقب:
- كثافة الويكات الطويلة
- Volume + rejection spikes
- repeated fake breakouts
- price discontinuities

### 5. Derivatives crowding
عند توفر Binance Futures:
- Funding Rate crowding
- Global Long/Short Ratio
- Open Interest shock

هذه عوامل crowding وليست إثباتًا للتلاعب.

## Integrity Score
0–100 منفصل تمامًا عن Technical Verification Score.

الإعداد الافتراضي:
- Minimum Integrity = 80
- Minimum Integrity Coverage = 70%
- Maximum cross-source deviation = 0.75%
- Minimum depth ±0.5% = $500K

Manipulation Risk = 100 - Integrity Score كقراءة مبسطة لمستوى الشذوذ.

## Final qualification
لا تظهر العملة في Strong Bullish / Strong Bearish إلا إذا اجتازت:
1. Market Cap / liquidity / spread
2. Technical Verification
3. MTF
4. Historical OOS
5. Profit Factor
6. Market Integrity
7. Depth and provider-agreement checks

## Paper Levels
Paper Entry / TP1 / TP2 / Stop تبقى للمحاكاة البحثية فقط وليست توصيات تداول حقيقية.

## تحديث GitHub Pages
استبدل كل ملفات النسخة السابقة بملفات V5.6 ثم Commit.

افتح:
https://YOURNAME.github.io/YOUR-REPO/?v=5.6

والـScanner مباشرة:
https://YOURNAME.github.io/YOUR-REPO/scanner.html?v=5.6
