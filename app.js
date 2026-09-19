const $=id=>document.getElementById(id);
let deferredPrompt=null,currentLive=null,currentTf='H1';

if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{
 const reg=await navigator.serviceWorker.register('./service-worker.js?v=5.6.6.1',{updateViaCache:'none'});await reg.update();
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
function validationSpec(tf){
 if(tf==='M15')return{history:4000,minN:80,step:4,horizon:16,purge:16,folds:4};
 if(tf==='H1')return{history:4000,minN:50,step:3,horizon:12,purge:12,folds:4};
 return{history:2500,minN:30,step:1,horizon:8,purge:8,folds:4};
}
function requiredSample(tf,cfg){return cfg.sampleRule==='auto'?validationSpec(tf).minN:cfg.minSample;}


function technicalCore(cs){
 const c=cs.map(x=>x.close),v=cs.map(x=>x.volume||0),e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),R=rsi(c),A=adx(cs),M=macd(c),I=ichimoku(cs),AT=atr(cs),vma=sma(v,20),piv=confirmedPivots(cs),last=cs.at(-1),i=cs.length-1;
 const E20=lastNN(e20),E50=lastNN(e50),E200=lastNN(e200),rv=lastNN(R),adxv=lastNN(A.adx),p=lastNN(A.plus),m=lastNN(A.minus),atrv=lastNN(AT),ten=lastNN(I.tenkan),kij=lastNN(I.kijun),sa=lastNN(I.spanA),sb=lastNN(I.spanB),mac=lastNN(M.line),sig=lastNN(M.signal),hist=lastNN(M.hist),vr=vma[i]?last.volume/vma[i]:1;

 let emaTrend=50;
 if(last.close>E20&&E20>E50&&E50>E200)emaTrend=92;
 else if(last.close>E50&&E50>E200)emaTrend=74;
 else if(last.close<E20&&E20<E50&&E50<E200)emaTrend=8;
 else if(last.close<E50&&E50<E200)emaTrend=26;

 const top=Math.max(sa,sb),bot=Math.min(sa,sb);
 let ichi=50;
 if(last.close>top&&ten>kij)ichi=92;
 else if(last.close>top)ichi=72;
 else if(last.close<bot&&ten<kij)ichi=8;
 else if(last.close<bot)ichi=28;
 const trend=(emaTrend+ichi)/2;

 let rsiScore=rv>=60?86:rv>=55?74:rv>=50?61:rv>=45?39:rv>=40?26:14;
 const macdScore=mac>sig&&hist>0?84:mac>sig?68:mac<sig&&hist<0?16:32;
 const momentum=(rsiScore+macdScore)/2;

 let strength=50;
 if(adxv>=25&&p>m)strength=88;
 else if(adxv>=20&&p>m)strength=70;
 else if(adxv>=25&&m>p)strength=12;
 else if(adxv>=20&&m>p)strength=30;

 const ah=piv.hs.filter(x=>x.confirmed<=i),al=piv.ls.filter(x=>x.confirmed<=i);
 let structure=50;
 if(ah.length>=2&&al.length>=2){
   const hh=ah.at(-1).price>ah.at(-2).price,hl=al.at(-1).price>al.at(-2).price,lh=ah.at(-1).price<ah.at(-2).price,ll=al.at(-1).price<al.at(-2).price;
   if(hh&&hl)structure=92; else if(lh&&ll)structure=8; else if(hh&&ll)structure=62; else if(lh&&hl)structure=38;
 }

 let volumeFlow=50;
 if(vr>=1.5&&last.close>last.open)volumeFlow=88;
 else if(vr>=1.2&&last.close>last.open)volumeFlow=72;
 else if(vr>=1.5&&last.close<last.open)volumeFlow=12;
 else if(vr>=1.2&&last.close<last.open)volumeFlow=28;

 const resistance=ah.length?ah.at(-1).price:Math.max(...cs.slice(-30).map(x=>x.high));
 const support=al.length?al.at(-1).price:Math.min(...cs.slice(-30).map(x=>x.low));
 const prev=cs.at(-2);
 const range=Math.max(1e-12,resistance-support);
 let srBreakout=clamp(100*(last.close-support)/range);
 const brokeUp=last.close>resistance&&prev?.close<=resistance;
 const brokeDown=last.close<support&&prev?.close>=support;
 const retestUp=cs.slice(-4,-1).some(x=>x.low<=resistance&&x.close>=resistance);
 const retestDown=cs.slice(-4,-1).some(x=>x.high>=support&&x.close<=support);
 if(brokeUp)srBreakout=retestUp?94:86;
 if(brokeDown)srBreakout=retestDown?6:14;

 const components={structure,trend,momentum,strength,volumeFlow,srBreakout};
 const baseScore=
   structure*.25+
   trend*.20+
   momentum*.12+
   strength*.10+
   volumeFlow*.12+
   srBreakout*.11;
 const baseWeight=.90;
 const h=new Date(last.time).getUTCHours(),session=h<7?'Asia':h<13?'London':h<16?'London/NY Overlap':h<21?'New York':'Late',regime=adxv>=25?'Trending':adxv<18?'Ranging':'Mixed';
 const levelTol=Math.max((atrv||last.close*.01)*.22,last.close*.0008);
 const resistanceTouches=separatedTouches(cs,resistance,levelTol,'R'),supportTouches=separatedTouches(cs,support,levelTol,'S');
 const resistanceStrength=clamp(28+resistanceTouches*16+(structure>=80?10:0)+(adxv>=25?8:0));
 const supportStrength=clamp(28+supportTouches*16+(structure<=20?10:0)+(adxv>=25?8:0));

 return{
   price:last.close,components,baseScore,baseWeight,
   structure,trend,momentum,strength,volumeFlow,srBreakout,
   rsi:rv,adx:adxv,atr:atrv,ema20:E20,ema50:E50,ema200:E200,macd:mac,macdSignal:sig,volumeRatio:vr,
   support,resistance,resistanceTouches,supportTouches,resistanceStrength,supportStrength,session,regime,barTime:last.time,barCloseTime:last.closeTime
 };
}

