const $=id=>document.getElementById(id);
let deferredPrompt=null, mode='crypto', lastReport=null;

if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{
  const reg=await navigator.serviceWorker.register('./service-worker.js?v=5.1.0',{updateViaCache:'none'});
  await reg.update();
}catch(e){console.warn('SW update failed',e);}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden');});
$('installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').classList.add('hidden');};

document.querySelectorAll('.modeTab').forEach(b=>b.onclick=()=>{
  mode=b.dataset.mode;
  document.querySelectorAll('.modeTab').forEach(x=>x.classList.toggle('active',x===b));
  $('cryptoControls').classList.toggle('hidden',mode!=='crypto');
  $('forexControls').classList.toggle('hidden',mode!=='forex');
});

const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const fmt=(x,n=2)=>Number.isFinite(x)?Number(x).toFixed(n):'N/A';
const pct=x=>Number.isFinite(x)?`${(x*100).toFixed(2)}%`:'N/A';
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function lastNN(a){for(let i=a.length-1;i>=0;i--)if(a[i]!==null&&Number.isFinite(a[i]))return a[i];return null;}

function ema(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;const k=2/(p+1);let z=v.slice(0,p).reduce((a,b)=>a+b,0)/p;o[p-1]=z;for(let i=p;i<v.length;i++){z=v[i]*k+z*(1-k);o[i]=z;}return o;}
function sma(v,p){const o=Array(v.length).fill(null);let s=0;for(let i=0;i<v.length;i++){s+=v[i];if(i>=p)s-=v[i-p];if(i>=p-1)o[i]=s/p;}return o;}
function rsi(c,p=14){const o=Array(c.length).fill(null);if(c.length<=p)return o;const g=[],l=[];for(let i=1;i<c.length;i++){const d=c[i]-c[i-1];g.push(Math.max(d,0));l.push(Math.max(-d,0));}let ag=g.slice(0,p).reduce((a,b)=>a+b,0)/p,al=l.slice(0,p).reduce((a,b)=>a+b,0)/p;const f=()=>al===0?100:100-100/(1+ag/al);o[p]=f();for(let i=p+1;i<c.length;i++){ag=(ag*(p-1)+g[i-1])/p;al=(al*(p-1)+l[i-1])/p;o[i]=f();}return o;}
function wilder(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;let s=v.slice(0,p).reduce((a,b)=>a+b,0);o[p-1]=s;for(let i=p;i<v.length;i++){s=s-s/p+(v[i]||0);o[i]=s;}return o;}
function adx(cs,p=14){const n=cs.length,pd=Array(n).fill(0),md=Array(n).fill(0),tr=Array(n).fill(0);for(let i=1;i<n;i++){const up=cs[i].high-cs[i-1].high,dn=cs[i-1].low-cs[i].low;pd[i]=up>dn&&up>0?up:0;md[i]=dn>up&&dn>0?dn:0;tr[i]=Math.max(cs[i].high-cs[i].low,Math.abs(cs[i].high-cs[i-1].close),Math.abs(cs[i].low-cs[i-1].close));}const t=wilder(tr.slice(1),p),pp=wilder(pd.slice(1),p),mm=wilder(md.slice(1),p),plus=Array(n).fill(null),minus=Array(n).fill(null),dx=Array(n).fill(null),ao=Array(n).fill(null);for(let j=p-1;j<t.length;j++){const i=j+1;if(!t[j])continue;plus[i]=100*pp[j]/t[j];minus[i]=100*mm[j]/t[j];const den=plus[i]+minus[i];dx[i]=den?100*Math.abs(plus[i]-minus[i])/den:0;}const vals=[],idx=[];for(let i=0;i<n;i++)if(dx[i]!==null){vals.push(dx[i]);idx.push(i);}if(vals.length>=p){let a=vals.slice(0,p).reduce((x,y)=>x+y,0)/p;ao[idx[p-1]]=a;for(let k=p;k<vals.length;k++){a=(a*(p-1)+vals[k])/p;ao[idx[k]]=a;}}return{adx:ao,plus,minus};}
function macd(c){const f=ema(c,12),s=ema(c,26),line=c.map((_,i)=>f[i]!==null&&s[i]!==null?f[i]-s[i]:null),compact=line.filter(x=>x!==null),sigc=ema(compact,9),sig=Array(c.length).fill(null);let j=0;for(let i=0;i<c.length;i++)if(line[i]!==null)sig[i]=sigc[j++]??null;return{line,signal:sig,hist:line.map((x,i)=>x!==null&&sig[i]!==null?x-sig[i]:null)};}
function ichimoku(cs){const mid=(i,p)=>{if(i<p-1)return null;let hi=-Infinity,lo=Infinity;for(let j=i-p+1;j<=i;j++){hi=Math.max(hi,cs[j].high);lo=Math.min(lo,cs[j].low);}return(hi+lo)/2;};const t=[],k=[],a=[],b=[];for(let i=0;i<cs.length;i++){const x=mid(i,9),y=mid(i,26);t.push(x);k.push(y);a.push(x!==null&&y!==null?(x+y)/2:null);b.push(mid(i,52));}return{tenkan:t,kijun:k,spanA:a,spanB:b};}
function sessionVwap(cs){const o=Array(cs.length).fill(null);let pv=0,v=0,day='';for(let i=0;i<cs.length;i++){const d=new Date(cs[i].time).toISOString().slice(0,10);if(d!==day){day=d;pv=0;v=0;}const typ=(cs[i].high+cs[i].low+cs[i].close)/3;pv+=typ*(cs[i].volume||0);v+=(cs[i].volume||0);o[i]=v?pv/v:null;}return o;}
function confirmedPivots(cs,left=3,right=3){const hs=[],ls=[];for(let i=left;i<cs.length-right;i++){let h=true,l=true;for(let j=i-left;j<=i+right;j++){if(j===i)continue;if(cs[j].high>=cs[i].high)h=false;if(cs[j].low<=cs[i].low)l=false;}if(h)hs.push({pivot:i,confirmed:i+right,price:cs[i].high});if(l)ls.push({pivot:i,confirmed:i+right,price:cs[i].low});}return{hs,ls};}
function featureMatrix(cs){
  const n=cs.length,c=cs.map(x=>x.close),v=cs.map(x=>x.volume||0),e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),rs=rsi(c),dx=adx(cs),mc=macd(c),ic=ichimoku(cs),vw=sessionVwap(cs),vma=sma(v,20),piv=confirmedPivots(cs);
  const rows=Array(n).fill(null),activeH=[],activeL=[];let hp=0,lp=0;
  for(let i=0;i<n;i++){
    while(hp<piv.hs.length&&piv.hs[hp].confirmed<=i)activeH.push(piv.hs[hp++]);
    while(lp<piv.ls.length&&piv.ls[lp].confirmed<=i)activeL.push(piv.ls[lp++]);
    if(i<210||[e20[i],e50[i],e200[i],rs[i],dx.adx[i],mc.line[i],mc.signal[i],ic.tenkan[i],ic.kijun[i],ic.spanA[i],ic.spanB[i]].some(x=>x===null))continue;

    let structure=50;
    if(activeH.length>=2&&activeL.length>=2){
      const hh=activeH.at(-1).price>activeH.at(-2).price,lh=activeH.at(-1).price<activeH.at(-2).price,hl=activeL.at(-1).price>activeL.at(-2).price,ll=activeL.at(-1).price<activeL.at(-2).price;
      if(hh&&hl)structure=90;else if(lh&&ll)structure=10;else if(hh&&ll)structure=62;else if(lh&&hl)structure=38;
    }

    let emaScore=50;
    if(c[i]>e20[i]&&e20[i]>e50[i]&&e50[i]>e200[i])emaScore=92;
    else if(c[i]>e50[i]&&e50[i]>e200[i])emaScore=72;
    else if(c[i]<e20[i]&&e20[i]<e50[i]&&e50[i]<e200[i])emaScore=8;
    else if(c[i]<e50[i]&&e50[i]<e200[i])emaScore=28;

    const top=Math.max(ic.spanA[i],ic.spanB[i]),bot=Math.min(ic.spanA[i],ic.spanB[i]);
    let ichi=50;if(c[i]>top&&ic.tenkan[i]>ic.kijun[i])ichi=90;else if(c[i]>top)ichi=70;else if(c[i]<bot&&ic.tenkan[i]<ic.kijun[i])ichi=10;else if(c[i]<bot)ichi=30;
    const trend=(emaScore+ichi)/2;

    const r=rs[i],rsiScore=r>=60?88:r>=55?74:r>=50?61:r>=45?41:r>=40?27:12;
    const hist=mc.hist[i];let macdScore=50;if(mc.line[i]>mc.signal[i]&&hist>0)macdScore=82;else if(mc.line[i]>mc.signal[i])macdScore=67;else if(mc.line[i]<mc.signal[i]&&hist<0)macdScore=18;else macdScore=33;
    const momentum=(rsiScore+macdScore)/2;

    const A=dx.adx[i],P=dx.plus[i],M=dx.minus[i];let strength=50;
    if(A>=25&&P>M)strength=88;else if(A>=20&&P>M)strength=70;else if(A>=25&&M>P)strength=12;else if(A>=20&&M>P)strength=30;

    const vr=vma[i]?v[i]/vma[i]:1;let volScore=50;if(vr>=1.25&&cs[i].close>cs[i].open)volScore=78;else if(vr>=1.25&&cs[i].close<cs[i].open)volScore=22;
    let vwScore=50;if(vw[i]){if(c[i]>vw[i]*1.001)vwScore=72;else if(c[i]<vw[i]*.999)vwScore=28;}
    const volumeFlow=(volScore+vwScore)/2;

    const hour=new Date(cs[i].time).getUTCHours();
    let time=50;if(hour>=7&&hour<16)time=56;if(hour>=13&&hour<16)time=61;

    rows[i]={structure,trend,momentum,strength,volumeFlow,time,adx:A,session:hour<7?'Asia':hour<13?'London':hour<21?'New York':'Late',close:c[i]};
  }
  return rows;
}
const DEFAULT_WEIGHTS={structure:25,trend:25,momentum:18,strength:15,volumeFlow:12,time:5};

