const $=id=>document.getElementById(id);
let scannerCancelled=false;

const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const median=a=>{if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;};
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const STABLES=new Set(['USDT','USDC','FDUSD','TUSD','DAI','USDE','USDS','PYUSD','BUSD','USD1','EUR','EURC']);
const FALLBACK_LARGE=['BTC','ETH','BNB','XRP','SOL','DOGE','ADA','TRX','AVAX','LINK','BCH','DOT','LTC','SUI','XLM','HBAR','SHIB','UNI','AAVE','NEAR','ICP','ETC','FIL','APT','ARB','OP','ATOM'];
const leveragedRe=/(UP|DOWN|BULL|BEAR|3L|3S)$/i;

if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{
  const reg=await navigator.serviceWorker.register('./service-worker.js?v=5.6.0',{updateViaCache:'none'});
  await reg.update();
}catch(e){console.warn(e);}});

function ema(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;const k=2/(p+1);let z=mean(v.slice(0,p));o[p-1]=z;for(let i=p;i<v.length;i++){z=v[i]*k+z*(1-k);o[i]=z;}return o;}
function sma(v,p){const o=Array(v.length).fill(null);let s=0;for(let i=0;i<v.length;i++){s+=v[i];if(i>=p)s-=v[i-p];if(i>=p-1)o[i]=s/p;}return o;}
function rsi(c,p=14){const o=Array(c.length).fill(null);if(c.length<=p)return o;const g=[],l=[];for(let i=1;i<c.length;i++){const d=c[i]-c[i-1];g.push(Math.max(d,0));l.push(Math.max(-d,0));}let ag=mean(g.slice(0,p)),al=mean(l.slice(0,p));const f=()=>al===0?100:100-100/(1+ag/al);o[p]=f();for(let i=p+1;i<c.length;i++){ag=(ag*(p-1)+g[i-1])/p;al=(al*(p-1)+l[i-1])/p;o[i]=f();}return o;}
function atr(cs,p=14){const tr=cs.map((c,i)=>i===0?c.high-c.low:Math.max(c.high-c.low,Math.abs(c.high-cs[i-1].close),Math.abs(c.low-cs[i-1].close)));const o=Array(cs.length).fill(null);if(cs.length<p)return o;let x=mean(tr.slice(0,p));o[p-1]=x;for(let i=p;i<cs.length;i++){x=(x*(p-1)+tr[i])/p;o[i]=x;}return o;}
function wilder(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;let s=v.slice(0,p).reduce((a,b)=>a+b,0);o[p-1]=s;for(let i=p;i<v.length;i++){s=s-s/p+(v[i]||0);o[i]=s;}return o;}
function adx(cs,p=14){const n=cs.length,pd=Array(n).fill(0),md=Array(n).fill(0),tr=Array(n).fill(0);for(let i=1;i<n;i++){const up=cs[i].high-cs[i-1].high,dn=cs[i-1].low-cs[i].low;pd[i]=up>dn&&up>0?up:0;md[i]=dn>up&&dn>0?dn:0;tr[i]=Math.max(cs[i].high-cs[i].low,Math.abs(cs[i].high-cs[i-1].close),Math.abs(cs[i].low-cs[i-1].close));}const t=wilder(tr.slice(1),p),pp=wilder(pd.slice(1),p),mm=wilder(md.slice(1),p),plus=Array(n).fill(null),minus=Array(n).fill(null),dx=Array(n).fill(null),ao=Array(n).fill(null);for(let j=p-1;j<t.length;j++){const i=j+1;if(!t[j])continue;plus[i]=100*pp[j]/t[j];minus[i]=100*mm[j]/t[j];const den=plus[i]+minus[i];dx[i]=den?100*Math.abs(plus[i]-minus[i])/den:0;}const vals=[],idx=[];for(let i=0;i<n;i++)if(dx[i]!=null){vals.push(dx[i]);idx.push(i);}if(vals.length>=p){let a=mean(vals.slice(0,p));ao[idx[p-1]]=a;for(let k=p;k<vals.length;k++){a=(a*(p-1)+vals[k])/p;ao[idx[k]]=a;}}return{adx:ao,plus,minus};}
function macd(c){const f=ema(c,12),s=ema(c,26),line=c.map((_,i)=>f[i]!=null&&s[i]!=null?f[i]-s[i]:null),compact=line.filter(x=>x!=null),sigc=ema(compact,9),signal=Array(c.length).fill(null);let j=0;for(let i=0;i<c.length;i++)if(line[i]!=null)signal[i]=sigc[j++]??null;return{line,signal,hist:line.map((x,i)=>x!=null&&signal[i]!=null?x-signal[i]:null)};}
function ichimoku(cs){const mid=(i,p)=>{if(i<p-1)return null;let hi=-Infinity,lo=Infinity;for(let j=i-p+1;j<=i;j++){hi=Math.max(hi,cs[j].high);lo=Math.min(lo,cs[j].low);}return(hi+lo)/2;};const t=[],k=[],a=[],b=[];for(let i=0;i<cs.length;i++){const x=mid(i,9),y=mid(i,26);t.push(x);k.push(y);a.push(x!=null&&y!=null?(x+y)/2:null);b.push(mid(i,52));}return{tenkan:t,kijun:k,spanA:a,spanB:b};}
function confirmedPivots(cs,l=3,r=3){const hs=[],ls=[];for(let i=l;i<cs.length-r;i++){let h=true,lo=true;for(let j=i-l;j<=i+r;j++){if(j===i)continue;if(cs[j].high>=cs[i].high)h=false;if(cs[j].low<=cs[i].low)lo=false;}if(h)hs.push({i,confirmed:i+r,price:cs[i].high});if(lo)ls.push({i,confirmed:i+r,price:cs[i].low});}return{hs,ls};}
function lastNN(a){for(let i=a.length-1;i>=0;i--)if(a[i]!=null&&Number.isFinite(a[i]))return a[i];return null;}

