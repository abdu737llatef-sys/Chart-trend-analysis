const $=id=>document.getElementById(id);
let deferredPrompt=null,currentLive=null,currentTf='H1';

if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{
 const reg=await navigator.serviceWorker.register('./service-worker.js?v=5.6.7.4',{updateViaCache:'none'});await reg.update();
}catch(e){console.warn(e);}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden');});
$('installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').classList.add('hidden');};

document.querySelectorAll('.modeTab').forEach(b=>b.onclick=()=>{
 const live=b.dataset.mode==='live';
 document.querySelectorAll('.modeTab').forEach(x=>x.classList.toggle('active',x===b));
 $('liveControls').classList.toggle('hidden',!live);
 $('researchControls').classList.toggle('hidden',live);
 $('marketOverview').classList.toggle('hidden',!live||!currentLive);
 $('mtfCards').classList.toggle('hidden',!live||!currentLive);
 $('detailsPanel').classList.toggle('hidden',!live||!currentLive);
});

const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const median=a=>{if(!a.length)return 0;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;};
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const fmt=(x,n=4)=>Number.isFinite(x)?Number(x).toFixed(n):'N/A';
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=x=>Number.isFinite(x)?`${(x*100).toFixed(1)}%`:'N/A';
function displayPF(pf,n=999,minN=10){
 if(n<minN)return'INSUFFICIENT SAMPLE';
 if(pf===Infinity)return'∞';
 return Number.isFinite(pf)?Number(pf).toFixed(2):'N/A';
}

const SCENARIO_KEY='cta_v566_paper_scenarios';
function loadScenarios(){
 try{const x=JSON.parse(localStorage.getItem(SCENARIO_KEY)||'[]');return Array.isArray(x)?x:[];}catch{return[];}
}
function saveScenarios(rows){
 try{localStorage.setItem(SCENARIO_KEY,JSON.stringify(rows.slice(-250)));}catch{}
}
function scenarioId(symbol,tf,barCloseTime,side){
 return `${symbol}:${tf}:${barCloseTime||Date.now()}:${side}`;
}
function activeScenarioFor(symbol,tf){
 return loadScenarios().filter(x=>x.symbol===symbol&&x.tf===tf&&!['TP2_HIT','STOPPED','INVALIDATED','EXPIRED','AMBIGUOUS'].includes(x.state)).at(-1)||null;
}
function scenarioStateClass(s){
 if(s==='PENDING_BREAKOUT')return'statePending';
 if(s==='WAITING_RETEST')return'stateRetest';
 if(s==='READY_NEXT_OPEN')return'stateReady';
 if(s==='TRIGGERED')return'stateTriggered';
 if(s==='TP1_HIT'||s==='TP2_HIT')return'stateWin';
 if(s==='STOPPED'||s==='INVALIDATED'||s==='AMBIGUOUS')return'stateLoss';
 if(s==='PAUSED_INTEGRITY')return'statePaused';
 if(s==='PAUSED_TECHNICAL')return'stateTechPause';
 if(s==='STALE_REVALIDATION')return'stateStale';
 return'stateEnded';
}
function expiryBars(tf){return tf==='M15'?16:tf==='H1'?8:5;}
function barsAfter(cs,closeTime){return cs.filter(c=>(c.closeTime||0)>(closeTime||0));}

function nextExecutionBar(cs,currentBar,afterOpenTime){
 const closed=cs.find(c=>(c.time||0)>afterOpenTime);
 if(closed)return closed;
 if(currentBar&&(currentBar.time||0)>afterOpenTime)return currentBar;
 return null;
}
function effectivePaperLevels(s,actualEntry){
 const long=s.side===1,plannedStop=+s.stop;
 if(!Number.isFinite(actualEntry)||!Number.isFinite(plannedStop))return null;
 const risk=long?actualEntry-plannedStop:plannedStop-actualEntry;
 if(!(risk>0))return null;
 return{
   actualEntry,
   effectiveStop:plannedStop,
   effectiveTP1:long?actualEntry+1.20*risk:actualEntry-1.20*risk,
   effectiveTP2:long?actualEntry+2.00*risk:actualEntry-2.00*risk,
   effectiveRisk:risk
 };
}
function migrateScenarioText(s){
 const x={...s};
 if((x.resistanceStrength||0)<65&&/strong resistance/i.test(x.mode||'')){
   x.mode='Closed-candle breakout + retest required (momentum/volume confirmation was insufficient)';
 }
 if((x.supportStrength||0)<65&&/strong support/i.test(x.mode||'')){
   x.mode='Closed-candle breakdown + retest required (momentum/volume confirmation was insufficient)';
 }
 if(!x.entryReason&&/retest/i.test(x.mode||'')){
   const level=(x.side===1?x.resistanceStrength:x.supportStrength)||0;
   x.entryReason=level>=65?'STRONG_LEVEL':'INSUFFICIENT_MOMENTUM_VOLUME';
 }
 if(!x.entryReason&&/continuation/i.test(x.mode||''))x.entryReason='HIGH_MOMENTUM_CONTINUATION';
 return x;
}
function scenarioNextAction(s){
 const long=s.side===1;
 if(s.state==='PENDING_BREAKOUT')
   return long
     ?`انتظار إغلاق شمعة ${s.tf} فوق مستوى الاختراق ${fmt(s.breakoutLevel,6)}. مجرد Wick فوق المستوى لا يكفي.`
     :`انتظار إغلاق شمعة ${s.tf} أسفل مستوى الكسر ${fmt(s.breakoutLevel,6)}. مجرد Wick أسفل المستوى لا يكفي.`;
 if(s.state==='WAITING_RETEST')
   return `تم تأكيد الكسر بالإغلاق. الآن انتظار Retest داخل ${fmt(s.retestLow,6)} – ${fmt(s.retestHigh,6)} ثم إغلاق تأكيدي في اتجاه السيناريو.`;
 if(s.state==='READY_NEXT_OPEN')
   return `تم تأكيد شرط الدخول. ينتظر النموذج افتتاح الشمعة التالية لتسجيل Actual Paper Trigger بدون استخدام سعر الإغلاق كتعبئة افتراضية.`;
 if(s.state==='TRIGGERED'||s.state==='TP1_HIT')
   return `تم تسجيل Actual Paper Trigger. تتم متابعة Effective Stop / TP1 / TP2 على الشموع المغلقة.`;
 if(s.state==='PAUSED_INTEGRITY')
   return `السيناريو موقوف مؤقتًا بسبب Market Integrity؛ لا يتم إنشاء Trigger جديد حتى عودة الحد الأدنى.`;
 if(s.state==='PAUSED_TECHNICAL')
   return `السيناريو محفوظ لكن Current Setup أصبح Neutral. لا يتم تفعيل اختراق جديد حتى يعود نفس الاتجاه الفني قبل انتهاء الصلاحية.`;
 if(s.state==='STALE_REVALIDATION')
   return `المستوى الحالي ابتعد كثيرًا عن مستوى السيناريو الأصلي. السيناريو محفوظ لكنه يحتاج Revalidation قبل السماح بتفعيل جديد.`;
 if(s.state==='EXPIRED')return 'انتهت صلاحية شرط الدخول قبل التفعيل.';
 if(s.state==='INVALIDATED')return 'تم إبطال الفكرة وفق شرط بنيوي أو Higher-TF veto.';
 return s.endReason||'يتم تتبع حالة السيناريو.';
}

function separatedTouches(cs,level,tol,kind){
 let last=-99,n=0;
 for(let i=Math.max(2,cs.length-140);i<cs.length-2;i++){
   const hit=kind==='R'?Math.abs(cs[i].high-level)<=tol:Math.abs(cs[i].low-level)<=tol;
   if(hit&&i-last>=4){n++;last=i;}
 }
 return n;
}


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
function wilsonLower95(wins,n){if(!n)return 0;const z=1.96,p=wins/n,z2=z*z,den=1+z2/n;return(p+z2/(2*n)-z*Math.sqrt((p*(1-p)+z2/(4*n))/n))/den;}
function validationSpec(tf){return UnifiedDecisionEngine.validationSpec(tf);}
function requiredSample(tf,cfg){return cfg.sampleRule==='auto'?validationSpec(tf).minN:cfg.minSample;}


function technicalCore(cs){return UnifiedDecisionEngine.technicalCore(cs);}

function primaryTrendLabel(a){
 if(a.trend>=65&&a.price>a.ema200)return'Bullish';
 if(a.trend<=35&&a.price<a.ema200)return'Bearish';
 if(a.trend>=60)return'Bullish bias';
 if(a.trend<=40)return'Bearish bias';
 return'Neutral';
}
function currentSetupLabel(a){
 if(a.side===1)return a.structureState?.includes('HH / HL')?'Bullish continuation':'Bullish setup';
 if(a.side===-1)return a.structureState?.includes('LH / LL')?'Bearish continuation':'Bearish setup';
 if(a.structureState?.includes('compression'))return'Neutral / Compression';
 if(a.structureState?.includes('mixed'))return'Neutral / Mixed structure';
 return'Neutral';
}
function isTerminalScenarioState(s){
 return['TP2_HIT','STOPPED','INVALIDATED','EXPIRED','AMBIGUOUS'].includes(s);
}
function isPreTriggerScenarioState(s){
 return['PENDING_BREAKOUT','WAITING_RETEST','PAUSED_INTEGRITY','PAUSED_TECHNICAL','STALE_REVALIDATION'].includes(s);
}

function mtfComponent(tf,cores){return UnifiedDecisionEngine.contextScore(tf,cores);}
function mtfStrength(frames){
 const m=Object.fromEntries(frames.map(x=>[x.tf,x.a.score]));
 return (m.M15??50)*.20+(m.H1??50)*.50+(m.D1??50)*.30;
}

function higherTfVeto(tf,side,cores){return UnifiedDecisionEngine.higherTfVeto(tf,side,cores);}

function barrierOutcomeDetailed(cs,i,dir,atrv,h=12,costBps=10){
 const entry=cs[i].close,F=dir===1?entry+atrv:entry-atrv,A=dir===1?entry-atrv:entry+atrv;
 const riskPct=atrv/Math.max(entry,1e-12),costPct=costBps/10000,costR=riskPct>0?costPct/riskPct:0;
 for(let j=i+1;j<=Math.min(cs.length-1,i+h);j++){
   const fav=dir===1?cs[j].high>=F:cs[j].low<=F,adv=dir===1?cs[j].low<=A:cs[j].high>=A;
   if(fav&&adv)return{out:'amb',r:null};
   if(fav)return{out:'win',r:1-costR};
   if(adv)return{out:'loss',r:-(1+costR)};
 }
 return{out:'timeout',r:null};
}
function purgedWalkForward(cs,tf,costBps=10){
 const spec=validationSpec(tf),AT=atr(cs),rows=[],warmup=260;
 for(let i=warmup;i<cs.length-spec.horizon;i+=spec.step){
   const window=cs.slice(Math.max(0,i-319),i+1),a=technicalCore(window);
   const score=a.baseScore/a.baseWeight,dir=score>=65?1:score<=35?-1:0;
   if(!dir||!AT[i])continue;
   const o=barrierOutcomeDetailed(cs,i,dir,AT[i],spec.horizon,costBps);
   if(o.out==='amb'||o.out==='timeout')continue;
   rows.push({i,dir,out:o.out,r:o.r});
 }
 const first=Math.floor(cs.length*.40),span=cs.length-first,foldSize=Math.floor(span/spec.folds),testRows=[];
 const foldStats=[];
 for(let f=0;f<spec.folds;f++){
   const rawStart=first+f*foldSize,rawEnd=f===spec.folds-1?cs.length-1:first+(f+1)*foldSize-1;
   const start=rawStart+spec.purge,end=rawEnd-spec.horizon;
   const fold=rows.filter(x=>x.i>=start&&x.i<=end);
   testRows.push(...fold);
   const n=fold.length,w=fold.filter(x=>x.out==='win').length,l=fold.filter(x=>x.out==='loss').length;
   foldStats.push({n,acc:n?w/n:0});
 }
 function side(dir){
   const r=testRows.filter(x=>x.dir===dir),wins=r.filter(x=>x.out==='win').length,losses=r.filter(x=>x.out==='loss').length,n=wins+losses;
   const gains=r.filter(x=>x.r>0).reduce((s,x)=>s+x.r,0),lossAbs=-r.filter(x=>x.r<0).reduce((s,x)=>s+x.r,0);
   const acc=n?wins/n:0,pf=lossAbs>0?gains/lossAbs:(gains>0?Infinity:0),wilson=wilsonLower95(wins,n),avgR=n?r.reduce((s,x)=>s+x.r,0)/n:0;
   return{n,wins,losses,acc,pf,wilson,avgR};
 }
 return{long:side(1),short:side(-1),folds:foldStats,spec,testN:testRows.length,costBps};
}