function composite(row,w=DEFAULT_WEIGHTS){let a=0,b=0;for(const k of Object.keys(w)){a+=row[k]*w[k];b+=w[k];}return a/b;}
function evaluate(cs,features,opts,weights=DEFAULT_WEIGHTS,start=210,end=null){
  const H=opts.horizon,minMove=opts.minMove,bull=opts.bull,bear=opts.bear,last=Math.min(end??(cs.length-H-1),cs.length-H-1);
  const signals=[];let eligible=0;
  for(let i=Math.max(210,start);i<=last;i++){
    const f=features[i];if(!f)continue;eligible++;
    const score=composite(f,weights);let dir=0;if(score>=bull)dir=1;else if(score<=bear)dir=-1;else continue;
    const ret=cs[i+H].close/cs[i].close-1;
    let correct=false,resolved=Math.abs(ret)>=minMove;
    if(dir===1)correct=ret>=minMove;else correct=ret<=-minMove;
    let mfe=-Infinity,mae=Infinity;
    for(let j=i+1;j<=i+H;j++){
      const fav=dir===1?(cs[j].high/cs[i].close-1):(cs[i].close/cs[j].low-1);
      const adv=dir===1?(cs[j].low/cs[i].close-1):(cs[i].close/cs[j].high-1);
      mfe=Math.max(mfe,fav);mae=Math.min(mae,adv);
    }
    signals.push({i,score,dir,ret,signedRet:dir*ret,correct,resolved,mfe,mae,session:f.session,regime:f.adx>=25?'Trending':f.adx<18?'Ranging':'Mixed'});
  }
  const n=signals.length,correct=signals.filter(x=>x.correct).length,bulls=signals.filter(x=>x.dir===1),bears=signals.filter(x=>x.dir===-1);
  const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
  return{
    signals,n,eligible,accuracy:n?correct/n:0,coverage:eligible?n/eligible:0,
    bullAccuracy:bulls.length?bulls.filter(x=>x.correct).length/bulls.length:0,
    bearAccuracy:bears.length?bears.filter(x=>x.correct).length/bears.length:0,
    bulls:bulls.length,bears:bears.length,
    avgSignedReturn:avg(signals.map(x=>x.signedRet)),
    avgMfe:avg(signals.map(x=>x.mfe)),avgMae:avg(signals.map(x=>x.mae)),
    unresolved:n?signals.filter(x=>!x.resolved).length/n:0
  };
}
function objective(m){
  if(m.n<20)return -999;
  const balance=1-Math.abs(m.bullAccuracy-m.bearAccuracy);
  return m.accuracy*.68 + Math.min(m.coverage,.45)*.12 + balance*.12 + Math.min(Math.max(m.avgSignedReturn,0)*20,.08);
}
function seeded(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function normalizeWeights(raw){const keys=Object.keys(DEFAULT_WEIGHTS),sum=keys.reduce((s,k)=>s+raw[k],0);const out={};keys.forEach(k=>out[k]=raw[k]/sum*100);return out;}
function optimize(cs,features,opts,start,end,seed=42,candidates=180){
  const rnd=seeded(seed);let bestW={...DEFAULT_WEIGHTS},bestM=evaluate(cs,features,opts,bestW,start,end),best=objective(bestM);
  for(let c=0;c<candidates;c++){
    const raw={};for(const k of Object.keys(DEFAULT_WEIGHTS)){const base=DEFAULT_WEIGHTS[k],jitter=.45+rnd()*1.25;raw[k]=Math.max(3,base*jitter);}
    const w=normalizeWeights(raw),m=evaluate(cs,features,opts,w,start,end),o=objective(m);
    if(o>best){best=o;bestW=w;bestM=m;}
  }
  return{weights:bestW,metrics:bestM,objective:best};
}
function walkForward(cs,features,opts){
  const warm=220,H=opts.horizon,N=cs.length-H-1,usable=N-warm;
  const testSize=Math.max(80,Math.floor(usable*.12)),folds=[];
  for(let f=0;f<4;f++){
    const testStart=warm+Math.floor(usable*.42)+f*testSize;
    if(testStart+testSize>N)break;
    const trainStart=warm,trainEnd=testStart-1,testEnd=testStart+testSize-1;
    const opt=optimize(cs,features,opts,trainStart,trainEnd,100+f,120);
    const test=evaluate(cs,features,opts,opt.weights,testStart,testEnd);
    folds.push({fold:f+1,trainStart,trainEnd,testStart,testEnd,train:opt.metrics,test,weights:opt.weights});
  }
  const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
  const agg={
    folds:folds.length,
    trainAccuracy:avg(folds.map(x=>x.train.accuracy)),
    testAccuracy:avg(folds.map(x=>x.test.accuracy)),
    testCoverage:avg(folds.map(x=>x.test.coverage)),
    testSignals:folds.reduce((s,x)=>s+x.test.n,0),
    overfitGap:avg(folds.map(x=>x.train.accuracy-x.test.accuracy)),
    testReturn:avg(folds.map(x=>x.test.avgSignedReturn))
  };
  const avgWeights={};for(const k of Object.keys(DEFAULT_WEIGHTS))avgWeights[k]=avg(folds.map(x=>x.weights[k]));
  return{folds,agg,avgWeights};
}
function thresholdSweep(cs,features,opts,weights){
  return [55,60,65,70,75,80].map(t=>{
    const m=evaluate(cs,features,{...opts,bull:t,bear:100-t},weights);
    return{threshold:t,bear:100-t,...m};
  });
}
function groupMetrics(signals,key){
  const groups={};for(const s of signals){const g=s[key];(groups[g]??=[]).push(s);}
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  return Object.entries(groups).map(([name,a])=>({name,n:a.length,accuracy:a.filter(x=>x.correct).length/a.length,avgRet:avg(a.map(x=>x.signedRet)),mfe:avg(a.map(x=>x.mfe)),mae:avg(a.map(x=>x.mae))})).sort((a,b)=>b.n-a.n);
}
async function fetchHistory(symbol,interval,market,total){
  const clean=symbol.toUpperCase().replace(/[^A-Z0-9]/g,''),base=market==='futures'?'https://fapi.binance.com/fapi/v1/klines':'https://data-api.binance.vision/api/v3/klines';
  let end=Date.now(),all=[];
  while(all.length<total){
    const limit=Math.min(1000,total-all.length),url=`${base}?symbol=${encodeURIComponent(clean)}&interval=${interval}&limit=${limit}&endTime=${end}`;
    const r=await fetch(url),d=await r.json();if(!r.ok||!Array.isArray(d))throw new Error(d?.msg||'تعذر جلب البيانات التاريخية.');
    if(!d.length)break;
    const batch=d.map(x=>({time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]}));
    all=[...batch,...all];end=batch[0].time-1;
    $('status').textContent=`تم تحميل ${all.length} / ${total} شمعة...`;
    if(batch.length<limit)break;
  }
  const seen=new Set();return all.filter(x=>{if(seen.has(x.time))return false;seen.add(x.time);return true;}).sort((a,b)=>a.time-b.time).slice(-total);
}
function parseCsv(text){
  const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(Boolean);
  const split=l=>{const o=[];let c='',q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(ch==='"'){q=!q;}else if(ch===','&&!q){o.push(c);c='';}else c+=ch;}o.push(c);return o;};
  const h=split(lines[0]).map(x=>x.trim().toLowerCase()),ix=names=>names.map(n=>h.indexOf(n)).find(i=>i>=0);
  const ti=ix(['time','timestamp','date','datetime']),oi=ix(['open']),hi=ix(['high']),li=ix(['low']),ci=ix(['close']),vi=ix(['volume','vol']);
  if([ti,oi,hi,li,ci].some(x=>x===undefined))throw new Error('CSV يحتاج Time/Open/High/Low/Close.');
  return lines.slice(1).map(l=>{const p=split(l);let t=+p[ti];if(!Number.isFinite(t)||t<1e9)t=Date.parse(p[ti]);if(t<1e11)t*=1000;return{time:t,open:+p[oi],high:+p[hi],low:+p[li],close:+p[ci],volume:vi===undefined?0:+p[vi]};}).filter(c=>Object.values(c).every(Number.isFinite)).sort((a,b)=>a.time-b.time);
}
function opts(){
  return{horizon:+$('horizon').value,minMove:+$('minMove').value,bull:+$('bullThreshold').value,bear:+$('bearThreshold').value};
}
async function run(cs,symbol,tf,source){
  if(cs.length<500)throw new Error('لـ V5 يفضّل 500 شمعة على الأقل، ووجدت '+cs.length+'.');
  $('status').textContent='حساب المؤشرات بدون Look‑Ahead...';
  await new Promise(r=>setTimeout(r,30));
  const features=featureMatrix(cs),o=opts();
  $('status').textContent='تشغيل Baseline Backtest...';
  const baseline=evaluate(cs,features,o,DEFAULT_WEIGHTS);
  $('status').textContent='تشغيل Walk‑Forward وتحسين الأوزان...';
  await new Promise(r=>setTimeout(r,30));
  const wf=walkForward(cs,features,o);
  const optimized=evaluate(cs,features,o,wf.avgWeights);
  const thresholds=thresholdSweep(cs,features,o,wf.avgWeights);
  const sessions=groupMetrics(optimized.signals,'session'),regimes=groupMetrics(optimized.signals,'regime');
  lastReport={symbol,tf,source,candles:cs.length,opts:o,baseline,wf,optimized,thresholds,sessions,regimes,defaultWeights:DEFAULT_WEIGHTS,optimizedWeights:wf.avgWeights};
  renderReport(lastReport);
  $('status').textContent='اكتمل V5 Backtest + Walk‑Forward.';
}
$('runCryptoBtn').onclick=async()=>{
  const b=$('runCryptoBtn');b.disabled=true;
  try{const cs=await fetchHistory($('symbol').value,$('timeframe').value,$('market').value,+$('historySize').value);await run(cs,$('symbol').value.toUpperCase(),$('timeframe').value,'Binance '+$('market').value);}
  catch(e){$('status').textContent='خطأ: '+e.message;}finally{b.disabled=false;}
};
$('runForexBtn').onclick=async()=>{
  const f=$('forexCsv').files[0];if(!f){$('status').textContent='اختر CSV أولًا.';return;}
  const b=$('runForexBtn');b.disabled=true;
  try{const cs=parseCsv(await f.text());await run(cs,$('forexSymbol').value,$('forexTf').value,'Forex CSV');}
  catch(e){$('status').textContent='خطأ: '+e.message;}finally{b.disabled=false;}
};

