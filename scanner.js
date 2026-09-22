const $=id=>document.getElementById(id);
let scannerCancelled=false;

const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const median=a=>{if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;};
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));


const wilsonLower95=(wins,n)=>{
  if(!n)return 0;
  const z=1.96,p=wins/n,z2=z*z,den=1+z2/n;
  return (p+z2/(2*n)-z*Math.sqrt((p*(1-p)+z2/(4*n))/n))/den;
};
const sampleConfidence=(v)=>{
  if(v.resolved>=100&&v.wilson95>=.53&&v.pf>=1.30)return'High';
  if(v.resolved>=50&&v.wilson95>=.50&&v.pf>=1.20)return'Medium';
  if(v.resolved>=30&&v.wilson95>=.50&&v.pf>=1.20)return'Preliminary';
  return'Low';
};

const percentile=(arr,p)=>{
  const a=arr.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length)return null;
  const idx=(a.length-1)*p,lo=Math.floor(idx),hi=Math.ceil(idx);
  if(lo===hi)return a[lo];
  return a[lo]+(a[hi]-a[lo])*(idx-lo);
};
const percentileRank=(arr,x)=>{
  const a=arr.filter(Number.isFinite).sort((u,v)=>u-v);
  if(!a.length||!Number.isFinite(x))return null;
  let n=0;for(const v of a)if(v<=x)n++;
  return n/a.length;
};

const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const STABLES=new Set(['USDT','USDC','FDUSD','TUSD','DAI','USDE','USDS','PYUSD','BUSD','USD1','EUR','EURC']);
const FALLBACK_LARGE=['BTC','ETH','BNB','XRP','SOL','DOGE','ADA','TRX','AVAX','LINK','BCH','DOT','LTC','SUI','XLM','HBAR','SHIB','UNI','AAVE','NEAR','ICP','ETC','FIL','APT','ARB','OP','ATOM'];
const leveragedRe=/(UP|DOWN|BULL|BEAR|3L|3S)$/i;