function mtfComponent(tf,cores){
 if(tf==='M15')return cores.H1.baseScore*.65+cores.D1.baseScore*.35;
 if(tf==='H1')return cores.D1.baseScore*.80+cores.M15.baseScore*.20;
 return cores.H1.baseScore*.80+cores.M15.baseScore*.20;
}
function mtfStrength(frames){
 const m=Object.fromEntries(frames.map(x=>[x.tf,x.a.score]));
 return (m.M15??50)*.20+(m.H1??50)*.50+(m.D1??50)*.30;
}

function higherTfVeto(tf,side,cores){
 if(!side)return false;
 if(tf==='M15'){
   if(side===1&&(cores.H1.score<=35||cores.D1.score<=25))return true;
   if(side===-1&&(cores.H1.score>=65||cores.D1.score>=75))return true;
 }
 if(tf==='H1'){
   if(side===1&&cores.D1.score<=35)return true;
   if(side===-1&&cores.D1.score>=65)return true;
 }
 return false;
}

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
   const acc=n?wins/n:0,pf=lossAbs>0?gains/lossAbs:(gains>0?99:0),wilson=wilsonLower95(wins,n),avgR=n?r.reduce((s,x)=>s+x.r,0)/n:0;
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
function paperLevels(a){
 const atrv=Math.max(a.atr,a.price*.002),buf=.08*atrv,retestTol=.22*atrv;
 let entry,stop,tp1,tp2,mode,triggerMode,breakoutLevel,retestLow,retestHigh,entryReason;
 const highMomentum=a.momentum>=70&&a.strength>=65&&a.volumeFlow>=60;
 if(a.side===1){
   breakoutLevel=a.resistance;
   const strong=(a.resistanceStrength||0)>=65;
   if(a.price<=a.resistance+buf){
     if(strong||!highMomentum){
       entryReason=strong?'STRONG_LEVEL':'INSUFFICIENT_MOMENTUM_VOLUME';
       mode=strong
         ?'Closed-candle breakout + successful retest of strong resistance'
         :'Closed-candle breakout + retest required (momentum/volume confirmation insufficient)';
       triggerMode='BREAKOUT_CLOSE_RETEST';
       retestLow=a.resistance-retestTol;retestHigh=a.resistance+retestTol;
       entry=a.resistance+.03*atrv;
     }else{
       entryReason='HIGH_MOMENTUM_CONTINUATION';
       mode='Closed-candle breakout continuation — retest not required';
       triggerMode='BREAKOUT_CLOSE';
       entry=a.resistance+buf;
     }
   }else{
     if(strong||!highMomentum){
       entryReason=strong?'STRONG_BROKEN_LEVEL':'INSUFFICIENT_MOMENTUM_VOLUME';
       mode=strong
         ?'Retest of broken resistance before continuation'
         :'Retest of broken resistance required (momentum/volume confirmation insufficient)';
       triggerMode='RETEST_AFTER_BREAKOUT';
       retestLow=a.resistance-retestTol;retestHigh=a.resistance+retestTol;
       entry=a.resistance+.03*atrv;
     }else{
       entryReason='HIGH_MOMENTUM_CONTINUATION';
       mode='Momentum continuation after confirmed close — retest not required';
       triggerMode='BREAKOUT_CLOSE';
       entry=a.price+.04*atrv;
     }
   }
   const structural=Math.min(a.support-.10*atrv,entry-.90*atrv);
   let risk=entry-structural;risk=Math.max(.90*atrv,Math.min(risk,1.80*atrv));
   stop=entry-risk;tp1=entry+1.20*risk;tp2=entry+2.00*risk;
 }else{
   breakoutLevel=a.support;
   const strong=(a.supportStrength||0)>=65;
   if(a.price>=a.support-buf){
     if(strong||!highMomentum){
       entryReason=strong?'STRONG_LEVEL':'INSUFFICIENT_MOMENTUM_VOLUME';
       mode=strong
         ?'Closed-candle breakdown + successful retest of strong support'
         :'Closed-candle breakdown + retest required (momentum/volume confirmation insufficient)';
       triggerMode='BREAKDOWN_CLOSE_RETEST';
       retestLow=a.support-retestTol;retestHigh=a.support+retestTol;
       entry=a.support-.03*atrv;
     }else{
       entryReason='HIGH_MOMENTUM_CONTINUATION';
       mode='Closed-candle breakdown continuation — retest not required';
       triggerMode='BREAKDOWN_CLOSE';
       entry=a.support-buf;
     }
   }else{
     if(strong||!highMomentum){
       entryReason=strong?'STRONG_BROKEN_LEVEL':'INSUFFICIENT_MOMENTUM_VOLUME';
       mode=strong
         ?'Retest of broken support before continuation'
         :'Retest of broken support required (momentum/volume confirmation insufficient)';
       triggerMode='RETEST_AFTER_BREAKDOWN';
       retestLow=a.support-retestTol;retestHigh=a.support+retestTol;
       entry=a.support-.03*atrv;
     }else{
       entryReason='HIGH_MOMENTUM_CONTINUATION';
       mode='Momentum continuation after confirmed close — retest not required';
       triggerMode='BREAKDOWN_CLOSE';
       entry=a.price-.04*atrv;
     }
   }
   const structural=Math.max(a.resistance+.10*atrv,entry+.90*atrv);
   let risk=structural-entry;risk=Math.max(.90*atrv,Math.min(risk,1.80*atrv));
   stop=entry+risk;tp1=entry-1.20*risk;tp2=entry-2.00*risk;
 }
 return{entry,stop,tp1,tp2,mode,entryReason,triggerMode,breakoutLevel,retestLow,retestHigh,
   resistanceStrength:a.resistanceStrength||0,supportStrength:a.supportStrength||0,
   resistanceTouches:a.resistanceTouches||0,supportTouches:a.supportTouches||0};
}
function confidenceTier(hist,integrity,techScore){
 if(hist.n>=100&&hist.wilson>=.53&&hist.pf>=1.30&&integrity.score>=80&&(techScore>=80||techScore<=20))return'HIGH CONFIDENCE';
 if(hist.n>=100&&hist.wilson>=.50&&hist.pf>=1.20&&integrity.score>=75)return'CONFIRMED';
 return'PRELIMINARY';
}
function finalDecision(frame,cfg){
 const a=frame.a,h=a.side===1?frame.oos.long:frame.oos.short,needN=requiredSample(frame.tf,cfg);
 const reasons=[];
 if(a.side===0)reasons.push('Technical direction is neutral');
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
   integrityAtCreation:frame.integrity.score,techAtCreation:frame.a.score,atrAtCreation:frame.a.atr
 };
 rows.push(s);saveScenarios(rows);
}
function updateScenarioLifecycle(symbol,frame,cs,currentBar=null){
 let rows=loadScenarios(),changed=false;
 rows=rows.map(raw=>{
   let s=migrateScenarioText(raw);
   if(s.symbol!==symbol||s.tf!==frame.tf||['TP2_HIT','STOPPED','INVALIDATED','EXPIRED','AMBIGUOUS'].includes(s.state))return s;
   const bars=barsAfter(cs,s.createdBarCloseTime),fresh={...s,barCount:bars.length,lastUpdate:Date.now()};
   if(!Number.isFinite(fresh.atrAtCreation))fresh.atrAtCreation=frame.a.atr;
   if(!fresh.entryReason&&/retest/i.test(fresh.mode||'')){
     fresh.entryReason=((fresh.side===1?fresh.resistanceStrength:fresh.supportStrength)||0)>=65?'STRONG_LEVEL':'INSUFFICIENT_MOMENTUM_VOLUME';
   }

   if(bars.length>fresh.expiryBars&&['PENDING_BREAKOUT','WAITING_RETEST','PAUSED_INTEGRITY'].includes(fresh.state)){
     fresh.state='EXPIRED';fresh.endReason='Entry condition did not trigger before expiry';changed=true;return fresh;
   }
   if(frame.a.side&&frame.a.side!==fresh.side){
     fresh.state='INVALIDATED';fresh.endReason='Closed-candle technical direction reversed';changed=true;return fresh;
   }
   if(frame.veto){
     fresh.state='INVALIDATED';fresh.endReason='Higher-timeframe veto appeared';changed=true;return fresh;
   }
   if(frame.integrity.score<60){
     if(!['TRIGGERED','TP1_HIT','READY_NEXT_OPEN'].includes(fresh.state))fresh.state='PAUSED_INTEGRITY';
     changed=true;
   }else if(fresh.state==='PAUSED_INTEGRITY'){
     fresh.state=['RETEST_AFTER_BREAKOUT','RETEST_AFTER_BREAKDOWN'].includes(fresh.triggerMode)?'WAITING_RETEST':'PENDING_BREAKOUT';changed=true;
   }

   const long=fresh.side===1;

   // Stage 1: closed-candle breakout/breakdown confirmation.
   if(fresh.state==='PENDING_BREAKOUT'){
     for(const b of bars){
       const confirmed=long?b.close>fresh.breakoutLevel:b.close<fresh.breakoutLevel;
       if(!confirmed)continue;
       fresh.breakoutConfirmedAt=b.closeTime;
       fresh.breakoutConfirmedBarTime=b.time;
       fresh.breakoutClose=b.close;
       if(['BREAKOUT_CLOSE_RETEST','BREAKDOWN_CLOSE_RETEST'].includes(fresh.triggerMode)){
         fresh.state='WAITING_RETEST';
       }else{
         fresh.state='READY_NEXT_OPEN';
         fresh.entryConfirmationAt=b.closeTime;
         fresh.entryConfirmationBarTime=b.time;
         fresh.confirmationType='BREAKOUT_CLOSE';
       }
       changed=true;break;
     }
   }

   // Stage 2: successful retest needs a touch plus a closed candle holding the broken level.
   if(fresh.state==='WAITING_RETEST'){
     const after=fresh.breakoutConfirmedAt||fresh.createdBarCloseTime;
     const retestBars=bars.filter(b=>b.closeTime>after);
     for(const b of retestBars){
       const touch=b.low<=fresh.retestHigh&&b.high>=fresh.retestLow;
       const hold=long?b.close>fresh.breakoutLevel:b.close<fresh.breakoutLevel;
       const fail=long?b.close<fresh.stop:b.close>fresh.stop;
       if(fail){
         fresh.state='INVALIDATED';fresh.endReason='Retest failed through structural invalidation';changed=true;break;
       }
       if(touch&&hold){
         fresh.state='READY_NEXT_OPEN';
         fresh.retestConfirmedAt=b.closeTime;
         fresh.entryConfirmationAt=b.closeTime;
         fresh.entryConfirmationBarTime=b.time;
         fresh.confirmationType='RETEST_CLOSE';
         changed=true;break;
       }
     }
   }

   // Stage 3: use the NEXT candle OPEN as the research fill to avoid close-price look-ahead.
   if(fresh.state==='READY_NEXT_OPEN'&&Number.isFinite(fresh.entryConfirmationBarTime)){
     const execBar=nextExecutionBar(cs,currentBar,fresh.entryConfirmationBarTime);
     if(execBar){
       const eff=effectivePaperLevels(fresh,execBar.open);
       if(!eff){
         fresh.state='INVALIDATED';fresh.endReason='Next-open execution produced invalid risk geometry';changed=true;
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
         changed=true;
       }
     }
   }

   // Stage 4: outcome monitoring uses effective levels after actual trigger.
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
         fresh.state='AMBIGUOUS';fresh.endReason='Same candle touched adverse and favorable barriers; OHLC cannot determine intrabar order';changed=true;break;
       }
       if(stopHit){fresh.state='STOPPED';fresh.endedAt=b.closeTime;changed=true;break;}
       if(tp2Hit){fresh.state='TP2_HIT';fresh.endedAt=b.closeTime;changed=true;break;}
       if(tp1Hit&&fresh.state!=='TP1_HIT'){fresh.state='TP1_HIT';fresh.tp1At=b.closeTime;changed=true;}
     }
   }
   return fresh;
 });
 if(changed)saveScenarios(rows);
}
function lifecycleCard(symbol,frame){
 const raw=activeScenarioFor(symbol,frame.tf);
 if(!raw)return`<h2>Paper Scenario Lifecycle</h2><div class="hiddenLevels">لا يوجد سيناريو Paper نشط لهذا الفريم. يتم إنشاء سيناريو فقط عند Qualified أو Near‑Qualified.</div>`;
 const s=migrateScenarioText(raw),side=s.side===1?'LONG / BULLISH':'SHORT / BEARISH';
 const levelStrength=s.side===1?s.resistanceStrength:s.supportStrength;
 const touches=s.side===1?s.resistanceTouches:s.supportTouches;
 const hasActual=Number.isFinite(s.actualEntry);
 const stop=hasActual?s.effectiveStop:s.stop,tp1=hasActual?s.effectiveTP1:s.tp1,tp2=hasActual?s.effectiveTP2:s.tp2;
 return`<div class="lifecycleTop"><div><h2>Paper Scenario Lifecycle</h2><div class="muted">${esc(side)} • ${esc(s.id)}</div></div><span class="lifecycleState ${scenarioStateClass(s.state)}">${esc(s.state)}</span></div>

 <div class="plannedBox"><b>Planned scenario at creation</b>
   <div class="scenarioGrid">
     <div class="scenarioCell"><small>Planned Entry Reference</small><b>${fmt(s.entry,6)}</b></div>
     <div class="scenarioCell"><small>Planned Stop</small><b>${fmt(s.stop,6)}</b></div>
     <div class="scenarioCell"><small>Planned TP1</small><b>${fmt(s.tp1,6)}</b></div>
     <div class="scenarioCell"><small>Planned TP2</small><b>${fmt(s.tp2,6)}</b></div>
   </div>
 </div>

 ${hasActual?`<div class="executionBox"><h3>Actual Paper Execution</h3>
   <div class="scenarioGrid">
     <div class="scenarioCell"><small>Actual Paper Trigger — next candle open</small><b>${fmt(s.actualEntry,6)}</b></div>
     <div class="scenarioCell"><small>Effective Stop</small><b>${fmt(stop,6)}</b></div>
     <div class="scenarioCell"><small>Effective TP1</small><b>${fmt(tp1,6)}</b></div>
     <div class="scenarioCell"><small>Effective TP2</small><b>${fmt(tp2,6)}</b></div>
   </div><div class="miniNote">Execution model: NEXT_CANDLE_OPEN_AFTER_CONFIRMATION. هذا يمنع اعتبار إغلاق شمعة التأكيد نفسه سعر تنفيذ افتراضي.</div></div>`:''}

 <div class="scenarioGrid" style="margin-top:10px">
   <div class="scenarioCell"><small>Bars elapsed</small><b>${s.barCount||0}</b></div>
   <div class="scenarioCell"><small>Maximum pending bars</small><b>${s.expiryBars}</b></div>
   <div class="scenarioCell"><small>Created Technical Score</small><b>${fmt(s.techAtCreation,1)}</b></div>
   <div class="scenarioCell"><small>Current state</small><b>${esc(s.state)}</b></div>
 </div>

 <div class="triggerBox"><b>Entry model:</b> ${esc(s.mode)}<br>
 ${s.triggerMode.includes('RETEST')?`<b>Retest zone:</b> ${fmt(s.retestLow,6)} – ${fmt(s.retestHigh,6)}<br>`:''}
 <b>Breakout/Breakdown level:</b> ${fmt(s.breakoutLevel,6)}<br>
 <b>Why this model:</b> ${esc(s.entryReason||'Adaptive level/momentum rule')}<br>
 <span class="muted">Planned levels remain in the journal; after confirmation the paper fill is recorded at the next candle open and Effective levels are calculated from that fill.</span></div>

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


$('runLiveBtn').onclick=async()=>{
 const b=$('runLiveBtn');b.disabled=true;$('status').textContent='جاري جلب تاريخ أطول وتشغيل Purged Walk‑Forward على M15/H1/D1...';
 try{
   const symbol=$('liveSymbol').value.trim().toUpperCase(),market=$('liveMarket').value;
   const cfg={sampleRule:$('liveSampleRule').value,minSample:+$('liveMinSample').value,minAcc:+$('liveMinAcc').value,minPF:+$('liveMinPF').value,minWilson:+$('liveMinWilson').value,costBps:+$('liveCostBps').value};
   const defs=[['M15','15m',validationSpec('M15').history],['H1','1h',validationSpec('H1').history],['D1','1d',validationSpec('D1').history]];
   const sets=await Promise.all(defs.map(x=>fetchHistory(symbol,x[1],market,x[2])));
   const executionBars=await Promise.all(defs.map(x=>fetchCurrentKline(symbol,x[1],market).catch(()=>null)));
   const ctx=await marketContext();
   const cores={};defs.forEach((d,i)=>cores[d[0]]=technicalCore(sets[i]));
   const frames=[];
   for(let i=0;i<defs.length;i++){
     const tf=defs[i][0],core=cores[tf],mtf=mtfComponent(tf,cores),score=clamp(core.baseScore+mtf*.10),side=score>=65?1:score<=35?-1:0;
     const a={...core,score,side,mtf,session:tf==='D1'?'N/A — Daily timeframe':core.session};cores[tf]={...a};
     $('status').textContent=`${tf}: Purged Walk‑Forward validation...`;
     const oos=purgedWalkForward(sets[i],tf,cfg.costBps),integrity=await liveIntegrity(symbol,market,a.price,sets[i]),veto=higherTfVeto(tf,side,cores);
     const frame={tf,a,oos,integrity,veto,levels:side?paperLevels(a):null,candles:sets[i]};
     frame.decision=finalDecision(frame,cfg);frame.near=frame.decision.status==='BLOCKED'&&nearQualified(frame,cfg);
     updateScenarioLifecycle(symbol,frame,sets[i],executionBars[i]);createScenarioIfNeeded(frame,sets[i],symbol);
     frames.push(frame);
   }
   const allSides=frames.map(x=>x.a.side||0),directionalCount=allSides.filter(x=>x!==0).length;
   const agreement=frames.length?Math.abs(allSides.reduce((q,x)=>q+x,0))/frames.length:0,strength=mtfStrength(frames);
   currentLive={symbol,market,ctx,frames,agreement,directionalCount,strength,cfg};renderLive();$('status').textContent='اكتمل V5.6.6.1: Scenario Lifecycle + next-candle-open paper execution.';
 }catch(e){$('status').textContent='خطأ: '+e.message;}finally{b.disabled=false;}
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
   ${metric('Direction Agreement',(x.agreement*100).toFixed(1)+'%')}
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
     ${metric('Technical direction',a.side===1?'Bullish':a.side===-1?'Bearish':'Neutral')}
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
     <div class="layerMetric"><small>Cost-adjusted Profit Factor</small><b class="${h.pf>=currentLive.cfg.minPF?'enginePass':'engineFail'}">${h.pf.toFixed(2)}</b></div>
     <div class="layerMetric"><small>Wilson 95% Lower Bound</small><b class="${h.wilson>=currentLive.cfg.minWilson?'enginePass':'engineFail'}">${pct(h.wilson)}</b></div>
     <div class="layerMetric"><small>Average net R</small><b>${h.avgR.toFixed(3)}R</b></div>
     <div class="layerMetric"><small>Research cost</small><b>${currentLive.cfg.costBps} bps</b></div>
   </div><div class="foldGrid">${folds.map((z,i)=>`<div class="foldBox"><small>Fold ${i+1}</small><b>${z.n?((z.acc*100).toFixed(1)+'%'):'N/A'}</b><small>N ${z.n}</small></div>`).join('')}</div>`:'<div class="hiddenLevels">لا يوجد اتجاه فني، لذلك لا يوجد Side-specific validation.</div>'}
   <p class="muted">تم فصل نوافذ الاختبار زمنيًا مع Purge حول الحدود وتقليل تداخل النتائج. هذه إحصاءات تاريخية وليست احتمالًا مضمونًا للنتيجة القادمة.</p>`;

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
     <div class="referenceScenario"><b>Entry model:</b> ${esc(L.mode)}<br><b>Why this model:</b> ${esc(L.entryReason||'Adaptive rule')}<br>
     ${L.triggerMode.includes('RETEST')?`<b>Retest zone:</b> ${fmt(L.retestLow,6)} – ${fmt(L.retestHigh,6)}<br>`:''}
     <b>Level strength:</b> ${a.side===1?fmt(L.resistanceStrength,0):fmt(L.supportStrength,0)}/100 • touches ${a.side===1?L.resistanceTouches:L.supportTouches}<br>
     <span class="muted">المستويات محسوبة من آخر شمعة مغلقة + S/R + ATR. للمستويات القوية يفضّل النظام إغلاق الاختراق ثم Retest ناجح بدل مجرد لمس السعر فوق/تحت المستوى.</span></div>`;
 }else{
   const L=f.levels,risk=Math.abs(L.entry-L.stop),rr1=risk?Math.abs(L.tp1-L.entry)/risk:0,rr2=risk?Math.abs(L.tp2-L.entry)/risk:0;
   $('tfScenario').innerHTML=`<h2>${f.tf} — Paper Scenario</h2><div class="decision allow">${d.status}</div><div class="levels4"><div class="level"><small>Paper Entry</small><strong>${fmt(L.entry,6)}</strong></div><div class="level"><small>Paper Stop</small><strong>${fmt(L.stop,6)}</strong></div><div class="level"><small>Paper TP1</small><strong>${fmt(L.tp1,6)}</strong><div class="rankTag">R:R ${rr1.toFixed(2)}</div></div><div class="level"><small>Paper TP2</small><strong>${fmt(L.tp2,6)}</strong><div class="rankTag">R:R ${rr2.toFixed(2)}</div></div></div><div class="referenceScenario"><b>Entry model:</b> ${esc(L.mode)}<br><b>Why this model:</b> ${esc(L.entryReason||'Adaptive rule')}<br>${L.triggerMode.includes('RETEST')?`<b>Retest zone:</b> ${fmt(L.retestLow,6)} – ${fmt(L.retestHigh,6)}<br>`:''}<span class="muted">Paper Research only.</span></div>`;
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

window.addEventListener('load',()=>{
 try{
   const sym=new URLSearchParams(location.search).get('symbol');
   if(sym&&$('liveSymbol')){$('liveSymbol').value=sym.toUpperCase();setTimeout(()=>$('runLiveBtn')?.click(),250);}
 }catch(e){}
});