function analyze(cs){
 const c=cs.map(x=>x.close),v=cs.map(x=>x.volume||0),e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),R=rsi(c),A=adx(cs),M=macd(c),I=ichimoku(cs),AT=atr(cs),vma=sma(v,20),piv=confirmedPivots(cs),last=cs.at(-1),i=cs.length-1;
 const E20=lastNN(e20),E50=lastNN(e50),E200=lastNN(e200),rv=lastNN(R),adxv=lastNN(A.adx),p=lastNN(A.plus),m=lastNN(A.minus),atrv=lastNN(AT),ten=lastNN(I.tenkan),kij=lastNN(I.kijun),sa=lastNN(I.spanA),sb=lastNN(I.spanB),mac=lastNN(M.line),sig=lastNN(M.signal),hist=lastNN(M.hist),vr=vma[i]?last.volume/vma[i]:1;
 let trend=50;if(last.close>E20&&E20>E50&&E50>E200)trend=92;else if(last.close>E50&&E50>E200)trend=73;else if(last.close<E20&&E20<E50&&E50<E200)trend=8;else if(last.close<E50&&E50<E200)trend=27;
 const top=Math.max(sa,sb),bot=Math.min(sa,sb);let ichi=50;if(last.close>top&&ten>kij)ichi=92;else if(last.close>top)ichi=72;else if(last.close<bot&&ten<kij)ichi=8;else if(last.close<bot)ichi=28;
 let mom=rv>=60?86:rv>=55?74:rv>=50?61:rv>=45?39:rv>=40?26:14;mom=(mom+(mac>sig&&hist>0?84:mac>sig?68:mac<sig&&hist<0?16:32))/2;
 let strength=50;if(adxv>=25&&p>m)strength=88;else if(adxv>=20&&p>m)strength=70;else if(adxv>=25&&m>p)strength=12;else if(adxv>=20&&m>p)strength=30;
 const ah=piv.hs.filter(x=>x.confirmed<=i),al=piv.ls.filter(x=>x.confirmed<=i);let structure=50;if(ah.length>=2&&al.length>=2){const hh=ah.at(-1).price>ah.at(-2).price,hl=al.at(-1).price>al.at(-2).price,lh=ah.at(-1).price<ah.at(-2).price,ll=al.at(-1).price<al.at(-2).price;if(hh&&hl)structure=92;else if(lh&&ll)structure=8;else if(hh&&ll)structure=62;else if(lh&&hl)structure=38;}
 let volumeFlow=50;if(vr>=1.5&&last.close>last.open)volumeFlow=88;else if(vr>=1.2&&last.close>last.open)volumeFlow=72;else if(vr>=1.5&&last.close<last.open)volumeFlow=12;else if(vr>=1.2&&last.close<last.open)volumeFlow=28;
 const score=structure*.24+((trend+ichi)/2)*.30+mom*.18+strength*.15+volumeFlow*.13;
 const resistance=ah.length?ah.at(-1).price:Math.max(...cs.slice(-30).map(x=>x.high)),support=al.length?al.at(-1).price:Math.min(...cs.slice(-30).map(x=>x.low));
 return{price:last.close,score,side:score>=65?1:score<=35?-1:0,structure,trend:(trend+ichi)/2,momentum:mom,strength,volumeFlow,atr:atrv,support,resistance};
}