async function fetchHistory(symbol,interval,market,total=900){
 const clean=symbol.toUpperCase().replace(/[^A-Z0-9]/g,''),base=market==='futures'?'https://fapi.binance.com/fapi/v1/klines':'https://data-api.binance.vision/api/v3/klines';
 let end=Date.now(),all=[];
 while(all.length<total){
   const limit=Math.min(1000,total-all.length+1),u=`${base}?symbol=${clean}&interval=${interval}&limit=${limit}&endTime=${end}`,r=await fetch(u,{cache:'no-store'}),d=await r.json();
   if(!r.ok||!Array.isArray(d))throw new Error(d?.msg||'تعذر جلب Binance');
   if(!d.length)break;
   const now=Date.now(),b=d.map(x=>({time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5],closeTime:+x[6]})).filter(x=>x.closeTime<now);
   if(!b.length)break;
   all=[...b,...all];end=b[0].time-1;if(b.length<limit-1)break;
 }
 const seen=new Set();
 return all.filter(x=>!seen.has(x.time)&&seen.add(x.time)).sort((a,b)=>a.time-b.time).slice(-total);
}


async function fetchCurrentKline(symbol,interval,market){
 const clean=symbol.toUpperCase().replace(/[^A-Z0-9]/g,'');
 const base=market==='futures'?'https://fapi.binance.com/fapi/v1/klines':'https://data-api.binance.vision/api/v3/klines';
 const r=await fetch(`${base}?symbol=${clean}&interval=${interval}&limit=1`,{cache:'no-store'});
 const d=await r.json();
 if(!r.ok||!Array.isArray(d)||!d.length)return null;
 const x=d[0];
 return{time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5],closeTime:+x[6],isOpen:+x[6]>=Date.now()};
}