if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{
  const reg=await navigator.serviceWorker.register('./service-worker.js?v=5.6.7.4',{updateViaCache:'none'});
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
 const a=UnifiedDecisionEngine.technicalCore(cs);
 const score=UnifiedDecisionEngine.normBase(a);
 return{...a,score,side:score>=65?1:score<=35?-1:0};
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

async function fetchHistoryUnified(symbol,interval,market,total=900){
 const clean=symbol.toUpperCase().replace(/[^A-Z0-9]/g,'');
 const base=market==='futures'?'https://fapi.binance.com/fapi/v1/klines':'https://data-api.binance.vision/api/v3/klines';
 let end=Date.now(),all=[];
 while(all.length<total){
   const limit=Math.min(1000,total-all.length+1);
   const d=await fetchJson(`${base}?symbol=${encodeURIComponent(clean)}&interval=${interval}&limit=${limit}&endTime=${end}`);
   if(!Array.isArray(d)||!d.length)break;
   const now=Date.now(),rows=d.map(x=>({time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5],closeTime:+x[6]})).filter(x=>x.closeTime<now);
   if(!rows.length)break;
   all=[...rows,...all];end=rows[0].time-1;
   if(rows.length<limit-1)break;
 }
 const seen=new Set();
 return all.filter(x=>!seen.has(x.time)&&seen.add(x.time)).sort((a,b)=>a.time-b.time).slice(-total);
}
async function fetchKlines(symbol,interval,limit=360,market='spot'){
 return fetchHistoryUnified(symbol,interval,market,limit);
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

async function getBinanceSnapshot(market='spot'){
 const futures=market==='futures';
 const base=futures?'https://fapi.binance.com/fapi/v1':'https://data-api.binance.vision/api/v3';
 const [exchange,tickers,books]=await Promise.all([
   fetchJson(`${base}/exchangeInfo`),
   fetchJson(`${base}/ticker/24hr`),
   fetchJson(`${base}/ticker/bookTicker`)
 ]);
 const allowed=new Set((exchange.symbols||[]).filter(x=>
   x.quoteAsset==='USDT'&&x.status==='TRADING'&&
   (futures?(x.contractType==='PERPETUAL'||!x.contractType):x.isSpotTradingAllowed!==false)
 ).map(x=>x.symbol));
 return{allowed,tmap:new Map((tickers||[]).map(x=>[x.symbol,x])),bmap:new Map((books||[]).map(x=>[x.symbol,x]))};
}

async function mapLimit(items,limit,fn){
 const out=new Array(items.length);let next=0;
 async function worker(){while(true){const i=next++;if(i>=items.length||scannerCancelled)return;try{out[i]=await fn(items[i],i);}catch(e){out[i]={error:e.message,item:items[i]};}}}
 await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
 return out;
}

function keyTf(tf){return tf==='15m'?'M15':tf==='1h'?'H1':'D1';}
function intervalTf(tf){return tf==='M15'?'15m':tf==='H1'?'1h':'1d';}
function scannerNeeds(tf){
 if(tf==='H1')return{M15:420,H1:4000,D1:900};
 if(tf==='M15')return{M15:4000,H1:1400,D1:500};
 return{M15:420,H1:1200,D1:2500};
}
async function fetchUnifiedSets(symbol,market,selectedTf){
 const need=scannerNeeds(selectedTf);
 const [m15,h1,d1]=await Promise.all([
   fetchHistoryUnified(symbol,'15m',market,need.M15),
   fetchHistoryUnified(symbol,'1h',market,need.H1),
   fetchHistoryUnified(symbol,'1d',market,need.D1)
 ]);
 return{M15:m15,H1:h1,D1:d1};
}
async function marketContexts(market='spot'){
 const [bsets,esets]=await Promise.all([
   fetchUnifiedSets('BTCUSDT',market,'H1'),
   fetchUnifiedSets('ETHUSDT',market,'H1')
 ]);
 const bf=UnifiedDecisionEngine.finalizeCurrent(bsets),ef=UnifiedDecisionEngine.finalizeCurrent(esets),out={};
 for(const [k,tf] of [['15m','M15'],['1h','H1'],['1d','D1']]){
   const b=bf[tf]?.score??50,e=ef[tf]?.score??50;
   out[k]={score:b*.60+e*.40,btc:b,eth:e};
 }
 return out;
}
function scannerValidation(pwf,side){
 const h=side===1?pwf.long:pwf.short;
 const out={signals:pwf.testN,resolved:h.n,wins:h.wins,losses:h.losses,amb:0,timeouts:0,acc:h.acc,pf:h.pf,wilson95:h.wilson,avgR:h.avgR};
 out.confidence=sampleConfidence(out);return out;
}
function displayPF(pf){return pf===Infinity?'∞':Number.isFinite(pf)?pf.toFixed(2):'N/A';}
function paperLevels(a){return UnifiedDecisionEngine.paperLevels(a);}

// ---------------- MARKET INTEGRITY ENGINE ----------------

async function fetchDepth(symbol,market='spot'){
 const base=market==='futures'?'https://fapi.binance.com/fapi/v1':'https://data-api.binance.vision/api/v3';
 return await fetchJson(`${base}/depth?symbol=${encodeURIComponent(symbol)}&limit=100`,15000);
}

function depthIntegrity(depth,mid,minDepth,quoteVolume24h=0){
 if(!depth||!Array.isArray(depth.bids)||!Array.isArray(depth.asks)||!mid)return{available:false};
 const bidFloor=mid*.995,askCeil=mid*1.005;
 const bidDepth=depth.bids.reduce((s,x)=>{const p=+x[0],q=+x[1];return p>=bidFloor?s+p*q:s;},0);
 const askDepth=depth.asks.reduce((s,x)=>{const p=+x[0],q=+x[1];return p<=askCeil?s+p*q:s;},0);
 const total=bidDepth+askDepth,imb=total?Math.abs(bidDepth-askDepth)/total:1;
 const absoluteRatio=minDepth?total/minDepth:0;
 const depthToVolume=quoteVolume24h>0?total/quoteVolume24h:0;

 const absScore=absoluteRatio>=4?100:absoluteRatio>=2?92:absoluteRatio>=1?82:absoluteRatio>=.5?58:absoluteRatio>=.25?35:15;
 const relScore=depthToVolume>=.010?100:depthToVolume>=.005?92:depthToVolume>=.0025?80:depthToVolume>=.001?62:depthToVolume>=.0005?42:20;
 const depthScore=absScore*.60+relScore*.40;
 const balanceScore=imb<=.20?100:imb<=.35?90:imb<=.50?75:imb<=.65?52:28;

 const flags=[];
 if(total<minDepth && depthToVolume<.001)flags.push('Thin depth vs liquidity');
 if(imb>.72)flags.push('Extreme book imbalance');
 return{available:true,bidDepth,askDepth,total,imbalance:imb,absoluteRatio,depthToVolume,depthScore,balanceScore,flags};
}


function candleIntegrity(cs){
 const recent=cs.slice(-140);
 if(recent.length<40)return{available:false,flags:['Insufficient candle history']};

 const AT=atr(recent,14);
 const vols=recent.map(x=>x.volume||0);
 const volBase=vols.slice(0,-1);
 const volP95=percentile(volBase,.95)||0;

 const wickRatios=[],normRanges=[],bodyRatios=[];
 for(let i=14;i<recent.length;i++){
   const c=recent[i],range=c.high-c.low,atrv=AT[i];
   if(!(range>0&&atrv>0))continue;
   const body=Math.abs(c.close-c.open);
   const upper=c.high-Math.max(c.open,c.close);
   const lower=Math.min(c.open,c.close)-c.low;
   wickRatios.push((upper+lower)/range);
   normRanges.push(range/atrv);
   bodyRatios.push(body/range);
 }
 const wickP90=percentile(wickRatios,.90)??.8;
 const rangeP90=percentile(normRanges,.90)??2.2;

 let abnormalWicks=0,fakeBreaks=0,spikeReject=0,gaps=0;
 const fakeByRegime={low:0,mid:0,high:0};

 for(let i=20;i<recent.length;i++){
   const c=recent[i],range=c.high-c.low,atrv=AT[i];
   if(!(range>0&&atrv>0))continue;
   const body=Math.abs(c.close-c.open),upper=c.high-Math.max(c.open,c.close),lower=Math.min(c.open,c.close)-c.low;
   const wick=(upper+lower)/range,bodyRatio=body/range,normRange=range/atrv;
   const abnormal=wick>Math.max(.78,wickP90)&&bodyRatio<.22&&normRange>Math.max(1.15,rangeP90*.70);
   if(abnormal)abnormalWicks++;
   if(abnormal&&volP95>0&&c.volume>=volP95)spikeReject++;

   const prior=recent.slice(i-20,i),ph=Math.max(...prior.map(x=>x.high)),pl=Math.min(...prior.map(x=>x.low));
   const broke=(c.high>ph&&c.close<ph)||(c.low<pl&&c.close>pl);
   if(broke){
     fakeBreaks++;
     const rv=atrv/c.close;
     if(rv<.008)fakeByRegime.low++;
     else if(rv<.02)fakeByRegime.mid++;
     else fakeByRegime.high++;
   }

   const prev=recent[i-1];
   if(prev.close>0){
     const openGap=Math.abs(c.open-prev.close)/prev.close;
     if(openGap>Math.max(.015,1.25*atrv/prev.close))gaps++;
   }
 }

 const n=Math.max(1,recent.length-20);
 const wickRate=abnormalWicks/n,fakeRate=fakeBreaks/n,spikeRate=spikeReject/n,gapRate=gaps/n;
 let score=100;
 score-=Math.min(28,wickRate*180);
 score-=Math.min(32,fakeRate*220);
 score-=Math.min(26,spikeRate*380);
 score-=Math.min(22,gapRate*450);
 score=clamp(score);

 const flags=[];
 if(wickRate>.11)flags.push('ATR-normalized wick anomaly');
 if(fakeRate>.08)flags.push('Volatility-adjusted fake breakouts');
 if(spikeRate>.025)flags.push('High-percentile volume rejection');
 if(gapRate>.018)flags.push('Price discontinuity');
 return{
   available:true,score,abnormalWicks,fakeBreaks,spikeReject,gaps,
   wickRate,fakeRate,spikeRate,gapRate,wickP90,rangeP90,fakeByRegime,flags
 };
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
   const [premium,ls,hist,fundingHist]=await Promise.all([
     fetchJson(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`,10000),
     fetchJson(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${encodeURIComponent(symbol)}&period=15m&limit=96`,10000),
     fetchJson(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${encodeURIComponent(symbol)}&period=15m&limit=96`,10000),
     fetchJson(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${encodeURIComponent(symbol)}&limit=100`,10000)
   ]);

   const currentFunding=Math.abs((+premium.lastFundingRate||0)*100);
   const fundingSeries=Array.isArray(fundingHist)?fundingHist.map(x=>Math.abs((+x.fundingRate||0)*100)).filter(Number.isFinite):[];
   const fundingPct=percentileRank(fundingSeries,currentFunding);

   const ratioSeries=Array.isArray(ls)?ls.map(x=>+x.longShortRatio).filter(x=>Number.isFinite(x)&&x>0):[];
   const currentRatio=ratioSeries.at(-1)??null;
   const logSeries=ratioSeries.map(x=>Math.abs(Math.log(x)));
   const ratioExtreme=currentRatio?Math.abs(Math.log(currentRatio)):null;
   const ratioPct=percentileRank(logSeries,ratioExtreme);

   const oiVals=Array.isArray(hist)?hist.map(x=>+x.sumOpenInterestValue).filter(x=>Number.isFinite(x)&&x>0):[];
   const oiChanges=[];
   for(let i=1;i<oiVals.length;i++)oiChanges.push(Math.abs(oiVals[i]/oiVals[i-1]-1)*100);
   const currentOiChange=oiChanges.at(-1)??null;
   const oiPct=percentileRank(oiChanges,currentOiChange);

   const pctScore=p=>p==null?null:(p<=.75?100:p<=.90?85:p<=.95?65:p<=.98?42:20);
   const fs=pctScore(fundingPct),rs=pctScore(ratioPct),os=pctScore(oiPct);
   const vals=[fs,rs,os].filter(Number.isFinite),score=vals.length?mean(vals):null;

   const flags=[];
   if(fundingPct!=null&&fundingPct>.95)flags.push('Funding >95th percentile');
   if(ratioPct!=null&&ratioPct>.95)flags.push('Long/short crowding >95th percentile');
   if(oiPct!=null&&oiPct>.95)flags.push('OI shock >95th percentile');

   return{
     available:vals.length>0,score:score??0,
     funding:currentFunding,fundingPct,
     ratio:currentRatio,ratioPct,
     oiChange:currentOiChange,oiPct,flags
   };
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
   fetchDepth(x.pair,cfg.market).then(d=>depthIntegrity(d,mid,cfg.minDepth,x.quoteVolume)).catch(()=>({available:false,flags:['Depth unavailable']})),
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

 const passDepth=depth.available&&(depth.total>=cfg.minDepth||depth.depthToVolume>=.0015);
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

function confidenceClass(x){return x==='High'?'confHigh':x==='Medium'?'confMedium':x==='Preliminary'?'confPrelim':'confLow';}
function barTimeText(x){
 if(!x?.a?.barCloseTime)return'N/A';
 return new Date(x.a.barCloseTime).toLocaleString('ar',{hour12:false});
}

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
 if(x.validation.resolved<cfg.minResolved)a.push(`OOS sample ${x.validation.resolved}<${cfg.minResolved}`);
 if(x.validation.acc<cfg.minAcc)a.push('OOS accuracy');
 if(x.validation.pf<cfg.minPF)a.push('PF');
 if(x.validation.wilson95<cfg.minWilson)a.push(`Wilson95 ${(x.validation.wilson95*100).toFixed(1)}%`);
 if(!x.higherPass)a.push('Higher-TF veto');
 if(x.integrity.score<cfg.minIntegrity)a.push('Integrity');
 if(x.integrity.coverage<cfg.minCoverage)a.push('Integrity coverage');
 if(!x.integrity.depth.available||(x.integrity.depth.total<cfg.minDepth&&x.integrity.depth.depthToVolume<.0015))a.push('Thin depth');
 if(x.integrity.cross.available&&x.integrity.cross.maxDeviation>cfg.maxSourceDev)a.push('Provider disagreement');
 return a.join(' / ')||'Qualified';
}


function finalDecisionCards(rows,side,cfg){
 if(!rows.length)return'';
 return rows.map(x=>{
   const rr1=Math.abs((x.levels.tp1-x.levels.entry)/(x.levels.entry-x.levels.stop));
   const rr2=Math.abs((x.levels.tp2-x.levels.entry)/(x.levels.entry-x.levels.stop));
   const conf=x.validation.confidence||sampleConfidence(x.validation);
   const sideText=side===1?'BULLISH — LIVE ENGINE PASS':'BEARISH — LIVE ENGINE PASS';
   const sideClass=side===1?'bullFinal':'bearFinal';
   const pillClass=side===1?'bullPill':'bearPill';
   return `<article class="finalDecisionCard ${sideClass}">
     <div class="finalDecisionTop">
       <div>
         <h3>${esc(x.symbol)} <span class="rankTag">#${x.rank??'—'}</span></h3>
         <div class="signalTime">Signal locked to closed ${esc(cfg.tf)} candle: ${esc(barTimeText(x))}</div>
       </div>
       <span class="signalPill ${pillClass}">${sideText}</span>
     </div>
     <div>
       <span class="lockBadge">CLOSED‑CANDLE LOCK</span>
       <span class="confBadge ${confidenceClass(conf)}">${esc(conf)} sample confidence</span>
     </div>
     <div class="decisionStats">
       <div class="decisionStat"><small>Technical Score</small><b>${x.verified.toFixed(1)}</b></div>
       <div class="decisionStat"><small>Integrity Live</small><b class="${integrityClass(x.integrity.score)}">${x.integrity.score.toFixed(1)}</b></div>
       <div class="decisionStat"><small>OOS Accuracy</small><b>${(x.validation.acc*100).toFixed(1)}%</b></div>
       <div class="decisionStat"><small>Resolved N</small><b>${x.validation.resolved}</b></div>
       <div class="decisionStat"><small>Wilson 95% LB</small><b>${(x.validation.wilson95*100).toFixed(1)}%</b></div>
       <div class="decisionStat"><small>Profit Factor</small><b>${displayPF(x.validation.pf)}</b></div>
       <div class="decisionStat"><small>MTF</small><b>${x.mtf.toFixed(1)}</b></div>
       <div class="decisionStat"><small>Higher TF</small><b class="${x.higherPass?'good':'bad'}">${x.higherPass?'PASS':'VETO'}</b></div>
     </div>
     <div class="paperLevels">
       <div class="paperLevel"><small>Paper Entry</small><strong>${priceFmt(x.levels.entry)}</strong></div>
       <div class="paperLevel"><small>Paper Stop</small><strong>${priceFmt(x.levels.stop)}</strong></div>
       <div class="paperLevel"><small>Paper TP1</small><strong>${priceFmt(x.levels.tp1)}</strong><div class="rankTag">R:R ${rr1.toFixed(2)}</div></div>
       <div class="paperLevel"><small>Paper TP2</small><strong>${priceFmt(x.levels.tp2)}</strong><div class="rankTag">R:R ${rr2.toFixed(2)}</div></div>
     </div>
     <div class="liveGuard">Technical direction and Paper levels stay fixed until the next ${esc(cfg.tf)} candle closes. Live Integrity may only PAUSE/BLOCK the candidate.</div>
     <div class="ruleLine">Unified Engine • ${esc(x.market||cfg.market)} • ${esc(x.validationMode||'')}<br>M15 ${x.mtfScores.m15.toFixed(1)} • H1 ${x.mtfScores.h1.toFixed(1)} • D1 ${x.mtfScores.d1.toFixed(1)} • OOS overlap ${x.overlapN||0} • Depth ${x.integrity.depth.available?usd(x.integrity.depth.total):'N/A'}</div>
   </article>`;
 }).join('');
}

function resultsTable(rows,side){
 if(!rows.length)return`<div class="note warn">لا توجد عملات اجتازت جميع شروط Technical + OOS + Integrity الآن. عدم وجود نتيجة أفضل من فرض فرصة ضعيفة.</div>`;
 return`<table class="scanTable integrityTable"><thead><tr>
 <th>Coin</th><th>Technical Score</th><th>Integrity</th><th>Risk</th><th>OOS</th><th>PF</th><th>MTF</th>
 <th>Depth ±0.5%</th><th>Sources</th><th>Market Cap</th><th>24h Volume</th><th>Spread</th>
 <th>Paper Entry</th><th>TP1</th><th>TP2</th><th>Stop</th><th></th>
 </tr></thead><tbody>${rows.map(x=>`<tr>
 <td class="coinCell">${esc(x.symbol)}<div class="rankTag">Rank #${x.rank??'—'}</div></td>
 <td class="${side===1?'score90':'score10'}">${x.verified.toFixed(1)}</td>
 <td class="${integrityClass(x.integrity.score)}">${x.integrity.score.toFixed(1)}</td>
 <td class="${riskClass(x.integrity.risk)}">${x.integrity.risk.toFixed(1)}</td>
 <td>${(x.validation.acc*100).toFixed(1)}% <span class="rankTag">(${x.validation.resolved})</span></td>
 <td>${displayPF(x.validation.pf)}</td>
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
 <th>Coin</th><th>Integrity</th><th>Risk</th><th>Coverage</th><th>Depth</th><th>Depth/Vol</th><th>Book imbalance</th>
 <th>Max source dev</th><th>Candle integrity</th><th>Derivatives</th><th>Flags</th>
 </tr></thead><tbody>${rows.map(x=>`<tr>
 <td class="coinCell">${esc(x.symbol)}</td>
 <td class="${integrityClass(x.integrity.score)}">${x.integrity.score.toFixed(1)}</td>
 <td class="${riskClass(x.integrity.risk)}">${x.integrity.risk.toFixed(1)}</td>
 <td>${Math.round(x.integrity.coverage*100)}%<div class="coverageBar"><div style="width:${Math.round(x.integrity.coverage*100)}%"></div></div></td>
 <td>${x.integrity.depth.available?usd(x.integrity.depth.total):'N/A'}</td>
 <td>${x.integrity.depth.available?(x.integrity.depth.depthToVolume*100).toFixed(3)+'%':'N/A'}</td>
 <td>${x.integrity.depth.available?(x.integrity.depth.imbalance*100).toFixed(1)+'%':'N/A'}</td>
 <td>${x.integrity.cross.available?(x.integrity.cross.maxDeviation*100).toFixed(3)+'%':'N/A'}</td>
 <td>${x.integrity.candles.score.toFixed(0)}/100</td>
 <td>${x.integrity.deriv.available?x.integrity.deriv.score.toFixed(0)+'/100':'N/A'}</td>
 <td>${flagHtml(x.integrity.flags)}</td>
 </tr>`).join('')}</tbody></table>`;
}


function closestCards(rows,side,cfg){
 if(!rows.length)return'<div class="muted">لا توجد بيانات.</div>';
 const arr=rows.filter(x=>x.side===side).map(x=>{
   const gaps=[];
   if(side===1&&x.verified<cfg.bullMin)gaps.push(`Technical ${x.verified.toFixed(1)} < ${cfg.bullMin}`);
   if(side===-1&&x.verified>cfg.bearMax)gaps.push(`Technical ${x.verified.toFixed(1)} > ${cfg.bearMax}`);
   if(x.validation.acc<cfg.minAcc)gaps.push(`OOS ${(x.validation.acc*100).toFixed(1)}%`);
   if(x.validation.pf<cfg.minPF)gaps.push(`PF ${displayPF(x.validation.pf)}`);
   if(x.validation.resolved<cfg.minResolved)gaps.push(`N ${x.validation.resolved}<${cfg.minResolved}`);
   if(x.validation.wilson95<cfg.minWilson)gaps.push(`Wilson95 ${(x.validation.wilson95*100).toFixed(1)}%`);
   if(!x.higherPass)gaps.push('Higher-TF veto');
   if(x.integrity.score<cfg.minIntegrity)gaps.push(`Integrity ${x.integrity.score.toFixed(1)}`);
   if(x.integrity.coverage<cfg.minCoverage)gaps.push(`Coverage ${Math.round(x.integrity.coverage*100)}%`);
   const technicalDistance=side===1?Math.max(0,cfg.bullMin-x.verified):Math.max(0,x.verified-cfg.bearMax);
   const accDistance=Math.max(0,cfg.minAcc-x.validation.acc)*100;
   const pfDistance=Math.max(0,cfg.minPF-x.validation.pf)*10;
   const intDistance=Math.max(0,cfg.minIntegrity-x.integrity.score);
   const covDistance=Math.max(0,cfg.minCoverage-x.integrity.coverage)*100;
   const sampleDistance=Math.max(0,cfg.minResolved-x.validation.resolved)*.25;
   const wilsonDistance=Math.max(0,cfg.minWilson-x.validation.wilson95)*100;
   const htfDistance=x.higherPass?0:15;
   const distance=technicalDistance+accDistance+pfDistance+intDistance+covDistance+sampleDistance+wilsonDistance+htfDistance;
   return{...x,gaps,distance};
 }).sort((a,b)=>a.distance-b.distance).slice(0,3);

 return arr.map(x=>`<div class="nearCard">
   <div class="nearTop"><strong>${esc(x.symbol)}</strong><span class="${side===1?'bullPill':'bearPill'} signalPill">${side===1?'Bullish':'Bearish'} ${x.verified.toFixed(1)}</span></div>
   <div class="mobileCards">
     <div class="miniCard"><small>Integrity</small><b class="${integrityClass(x.integrity.score)}">${x.integrity.score.toFixed(1)}</b></div>
     <div class="miniCard"><small>OOS</small><b>${(x.validation.acc*100).toFixed(1)}%</b></div>
     <div class="miniCard"><small>PF</small><b>${displayPF(x.validation.pf)}</b></div>
     <div class="miniCard"><small>MTF</small><b>${x.mtf.toFixed(1)}</b></div>
   </div>
   <div class="gapList">${x.gaps.length?x.gaps.map(g=>`<span class="gapTag">${esc(g)}</span>`).join(''):'<span class="passTag">Passed all — should appear in final list</span>'}</div>
 </div>`).join('');
}

function nearTable(rows){
 if(!rows.length)return'<div class="muted">لا توجد بيانات تشخيصية.</div>';
 return`<table class="scanTable"><thead><tr><th>Coin</th><th>Side</th><th>Technical Score</th><th>Integrity</th><th>OOS</th><th>PF</th><th>Rejected because</th></tr></thead>
 <tbody>${rows.slice(0,16).map(x=>`<tr><td class="coinCell">${esc(x.symbol)}</td><td>${x.side===1?'Bullish':'Bearish'}</td><td>${x.verified.toFixed(1)}</td><td class="${integrityClass(x.integrity.score)}">${x.integrity.score.toFixed(1)}</td><td>${(x.validation.acc*100).toFixed(1)}%</td><td>${displayPF(x.validation.pf)}</td><td>${esc(x.reason)}</td></tr>`).join('')}</tbody></table>`;
}

window.openFull=symbol=>{const m=$('scanMarket')?.value||'futures';location.href=`./?v=5.6.7.4&symbol=${encodeURIComponent(symbol)}&market=${encodeURIComponent(m)}`;};

$('cancelScannerBtn').onclick=()=>{scannerCancelled=true;$('status').textContent='تم طلب الإيقاف؛ سيتوقف بعد انتهاء الطلبات الجارية.';};

$('runScannerBtn').onclick=async()=>{
 const btn=$('runScannerBtn');btn.disabled=true;scannerCancelled=false;$('cancelScannerBtn').classList.remove('hidden');
 ['scannerSummary','bullishCard','bearishCard','closestGrid','integrityCard','nearMissCard'].forEach(id=>$(id).classList.add('hidden'));

 const tfRaw=$('scanTf').value,tfKey=keyTf(tfRaw),sampleRaw=$('scanMinResolved').value;
 const cfg={
   tf:tfRaw,tfKey,market:$('scanMarket').value,costBps:+$('scanCostBps').value,
   topRank:+$('scanTopRank').value,minCap:+$('scanMinCap').value,minVol:+$('scanMinVol').value,
   maxSpread:+$('scanMaxSpread').value,minDepth:+$('scanMinDepth').value,minIntegrity:+$('scanMinIntegrity').value,
   minCoverage:+$('scanMinCoverage').value,maxSourceDev:+$('scanMaxSourceDev').value,maxResults:+$('scanMaxResults').value,
   bullMin:+$('scanBullMin').value,bearMax:+$('scanBearMax').value,minAcc:+$('scanMinAcc').value,minPF:+$('scanMinPF').value,
   minResolved:sampleRaw==='auto'?UnifiedDecisionEngine.validationSpec(tfKey).minN:+sampleRaw,minWilson:+$('scanMinWilson').value
 };

 try{
   $('status').textContent='Stage 1/4: تحميل القيمة السوقية والسيولة والسبريد...';
   const [u,snap,ctx]=await Promise.all([getUniverse(),getBinanceSnapshot(cfg.market),marketContexts(cfg.market)]);

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
     const cs=await fetchKlines(c.pair,cfg.tf,360,cfg.market),a=analyze(cs);
     done++;progress(done,deep.length,'Stage 2/4: التحليل الفني الأولي');
     return{...c,base:cs,a,raw:a.score};
   });
   if(scannerCancelled)throw new Error('Scan cancelled');

   const usable=initial.filter(x=>x&&!x.error&&x.a);
   const bullPool=[...usable].sort((a,b)=>b.raw-a.raw).slice(0,6);
   const bearPool=[...usable].sort((a,b)=>a.raw-b.raw).slice(0,6);
   const finalists=[...new Map([...bullPool,...bearPool].map(x=>[x.pair,x])).values()];

   done=0;
   const final=await mapLimit(finalists,2,async x=>{
     const sets=await fetchUnifiedSets(x.pair,cfg.market,cfg.tfKey);
     const finals=UnifiedDecisionEngine.finalizeCurrent(sets);
     const a=finals[cfg.tfKey];
     if(!a)throw new Error('Unified Engine could not finalize selected timeframe');
     const side=a.side;
     const pwf=UnifiedDecisionEngine.purgedWalkForward(sets,cfg.tfKey,cfg.costBps);
     const validation=scannerValidation(pwf,side);
     const higherPass=!UnifiedDecisionEngine.higherTfVeto(cfg.tfKey,side,finals);
     const hist=sets[cfg.tfKey];
     const unifiedX={...x,a,base:hist};
     const integrity=await integrityEngine(unifiedX,hist,cfg);
     const levels=side?paperLevels(a):null;
     const verified=a.score;
     const mtfScores={m15:finals.M15?.score??50,h1:finals.H1?.score??50,d1:finals.D1?.score??50};
     const dirs=[finals.M15?.side,finals.H1?.side,finals.D1?.side].filter(v=>v!=null&&v!==0);
     const agreement=dirs.length?Math.abs(dirs.reduce((s,v)=>s+v,0))/dirs.length:0;
     const context=ctx[cfg.tf].score;
     done++;progress(done,finalists.length,'Stage 3/4: Unified Engine + timeframe-specific OOS + Integrity');
     return{...x,a,side,mtf:a.mtf,agreement,mtfScores,higherPass,context,verified,validation,integrity,levels,
       validationMode:pwf.validationMode,overlapN:pwf.overlapN,market:cfg.market};
   });
   if(scannerCancelled)throw new Error('Scan cancelled');

   const good=final.filter(x=>x&&!x.error);
   const qualifies=x=>x.side!==0&&x.validation.resolved>=cfg.minResolved&&x.validation.acc>=cfg.minAcc&&x.validation.pf>=cfg.minPF&&x.validation.wilson95>=cfg.minWilson&&x.higherPass&&x.integrity.pass;
   const bulls=good.filter(x=>x.side===1&&x.verified>=cfg.bullMin&&qualifies(x))
     .sort((a,b)=>b.integrity.score-a.integrity.score||b.verified-a.verified||b.validation.pf-a.validation.pf).slice(0,cfg.maxResults);
   const bears=good.filter(x=>x.side===-1&&x.verified<=cfg.bearMax&&qualifies(x))
     .sort((a,b)=>b.integrity.score-a.integrity.score||a.verified-b.verified||b.validation.pf-a.validation.pf).slice(0,cfg.maxResults);

   const q=new Set([...bulls,...bears].map(x=>x.pair));
   const near=good.filter(x=>!q.has(x.pair)).map(x=>({...x,reason:rejectReason(x,cfg)}))
     .sort((a,b)=>b.integrity.score-a.integrity.score||Math.abs(b.verified-50)-Math.abs(a.verified-50));

   ['scannerSummary','bullishCard','bearishCard','closestGrid','integrityCard','nearMissCard'].forEach(id=>$(id).classList.remove('hidden'));

   const lowIntegrity=good.filter(x=>!x.integrity.pass).length;
   $('scannerSummary').innerHTML=`<h2>V5.6.7.4 Unified Scanner Summary</h2><div class="metrics">
     ${metric('Market-cap source',esc(u.source))}
     ${metric('Eligible universe',candidates.length)}
     ${metric('Deep-scanned',deep.length)}
     ${metric('Integrity-tested',good.length)}
     ${metric('Integrity-blocked',lowIntegrity,'bad')}
     ${metric('Strong bullish',bulls.length,'good')}
     ${metric('Strong bearish',bears.length,'bad')}
     ${metric('BTC/ETH context',ctx[cfg.tf].score.toFixed(1))}
   </div><p class="muted">Stage 1 مجرد اكتشاف. المرشح النهائي يعاد حسابه بنفس Unified Decision Engine الخاص بـLive: Closed Candle → timeframe-specific Technical/Context → Higher-TF veto → Purged OOS → Cost-adjusted PF → Wilson95، ثم يضاف Scanner Integrity Guard.</p>`;

   $('bullishDecisionCards').innerHTML=finalDecisionCards(bulls,1,cfg);
   $('bearishDecisionCards').innerHTML=finalDecisionCards(bears,-1,cfg);
   $('bullishTable').innerHTML=resultsTable(bulls,1);
   $('bearishTable').innerHTML=resultsTable(bears,-1);
   $('integrityTable').innerHTML=integrityTable([...good].sort((a,b)=>a.integrity.score-b.integrity.score));
   $('closestBullishTable').innerHTML=closestCards(near,1,cfg);
   $('closestBearishTable').innerHTML=closestCards(near,-1,cfg);
   $('nearMissTable').innerHTML=nearTable(near);

   $('status').textContent=`Stage 4/4 complete: ${bulls.length} Bullish و${bears.length} Bearish اجتازوا جميع فلاتر V5.6.2.`;
 }catch(e){
   $('status').textContent=e.message==='Scan cancelled'?'تم إيقاف الفحص.':'خطأ أثناء الفحص: '+e.message;
 }finally{
   btn.disabled=false;$('cancelScannerBtn').classList.add('hidden');
 }
};