function barrierOutcome(cs,i,dir,atrv,h=12){
 const e=cs[i].close,f=atrv,a=atrv,F=dir===1?e+f:e-f,A=dir===1?e-a:e+a;
 for(let j=i+1;j<=Math.min(cs.length-1,i+h);j++){const hf=dir===1?cs[j].high>=F:cs[j].low<=F,ha=dir===1?cs[j].low<=A:cs[j].high>=A;if(hf&&ha)return'amb';if(hf)return'win';if(ha)return'loss';}
 return'timeout';
}

async function fetchJson(url,timeout=18000){
 const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),timeout);
 try{const r=await fetch(url,{signal:ctl.signal,cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}
 finally{clearTimeout(t);}
}
async function fetchKlines(symbol,interval,limit=360){
 const d=await fetchJson(`https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${Math.min(limit,1000)}`);
 if(!Array.isArray(d))throw new Error('No klines');
 return d.map(x=>({time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]}));
}

async function getUniverse(){
 try{
   const d=await fetchJson('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false',20000);
   if(!Array.isArray(d)||!d.length)throw new Error('empty');
   return{source:'CoinGecko market-cap feed',coins:d.map(x=>({
     symbol:String(x.symbol||'').toUpperCase(),name:x.name||x.symbol,rank:+x.market_cap_rank||9999,
     marketCap:+x.market_cap||0,currentPrice:+x.current_price||null
   }))};
 }catch(e){
   return{source:'Conservative built-in large-cap fallback',coins:FALLBACK_LARGE.map((s,i)=>({symbol:s,name:s,rank:i+1,marketCap:null,currentPrice:null,fallback:true}))};
 }
}

async function getBinanceSnapshot(){
 const [exchange,tickers,books]=await Promise.all([
   fetchJson('https://data-api.binance.vision/api/v3/exchangeInfo'),
   fetchJson('https://data-api.binance.vision/api/v3/ticker/24hr'),
   fetchJson('https://data-api.binance.vision/api/v3/ticker/bookTicker')
 ]);
 const allowed=new Set((exchange.symbols||[]).filter(x=>x.quoteAsset==='USDT'&&x.status==='TRADING'&&x.isSpotTradingAllowed!==false).map(x=>x.symbol));
 return{allowed,tmap:new Map((tickers||[]).map(x=>[x.symbol,x])),bmap:new Map((books||[]).map(x=>[x.symbol,x]))};
}

async function mapLimit(items,limit,fn){
 const out=new Array(items.length);let next=0;
 async function worker(){while(true){const i=next++;if(i>=items.length||scannerCancelled)return;try{out[i]=await fn(items[i],i);}catch(e){out[i]={error:e.message,item:items[i]};}}}
 await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
 return out;
}

function tfWeights(tf){if(tf==='15m')return{'15m':.50,'1h':.30,'1d':.20};if(tf==='1h')return{'15m':.15,'1h':.55,'1d':.30};return{'15m':.10,'1h':.25,'1d':.65};}
async function getMtf(symbol,baseTf,baseCandles){
 const tfs=['15m','1h','1d'],rows={};
 await Promise.all(tfs.map(async tf=>{const cs=tf===baseTf?baseCandles:await fetchKlines(symbol,tf,tf==='1d'?400:420);rows[tf]={a:analyze(cs)};}));
 const w=tfWeights(baseTf),mtf=Object.keys(w).reduce((s,tf)=>s+rows[tf].a.score*w[tf],0),dirs=Object.values(rows).map(x=>x.a.side).filter(Boolean);
 return{mtf,agreement:dirs.length?Math.abs(dirs.reduce((s,x)=>s+x,0))/dirs.length:0};
}
async function marketContexts(){
 const out={};
 for(const tf of ['15m','1h','1d']){
   const[b,e]=await Promise.all([fetchKlines('BTCUSDT',tf,400),fetchKlines('ETHUSDT',tf,400)]),ba=analyze(b),ea=analyze(e);
   out[tf]={score:ba.score*.60+ea.score*.40,btc:ba.score,eth:ea.score};
 }
 return out;
}
function validateSide(cs,targetSide){
 const start=Math.max(280,Math.floor(cs.length*.70)),end=cs.length-14;let wins=0,losses=0,amb=0,timeouts=0,signals=0;
 for(let i=start;i<end;i+=2){if(scannerCancelled)break;const w=cs.slice(Math.max(0,i-279),i+1);if(w.length<230)continue;const a=analyze(w);if(a.side!==targetSide)continue;signals++;const out=barrierOutcome(cs,i,targetSide,a.atr,12);if(out==='win')wins++;else if(out==='loss')losses++;else if(out==='amb')amb++;else timeouts++;}
 const resolved=wins+losses;return{signals,resolved,wins,losses,amb,timeouts,acc:resolved?wins/resolved:0,pf:losses?wins/losses:(wins?99:0)};
}
function paperLevels(a,side){
 const atrv=a.atr||a.price*.01,buf=.12*atrv;let entry,stop,tp1,tp2;
 if(side===1){entry=Math.max(a.price,a.resistance+buf);const structural=a.support-buf;let risk=entry-structural;risk=Math.max(.85*atrv,Math.min(risk,1.60*atrv));stop=entry-risk;tp1=entry+1.20*risk;tp2=entry+2.00*risk;}
 else{entry=Math.min(a.price,a.support-buf);const structural=a.resistance+buf;let risk=structural-entry;risk=Math.max(.85*atrv,Math.min(risk,1.60*atrv));stop=entry+risk;tp1=entry-1.20*risk;tp2=entry-2.00*risk;}
 return{entry,stop,tp1,tp2};
}