async function fetchJson(url,timeout=12000){
 const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),timeout);
 try{const r=await fetch(url,{signal:ctl.signal,cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}
 finally{clearTimeout(t);}
}
async function coinbaseSpot(base){
 try{const d=await fetchJson(`https://api.coinbase.com/v2/prices/${encodeURIComponent(base)}-USD/spot`,8000);const p=+(d?.data?.amount);return Number.isFinite(p)&&p>0?p:null;}catch{return null;}
}
function candleIntegrity(cs){
 const recent=cs.slice(-100),AT=atr(recent),ratios=[],flags=[];
 let abnormal=0;
 for(let i=14;i<recent.length;i++){
   const c=recent[i],range=c.high-c.low,a=AT[i];
   if(!(range>0&&a>0))continue;
   const body=Math.abs(c.close-c.open),wick=(range-body)/range,norm=range/a;
   ratios.push(wick);
   if(wick>.82&&body/range<.18&&norm>1.3)abnormal++;
 }
 const rate=recent.length?abnormal/recent.length:0,score=clamp(100-rate*250);
 if(rate>.10)flags.push('Elevated wick anomaly rate');
 return{score,flags};
}
async function liveIntegrity(symbol,market,price,cs){
 const base=symbol.replace(/USDT$/,'');
 const bookBase=market==='futures'?'https://fapi.binance.com/fapi/v1':'https://data-api.binance.vision/api/v3';
 let spreadScore=null,depthScore=null,crossScore=null,spread=null,depthTotal=null,sourceDev=null;
 const flags=[],components=[];
 try{
   const [book,depth,tick,cb]=await Promise.all([
     fetchJson(`${bookBase}/ticker/bookTicker?symbol=${symbol}`,8000),
     fetchJson(`${bookBase}/depth?symbol=${symbol}&limit=100`,8000),
     fetchJson(`${bookBase}/ticker/24hr?symbol=${symbol}`,8000),
     coinbaseSpot(base)
   ]);
   const bid=+book.bidPrice,ask=+book.askPrice,mid=(bid+ask)/2;
   spread=mid>0?(ask-bid)/mid:null;
   if(spread!=null){
     spreadScore=spread<=.0003?100:spread<=.0005?95:spread<=.001?85:spread<=.0015?70:spread<=.0025?45:20;
     components.push({score:spreadScore,w:25});
     if(spread>.0015)flags.push('Wide spread');
   }
   if(Array.isArray(depth.bids)&&Array.isArray(depth.asks)&&mid>0){
     const bidFloor=mid*.995,askCeil=mid*1.005;
     const bd=depth.bids.reduce((s,x)=>+x[0]>=bidFloor?s+(+x[0])*(+x[1]):s,0);
     const ad=depth.asks.reduce((s,x)=>+x[0]<=askCeil?s+(+x[0])*(+x[1]):s,0);
     depthTotal=bd+ad;
     const qv=+tick.quoteVolume||0,rel=qv>0?depthTotal/qv:0;
     depthScore=depthTotal>=2e6?100:depthTotal>=1e6?90:depthTotal>=5e5?80:depthTotal>=2.5e5?60:35;
     if(rel>=.005)depthScore=Math.min(100,depthScore+8);
     components.push({score:depthScore,w:30});
     if(depthTotal<2.5e5&&rel<.001)flags.push('Thin depth');
   }
   if(cb&&price>0){
     sourceDev=Math.abs(cb-price)/((cb+price)/2);
     crossScore=sourceDev<=.0015?100:sourceDev<=.003?94:sourceDev<=.005?84:sourceDev<=.0075?72:sourceDev<=.012?50:20;
     components.push({score:crossScore,w:25});
     if(sourceDev>.0075)flags.push('Cross-source price disagreement');
   }
 }catch(e){flags.push('Some live integrity feeds unavailable');}

 const candle=candleIntegrity(cs);components.push({score:candle.score,w:20});flags.push(...candle.flags);
 const totalW=components.reduce((s,x)=>s+x.w,0),score=totalW?components.reduce((s,x)=>s+x.score*x.w,0)/totalW:0,coverage=totalW/100;
 return{score,coverage,spread,depthTotal,sourceDev,flags:[...new Set(flags)]};
}

async function marketContext(){
 const[b,e]=await Promise.all([fetchHistory('BTCUSDT','1h','spot',500),fetchHistory('ETHUSDT','1h','spot',500)]);
 const ba=technicalCore(b),ea=technicalCore(e),score=(ba.baseScore/ba.baseWeight)*.60+(ea.baseScore/ea.baseWeight)*.40;
 return{btc:ba.baseScore/ba.baseWeight,eth:ea.baseScore/ea.baseWeight,score,direction:score>=60?'Bullish':score<=40?'Bearish':'Neutral'};
}
const ADAPTIVE_POLICIES={
 LIVE:{name:'Adaptive V2 Live',breakoutCloseScore:78,strongLevel:85,strongPremium:5,minBodyAtr:.35,minCloseLocation:.62,minVolumeRatio:.90},
 BALANCED:{name:'Adaptive V2 Balanced',breakoutCloseScore:75,strongLevel:88,strongPremium:4,minBodyAtr:.30,minCloseLocation:.58,minVolumeRatio:.80},
 MOMENTUM:{name:'Adaptive V2 Momentum',breakoutCloseScore:72,strongLevel:90,strongPremium:4,minBodyAtr:.28,minCloseLocation:.56,minVolumeRatio:.75}
};
function dirValue(x,side){return side===1?x:100-x;}
function entryQualityV2(a,policy=ADAPTIVE_POLICIES.LIVE){
 const side=a.side||0;if(!side)return{score:50,decision:'RETEST',reason:'NEUTRAL_DIRECTION'};
 const dStructure=dirValue(a.structure,side),dTrend=dirValue(a.trend,side),dMomentum=dirValue(a.momentum,side),dStrength=dirValue(a.strength,side),dVolume=dirValue(a.volumeFlow,side),dSR=dirValue(a.srBreakout,side),dMtf=dirValue(a.mtf??50,side);
 let score=dStructure*.18+dTrend*.16+dMomentum*.17+dStrength*.12+dVolume*.11+dSR*.10+dMtf*.10;
 if(a.regime==='Trending')score+=6;else if(a.regime==='Ranging')score-=8;
 const levelStrength=side===1?(a.resistanceStrength||0):(a.supportStrength||0);
 if(levelStrength>=policy.strongLevel)score-=4;
 score=clamp(score);
 return{score,decision:score>=policy.breakoutCloseScore?'CLOSE_CANDIDATE':'RETEST_BIAS',reason:score>=policy.breakoutCloseScore?'PRE_BREAKOUT_QUALITY_STRONG':'PRE_BREAKOUT_RETEST_BIAS',levelStrength,dStructure,dTrend,dMomentum,dStrength,dVolume,dSR,dMtf};
}
function volumeRatioAt(cs,idx){
 if(idx<1)return 1;const from=Math.max(0,idx-20),a=cs.slice(from,idx).map(x=>x.volume||0),m=a.length?mean(a):0;return m>0?(cs[idx].volume||0)/m:1;
}
function adaptiveBreakoutDecision(cs,idx,side,plan,policy=null){
 policy=policy||plan.policyConfig||ADAPTIVE_POLICIES.LIVE;
 const b=cs[idx],atrv=Math.max(plan.atrRef||plan.atrAtCreation||0,Math.abs(plan.breakoutLevel||b.close)*.002,1e-12),range=Math.max(b.high-b.low,1e-12);
 const bodyAtr=Math.abs(b.close-b.open)/atrv,closeLocation=side===1?(b.close-b.low)/range:(b.high-b.close)/range,distanceAtr=side===1?(b.close-plan.breakoutLevel)/atrv:(plan.breakoutLevel-b.close)/atrv,vr=volumeRatioAt(cs,idx);
 const bodyScore=clamp(bodyAtr/.90*100),locScore=clamp(closeLocation*100),distanceScore=clamp(distanceAtr/.50*100),volumeScore=clamp(vr/1.50*100),pre=Number.isFinite(plan.preBreakoutQuality)?plan.preBreakoutQuality:60;
 let score=pre*.55+bodyScore*.12+locScore*.10+distanceScore*.10+volumeScore*.13;
 const strong=(plan.levelStrength||0)>=policy.strongLevel;
 if(strong&&distanceAtr<.15)score-=8;
 score=clamp(score);
 const threshold=policy.breakoutCloseScore+(strong?policy.strongPremium:0);
 const evidenceOk=bodyAtr>=policy.minBodyAtr&&closeLocation>=policy.minCloseLocation&&(vr>=policy.minVolumeRatio||pre>=85);
 const decision=score>=threshold&&evidenceOk?'CLOSE':'RETEST';
 let reason='BREAKOUT_V2_RETEST';
 if(decision==='CLOSE')reason='BREAKOUT_V2_MOMENTUM_CONTINUATION';
 else if(strong)reason='BREAKOUT_V2_STRONG_LEVEL_RETEST';
 else if(vr<policy.minVolumeRatio)reason='BREAKOUT_V2_LOW_VOLUME_RETEST';
 else if(bodyAtr<policy.minBodyAtr||closeLocation<policy.minCloseLocation)reason='BREAKOUT_V2_WEAK_CANDLE_RETEST';
 return{score,decision,reason,bodyAtr,closeLocation,distanceAtr,volumeRatio:vr,threshold,strongLevel:strong};
}
function paperLevelsPolicy(a,policy=ADAPTIVE_POLICIES.LIVE){
 const atrv=Math.max(a.atr,a.price*.002),buf=.08*atrv,retestTol=.22*atrv,pre=entryQualityV2(a,policy);
 let entry,stop,tp1,tp2,mode,triggerMode,breakoutLevel,retestLow,retestHigh,entryReason;
 const levelStrength=a.side===1?(a.resistanceStrength||0):(a.supportStrength||0);
 if(a.side===1){
   breakoutLevel=a.resistance;retestLow=a.resistance-retestTol;retestHigh=a.resistance+retestTol;
   if(a.price<=a.resistance+buf){
     entryReason='AWAIT_BREAKOUT_QUALITY_V2';
     mode='Adaptive Entry V2 — closed-candle breakout, then choose momentum continuation or retest';
     triggerMode='ADAPTIVE_BREAKOUT_V2';entry=a.resistance+.03*atrv;
   }else if(pre.decision==='CLOSE_CANDIDATE'){
     entryReason='POST_BREAKOUT_HIGH_QUALITY_V2';mode='Adaptive V2 momentum continuation after confirmed close';triggerMode='BREAKOUT_CLOSE';entry=a.price+.04*atrv;
   }else{
     entryReason='POST_BREAKOUT_RETEST_BIAS_V2';mode='Adaptive V2 retest of broken resistance before continuation';triggerMode='RETEST_AFTER_BREAKOUT';entry=a.resistance+.03*atrv;
   }
   const structural=Math.min(a.support-.10*atrv,entry-.90*atrv);let risk=entry-structural;risk=Math.max(.90*atrv,Math.min(risk,1.80*atrv));stop=entry-risk;tp1=entry+1.20*risk;tp2=entry+2.00*risk;
 }else{
   breakoutLevel=a.support;retestLow=a.support-retestTol;retestHigh=a.support+retestTol;
   if(a.price>=a.support-buf){
     entryReason='AWAIT_BREAKOUT_QUALITY_V2';
     mode='Adaptive Entry V2 — closed-candle breakdown, then choose momentum continuation or retest';
     triggerMode='ADAPTIVE_BREAKOUT_V2';entry=a.support-.03*atrv;
   }else if(pre.decision==='CLOSE_CANDIDATE'){
     entryReason='POST_BREAKOUT_HIGH_QUALITY_V2';mode='Adaptive V2 momentum continuation after confirmed close';triggerMode='BREAKDOWN_CLOSE';entry=a.price-.04*atrv;
   }else{
     entryReason='POST_BREAKOUT_RETEST_BIAS_V2';mode='Adaptive V2 retest of broken support before continuation';triggerMode='RETEST_AFTER_BREAKDOWN';entry=a.support-.03*atrv;
   }
   const structural=Math.max(a.resistance+.10*atrv,entry+.90*atrv);let risk=structural-entry;risk=Math.max(.90*atrv,Math.min(risk,1.80*atrv));stop=entry+risk;tp1=entry-1.20*risk;tp2=entry-2.00*risk;
 }
 return{entry,stop,tp1,tp2,mode,entryReason,triggerMode,breakoutLevel,retestLow,retestHigh,
   resistanceStrength:a.resistanceStrength||0,supportStrength:a.supportStrength||0,
   resistanceTouches:a.resistanceTouches||0,supportTouches:a.supportTouches||0,
   policyName:policy.name,policyConfig:{...policy},preBreakoutQuality:pre.score,preDecision:pre.decision,
   levelStrength,atrRef:atrv,entryModelVersion:'AdaptiveEntryV2'};
}
function paperLevels(a){return UnifiedDecisionEngine.paperLevels(a);}

function confidenceTier(hist,integrity,techScore){
 if(hist.n>=100&&hist.wilson>=.53&&hist.pf>=1.30&&integrity.score>=80&&(techScore>=80||techScore<=20))return'HIGH CONFIDENCE';
 if(hist.n>=100&&hist.wilson>=.50&&hist.pf>=1.20&&integrity.score>=75)return'CONFIRMED';
 return'PRELIMINARY';
}
function finalDecision(frame,cfg){
 const a=frame.a,h=a.side===1?frame.oos.long:frame.oos.short,needN=requiredSample(frame.tf,cfg);
 const reasons=[];
 if(a.side===0)reasons.push('Current setup is neutral');
 if(frame.veto)reasons.push('Higher-timeframe veto');
 if(a.side&&h.n<needN)reasons.push(`OOS N ${h.n} < ${needN}`);
 if(a.side&&h.acc<cfg.minAcc)reasons.push(`OOS accuracy ${(h.acc*100).toFixed(1)}% < ${(cfg.minAcc*100).toFixed(0)}%`);
 if(a.side&&h.pf<cfg.minPF)reasons.push(`Cost-adjusted PF ${h.pf.toFixed(2)} < ${cfg.minPF.toFixed(2)}`);
 if(a.side&&h.wilson<cfg.minWilson)reasons.push(`Wilson95 ${(h.wilson*100).toFixed(1)}% < ${(cfg.minWilson*100).toFixed(0)}%`);
 if(frame.integrity.score<70)reasons.push(`Integrity ${frame.integrity.score.toFixed(1)} < 70`);
 if(frame.integrity.coverage<.50)reasons.push(`Integrity coverage ${(frame.integrity.coverage*100).toFixed(0)}% < 50%`);
 if(reasons.length)return{status:'BLOCKED',reasons,needN};
 return{status:confidenceTier(h,frame.integrity,a.score),reasons:['All minimum gates passed'],needN};
}
function nearQualified(frame,cfg){
 const a=frame.a;if(!a.side||frame.veto||frame.integrity.score<70||frame.integrity.coverage<.50)return false;
 const h=a.side===1?frame.oos.long:frame.oos.short,needN=requiredSample(frame.tf,cfg);
 const gates=[h.n>=needN,h.acc>=cfg.minAcc,h.pf>=cfg.minPF,h.wilson>=cfg.minWilson];
 const passed=gates.filter(Boolean).length;
 const nClose=h.n>=Math.max(15,needN*.50),accClose=h.acc>=cfg.minAcc-.04,pfClose=h.pf>=Math.max(1,cfg.minPF-.20),wClose=h.wilson>=cfg.minWilson-.05;
 return passed>=3 || (passed>=2&&nClose&&accClose&&pfClose&&wClose);
}


function createScenarioIfNeeded(frame,cs,symbol){
 const d=frame.decision;
 if(!frame.a.side||!(d.status!=='BLOCKED'||frame.near)||!frame.levels)return;
 let rows=loadScenarios(),active=rows.filter(x=>x.symbol===symbol&&x.tf===frame.tf&&!['TP2_HIT','STOPPED','INVALIDATED','EXPIRED','AMBIGUOUS'].includes(x.state)).at(-1);
 if(active)return;
 const L=frame.levels,initialState=
   ['RETEST_AFTER_BREAKOUT','RETEST_AFTER_BREAKDOWN'].includes(L.triggerMode)?'WAITING_RETEST':'PENDING_BREAKOUT';
 const s={
   id:scenarioId(symbol,frame.tf,frame.a.barCloseTime,frame.a.side),
   symbol,tf:frame.tf,side:frame.a.side,state:initialState,
   createdAt:Date.now(),createdBarCloseTime:frame.a.barCloseTime,
   lastUpdate:Date.now(),entry:L.entry,stop:L.stop,tp1:L.tp1,tp2:L.tp2,
   mode:L.mode,entryReason:L.entryReason,triggerMode:L.triggerMode,breakoutLevel:L.breakoutLevel,
   retestLow:L.retestLow,retestHigh:L.retestHigh,
   referenceOnly:d.status==='BLOCKED',sourceStatus:d.status,
   expiryBars:expiryBars(frame.tf),barCount:0,
   resistanceStrength:L.resistanceStrength,supportStrength:L.supportStrength,
   resistanceTouches:L.resistanceTouches,supportTouches:L.supportTouches,
   preBreakoutQuality:L.preBreakoutQuality,preDecision:L.preDecision,levelStrength:L.levelStrength,policyConfig:L.policyConfig,entryModelVersion:L.entryModelVersion,
   integrityAtCreation:frame.integrity.score,techAtCreation:frame.a.score,atrAtCreation:frame.a.atr,atrRef:L.atrRef||frame.a.atr,
   primaryTrendAtCreation:primaryTrendLabel(frame.a),setupAtCreation:currentSetupLabel(frame.a),
   supportAtCreation:frame.a.support,resistanceAtCreation:frame.a.resistance
 };
 rows.push(s);saveScenarios(rows);
}
function updateScenarioLifecycle(symbol,frame,cs,currentBar=null){
 let rows=loadScenarios();
 rows=rows.map(raw=>{
   let s=migrateScenarioText(raw);
   if(s.symbol!==symbol||s.tf!==frame.tf||isTerminalScenarioState(s.state))return s;

   const bars=barsAfter(cs,s.createdBarCloseTime);
   const fresh={...s,barCount:bars.length,lastUpdate:Date.now()};
   if(!Number.isFinite(fresh.atrAtCreation))fresh.atrAtCreation=frame.a.atr;

   const currentLevel=fresh.side===1?frame.a.resistance:frame.a.support;
   const currentAtr=Math.max(frame.a.atr||0,1e-12);
   fresh.currentReferenceLevel=currentLevel;
   fresh.levelDriftAbs=Math.abs(currentLevel-fresh.breakoutLevel);
   fresh.levelDriftATR=fresh.levelDriftAbs/currentAtr;
   fresh.revalidationRequired=fresh.levelDriftATR>=1.0;
   fresh.currentTechnicalScore=frame.a.score;
   fresh.currentPrimaryTrend=primaryTrendLabel(frame.a);
   fresh.currentSetup=currentSetupLabel(frame.a);

   if(bars.length>fresh.expiryBars&&isPreTriggerScenarioState(fresh.state)){
     fresh.state='EXPIRED';
     fresh.endReason='Entry condition did not trigger before expiry';
     return fresh;
   }

   // Opposite confirmed technical side invalidates the original idea.
   if(frame.a.side&&frame.a.side!==fresh.side){
     fresh.state='INVALIDATED';
     fresh.endReason='Closed-candle technical direction reversed';
     return fresh;
   }
   if(frame.veto){
     fresh.state='INVALIDATED';
     fresh.endReason='Higher-timeframe veto appeared';
     return fresh;
   }

   // Once triggered, do not pause an existing paper execution because the setup later becomes neutral.
   const alreadyTriggered=['TRIGGERED','TP1_HIT','READY_NEXT_OPEN'].includes(fresh.state);

   if(!alreadyTriggered){
     // Neutral current setup pauses, but does not erase, the prior scenario.
     if(frame.a.side===0){
       if(fresh.state!=='PAUSED_TECHNICAL'){
         fresh.resumeState=['PENDING_BREAKOUT','WAITING_RETEST'].includes(fresh.state)?fresh.state:(fresh.resumeState||'PENDING_BREAKOUT');
       }
       fresh.state='PAUSED_TECHNICAL';
       saveScenarios(rows); // harmless early persistence for mobile browsers
       return fresh;
     }

     // Same side returned: first restore the prior stage.
     if(fresh.state==='PAUSED_TECHNICAL'){
       fresh.state=fresh.resumeState||'PENDING_BREAKOUT';
     }

     // If the current S/R reference drifted by >= 1 ATR, freeze entry activation until it reconverges.
     if(fresh.revalidationRequired){
       if(fresh.state!=='STALE_REVALIDATION'){
         fresh.resumeState=['PENDING_BREAKOUT','WAITING_RETEST'].includes(fresh.state)?fresh.state:(fresh.resumeState||'PENDING_BREAKOUT');
       }
       fresh.state='STALE_REVALIDATION';
       return fresh;
     }else if(fresh.state==='STALE_REVALIDATION'&&fresh.levelDriftATR<0.75){
       fresh.state=fresh.resumeState||'PENDING_BREAKOUT';
     }

     if(frame.integrity.score<60){
       if(fresh.state!=='PAUSED_INTEGRITY'){
         fresh.resumeState=['PENDING_BREAKOUT','WAITING_RETEST'].includes(fresh.state)?fresh.state:(fresh.resumeState||'PENDING_BREAKOUT');
       }
       fresh.state='PAUSED_INTEGRITY';
       return fresh;
     }else if(fresh.state==='PAUSED_INTEGRITY'){
       fresh.state=fresh.resumeState||'PENDING_BREAKOUT';
     }
   }

   const long=fresh.side===1;

   if(fresh.state==='PENDING_BREAKOUT'){
     for(const b of bars){
       const confirmed=long?b.close>fresh.breakoutLevel:b.close<fresh.breakoutLevel;
       if(!confirmed)continue;
       fresh.breakoutConfirmedAt=b.closeTime;
       fresh.breakoutConfirmedBarTime=b.time;
       fresh.breakoutClose=b.close;
       if(fresh.triggerMode==='ADAPTIVE_BREAKOUT_V2'){
         const bi=cs.findIndex(x=>x.time===b.time),q=adaptiveBreakoutDecision(cs,bi,fresh.side,fresh,fresh.policyConfig||ADAPTIVE_POLICIES.LIVE);
         fresh.adaptiveBreakoutQuality=q.score;fresh.adaptiveBreakoutDecision=q.decision;fresh.adaptiveBreakoutReason=q.reason;
         fresh.breakoutBodyAtr=q.bodyAtr;fresh.breakoutCloseLocation=q.closeLocation;fresh.breakoutVolumeRatio=q.volumeRatio;
         if(q.decision==='RETEST')fresh.state='WAITING_RETEST';
         else{fresh.state='READY_NEXT_OPEN';fresh.entryConfirmationAt=b.closeTime;fresh.entryConfirmationBarTime=b.time;fresh.confirmationType='BREAKOUT_CLOSE_V2';}
       }else if(['BREAKOUT_CLOSE_RETEST','BREAKDOWN_CLOSE_RETEST'].includes(fresh.triggerMode)){
         fresh.state='WAITING_RETEST';
       }else{
         fresh.state='READY_NEXT_OPEN';
         fresh.entryConfirmationAt=b.closeTime;
         fresh.entryConfirmationBarTime=b.time;
         fresh.confirmationType='BREAKOUT_CLOSE';
       }
       break;
     }
   }

   if(fresh.state==='WAITING_RETEST'){
     const after=fresh.breakoutConfirmedAt||fresh.createdBarCloseTime;
     const retestBars=bars.filter(b=>b.closeTime>after);
     for(const b of retestBars){
       const touch=b.low<=fresh.retestHigh&&b.high>=fresh.retestLow;
       const hold=long?b.close>fresh.breakoutLevel:b.close<fresh.breakoutLevel;
       const fail=long?b.close<fresh.stop:b.close>fresh.stop;
       if(fail){
         fresh.state='INVALIDATED';
         fresh.endReason='Retest failed through structural invalidation';
         break;
       }
       if(touch&&hold){
         fresh.state='READY_NEXT_OPEN';
         fresh.retestConfirmedAt=b.closeTime;
         fresh.entryConfirmationAt=b.closeTime;
         fresh.entryConfirmationBarTime=b.time;
         fresh.confirmationType='RETEST_CLOSE';
         break;
       }
     }
   }

   if(fresh.state==='READY_NEXT_OPEN'&&Number.isFinite(fresh.entryConfirmationBarTime)){
     const execBar=nextExecutionBar(cs,currentBar,fresh.entryConfirmationBarTime);
     if(execBar){
       const eff=effectivePaperLevels(fresh,execBar.open);
       if(!eff){
         fresh.state='INVALIDATED';
         fresh.endReason='Next-open execution produced invalid risk geometry';
       }else{
         fresh.state='TRIGGERED';
         fresh.actualEntry=eff.actualEntry;
         fresh.effectiveStop=eff.effectiveStop;
         fresh.effectiveTP1=eff.effectiveTP1;
         fresh.effectiveTP2=eff.effectiveTP2;
         fresh.effectiveRisk=eff.effectiveRisk;
         fresh.triggeredAt=execBar.time;
         fresh.triggerBarTime=execBar.time;
         fresh.executionModel='NEXT_CANDLE_OPEN_AFTER_CONFIRMATION';
         fresh.executionWasLiveOpen=!!execBar.isOpen;
       }
     }
   }

   if(fresh.state==='TRIGGERED'||fresh.state==='TP1_HIT'){
     const stop=Number.isFinite(fresh.effectiveStop)?fresh.effectiveStop:fresh.stop;
     const tp1=Number.isFinite(fresh.effectiveTP1)?fresh.effectiveTP1:fresh.tp1;
     const tp2=Number.isFinite(fresh.effectiveTP2)?fresh.effectiveTP2:fresh.tp2;
     const post=cs.filter(b=>(b.time||0)>=(fresh.triggerBarTime||Infinity));
     for(const b of post){
       const stopHit=long?b.low<=stop:b.high>=stop;
       const tp1Hit=long?b.high>=tp1:b.low<=tp1;
       const tp2Hit=long?b.high>=tp2:b.low<=tp2;
       if(stopHit&&(tp1Hit||tp2Hit)){
         fresh.state='AMBIGUOUS';
         fresh.endReason='Same candle touched adverse and favorable barriers; OHLC cannot determine intrabar order';
         break;
       }
       if(stopHit){fresh.state='STOPPED';fresh.endedAt=b.closeTime;break;}
       if(tp2Hit){fresh.state='TP2_HIT';fresh.endedAt=b.closeTime;break;}
       if(tp1Hit&&fresh.state!=='TP1_HIT'){fresh.state='TP1_HIT';fresh.tp1At=b.closeTime;}
     }
   }
   return fresh;
 });
 // Always persist: barCount, drift and current snapshot must update even when state did not change.
 saveScenarios(rows);
} 
function lifecycleCard(symbol,frame){
 const raw=activeScenarioFor(symbol,frame.tf);
 if(!raw)return`<h2>Paper Scenario Lifecycle</h2><div class="hiddenLevels">لا يوجد سيناريو Paper نشط لهذا الفريم. يتم إنشاء سيناريو فقط عند Qualified أو Near‑Qualified.</div>`;
 const s=migrateScenarioText(raw),side=s.side===1?'LONG / BULLISH':'SHORT / BEARISH';
 const levelStrength=s.side===1?s.resistanceStrength:s.supportStrength,touches=s.side===1?s.resistanceTouches:s.supportTouches;
 const hasActual=Number.isFinite(s.actualEntry);
 const stop=hasActual?s.effectiveStop:s.stop,tp1=hasActual?s.effectiveTP1:s.tp1,tp2=hasActual?s.effectiveTP2:s.tp2;
 const currentLevel=s.side===1?frame.a.resistance:frame.a.support;
 const driftAbs=Math.abs(currentLevel-s.breakoutLevel),driftATR=driftAbs/Math.max(frame.a.atr||1e-12,1e-12);
 return`<div class="lifecycleTop"><div><h2>Paper Scenario Lifecycle</h2><div class="muted">${esc(side)} • ${esc(s.id)}</div></div><span class="lifecycleState ${scenarioStateClass(s.state)}">${esc(s.state)}</span></div>

 <div class="snapshotGrid">
   <div class="snapshotCell"><small>Primary Trend at creation</small><b>${esc(s.primaryTrendAtCreation||'N/A')}</b></div>
   <div class="snapshotCell"><small>Current Primary Trend</small><b>${esc(primaryTrendLabel(frame.a))}</b></div>
   <div class="snapshotCell"><small>Setup at creation</small><b>${esc(s.setupAtCreation||'Bullish/Bearish setup')}</b></div>
   <div class="snapshotCell"><small>Current Setup</small><b>${esc(currentSetupLabel(frame.a))}</b></div>
 </div>

 <div class="plannedBox"><b>Frozen planned scenario at creation</b>
   <div class="scenarioGrid">
     <div class="scenarioCell"><small>Planned Entry Reference</small><b>${fmt(s.entry,6)}</b></div>
     <div class="scenarioCell"><small>Planned Stop</small><b>${fmt(s.stop,6)}</b></div>
     <div class="scenarioCell"><small>Planned TP1</small><b>${fmt(s.tp1,6)}</b></div>
     <div class="scenarioCell"><small>Planned TP2</small><b>${fmt(s.tp2,6)}</b></div>
   </div>
 </div>

 ${hasActual?`<div class="executionBox"><h3>Actual Paper Execution</h3><div class="scenarioGrid">
   <div class="scenarioCell"><small>Actual Paper Trigger — next candle open</small><b>${fmt(s.actualEntry,6)}</b></div>
   <div class="scenarioCell"><small>Effective Stop</small><b>${fmt(stop,6)}</b></div>
   <div class="scenarioCell"><small>Effective TP1</small><b>${fmt(tp1,6)}</b></div>
   <div class="scenarioCell"><small>Effective TP2</small><b>${fmt(tp2,6)}</b></div>
 </div><div class="miniNote">Execution model: NEXT_CANDLE_OPEN_AFTER_CONFIRMATION.</div></div>`:''}

 <div class="scenarioGrid" style="margin-top:10px">
   <div class="scenarioCell"><small>Bars elapsed</small><b>${s.barCount||0}</b></div>
   <div class="scenarioCell"><small>Maximum pending bars</small><b>${s.expiryBars}</b></div>
   <div class="scenarioCell"><small>Created Technical Score</small><b>${fmt(s.techAtCreation,1)}</b></div>
   <div class="scenarioCell"><small>Current Technical Score</small><b>${fmt(frame.a.score,1)}</b></div>
 </div>

 <div class="triggerBox"><b>Entry model:</b> ${esc(s.mode)}<br>
 ${s.triggerMode.includes('RETEST')?`<b>Retest zone:</b> ${fmt(s.retestLow,6)} – ${fmt(s.retestHigh,6)}<br>`:''}
 <b>Original breakout/breakdown:</b> ${fmt(s.breakoutLevel,6)}<br>
 <b>Current S/R reference:</b> ${fmt(currentLevel,6)}<br>
 <b>Level drift:</b> ${fmt(driftAbs,6)} = ${fmt(driftATR,2)} ATR<br>
 <b>Pre-breakout quality:</b> ${Number.isFinite(s.preBreakoutQuality)?fmt(s.preBreakoutQuality,1)+'/100':'N/A'}<br>
 ${Number.isFinite(s.adaptiveBreakoutQuality)?`<b>Breakout quality at confirmation:</b> ${fmt(s.adaptiveBreakoutQuality,1)}/100 • <b>V2 decision:</b> ${esc(s.adaptiveBreakoutDecision||'N/A')}<br>`:''}
 <b>Why this model:</b> ${esc(s.adaptiveBreakoutReason||s.entryReason||'Adaptive Entry V2')}</div>

 ${driftATR>=1?`<div class="revalidationWarn"><b>REVALIDATION REQUIRED</b><br>المستوى الحالي ابتعد عن مستوى السيناريو الأصلي بمقدار ${fmt(driftATR,2)} ATR. لا يتم تغيير المستوى القديم بصمت؛ يبقى محفوظًا للمقارنة.</div>`:''}

 <div class="nextAction"><b>Next action / الحالة المطلوبة:</b><br>${esc(scenarioNextAction(s))}</div>
 <div class="levelStrength"><span class="levelTag">Level strength ${fmt(levelStrength,0)}/100</span><span class="levelTag">Historical touches ${touches}</span><span class="levelTag">${s.referenceOnly?'Reference / Near‑Qualified':'Qualified at creation'}</span></div>`;
}
function renderJournal(symbol){
 const rows=loadScenarios().filter(x=>x.symbol===symbol).slice(-12).reverse();
 if(!rows.length)return`<h2>Paper Scenario Journal</h2><div class="hiddenLevels">لا يوجد سجل بعد.</div>`;
 return`<div class="journalActions"><button id="clearJournalBtn" class="smallBtn">مسح سجل Paper</button></div><h2>Paper Scenario Journal</h2>${rows.map(s=>`<div class="journalRow">
   <div class="journalHead"><b>${esc(s.symbol)} — ${esc(s.tf)}</b><span class="lifecycleState ${scenarioStateClass(s.state)}">${esc(s.state)}</span></div>
   <div class="journalMeta">${s.side===1?'Bullish':'Bearish'} • Planned Entry ${fmt(s.entry,6)}${Number.isFinite(s.actualEntry)?` • Actual Trigger ${fmt(s.actualEntry,6)}`:''}<br>${Number.isFinite(s.actualEntry)?`Effective Stop ${fmt(s.effectiveStop,6)} • TP1 ${fmt(s.effectiveTP1,6)} • TP2 ${fmt(s.effectiveTP2,6)}`:`Planned Stop ${fmt(s.stop,6)} • TP1 ${fmt(s.tp1,6)} • TP2 ${fmt(s.tp2,6)}`}<br>${esc(migrateScenarioText(s).mode)}${s.endReason?'<br>'+esc(s.endReason):''}</div>
 </div>`).join('')}`;
}



function researchInterval(tf){return tf==='M15'?'15m':tf==='H1'?'1h':'1d';}
function researchHoldBars(tf){return tf==='M15'?32:tf==='H1'?24:12;}
function researchMethodName(method){return method==='A'?'A — Breakout Close':method==='B'?'B — Breakout + Retest':'C — Adaptive Entry';}
function nextBarOpenExecution(cs,confirmIndex,side,plan){
 const execIndex=confirmIndex+1;if(execIndex>=cs.length)return null;
 const actualEntry=cs[execIndex].open,eff=effectivePaperLevels({...plan,side},actualEntry);
 return eff?{execIndex,...eff}:null;
}
function researchCostR(entry,risk,costBps){
 const riskPct=risk/Math.max(Math.abs(entry),1e-12),costPct=costBps/10000;
 return riskPct>0?costPct/riskPct:0;
}
function resolveResearchTrade(cs,exec,side,costBps,holdBars){
 const long=side===1,entry=exec.actualEntry,stop=exec.effectiveStop,tp1=exec.effectiveTP1,tp2=exec.effectiveTP2,risk=exec.effectiveRisk;
 const costR=researchCostR(entry,risk,costBps),end=Math.min(cs.length-1,exec.execIndex+holdBars);
 for(let j=exec.execIndex;j<=end;j++){
   const b=cs[j],stopHit=long?b.low<=stop:b.high>=stop,tp1Hit=long?b.high>=tp1:b.low<=tp1;
   if(stopHit&&tp1Hit)return{triggered:true,resolved:false,ambiguous:true,outcome:'AMBIGUOUS',r:null,tp2Potential:false,exitIndex:j};
   if(stopHit)return{triggered:true,resolved:true,ambiguous:false,outcome:'STOP',r:-(1+costR),tp2Potential:false,exitIndex:j};
   if(tp1Hit){
     let tp2Potential=long?b.high>=tp2:b.low<=tp2;
     if(!tp2Potential){
       for(let k=j+1;k<=end;k++){
         const z=cs[k];
         if(long?z.high>=tp2:z.low<=tp2){tp2Potential=true;break;}
       }
     }
     // A/B benchmark = full exit at TP1. TP2 is diagnostic only.
     return{triggered:true,resolved:true,ambiguous:false,outcome:'TP1',r:1.2-costR,tp2Potential,exitIndex:j};
   }
 }
 const last=cs[end],raw=(long?(last.close-entry):(entry-last.close))/Math.max(risk,1e-12);
 return{triggered:true,resolved:true,ambiguous:false,outcome:'TIME_EXIT',r:raw-costR,tp2Potential:false,exitIndex:end};
}
function simulateResearchMethod(cs,sig,method,tf,costBps){
 const {i,side,plan}=sig,long=side===1,expiry=expiryBars(tf),hold=researchHoldBars(tf),maxEntry=Math.min(cs.length-2,i+expiry);
 let breakoutIndex=-1,retestIndex=-1,confirmIndex=-1,triggerKind='',noTriggerReason='';
 for(let j=i+1;j<=maxEntry;j++){const b=cs[j],ok=long?b.close>plan.breakoutLevel:b.close<plan.breakoutLevel;if(ok){breakoutIndex=j;break;}}
 if(breakoutIndex<0)return{method,triggered:false,resolved:false,noTriggerReason:'NO_BREAKOUT',barsToTrigger:null};
 let adaptiveDecision=null,adaptiveMeta=null;
 let needsRetest=method==='B';
 if(method==='C'){
   if(plan.triggerMode==='ADAPTIVE_BREAKOUT_V2'){
     adaptiveMeta=adaptiveBreakoutDecision(cs,breakoutIndex,side,plan,plan.policyConfig||ADAPTIVE_POLICIES.LIVE);
     adaptiveDecision=adaptiveMeta.decision;needsRetest=adaptiveDecision==='RETEST';
   }else{
     needsRetest=String(plan.triggerMode||'').includes('RETEST');
     adaptiveDecision=needsRetest?'RETEST':'CLOSE';
   }
 }
 if(!needsRetest){confirmIndex=breakoutIndex;triggerKind=method==='C'?'ADAPTIVE_CLOSE':'BREAKOUT_CLOSE';}
 else{
   for(let j=breakoutIndex+1;j<=maxEntry;j++){
     const b=cs[j],touch=b.low<=plan.retestHigh&&b.high>=plan.retestLow,holdLevel=long?b.close>plan.breakoutLevel:b.close<plan.breakoutLevel,failed=long?b.close<plan.stop:b.close>plan.stop;
     if(failed){noTriggerReason='FAILED_RETEST';break;}
     if(touch&&holdLevel){retestIndex=j;confirmIndex=j;triggerKind='RETEST_CLOSE';break;}
   }
   if(confirmIndex<0){
     if(!noTriggerReason)noTriggerReason='NO_RETEST';
     const after=cs.slice(breakoutIndex+1,Math.min(maxEntry+1,cs.length)),atrv=Math.max(sig.a.atr,sig.a.price*.002);
     const continuation=after.some(b=>long?b.high>=cs[breakoutIndex].close+atrv:b.low<=cs[breakoutIndex].close-atrv);
     return{method,triggered:false,resolved:false,noTriggerReason,breakoutIndex,retestIndex:-1,missedContinuation:continuation,barsToTrigger:null,adaptiveDecision,adaptiveMeta};
   }
 }
 const exec=nextBarOpenExecution(cs,confirmIndex,side,plan);
 if(!exec)return{method,triggered:false,resolved:false,noTriggerReason:'INVALID_NEXT_OPEN',breakoutIndex,retestIndex,confirmIndex,barsToTrigger:null};
 const result=resolveResearchTrade(cs,exec,side,costBps,hold);
 return{method,...result,breakoutIndex,retestIndex,confirmIndex,execIndex:exec.execIndex,actualEntry:exec.actualEntry,effectiveStop:exec.effectiveStop,effectiveTP1:exec.effectiveTP1,effectiveTP2:exec.effectiveTP2,triggerKind,barsToTrigger:exec.execIndex-i,adaptiveDecision,adaptiveMeta};
}
function maxDrawdownR(rows){
 let eq=0,peak=0,maxdd=0;
 for(const x of rows.filter(x=>x.resolved&&Number.isFinite(x.r)).sort((a,b)=>a.signalIndex-b.signalIndex)){eq+=x.r;peak=Math.max(peak,eq);maxdd=Math.max(maxdd,peak-eq);}
 return maxdd;
}
function aggregateResearch(rows){
 const triggered=rows.filter(x=>x.triggered),resolved=triggered.filter(x=>x.resolved&&Number.isFinite(x.r)),ambiguous=triggered.filter(x=>x.ambiguous);
 const wins=resolved.filter(x=>x.r>0),losses=resolved.filter(x=>x.r<0),grossWin=wins.reduce((s,x)=>s+x.r,0),grossLoss=Math.abs(losses.reduce((s,x)=>s+x.r,0));
 const pf=grossLoss?grossWin/grossLoss:(grossWin?Infinity:0),acc=(wins.length+losses.length)?wins.length/(wins.length+losses.length):0,avgR=resolved.length?resolved.reduce((s,x)=>s+x.r,0)/resolved.length:0;
 const bars=triggered.filter(x=>Number.isFinite(x.barsToTrigger)).map(x=>x.barsToTrigger),tp2=triggered.filter(x=>x.tp2Potential).length,reasonCounts={};
 rows.filter(x=>!x.triggered).forEach(x=>reasonCounts[x.noTriggerReason]=(reasonCounts[x.noTriggerReason]||0)+1);
 return{signals:rows.length,triggered:triggered.length,triggerRate:rows.length?triggered.length/rows.length:0,resolved:resolved.length,wins:wins.length,losses:losses.length,accuracy:acc,pf,avgR,wilson:wilsonLower95(wins.length,wins.length+losses.length),maxDD:maxDrawdownR(rows),ambiguous:ambiguous.length,noTrigger:rows.length-triggered.length,tp2Rate:triggered.length?tp2/triggered.length:0,avgBarsToTrigger:bars.length?mean(bars):0,reasonCounts};
}
function researchFoldStats(rows){
 return[0,1,2,3].map(f=>{const a=aggregateResearch(rows.filter(x=>x.fold===f));return{fold:f+1,n:a.resolved,pf:a.pf,avgR:a.avgR,acc:a.accuracy,triggered:a.triggered};});
}
function pairedResearchStats(records){
 let fakeAvoided=0,missedWinners=0,retestImproved=0,retestWorsened=0,bothResolved=0;
 for(const r of records){
   const A=r.A,B=r.B;
   if(A&&A.resolved&&A.r<0&&!(B&&B.triggered))fakeAvoided++;
   if(A&&A.resolved&&A.r>0&&!(B&&B.triggered))missedWinners++;
   if(A&&A.resolved&&B&&B.resolved){bothResolved++;if(A.r<0&&B.r>0)retestImproved++;if(A.r>0&&B.r<0)retestWorsened++;}
 }
 return{fakeAvoided,missedWinners,retestImproved,retestWorsened,bothResolved};
}

function lastIndexClosedAtOrBefore(cs,closeTime){
 let lo=0,hi=cs.length-1,ans=-1;
 while(lo<=hi){
   const m=(lo+hi)>>1;
   if((cs[m].closeTime||0)<=closeTime){ans=m;lo=m+1;}else hi=m-1;
 }
 return ans;
}
function historicalCoreAt(cs,idx){
 if(idx<259)return null;
 return technicalCore(cs.slice(Math.max(0,idx-319),idx+1));
}
function historicalMtfSnapshot(sets,tf,i){return UnifiedDecisionEngine.historicalSnapshot(sets,tf,i);}

function purgedWalkForwardMtf(sets,tf,costBps=10){return UnifiedDecisionEngine.purgedWalkForward(sets,tf,costBps);}

function fullMtfStartIndex(sets,tf){return UnifiedDecisionEngine.fullStartIndex(sets,tf);}


function adaptiveReasonCounts(plans){
 const out={AWAIT_BREAKOUT_QUALITY_V2:0,POST_BREAKOUT_HIGH_QUALITY_V2:0,POST_BREAKOUT_RETEST_BIAS_V2:0,OTHER:0};
 for(const p of plans){const k=p.entryReason||'OTHER';if(out[k]===undefined)out.OTHER++;else out[k]++;}
 return out;
}
function adaptiveOutcomeCounts(rows){
 const out={CLOSE:0,RETEST:0,UNKNOWN:0};
 for(const r of rows){const k=r.adaptiveDecision||'UNKNOWN';if(out[k]===undefined)out.UNKNOWN++;else out[k]++;}
 return out;
}
function researchRegimeBucket(a){
 const side=a.side||0,dm=dirValue(a.momentum,side||1),level=side===1?(a.resistanceStrength||0):(a.supportStrength||0),vr=a.volumeRatio||1;
 if(a.regime==='Ranging')return'Ranging';
 if(a.regime==='Trending'&&dm>=70&&vr>=1.05)return'Trending + high momentum';
 if(a.regime==='Trending'&&vr<.85)return'Trending + low participation';
 if(level>=80)return'Strong S/R level';
 if(a.regime==='Trending')return'Trending — other';
 return'Mixed / transition';
}
function regimeConditionedResearch(records){
 const map=new Map();
 for(const r of records){const k=researchRegimeBucket(r.snapshotA);if(!map.has(k))map.set(k,[]);map.get(k).push(r);}
 return[...map.entries()].map(([name,rs])=>({name,signals:rs.length,A:aggregateResearch(rs.map(x=>x.A)),B:aggregateResearch(rs.map(x=>x.B)),C:aggregateResearch(rs.map(x=>x.C))})).sort((a,b)=>b.signals-a.signals);
}
function runAdaptiveProfile(records,cs,tf,costBps,policy){
 const rows=[],plans=[];
 for(const r of records){
   const a=r.snapshotA;
   const plan=paperLevelsPolicy(a,policy);plans.push(plan);
   const sig={i:r.i,fold:r.fold,a,side:r.side,plan};
   const x=simulateResearchMethod(cs,sig,'C',tf,costBps);
   x.signalIndex=r.i;x.fold=r.fold;x.side=r.side;x.signalScore=r.score;
   rows.push(x);
 }
 return{
   name:policy.name,policy,
   stats:aggregateResearch(rows),
   folds:researchFoldStats(rows),
   retestCount:adaptiveOutcomeCounts(rows).RETEST,
   closeCount:adaptiveOutcomeCounts(rows).CLOSE,
   unknownCount:adaptiveOutcomeCounts(rows).UNKNOWN,
   reasons:adaptiveReasonCounts(plans)
 };
}

function buildHistoricalResearch(sets,tf,costBps){
 const cs=sets[tf],spec=validationSpec(tf),lookahead=expiryBars(tf)+researchHoldBars(tf)+3,fullStart=fullMtfStartIndex(sets,tf);
 if(fullStart<0)throw new Error('لا توجد تغطية MTF تاريخية كافية لهذا الفريم.');
 const researchStart=Math.max(fullStart,Math.floor(fullStart+(cs.length-fullStart)*.40));
 const usableEnd=cs.length-lookahead-1;
 const span=Math.max(1,usableEnd-researchStart),foldSize=Math.max(1,Math.floor(span/4)),records=[];
 for(let f=0;f<4;f++){
   const rawStart=researchStart+f*foldSize,rawEnd=f===3?usableEnd:researchStart+(f+1)*foldSize-1;
   const start=Math.max(researchStart,rawStart+spec.purge),end=Math.min(usableEnd,rawEnd-spec.purge);
   if(end<=start)continue;
   for(let i=start;i<=end;i+=spec.step){
     const snap=historicalMtfSnapshot(sets,tf,i);
     if(!snap||snap.veto)continue;
     const a=snap.a,side=a.side;
     if(!side||!Number.isFinite(a.atr)||a.atr<=0)continue;
     const plan=paperLevels(a),sig={i,fold:f,a,side,plan};
     const A=simulateResearchMethod(cs,sig,'A',tf,costBps),B=simulateResearchMethod(cs,sig,'B',tf,costBps),C=simulateResearchMethod(cs,sig,'C',tf,costBps);
     for(const x of[A,B,C]){x.signalIndex=i;x.fold=f;x.side=side;x.signalScore=a.score;}
     records.push({i,fold:f,side,score:a.score,plan,A,B,C,snapshotA:a});
   }
 }
 const rowsA=records.map(r=>r.A),rowsB=records.map(r=>r.B),rowsC=records.map(r=>r.C);
 const profileTests=[
   runAdaptiveProfile(records,cs,tf,costBps,ADAPTIVE_POLICIES.LIVE),
   runAdaptiveProfile(records,cs,tf,costBps,ADAPTIVE_POLICIES.BALANCED),
   runAdaptiveProfile(records,cs,tf,costBps,ADAPTIVE_POLICIES.MOMENTUM)
 ];
 return{
   records,fullStart,researchStart,usableEnd,
   effectiveOverlapN:Math.max(0,usableEnd-fullStart+1),
   effectiveOverlapStart:cs[fullStart]?.time||null,
   effectiveOverlapEnd:cs[usableEnd]?.closeTime||null,
   A:{stats:aggregateResearch(rowsA),folds:researchFoldStats(rowsA)},
   B:{stats:aggregateResearch(rowsB),folds:researchFoldStats(rowsB)},
   C:{stats:aggregateResearch(rowsC),folds:researchFoldStats(rowsC)},
   paired:pairedResearchStats(records),
   adaptiveRetestCount:adaptiveOutcomeCounts(rowsC).RETEST,
   adaptiveCloseCount:adaptiveOutcomeCounts(rowsC).CLOSE,
   adaptiveUnknownCount:adaptiveOutcomeCounts(rowsC).UNKNOWN,
   adaptiveReasons:adaptiveReasonCounts(records.map(r=>r.plan)),
   profileTests,
   regimeStats:regimeConditionedResearch(records)
 };
}
function researchMetric(label,value,cls=''){return`<div class="methodMetric"><small>${label}</small><b class="${cls}">${value}</b></div>`;}
function metricClassPositive(x,neutral=0){return x>neutral?'researchGood':x<neutral?'researchBad':'researchNeutral';}
function renderResearchResult(symbol,tf,costBps,result,historyN){
 if(typeof metric!=='function'||typeof displayPF!=='function'||typeof researchMetric!=='function')
   throw new Error('Research UI helper initialization failed: metric/displayPF/researchMetric');
 for(const id of['researchSummary','researchCompare','researchPairs','researchAdaptive','researchRegimes','researchFolds','researchLifecycle'])$(id).classList.remove('hidden');
 const overlapStart=result.effectiveOverlapStart?new Date(result.effectiveOverlapStart).toLocaleDateString('en-CA'):'N/A';
 const overlapEnd=result.effectiveOverlapEnd?new Date(result.effectiveOverlapEnd).toLocaleDateString('en-CA'):'N/A';
 $('researchSummary').innerHTML=`<h2>Historical Entry Research — ${esc(symbol)} ${tf}</h2><span class="parityBadge">Timeframe-specific validation: ON</span><div class="metrics">
 ${metric(tf+' candles loaded',historyN)}
 ${metric('Effective validation overlap',result.effectiveOverlapN)}
 ${metric('Historical signals',result.records.length)}
 ${metric('Research cost',costBps+' bps')}
 ${metric('Execution model','Next candle open')}
 ${metric('Exit benchmark','Full exit at TP1 (1.20R)')}
 ${metric('Adaptive chose Retest',result.adaptiveRetestCount)}
 ${metric('Adaptive V2 chose Close',result.adaptiveCloseCount)}
 ${metric('Adaptive V2 chose Retest',result.adaptiveRetestCount)}
 </div><div class="overlapNote"><b>Effective MTF date range:</b> ${overlapStart} → ${overlapEnd}<br>الرقم أعلاه هو التداخل الفعلي المطلوب للفريم المختار وفق التسلسل الهرمي الجديد؛ H1 لا يحتاج M15 تاريخيًا.</div>
 <div class="researchWarning">Benchmark الخروج موحّد: خروج كامل عند TP1 = 1.20R. TP2 تشخيص فقط ولا يرفع PF. Higher‑TF veto مطبق تاريخيًا أيضًا، مع فصل دور الاتجاه عن دور توقيت الدخول.</div>`;

 const methods=['A','B','C'];
 $('researchCompare').innerHTML=`<h2>A/B/C Comparison</h2><div class="researchMethodGrid">${methods.map(m=>{const s=result[m].stats;return`<div class="methodCard"><span class="methodTag">${researchMethodName(m)}</span><div class="methodMetrics">
 ${researchMetric('Signals',s.signals)}${researchMetric('Triggered',s.triggered)}${researchMetric('Trigger rate',pct(s.triggerRate))}${researchMetric('Resolved',s.resolved)}
 ${researchMetric('Win rate',pct(s.accuracy),metricClassPositive(s.accuracy,.50))}
 ${researchMetric('PF after costs',displayPF(s.pf,s.resolved),metricClassPositive(Number.isFinite(s.pf)?s.pf:2,1))}
 ${researchMetric('Average net R',s.avgR.toFixed(3)+'R',metricClassPositive(s.avgR,0))}
 ${researchMetric('Wilson 95%',pct(s.wilson),metricClassPositive(s.wilson,.50))}
 ${researchMetric('Max drawdown',s.maxDD.toFixed(2)+'R')}
 ${researchMetric('Avg bars to trigger',s.avgBarsToTrigger.toFixed(1))}
 ${researchMetric('TP2 potential after TP1',pct(s.tp2Rate))}
 ${researchMetric('Ambiguous OHLC',s.ambiguous)}
 </div>${s.resolved<30?'<span class="sampleWarn">Preliminary sample N&lt;30</span>':''}</div>`;}).join('')}</div>
 <div class="compareTableWrap"><table class="compareTable"><thead><tr><th>Metric</th><th>A: Breakout Close</th><th>B: Breakout + Retest</th><th>C: Adaptive Entry V2</th></tr></thead><tbody>
 ${[
 ['PF after costs',displayPF(result.A.stats.pf,result.A.stats.resolved),displayPF(result.B.stats.pf,result.B.stats.resolved),displayPF(result.C.stats.pf,result.C.stats.resolved)],
 ['Average net R',result.A.stats.avgR.toFixed(3)+'R',result.B.stats.avgR.toFixed(3)+'R',result.C.stats.avgR.toFixed(3)+'R'],
 ['Win rate',pct(result.A.stats.accuracy),pct(result.B.stats.accuracy),pct(result.C.stats.accuracy)],
 ['Wilson 95%',pct(result.A.stats.wilson),pct(result.B.stats.wilson),pct(result.C.stats.wilson)],
 ['Max drawdown',result.A.stats.maxDD.toFixed(2)+'R',result.B.stats.maxDD.toFixed(2)+'R',result.C.stats.maxDD.toFixed(2)+'R'],
 ['Trigger rate',pct(result.A.stats.triggerRate),pct(result.B.stats.triggerRate),pct(result.C.stats.triggerRate)],
 ['Avg bars to trigger',result.A.stats.avgBarsToTrigger.toFixed(1),result.B.stats.avgBarsToTrigger.toFixed(1),result.C.stats.avgBarsToTrigger.toFixed(1)]
 ].map(r=>`<tr>${r.map((x,i)=>`<td>${i===0?esc(x):x}</td>`).join('')}</tr>`).join('')}
 </tbody></table></div>`;

 const q=result.paired;
 $('researchPairs').innerHTML=`<h2>Paired Trade-off Analysis</h2><div class="pairedGrid">
 <div class="pairedBox"><small>A losses avoided because B did not trigger</small><b>${q.fakeAvoided}</b></div>
 <div class="pairedBox"><small>A winning moves missed because B had no retest</small><b>${q.missedWinners}</b></div>
 <div class="pairedBox"><small>Both triggered: Retest changed loss → gain</small><b>${q.retestImproved}</b></div>
 <div class="pairedBox"><small>Both triggered: Retest changed gain → loss</small><b>${q.retestWorsened}</b></div>
 </div><p class="muted">هذه مقارنة وصفية لنفس الإشارات، وليست اختيارًا تلقائيًا لطريقة دخول.</p>`;

 const r=result.adaptiveReasons||{},totalAdaptive=Math.max(1,result.adaptiveCloseCount+result.adaptiveRetestCount),closeShare=result.adaptiveCloseCount/totalAdaptive,retestShare=result.adaptiveRetestCount/totalAdaptive,imbalanced=Math.max(closeShare,retestShare)>.90;
 $('researchAdaptive').innerHTML=`<h2>Adaptive Entry V2 Diagnostics</h2>
 <div class="metrics">
   ${metric('V2 → Breakout Close',result.adaptiveCloseCount)}
   ${metric('V2 → Retest',result.adaptiveRetestCount)}
   ${metric('Close share',pct(closeShare))}
   ${metric('Retest share',pct(retestShare))}
   ${metric('Await breakout quality',r.AWAIT_BREAKOUT_QUALITY_V2||0)}
 </div>
 <div class="${imbalanced?'researchWarning':'overlapNote'}"><b>${imbalanced?'IMBALANCE FLAG':'Decision balance acceptable'}</b><br>${imbalanced?'إحدى طريقتي الدخول تجاوزت 90% من قرارات V2؛ لا يتم اعتبار ذلك تفوقًا بل إشارة لمزيد من الاختبار.':'لم تعد القاعدة تجبر Strong S/R على Retest تلقائيًا؛ القرار النهائي يُحسم بعد رؤية إغلاق شمعة الاختراق.'}</div>
 <p class="muted">Adaptive V2 لا ينظر إلى قوة المستوى فقط. بعد إغلاق الاختراق يقيس Body/ATR وموضع الإغلاق داخل الشمعة والمسافة بعد المستوى وVolume ratio، ثم يختار Continuation أو Retest. الحدود ثابتة مسبقًا وليست مُحسّنة آليًا على نتيجة ADA.</p>
 <div class="profileGrid">${result.profileTests.map(z=>`<div class="profileCard">
   <h3>${esc(z.name)}</h3>
   <div class="profileRule">Close score ≥${z.policy.breakoutCloseScore} • Body/ATR ≥${z.policy.minBodyAtr.toFixed(2)} • Close-location ≥${z.policy.minCloseLocation.toFixed(2)} • Volume ≥${z.policy.minVolumeRatio.toFixed(2)}x</div>
   <div class="profileMetrics">
     ${researchMetric('Retest',z.retestCount)}
     ${researchMetric('Close',z.closeCount)}
     ${researchMetric('Resolved',z.stats.resolved)}
     ${researchMetric('PF',displayPF(z.stats.pf,z.stats.resolved))}
     ${researchMetric('Avg R',z.stats.avgR.toFixed(3)+'R')}
     ${researchMetric('Max DD',z.stats.maxDD.toFixed(2)+'R')}
   </div>
   ${z.stats.resolved<30?'<span class="sampleWarn">Research only • small sample</span>':''}
 </div>`).join('')}</div>`;

 $('researchRegimes').innerHTML=`<h2>Regime-Conditioned Entry Research</h2><p class="muted">مقارنة وصفية لطريقة الدخول داخل حالات سوق مختلفة. لا يتم اختيار "الفائز" تلقائيًا، والصفوف الصغيرة تبقى استكشافية.</p><div class="compareTableWrap"><table class="compareTable"><thead><tr><th>Regime</th><th>Signals</th><th>A PF</th><th>B PF</th><th>C PF</th><th>A AvgR</th><th>B AvgR</th><th>C AvgR</th></tr></thead><tbody>${result.regimeStats.map(z=>`<tr><td>${esc(z.name)}${z.signals<30?' • small N':''}</td><td>${z.signals}</td><td>${displayPF(z.A.pf,z.A.resolved)}</td><td>${displayPF(z.B.pf,z.B.resolved)}</td><td>${displayPF(z.C.pf,z.C.resolved)}</td><td>${z.A.avgR.toFixed(3)}R</td><td>${z.B.avgR.toFixed(3)}R</td><td>${z.C.avgR.toFixed(3)}R</td></tr>`).join('')}</tbody></table></div>`;

 $('researchFolds').innerHTML=`<h2>Chronological Fold Stability</h2>${methods.map(m=>`<div class="foldMethod"><h3>${researchMethodName(m)}</h3><div class="foldGrid">${result[m].folds.map(z=>{
   if(z.n<10)return`<div class="foldBox"><small>Fold ${z.fold}</small><b>INSUFFICIENT SAMPLE</b><small>N ${z.n}</small></div>`;
   return`<div class="foldBox"><small>Fold ${z.fold}</small><b>PF ${displayPF(z.pf,z.n)}</b><small>Avg ${z.avgR.toFixed(3)}R • N ${z.n}</small></div>`;
 }).join('')}</div></div>`).join('')}
 <p class="muted">PF لا يُعرض للـFold إذا كان N&lt;10. هذا يمنع أرقامًا مثل 99 من عينة صغيرة جدًا من أن تبدو ذات معنى.</p>`;

 $('researchLifecycle').innerHTML=`<h2>Historical Lifecycle State Machine</h2><div class="lifecycleFlow">
 <span class="flowState">SIGNAL</span><span class="flowArrow">→</span><span class="flowState">PENDING_BREAKOUT</span><span class="flowArrow">→</span><span class="flowState">WAITING_RETEST when required</span><span class="flowArrow">→</span><span class="flowState">READY_NEXT_OPEN</span><span class="flowArrow">→</span><span class="flowState">TRIGGERED</span><span class="flowArrow">→</span><span class="flowState">TP1 / STOP / TIME_EXIT / AMBIGUOUS</span></div>
 <p class="muted">التنفيذ التاريخي والحي يفصلان بين شمعة التأكيد وOpen الشمعة التالية. السيناريو الحي المخزّن يبقى مستقلًا.</p>`;
}

async function runHistoricalResearch(){
 const b=$('runResearchBtn');b.disabled=true;
 const symbol=$('researchSymbol').value.trim().toUpperCase(),market=$('researchMarket').value,tf=$('researchTf').value,costBps=+$('researchCostBps').value;
 if(tf==='D1'){ $('researchStatus').textContent='D1 Research معطّل في V5.6.7.4 حتى يتوفر مسار بيانات أعمق مناسب للمتصفح.';b.disabled=false;return; }
 $('researchStatus').textContent='جاري جلب تاريخ MTF متداخل فعليًا...';
 try{
   const needs=tf==='H1'
     ?{M15:420,H1:4000,D1:900}
     :{M15:4000,H1:1400,D1:500};
   const [m15,h1,d1]=await Promise.all([
     fetchHistory(symbol,'15m',market,needs.M15),
     fetchHistory(symbol,'1h',market,needs.H1),
     fetchHistory(symbol,'1d',market,needs.D1)
   ]);
   const sets={M15:m15,H1:h1,D1:d1};
   if(sets[tf].length<500)throw new Error('عدد الشموع المتاحة غير كافٍ للاختبار التاريخي.');
   $('researchStatus').textContent='جاري محاكاة A/B/C + Adaptive Entry V2 + Regime-conditioned research...';
   await new Promise(r=>setTimeout(r,40));
   const result=buildHistoricalResearch(sets,tf,costBps);
   if(!result.records.length)throw new Error('لم يتم العثور على إشارات كاملة بعد تطبيق MTF + Higher‑TF veto.');
   renderResearchResult(symbol,tf,costBps,result,sets[tf].length);
   $('researchStatus').textContent=`اكتمل V5.6.7.4 — ${result.records.length} إشارة بعد MTF parity + veto.`;
 }catch(e){$('researchStatus').textContent='خطأ في Historical Simulator: '+e.message;}
 finally{b.disabled=false;}
}


$('runLiveBtn').onclick=async()=>{
 const b=$('runLiveBtn');b.disabled=true;$('status').textContent='جاري جلب البيانات وتشغيل Unified Decision Engine...';
 try{
   const symbol=$('liveSymbol').value.trim().toUpperCase(),market=$('liveMarket').value;
   const cfg={sampleRule:$('liveSampleRule').value,minSample:+$('liveMinSample').value,minAcc:+$('liveMinAcc').value,minPF:+$('liveMinPF').value,minWilson:+$('liveMinWilson').value,costBps:+$('liveCostBps').value};
   const defs=[['M15','15m',validationSpec('M15').history],['H1','1h',validationSpec('H1').history],['D1','1d',validationSpec('D1').history]];
   const loaded=await Promise.all(defs.map(x=>fetchHistory(symbol,x[1],market,x[2])));
   const setsByTf={M15:loaded[0],H1:loaded[1],D1:loaded[2]};
   const executionBars=await Promise.all(defs.map(x=>fetchCurrentKline(symbol,x[1],market).catch(()=>null)));
   const ctx=await marketContext();

   // Unified Decision Engine: one source of truth for Live + Scanner.
   const finals=UnifiedDecisionEngine.finalizeCurrent(setsByTf);

   // PASS 3: only now evaluate historical validation, integrity and higher-TF veto.
   const frames=[];
   for(let i=0;i<defs.length;i++){
     const tf=defs[i][0],a=finals[tf];
     $('status').textContent=`${tf}: Timeframe-specific Purged Walk‑Forward + integrity...`;
     const oos=purgedWalkForwardMtf(setsByTf,tf,cfg.costBps);
     oos.folds=a.side===1?(oos.foldsLong||oos.folds):a.side===-1?(oos.foldsShort||oos.folds):oos.folds;
     const integrity=await liveIntegrity(symbol,market,a.price,loaded[i]);
     const veto=higherTfVeto(tf,a.side,finals);
     const frame={tf,a,oos,integrity,veto,levels:a.side?paperLevels(a):null,candles:loaded[i]};
     frame.decision=finalDecision(frame,cfg);frame.near=frame.decision.status==='BLOCKED'&&nearQualified(frame,cfg);
     updateScenarioLifecycle(symbol,frame,loaded[i],executionBars[i]);createScenarioIfNeeded(frame,loaded[i],symbol);
     frames.push(frame);
   }

   const sides=frames.map(x=>x.a.side||0),bull=sides.filter(x=>x===1).length,bear=sides.filter(x=>x===-1).length,neutral=sides.filter(x=>x===0).length;
   const directionalCount=bull+bear,netConsensus=frames.length?Math.abs(sides.reduce((q,x)=>q+x,0))/frames.length:0;
   const majorityCount=Math.max(bull,bear),majorityDirection=bull>bear?'Bullish':bear>bull?'Bearish':'Split / Neutral';
   const strength=mtfStrength(frames);
   currentLive={symbol,market,ctx,frames,agreement:netConsensus,netConsensus,directionalCount,bullCount:bull,bearCount:bear,neutralCount:neutral,majorityCount,majorityDirection,strength,cfg};
   // UI helper self-check: fail with a precise message instead of a blank dashboard.
   if(typeof metric!=='function'||typeof statusClass!=='function'||typeof displayPF!=='function')throw new Error('UI helper initialization failed: metric/statusClass/displayPF');
   currentTf='H1';renderLive();
   $('status').textContent='اكتمل V5.6.7.4: two-pass MTF + correct Higher‑TF veto + MTF-aware OOS.';
 }catch(e){$('status').textContent='خطأ: '+e.message;}
 finally{b.disabled=false;}
};

function metric(label,value,cls=''){return`<div class="metric"><small>${label}</small><b class="${cls}">${value}</b></div>`;}
function statusClass(s){return s==='BLOCKED'?'statusBlocked':s==='PRELIMINARY'?'statusPrelim':s==='CONFIRMED'?'statusConfirmed':'statusHigh';}

function renderLive(){
 const x=currentLive;
 $('marketOverview').classList.remove('hidden');$('mtfCards').classList.remove('hidden');$('detailsPanel').classList.remove('hidden');
 $('marketOverview').innerHTML=`<h2>Market Overview — ${esc(x.symbol)}</h2><div class="metrics">
   ${metric('BTC H1 context',x.ctx.btc.toFixed(1))}
   ${metric('ETH H1 context',x.ctx.eth.toFixed(1))}
   ${metric('Market context',x.ctx.direction)}
   ${metric('Net Direction Consensus',(x.netConsensus*100).toFixed(1)+'%')}
   ${metric('Majority Direction',x.majorityDirection+' '+x.majorityCount+'/3')}
   ${metric('Directional Frames',x.directionalCount+'/3')}
   ${metric('Weighted MTF Strength',x.strength.toFixed(1)+'/100')}
 </div>`;
 $('mtfCards').innerHTML=x.frames.map(f=>`<div class="tfcard">
   <h3>${f.tf}</h3>
   <div class="direction ${f.a.side===1?'bullish':f.a.side===-1?'bearish':'neutral'}">${f.a.side===1?'BULLISH':f.a.side===-1?'BEARISH':'NEUTRAL'}</div>
   <div class="score">${f.a.score.toFixed(1)}</div>
   <p class="muted">${f.tf==='D1'?f.a.regime:(f.a.session+' • '+f.a.regime)}</p>
   <div class="decision ${f.decision.status==='BLOCKED'?'block':'allow'}">${f.decision.status}</div>
 </div>`).join('');
 $('tfTabs').innerHTML=x.frames.map(f=>`<button class="tab ${f.tf===currentTf?'active':''}" data-tf="${f.tf}">${f.tf}</button>`).join('');
 $('tfTabs').querySelectorAll('.tab').forEach(b=>b.onclick=()=>{currentTf=b.dataset.tf;$('tfTabs').querySelectorAll('.tab').forEach(z=>z.classList.toggle('active',z.dataset.tf===currentTf));renderTf();});
 if(!x.frames.some(f=>f.tf===currentTf))currentTf='H1';renderTf();
}
function compRow(name,value,weight){
 return`<div class="compRow"><div><b>${name}</b><div class="compBar"><span style="width:${clamp(value)}%"></span></div></div><b>${value.toFixed(0)}</b><span class="weightTag">${weight}%</span></div>`;
}
function renderTf(){
 const f=currentLive.frames.find(z=>z.tf===currentTf),a=f.a,h=a.side===1?f.oos.long:f.oos.short,d=f.decision;
 const lock=a.barCloseTime?new Date(a.barCloseTime).toLocaleString('ar',{hour12:false}):'N/A';

 $('tfSummary').innerHTML=`<h2>${currentLive.symbol} — ${f.tf}</h2>
   <div class="score ${a.side===1?'bullish':a.side===-1?'bearish':'neutral'}">${a.score.toFixed(1)}/100</div>
   <div class="metrics">
     ${metric('Primary Trend',primaryTrendLabel(a))}
     ${metric('Current Setup',currentSetupLabel(a))}
     ${metric('Market Structure',a.structureState)}
     ${metric('Closed price',fmt(a.price,6))}
     ${metric('Session',a.session)}
     ${metric('Regime',a.regime)}
     ${metric('MTF component',a.mtf.toFixed(1))}
     ${metric('Higher-TF veto',f.veto?'YES':'NO',f.veto?'bad':'good')}
   </div><div class="lockLine">🔒 Technical signal locked to closed ${f.tf} candle: ${esc(lock)}</div>`;

 $('tfDecision').innerHTML=`<h2>Final Decision</h2>
   <div class="finalStatus ${statusClass(d.status)}">${d.status}</div>
   <div class="reasonBox">${d.reasons.map(x=>`• ${esc(x)}`).join('<br>')}</div>
   <p class="muted">Final Status لا يساوي احتمال ربح. هو نتيجة عبور الطبقات الثلاث وفق الحدود الحالية.</p>`;

 $('tfTechnical').innerHTML=`<h2>1 — Technical Engine</h2>
   <p class="muted">المؤشرات المترابطة مدمجة داخل مجموعات حتى لا يتم احتساب نفس حركة السعر عدة مرات.</p>
   ${compRow('Market Structure',a.structure,25)}
   ${compRow('Trend — EMA + Ichimoku',a.trend,20)}
   ${compRow('Momentum — RSI + MACD',a.momentum,12)}
   ${compRow('Trend Strength — ADX/DI',a.strength,10)}
   ${compRow('Volume / Participation',a.volumeFlow,12)}
   ${compRow('S/R + Breakout / Retest',a.srBreakout,11)}
   ${compRow('MTF Context',a.mtf,10)}
   <div class="metrics">${metric('Technical Score',a.score.toFixed(1))}${metric('Direction threshold','Bull ≥65 / Bear ≤35')}</div>`;

 const needN=requiredSample(f.tf,currentLive.cfg),folds=f.oos.folds||[];
 $('tfHistorical').innerHTML=`<h2>2 — Purged Walk‑Forward Historical Validation</h2>
   ${a.side?`<div class="layerGrid">
     <div class="layerMetric"><small>Resolved OOS N</small><b class="${h.n>=needN?'enginePass':'engineFail'}">${h.n}</b></div>
     <div class="layerMetric"><small>Minimum Required</small><b>${needN}</b></div>
     <div class="layerMetric"><small>OOS Accuracy</small><b class="${h.acc>=currentLive.cfg.minAcc?'enginePass':'engineFail'}">${pct(h.acc)}</b></div>
     <div class="layerMetric"><small>Cost-adjusted Profit Factor</small><b class="${h.pf>=currentLive.cfg.minPF?'enginePass':'engineFail'}">${displayPF(h.pf,h.n)}</b></div>
     <div class="layerMetric"><small>Wilson 95% Lower Bound</small><b class="${h.wilson>=currentLive.cfg.minWilson?'enginePass':'engineFail'}">${pct(h.wilson)}</b></div>
     <div class="layerMetric"><small>Average net R</small><b>${h.avgR.toFixed(3)}R</b></div>
     <div class="layerMetric"><small>Research cost</small><b>${currentLive.cfg.costBps} bps</b></div>
   </div><div class="foldGrid">${folds.map((z,i)=>`<div class="foldBox"><small>Fold ${i+1}</small><b>${z.n?((z.acc*100).toFixed(1)+'%'):'N/A'}</b><small>N ${z.n}</small></div>`).join('')}</div>`:'<div class="hiddenLevels">لا يوجد اتجاه فني، لذلك لا يوجد Side-specific validation.</div>'}
   <div class="overlapNote">Timeframe-specific OOS overlap: ${f.oos.overlapN||0} ${f.tf} candles${f.oos.overlapStartTime?` • ${new Date(f.oos.overlapStartTime).toLocaleDateString('en-CA')} → ${new Date(f.oos.overlapEndTime).toLocaleDateString('en-CA')}`:''}</div>
   <p class="muted">${esc(f.oos.validationMode||'Timeframe-specific validation')}<br>تم تطبيق Higher‑TF veto قبل إدخال الإشارة في OOS. هذه إحصاءات تاريخية وليست احتمالًا مضمونًا.</p>`;

 const flags=f.integrity.flags?.length?f.integrity.flags.map(x=>`<span class="integrityFlag">${esc(x)}</span>`).join(''):'<span class="integrityOk">No major live integrity flag</span>';
 $('tfIntegrity').innerHTML=`<h2>3 — Market Integrity Engine</h2>
   <div class="layerGrid">
     <div class="layerMetric"><small>Integrity Score</small><b class="${f.integrity.score>=75?'enginePass':f.integrity.score>=70?'engineWarn':'engineFail'}">${f.integrity.score.toFixed(1)}</b></div>
     <div class="layerMetric"><small>Coverage</small><b>${pct(f.integrity.coverage)}</b></div>
     <div class="layerMetric"><small>Live Spread</small><b>${f.integrity.spread!=null?(f.integrity.spread*100).toFixed(3)+'%':'N/A'}</b></div>
     <div class="layerMetric"><small>Depth ±0.5%</small><b>${f.integrity.depthTotal!=null?'$'+(f.integrity.depthTotal/1e6).toFixed(2)+'M':'N/A'}</b></div>
     <div class="layerMetric"><small>Cross-source deviation</small><b>${f.integrity.sourceDev!=null?(f.integrity.sourceDev*100).toFixed(3)+'%':'N/A'}</b></div>
   </div><div class="integrityFlags">${flags}</div>
   <p class="muted">Integrity بيانات حية؛ يمكنها حجب السيناريو إذا ساءت، لكنها لا تعيد حساب الاتجاه الفني قبل إغلاق الشمعة التالية.</p>`;

 $('tfLifecycle').innerHTML=lifecycleCard(currentLive.symbol,f);
 $('paperJournal').innerHTML=renderJournal(currentLive.symbol);
 const clearBtn=$('clearJournalBtn');if(clearBtn)clearBtn.onclick=()=>{saveScenarios(loadScenarios().filter(x=>x.symbol!==currentLive.symbol));renderTf();};
 $('tfScenario').className=`card ${d.status==='BLOCKED'?'filterBlocked':'filterAllowed'}`;
 if(d.status==='BLOCKED'&&!f.near){
   $('tfScenario').innerHTML=`<h2>${f.tf} — Paper Scenario</h2><div class="decision block">BLOCKED</div><div class="hiddenLevels">النتيجة ليست قريبة بما يكفي من شروط التحقق، لذلك لا تُعرض مستويات مرجعية.</div>`;
 }else if(d.status==='BLOCKED'&&f.near){
   const L=f.levels,risk=Math.abs(L.entry-L.stop),rr1=risk?Math.abs(L.tp1-L.entry)/risk:0,rr2=risk?Math.abs(L.tp2-L.entry)/risk:0;
   $('tfScenario').innerHTML=`<h2>${f.tf} — Paper Reference Scenario</h2>
     <div class="decision block">BLOCKED — NEAR-QUALIFIED</div><span class="referenceBadge">REFERENCE ONLY • NOT QUALIFIED</span>
     <div class="levels4"><div class="level"><small>Paper Reference Entry</small><strong>${fmt(L.entry,6)}</strong></div><div class="level"><small>Paper Reference Stop</small><strong>${fmt(L.stop,6)}</strong></div><div class="level"><small>Paper Reference TP1</small><strong>${fmt(L.tp1,6)}</strong><div class="rankTag">R:R ${rr1.toFixed(2)}</div></div><div class="level"><small>Paper Reference TP2</small><strong>${fmt(L.tp2,6)}</strong><div class="rankTag">R:R ${rr2.toFixed(2)}</div></div></div>
     <div class="referenceScenario"><b>Entry model:</b> ${esc(L.mode)}<br><b>Why this model:</b> ${esc(L.entryReason||'Adaptive Entry V2')}<br><b>Pre-breakout quality:</b> ${Number.isFinite(L.preBreakoutQuality)?fmt(L.preBreakoutQuality,1)+'/100':'N/A'}<br>
     ${L.triggerMode.includes('RETEST')?`<b>Retest zone:</b> ${fmt(L.retestLow,6)} – ${fmt(L.retestHigh,6)}<br>`:''}
     <b>Level strength:</b> ${a.side===1?fmt(L.resistanceStrength,0):fmt(L.supportStrength,0)}/100 • touches ${a.side===1?L.resistanceTouches:L.supportTouches}<br>
     <span class="muted">المستويات محسوبة من آخر شمعة مغلقة + S/R + ATR. للمستويات القوية يفضّل النظام إغلاق الاختراق ثم Retest ناجح بدل مجرد لمس السعر فوق/تحت المستوى.</span></div>`;
 }else{
   const L=f.levels,risk=Math.abs(L.entry-L.stop),rr1=risk?Math.abs(L.tp1-L.entry)/risk:0,rr2=risk?Math.abs(L.tp2-L.entry)/risk:0;
   $('tfScenario').innerHTML=`<h2>${f.tf} — Paper Scenario</h2><div class="decision allow">${d.status}</div><div class="levels4"><div class="level"><small>Paper Entry</small><strong>${fmt(L.entry,6)}</strong></div><div class="level"><small>Paper Stop</small><strong>${fmt(L.stop,6)}</strong></div><div class="level"><small>Paper TP1</small><strong>${fmt(L.tp1,6)}</strong><div class="rankTag">R:R ${rr1.toFixed(2)}</div></div><div class="level"><small>Paper TP2</small><strong>${fmt(L.tp2,6)}</strong><div class="rankTag">R:R ${rr2.toFixed(2)}</div></div></div><div class="referenceScenario"><b>Entry model:</b> ${esc(L.mode)}<br><b>Why this model:</b> ${esc(L.entryReason||'Adaptive Entry V2')}<br><b>Pre-breakout quality:</b> ${Number.isFinite(L.preBreakoutQuality)?fmt(L.preBreakoutQuality,1)+'/100':'N/A'}<br>${L.triggerMode.includes('RETEST')?`<b>Retest zone:</b> ${fmt(L.retestLow,6)} – ${fmt(L.retestHigh,6)}<br>`:''}<span class="muted">Paper Research only.</span></div>`;
 }

 $('tfIndicators').innerHTML=`<h2>Indicator Detail</h2><div class="metrics">
   ${metric('EMA20',fmt(a.ema20,6))}${metric('EMA50',fmt(a.ema50,6))}${metric('EMA200',fmt(a.ema200,6))}
   ${metric('RSI14',a.rsi.toFixed(2))}${metric('ADX14',a.adx.toFixed(2))}
   ${metric('MACD',fmt(a.macd,6))}${metric('MACD Signal',fmt(a.macdSignal,6))}
   ${metric('Volume/MA20',a.volumeRatio.toFixed(2)+'x')}
   ${metric('Support',fmt(a.support,6))}${metric('Resistance',fmt(a.resistance,6))}
   ${metric('Support Strength',fmt(a.supportStrength,0)+'/100')}${metric('Resistance Strength',fmt(a.resistanceStrength,0)+'/100')}
   ${metric('Support Touches',a.supportTouches)}${metric('Resistance Touches',a.resistanceTouches)}${metric('ATR',fmt(a.atr,6))}
 </div>`;
}

if($('runResearchBtn'))$('runResearchBtn').onclick=runHistoricalResearch;
try{saveScenarios(loadScenarios().map(migrateScenarioText));}catch{}
window.addEventListener('load',()=>{
 try{
   const sym=new URLSearchParams(location.search).get('symbol');
   if(sym&&$('liveSymbol')){$('liveSymbol').value=sym.toUpperCase();setTimeout(()=>$('runLiveBtn')?.click(),250);}
 }catch(e){}
});