function metric(label,val,cls=''){return`<div class="metric"><small>${label}</small><b class="${cls}">${val}</b></div>`;}
function accuracyClass(x){return x>=.6?'good':x>=.52?'warn':'bad';}
function renderReport(r){
  ['summaryCard','baselineCard','wfCard','weightsCard','thresholdCard','sessionCard','regimeCard','distributionCard'].forEach(id=>$(id).classList.remove('hidden'));
  $('metricsGrid').classList.remove('hidden');$('regimeGrid').classList.remove('hidden');
  const a=r.optimized.accuracy, gap=r.wf.agg.overfitGap;
  $('summaryCard').innerHTML=`<h2>${esc(r.symbol)} — ${esc(r.tf)}</h2><div class="score ${accuracyClass(a)}">${(a*100).toFixed(1)}%</div><strong>Outcomes accuracy using optimized average weights</strong><p class="muted">${esc(r.source)} • ${r.candles} candles • Horizon ${r.opts.horizon} bars • Minimum move ${(r.opts.minMove*100).toFixed(2)}%</p><div class="note ${gap<.06?'good':gap<.12?'warn':'bad'}">Walk‑Forward overfit gap: ${(gap*100).toFixed(1)}%. ${gap<.06?'الفرق منخفض نسبيًا.':gap<.12?'يوجد فرق يحتاج الحذر.':'الفرق مرتفع؛ النموذج قد يكون Overfit.'}</div>`;

  $('baselineCard').innerHTML=`<h2>Baseline Weights</h2><div class="metrics">
    ${metric('Signals',r.baseline.n)}${metric('Accuracy',(r.baseline.accuracy*100).toFixed(1)+'%',accuracyClass(r.baseline.accuracy))}
    ${metric('Coverage',(r.baseline.coverage*100).toFixed(1)+'%')}${metric('Bull accuracy',(r.baseline.bullAccuracy*100).toFixed(1)+'%')}
    ${metric('Bear accuracy',(r.baseline.bearAccuracy*100).toFixed(1)+'%')}${metric('Avg signed return',pct(r.baseline.avgSignedReturn))}
    ${metric('Avg MFE',pct(r.baseline.avgMfe))}${metric('Avg MAE',pct(r.baseline.avgMae))}
  </div>`;

  const w=r.wf.agg;
  $('wfCard').innerHTML=`<h2>Walk‑Forward Validation</h2><div class="metrics">
    ${metric('Folds',w.folds)}${metric('Test signals',w.testSignals)}
    ${metric('Train accuracy',(w.trainAccuracy*100).toFixed(1)+'%')}${metric('Out-of-sample',(w.testAccuracy*100).toFixed(1)+'%',accuracyClass(w.testAccuracy))}
    ${metric('Test coverage',(w.testCoverage*100).toFixed(1)+'%')}${metric('Overfit gap',(w.overfitGap*100).toFixed(1)+'%',w.overfitGap<.06?'good':w.overfitGap<.12?'warn':'bad')}
    ${metric('Avg test signed return',pct(w.testReturn))}${metric('Unresolved', (r.optimized.unresolved*100).toFixed(1)+'%')}
  </div>`;

  const labels={structure:'Structure',trend:'Trend',momentum:'Momentum',strength:'ADX Strength',volumeFlow:'Volume/VWAP',time:'Time'};
  $('weightsCard').innerHTML=`<h2>Adaptive Weights</h2><p class="muted">Default مقابل متوسط الأوزان التي فازت داخل Walk‑Forward folds.</p>`+
    Object.keys(r.defaultWeights).map(k=>`<div class="weightrow"><b>${labels[k]}</b><div class="bar"><div style="width:${Math.min(100,r.optimizedWeights[k]*3)}%"></div></div><span>${r.defaultWeights[k].toFixed(1)}</span><strong>${r.optimizedWeights[k].toFixed(1)}</strong></div>`).join('')+
    `<p class="muted">العمود الأول Default، والثاني Optimized.</p>`;

  $('thresholdCard').innerHTML=`<h2>Threshold Sweep</h2><div class="tablewrap"><table><thead><tr><th>Bull/Bear</th><th>Signals</th><th>Accuracy</th><th>Coverage</th><th>Bull</th><th>Bear</th><th>Avg Return</th></tr></thead><tbody>`+
    r.thresholds.map(x=>`<tr><td>${x.threshold}/${x.bear}</td><td>${x.n}</td><td>${(x.accuracy*100).toFixed(1)}%</td><td>${(x.coverage*100).toFixed(1)}%</td><td>${(x.bullAccuracy*100).toFixed(1)}%</td><td>${(x.bearAccuracy*100).toFixed(1)}%</td><td>${pct(x.avgSignedReturn)}</td></tr>`).join('')+
    `</tbody></table></div>`;

  function groupTable(title,rows){
    return `<h2>${title}</h2><div class="tablewrap"><table><thead><tr><th>Group</th><th>N</th><th>Accuracy</th><th>Avg Return</th><th>MFE</th><th>MAE</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.n}</td><td>${(x.accuracy*100).toFixed(1)}%</td><td>${pct(x.avgRet)}</td><td>${pct(x.mfe)}</td><td>${pct(x.mae)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  $('sessionCard').innerHTML=groupTable('Performance by Session',r.sessions);
  $('regimeCard').innerHTML=groupTable('Performance by Market Regime',r.regimes);

  $('distributionCard').innerHTML=`<h2>Interpretation</h2><div class="chips"><span>Signals ${r.optimized.n}</span><span>Bulls ${r.optimized.bulls}</span><span>Bears ${r.optimized.bears}</span><span>Coverage ${(r.optimized.coverage*100).toFixed(1)}%</span><span>MFE ${pct(r.optimized.avgMfe)}</span><span>MAE ${pct(r.optimized.avgMae)}</span></div><p class="muted">لا يكفي ارتفاع Accuracy وحده. افحص عدد الإشارات، Coverage، فرق Train/Test، MFE/MAE، وتوازن نتائج الصعود والهبوط. إذا كانت العينة صغيرة أو Overfit gap مرتفعًا فلا تعتمد على الأوزان المحسنة.</p>`;
}