// ---------------- MARKET INTEGRITY ENGINE ----------------

async function fetchDepth(symbol){
 return await fetchJson(`https://data-api.binance.vision/api/v3/depth?symbol=${encodeURIComponent(symbol)}&limit=100`,15000);
}
function depthIntegrity(depth,mid,minDepth){
 if(!depth||!Array.isArray(depth.bids)||!Array.isArray(depth.asks)||!mid)return{available:false};
 const bidFloor=mid*.995,askCeil=mid*1.005;
 const bidDepth=depth.bids.reduce((s,x)=>{const p=+x[0],q=+x[1];return p>=bidFloor?s+p*q:s;},0);
 const askDepth=depth.asks.reduce((s,x)=>{const p=+x[0],q=+x[1];return p<=askCeil?s+p*q:s;},0);
 const total=bidDepth+askDepth,imb=total?Math.abs(bidDepth-askDepth)/total:1,ratio=minDepth?total/minDepth:0;
 const depthScore=ratio>=4?100:ratio>=2?92:ratio>=1?82:ratio>=.5?58:ratio>=.25?35:15;
 const balanceScore=imb<=.20?100:imb<=.35?88:imb<=.50?70:imb<=.65?45:20;
 const flags=[];
 if(total<minDepth)flags.push('Thin depth');
 if(imb>.65)flags.push('Extreme book imbalance');
 return{available:true,bidDepth,askDepth,total,imbalance:imb,depthScore,balanceScore,flags};
}

function candleIntegrity(cs){
 const recent=cs.slice(-80),vols=recent.map(x=>x.volume||0),medVol=median(vols.filter(x=>x>0));
 let rejections=0,fakeBreaks=0,spikeReject=0,gaps=0;
 for(let i=1;i<recent.length;i++){
   const c=recent[i],range=c.high-c.low;
   if(range<=0)continue;
   const body=Math.abs(c.close-c.open),upper=c.high-Math.max(c.open,c.close),lower=Math.min(c.open,c.close)-c.low;
   const wick=(upper+lower)/range,bodyRatio=body/range;
   const rejection=wick>.72&&bodyRatio<.22;
   if(rejection)rejections++;
   if(rejection&&medVol>0&&c.volume>medVol*4)spikeReject++;
   const gap=Math.abs(c.open-recent[i-1].close)/recent[i-1].close;
   if(gap>.012)gaps++;
   if(i>=20){
     const prior=recent.slice(i-20,i);
     const ph=Math.max(...prior.map(x=>x.high)),pl=Math.min(...prior.map(x=>x.low));
     if((c.high>ph&&c.close<ph)||(c.low<pl&&c.close>pl))fakeBreaks++;
   }
 }
 let score=100-rejections*1.3-fakeBreaks*4-spikeReject*10-gaps*7;
 score=clamp(score);
 const flags=[];
 if(spikeReject>=1)flags.push('Volume rejection spike');
 if(fakeBreaks>=4)flags.push('Repeated fake breakouts');
 if(rejections>=12)flags.push('Abnormal wick density');
 if(gaps>=2)flags.push('Price discontinuity');
 return{available:true,score,rejections,fakeBreaks,spikeReject,gaps,flags};
}

async function coinbaseSpot(base){
 try{
   const d=await fetchJson(`https://api.coinbase.com/v2/prices/${encodeURIComponent(base)}-USD/spot`,10000);
   const p=+(d?.data?.amount);
   return Number.isFinite(p)&&p>0?p:null;
 }catch{return null;}
}
function deviationScore(maxDev){
 return maxDev<=.0015?100:maxDev<=.003?95:maxDev<=.005?85:maxDev<=.0075?75:maxDev<=.012?55:maxDev<=.02?30:10;
}
async function crossSourceIntegrity(base,binancePrice,coinGeckoPrice,maxAllowed){
 const sources=[{name:'Binance',price:binancePrice}];
 if(Number.isFinite(coinGeckoPrice)&&coinGeckoPrice>0)sources.push({name:'CoinGecko',price:coinGeckoPrice});
 const cb=await coinbaseSpot(base);
 if(Number.isFinite(cb)&&cb>0)sources.push({name:'Coinbase',price:cb});
 if(sources.length<2)return{available:false,sources,maxDeviation:null,score:null,flags:['Independent price coverage low']};
 const med=median(sources.map(x=>x.price)),devs=sources.map(x=>Math.abs(x.price-med)/med),maxDev=Math.max(...devs);
 const flags=[];
 if(maxDev>maxAllowed)flags.push('Cross-source price disagreement');
 return{available:true,sources,maxDeviation:maxDev,score:deviationScore(maxDev),flags};
}

async function derivativesIntegrity(symbol){
 try{
   const [premium,ls,hist]=await Promise.all([
     fetchJson(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`,10000),
     fetchJson(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${encodeURIComponent(symbol)}&period=15m&limit=2`,10000),
     fetchJson(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${encodeURIComponent(symbol)}&period=15m&limit=2`,10000)
   ]);
   const funding=Math.abs((+premium.lastFundingRate||0)*100);
   const ratio=Array.isArray(ls)&&ls.length?+ls.at(-1).longShortRatio:null;
   let oiChange=null;
   if(Array.isArray(hist)&&hist.length>=2){
     const a=+hist[0].sumOpenInterestValue,b=+hist.at(-1).sumOpenInterestValue;
     if(a>0)oiChange=Math.abs(b/a-1)*100;
   }
   const fs=funding<=.03?100:funding<=.05?92:funding<=.10?70:funding<=.20?42:20;
   const rs=ratio==null?null:(ratio>=.75&&ratio<=1.33?100:ratio>=.60&&ratio<=1.67?82:ratio>=.50&&ratio<=2?60:30);
   const os=oiChange==null?null:(oiChange<=3?100:oiChange<=6?82:oiChange<=10?58:30);
   const vals=[fs,rs,os].filter(Number.isFinite),score=mean(vals);
   const flags=[];
   if(funding>.10)flags.push('Funding crowding');
   if(ratio!=null&&(ratio<.50||ratio>2))flags.push('Extreme long/short crowding');
   if(oiChange!=null&&oiChange>10)flags.push('Open-interest shock');
   return{available:true,score,funding,ratio,oiChange,flags};
 }catch{
   return{available:false,flags:[]};
 }
}

function spreadIntegrity(spread){
 const pct=spread*100;
 const score=pct<=.03?100:pct<=.05?96:pct<=.10?84:pct<=.15?68:pct<=.25?42:15;
 return{available:true,score,flags:pct>.15?['Wide spread']:[]};
}

async function integrityEngine(x,hist,cfg){
 const mid=x.a.price;
 const [depth,cross,deriv]=await Promise.all([
   fetchDepth(x.pair).then(d=>depthIntegrity(d,mid,cfg.minDepth)).catch(()=>({available:false,flags:['Depth unavailable']})),
   crossSourceIntegrity(x.symbol,mid,x.currentPrice,cfg.maxSourceDev),
   derivativesIntegrity(x.pair)
 ]);
 const candles=candleIntegrity(hist),spread=spreadIntegrity(x.spread);

 const components=[
   {name:'Spread',w:15,d:spread},
   {name:'Depth',w:20,d:depth.available?{available:true,score:depth.depthScore,flags:depth.flags}:depth},
   {name:'Book balance',w:10,d:depth.available?{available:true,score:depth.balanceScore,flags:[]}:{available:false}},
   {name:'Cross-source',w:20,d:cross},
   {name:'Candle anomalies',w:20,d:candles},
   {name:'Derivatives crowding',w:15,d:deriv}
 ];
 let sum=0,weight=0,totalW=components.reduce((s,c)=>s+c.w,0);
 for(const c of components)if(c.d?.available&&Number.isFinite(c.d.score)){sum+=c.d.score*c.w;weight+=c.w;}
 const coverage=totalW?weight/totalW:0;
 let score=weight?sum/weight:0;
 score=score*(.90+.10*coverage);
 score=clamp(score);
 const risk=100-score;
 const flags=[...new Set(components.flatMap(c=>c.d?.flags||[]))];

 const passDepth=depth.available&&depth.total>=cfg.minDepth;
 const passCross=!cross.available||cross.maxDeviation<=cfg.maxSourceDev;
 const pass=score>=cfg.minIntegrity&&coverage>=cfg.minCoverage&&passDepth&&passCross;

 return{score,risk,coverage,pass,flags,depth,cross,deriv,candles,spread};
}

const usd=x=>{if(!Number.isFinite(x))return'N/A';if(x>=1e12)return'$'+(x/1e12).toFixed(2)+'T';if(x>=1e9)return'$'+(x/1e9).toFixed(2)+'B';if(x>=1e6)return'$'+(x/1e6).toFixed(1)+'M';if(x>=1e3)return'$'+(x/1e3).toFixed(1)+'K';return'$'+x.toFixed(0);};
const priceFmt=x=>{if(!Number.isFinite(x))return'N/A';if(x>=1000)return x.toFixed(2);if(x>=1)return x.toFixed(4);if(x>=.01)return x.toFixed(6);return x.toPrecision(6);};
function metric(label,value,cls=''){return`<div class="metric"><small>${label}</small><b class="${cls}">${value}</b></div>`;}
function progress(done,total,label){const p=total?Math.round(done/total*100):0;$('status').innerHTML=`<div>${esc(label)} — ${done}/${total}</div><div class="progressbar"><div style="width:${p}%"></div></div>`;}

function integrityClass(x){return x>=80?'integrityGood':x>=65?'integrityMid':'integrityBad';}
function riskClass(x){return x<=20?'riskLow':x<=35?'riskMid':'riskHigh';}
function sourceText(cross){
 if(!cross?.available)return'1 source';
 return cross.sources.map(x=>x.name).join(' / ');
}
function flagHtml(flags){
 if(!flags?.length)return'<span class="okflag">No major anomaly flag</span>';
 return flags.map(x=>`<span class="flag">${esc(x)}</span>`).join('');
}

function rejectReason(x,cfg){
 const a=[];
 if(x.side===1&&x.verified<cfg.bullMin)a.push('Technical<'+cfg.bullMin);
 if(x.side===-1&&x.verified>cfg.bearMax)a.push('Technical>'+cfg.bearMax);
 if(x.validation.resolved<20)a.push('OOS sample');
 if(x.validation.acc<cfg.minAcc)a.push('OOS accuracy');
 if(x.validation.pf<cfg.minPF)a.push('PF');
 if(x.integrity.score<cfg.minIntegrity)a.push('Integrity');
 if(x.integrity.coverage<cfg.minCoverage)a.push('Integrity coverage');
 if(!x.integrity.depth.available||x.integrity.depth.total<cfg.minDepth)a.push('Thin depth');
 if(x.integrity.cross.available&&x.integrity.cross.maxDeviation>cfg.maxSourceDev)a.push('Provider disagreement');
 return a.join(' / ')||'Qualified';
}

function resultsTable(rows,side){
 if(!rows.length)return`<div class="note warn">لا توجد عملات اجتازت جميع شروط Technical + OOS + Integrity الآن. عدم وجود نتيجة أفضل من فرض فرصة ضعيفة.</div>`;
 return`<table class="scanTable integrityTable"><thead><tr>
 <th>Coin</th><th>Verification</th><th>Integrity</th><th>Risk</th><th>OOS</th><th>PF</th><th>MTF</th>
 <th>Depth ±0.5%</th><th>Sources</th><th>Market Cap</th><th>24h Volume</th><th>Spread</th>
 <th>Paper Entry</th><th>TP1</th><th>TP2</th><th>Stop</th><th></th>
 </tr></thead><tbody>${rows.map(x=>`<tr>
 <td class="coinCell">${esc(x.symbol)}<div class="rankTag">Rank #${x.rank??'—'}</div></td>
 <td class="${side===1?'score90':'score10'}">${x.verified.toFixed(1)}</td>
 <td class="${integrityClass(x.integrity.score)}">${x.integrity.score.toFixed(1)}</td>
 <td class="${riskClass(x.integrity.risk)}">${x.integrity.risk.toFixed(1)}</td>
 <td>${(x.validation.acc*100).toFixed(1)}% <span class="rankTag">(${x.validation.resolved})</span></td>
 <td>${x.validation.pf.toFixed(2)}</td>
 <td>${x.mtf.toFixed(1)} <span class="rankTag">${Math.round(x.agreement*100)}% align</span></td>
 <td>${x.integrity.depth.available?usd(x.integrity.depth.total):'N/A'}</td>
 <td>${esc(sourceText(x.integrity.cross))}</td>
 <td>${x.marketCap?usd(x.marketCap):'Fallback large-cap'}</td>
 <td>${usd(x.quoteVolume)}</td>
 <td>${(x.spread*100).toFixed(3)}%</td>
 <td>${priceFmt(x.levels.entry)}</td><td>${priceFmt(x.levels.tp1)}</td><td>${priceFmt(x.levels.tp2)}</td><td>${priceFmt(x.levels.stop)}</td>
 <td><button class="analyzeBtn" onclick="openFull('${esc(x.symbol)}')">تحليل كامل</button></td>
 </tr>`).join('')}</tbody></table>`;
}

function integrityTable(rows){
 if(!rows.length)return'<div class="muted">لا توجد بيانات.</div>';
 return`<table class="scanTable integrityTable"><thead><tr>
 <th>Coin</th><th>Integrity</th><th>Risk</th><th>Coverage</th><th>Depth</th><th>Book imbalance</th>
 <th>Max source dev</th><th>Candle integrity</th><th>Derivatives</th><th>Flags</th>
 </tr></thead><tbody>${rows.map(x=>`<tr>
 <td class="coinCell">${esc(x.symbol)}</td>
 <td class="${integrityClass(x.integrity.score)}">${x.integrity.score.toFixed(1)}</td>
 <td class="${riskClass(x.integrity.risk)}">${x.integrity.risk.toFixed(1)}</td>
 <td>${Math.round(x.integrity.coverage*100)}%<div class="coverageBar"><div style="width:${Math.round(x.integrity.coverage*100)}%"></div></div></td>
 <td>${x.integrity.depth.available?usd(x.integrity.depth.total):'N/A'}</td>
 <td>${x.integrity.depth.available?(x.integrity.depth.imbalance*100).toFixed(1)+'%':'N/A'}</td>
 <td>${x.integrity.cross.available?(x.integrity.cross.maxDeviation*100).toFixed(3)+'%':'N/A'}</td>
 <td>${x.integrity.candles.score.toFixed(0)}/100</td>
 <td>${x.integrity.deriv.available?x.integrity.deriv.score.toFixed(0)+'/100':'N/A'}</td>
 <td>${flagHtml(x.integrity.flags)}</td>
 </tr>`).join('')}</tbody></table>`;
}

function nearTable(rows){
 if(!rows.length)return'<div class="muted">لا توجد بيانات تشخيصية.</div>';
 return`<table class="scanTable"><thead><tr><th>Coin</th><th>Side</th><th>Verification</th><th>Integrity</th><th>OOS</th><th>PF</th><th>Rejected because</th></tr></thead>
 <tbody>${rows.slice(0,16).map(x=>`<tr><td class="coinCell">${esc(x.symbol)}</td><td>${x.side===1?'Bullish':'Bearish'}</td><td>${x.verified.toFixed(1)}</td><td class="${integrityClass(x.integrity.score)}">${x.integrity.score.toFixed(1)}</td><td>${(x.validation.acc*100).toFixed(1)}%</td><td>${x.validation.pf.toFixed(2)}</td><td>${esc(x.reason)}</td></tr>`).join('')}</tbody></table>`;
}

window.openFull=symbol=>{location.href=`./?v=5.6&symbol=${encodeURIComponent(symbol)}`;};

$('cancelScannerBtn').onclick=()=>{scannerCancelled=true;$('status').textContent='تم طلب الإيقاف؛ سيتوقف بعد انتهاء الطلبات الجارية.';};

$('runScannerBtn').onclick=async()=>{
 const btn=$('runScannerBtn');btn.disabled=true;scannerCancelled=false;$('cancelScannerBtn').classList.remove('hidden');
 ['scannerSummary','bullishCard','bearishCard','integrityCard','nearMissCard'].forEach(id=>$(id).classList.add('hidden'));

 const cfg={
   tf:$('scanTf').value,topRank:+$('scanTopRank').value,minCap:+$('scanMinCap').value,minVol:+$('scanMinVol').value,
   maxSpread:+$('scanMaxSpread').value,minDepth:+$('scanMinDepth').value,minIntegrity:+$('scanMinIntegrity').value,
   minCoverage:+$('scanMinCoverage').value,maxSourceDev:+$('scanMaxSourceDev').value,maxResults:+$('scanMaxResults').value,
   bullMin:+$('scanBullMin').value,bearMax:+$('scanBearMax').value,minAcc:+$('scanMinAcc').value,minPF:+$('scanMinPF').value
 };

 try{
   $('status').textContent='Stage 1/4: تحميل القيمة السوقية والسيولة والسبريد...';
   const [u,snap,ctx]=await Promise.all([getUniverse(),getBinanceSnapshot(),marketContexts()]);

   let candidates=[];
   for(const c of u.coins){
     if(c.rank>cfg.topRank||STABLES.has(c.symbol)||leveragedRe.test(c.symbol))continue;
     if(c.marketCap!=null&&c.marketCap<cfg.minCap)continue;
     const pair=c.symbol+'USDT';
     if(!snap.allowed.has(pair))continue;
     const t=snap.tmap.get(pair),b=snap.bmap.get(pair);if(!t||!b)continue;
     const qv=+t.quoteVolume||0,bid=+b.bidPrice||0,ask=+b.askPrice||0,mid=(bid+ask)/2,spread=mid>0?(ask-bid)/mid:999;
     if(qv<cfg.minVol||spread>cfg.maxSpread)continue;
     candidates.push({...c,pair,quoteVolume:qv,spread,binancePrice:+t.lastPrice||mid});
   }
   candidates.sort((a,b)=>a.rank-b.rank||b.quoteVolume-a.quoteVolume);
   const deep=candidates.slice(0,Math.min(40,candidates.length));

   let done=0;
   const initial=await mapLimit(deep,5,async c=>{
     const cs=await fetchKlines(c.pair,cfg.tf,360),a=analyze(cs);
     done++;progress(done,deep.length,'Stage 2/4: التحليل الفني الأولي');
     return{...c,base:cs,a,raw:a.score};
   });
   if(scannerCancelled)throw new Error('Scan cancelled');

   const usable=initial.filter(x=>x&&!x.error&&x.a);
   const bullPool=[...usable].sort((a,b)=>b.raw-a.raw).slice(0,10);
   const bearPool=[...usable].sort((a,b)=>a.raw-b.raw).slice(0,10);
   const finalists=[...new Map([...bullPool,...bearPool].map(x=>[x.pair,x])).values()];

   done=0;
   const final=await mapLimit(finalists,3,async x=>{
     const mtf=await getMtf(x.pair,cfg.tf,x.base);
     const side=x.raw>=50?1:-1;
     const hist=await fetchKlines(x.pair,cfg.tf,900);
     const validation=validateSide(hist,side);
     const context=ctx[cfg.tf].score;
     const blend=x.a.score*.55+mtf.mtf*.30+context*.15;
     const verified=clamp(50+(blend-50)*1.55);
     const integrity=await integrityEngine(x,hist,cfg);
     const levels=paperLevels(x.a,side);
     done++;progress(done,finalists.length,'Stage 3/4: MTF + OOS + Market Integrity');
     return{...x,side,mtf:mtf.mtf,agreement:mtf.agreement,context,verified,validation,integrity,levels};
   });
   if(scannerCancelled)throw new Error('Scan cancelled');

   const good=final.filter(x=>x&&!x.error);
   const qualifies=x=>x.validation.resolved>=20&&x.validation.acc>=cfg.minAcc&&x.validation.pf>=cfg.minPF&&x.integrity.pass;
   const bulls=good.filter(x=>x.side===1&&x.verified>=cfg.bullMin&&qualifies(x))
     .sort((a,b)=>b.integrity.score-a.integrity.score||b.verified-a.verified||b.validation.pf-a.validation.pf).slice(0,cfg.maxResults);
   const bears=good.filter(x=>x.side===-1&&x.verified<=cfg.bearMax&&qualifies(x))
     .sort((a,b)=>b.integrity.score-a.integrity.score||a.verified-b.verified||b.validation.pf-a.validation.pf).slice(0,cfg.maxResults);

   const q=new Set([...bulls,...bears].map(x=>x.pair));
   const near=good.filter(x=>!q.has(x.pair)).map(x=>({...x,reason:rejectReason(x,cfg)}))
     .sort((a,b)=>b.integrity.score-a.integrity.score||Math.abs(b.verified-50)-Math.abs(a.verified-50));

   ['scannerSummary','bullishCard','bearishCard','integrityCard','nearMissCard'].forEach(id=>$(id).classList.remove('hidden'));

   const lowIntegrity=good.filter(x=>!x.integrity.pass).length;
   $('scannerSummary').innerHTML=`<h2>V5.6 Scanner Summary</h2><div class="metrics">
     ${metric('Market-cap source',esc(u.source))}
     ${metric('Eligible universe',candidates.length)}
     ${metric('Deep-scanned',deep.length)}
     ${metric('Integrity-tested',good.length)}
     ${metric('Integrity-blocked',lowIntegrity,'bad')}
     ${metric('Strong bullish',bulls.length,'good')}
     ${metric('Strong bearish',bears.length,'bad')}
     ${metric('BTC/ETH context',ctx[cfg.tf].score.toFixed(1))}
   </div><p class="muted">المرشح النهائي يجب أن يمر عبر: Technical → MTF → OOS → PF → Depth → Cross-source → Anomaly Guard. عدم وجود مرشح نهائي نتيجة مقبولة.</p>`;

   $('bullishTable').innerHTML=resultsTable(bulls,1);
   $('bearishTable').innerHTML=resultsTable(bears,-1);
   $('integrityTable').innerHTML=integrityTable([...good].sort((a,b)=>a.integrity.score-b.integrity.score));
   $('nearMissTable').innerHTML=nearTable(near);

   $('status').textContent=`Stage 4/4 complete: ${bulls.length} Bullish و${bears.length} Bearish اجتازوا جميع فلاتر V5.6.`;
 }catch(e){
   $('status').textContent=e.message==='Scan cancelled'?'تم إيقاف الفحص.':'خطأ أثناء الفحص: '+e.message;
 }finally{
   btn.disabled=false;$('cancelScannerBtn').classList.add('hidden');
 }
};
