const $=id=>document.getElementById(id);
let deferredPrompt=null,currentLive=null,currentTf='H1';

if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{
 const reg=await navigator.serviceWorker.register('./service-worker.js?v=5.6.4',{updateViaCache:'none'});await reg.update();
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

 return{
   price:last.close,components,baseScore,baseWeight,
   structure,trend,momentum,strength,volumeFlow,srBreakout,
   rsi:rv,adx:adxv,atr:atrv,ema20:E20,ema50:E50,ema200:E200,macd:mac,macdSignal:sig,volumeRatio:vr,
   support,resistance,session,regime,barTime:last.time,barCloseTime:last.closeTime
 };
}

function mtfComponent(tf,cores){
 if(tf==='M15')return cores.H1.baseScore*.65+cores.D1.baseScore*.35;
 if(tf==='H1')return cores.D1.baseScore*.80+cores.M15.baseScore*.20;
 return cores.H1.baseScore*.80+cores.M15.baseScore*.20;
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

function barrierOutcome(cs,i,dir,atrv,h=12){
 const e=cs[i].close,F=dir===1?e+atrv:e-atrv,A=dir===1?e-atrv:e+atrv;
 for(let j=i+1;j<=Math.min(cs.length-1,i+h);j++){
   const fav=dir===1?cs[j].high>=F:cs[j].low<=F,adv=dir===1?cs[j].low<=A:cs[j].high>=A;
   if(fav&&adv)return'amb'; if(fav)return'win'; if(adv)return'loss';
 }
 return'timeout';
}
function quickOOS(cs){
 const AT=atr(cs),rows=[];
 for(let i=240;i<cs.length-13;i+=2){
   const a=technicalCore(cs.slice(Math.max(0,i-299),i+1));
   const score=a.baseScore/a.baseWeight;
   const dir=score>=65?1:score<=35?-1:0;
   if(!dir)continue;
   rows.push({dir,out:barrierOutcome(cs,i,dir,AT[i])});
 }
 const test=rows.slice(Math.floor(rows.length*.70));
 function side(dir){
   const r=test.filter(x=>x.dir===dir&&(x.out==='win'||x.out==='loss'));
   const wins=r.filter(x=>x.out==='win').length,losses=r.filter(x=>x.out==='loss').length,n=wins+losses;
   const acc=n?wins/n:0,pf=losses?wins/losses:(wins?99:0),wilson=wilsonLower95(wins,n);
   return{n,wins,losses,acc,pf,wilson};
 }
 return{long:side(1),short:side(-1)};
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
 const buffer=.10*a.atr;let entry,stop,tp1,tp2;
 if(a.side===1){
   entry=Math.max(a.price,a.resistance+buffer);
   stop=Math.min(a.support-buffer,entry-1.15*a.atr);
   const risk=entry-stop;tp1=entry+risk;tp2=entry+2*risk;
 }else{
   entry=Math.min(a.price,a.support-buffer);
   stop=Math.max(a.resistance+buffer,entry+1.15*a.atr);
   const risk=stop-entry;tp1=entry-risk;tp2=entry-2*risk;
 }
 return{entry,stop,tp1,tp2};
}
function confidenceTier(hist,integrity,techScore){
 if(hist.n>=100&&hist.wilson>=.53&&hist.pf>=1.30&&integrity.score>=80&&(techScore>=80||techScore<=20))return'HIGH CONFIDENCE';
 if(hist.n>=100&&hist.wilson>=.50&&hist.pf>=1.20&&integrity.score>=75)return'CONFIRMED';
 return'PRELIMINARY';
}
function finalDecision(frame,cfg){
 const a=frame.a,h=a.side===1?frame.oos.long:frame.oos.short;
 const reasons=[];
 if(a.side===0)reasons.push('Technical direction is neutral');
 if(frame.veto)reasons.push('Higher-timeframe veto');
 if(a.side&&h.n<cfg.minSample)reasons.push(`OOS N ${h.n} < ${cfg.minSample}`);
 if(a.side&&h.acc<cfg.minAcc)reasons.push(`OOS accuracy ${(h.acc*100).toFixed(1)}% < ${(cfg.minAcc*100).toFixed(0)}%`);
 if(a.side&&h.pf<cfg.minPF)reasons.push(`PF ${h.pf.toFixed(2)} < ${cfg.minPF.toFixed(2)}`);
 if(a.side&&h.wilson<cfg.minWilson)reasons.push(`Wilson95 ${(h.wilson*100).toFixed(1)}% < ${(cfg.minWilson*100).toFixed(0)}%`);
 if(frame.integrity.score<70)reasons.push(`Integrity ${frame.integrity.score.toFixed(1)} < 70`);
 if(frame.integrity.coverage<.50)reasons.push(`Integrity coverage ${(frame.integrity.coverage*100).toFixed(0)}% < 50%`);
 if(reasons.length)return{status:'BLOCKED',reasons};
 return{status:confidenceTier(h,frame.integrity,a.score),reasons:['All minimum gates passed']};
}

$('runLiveBtn').onclick=async()=>{
 const b=$('runLiveBtn');b.disabled=true;$('status').textContent='جاري تشغيل Technical → Historical → Integrity على M15/H1/D1...';
 try{
   const symbol=$('liveSymbol').value.trim().toUpperCase(),market=$('liveMarket').value;
   const cfg={minSample:+$('liveMinSample').value,minAcc:+$('liveMinAcc').value,minPF:+$('liveMinPF').value,minWilson:+$('liveMinWilson').value};
   const defs=[['M15','15m',1000],['H1','1h',1000],['D1','1d',700]];
   const sets=await Promise.all(defs.map(x=>fetchHistory(symbol,x[1],market,x[2])));
   const ctx=await marketContext();

   const cores={};
   defs.forEach((d,i)=>cores[d[0]]=technicalCore(sets[i]));
   const frames=[];
   for(let i=0;i<defs.length;i++){
     const tf=defs[i][0],core=cores[tf],mtf=mtfComponent(tf,cores);
     const score=clamp(core.baseScore+mtf*.10);
     const side=score>=65?1:score<=35?-1:0;
     const a={...core,score,side,mtf};
     cores[tf]={...core,score,side,mtf};
     const oos=quickOOS(sets[i]);
     const integrity=await liveIntegrity(symbol,market,a.price,sets[i]);
     const veto=higherTfVeto(tf,side,cores);
     const frame={tf,a,oos,integrity,veto,levels:side?paperLevels(a):null};
     frame.decision=finalDecision(frame,cfg);
     frames.push(frame);
   }

   const dirs=frames.map(x=>x.a.side).filter(Boolean),agreement=dirs.length?Math.abs(dirs.reduce((s,x)=>s+x,0))/dirs.length:0;
   currentLive={symbol,market,ctx,frames,agreement,cfg};
   renderLive();$('status').textContent='اكتمل التحليل متعدد الطبقات.';
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
   ${metric('MTF directional agreement',(x.agreement*100).toFixed(0)+'%')}
 </div>`;
 $('mtfCards').innerHTML=x.frames.map(f=>`<div class="tfcard">
   <h3>${f.tf}</h3>
   <div class="direction ${f.a.side===1?'bullish':f.a.side===-1?'bearish':'neutral'}">${f.a.side===1?'BULLISH':f.a.side===-1?'BEARISH':'NEUTRAL'}</div>
   <div class="score">${f.a.score.toFixed(1)}</div>
   <p class="muted">${f.a.session} • ${f.a.regime}</p>
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

 $('tfHistorical').innerHTML=`<h2>2 — Historical Validation Engine</h2>
   ${a.side?`<div class="layerGrid">
     <div class="layerMetric"><small>Side-specific Resolved N</small><b class="${h.n>=currentLive.cfg.minSample?'enginePass':'engineFail'}">${h.n}</b></div>
     <div class="layerMetric"><small>OOS Accuracy</small><b class="${h.acc>=currentLive.cfg.minAcc?'enginePass':'engineFail'}">${pct(h.acc)}</b></div>
     <div class="layerMetric"><small>Profit Factor</small><b class="${h.pf>=currentLive.cfg.minPF?'enginePass':'engineFail'}">${h.pf.toFixed(2)}</b></div>
     <div class="layerMetric"><small>Wilson 95% Lower Bound</small><b class="${h.wilson>=currentLive.cfg.minWilson?'enginePass':'engineFail'}">${pct(h.wilson)}</b></div>
   </div>`:'<div class="hiddenLevels">لا يوجد اتجاه فني، لذلك لا يوجد Side-specific validation.</div>'}
   <p class="muted">OOS هنا تحقق تاريخي مبسط على الجزء الأحدث من البيانات؛ لا يعني أن النتيجة القادمة ستنجح بنفس النسبة.</p>`;

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

 $('tfScenario').className=`card ${d.status==='BLOCKED'?'filterBlocked':'filterAllowed'}`;
 if(d.status==='BLOCKED'){
   $('tfScenario').innerHTML=`<h2>${f.tf} — Paper Scenario</h2>
     <div class="decision block">BLOCKED</div>
     <div class="hiddenLevels">تم إخفاء Paper Entry / TP1 / TP2 / Stop لأن السيناريو لم يجتز جميع الفلاتر الدنيا.</div>`;
 }else{
   const L=f.levels,risk=Math.abs(L.entry-L.stop),rr1=risk?Math.abs(L.tp1-L.entry)/risk:0,rr2=risk?Math.abs(L.tp2-L.entry)/risk:0;
   $('tfScenario').innerHTML=`<h2>${f.tf} — Paper Scenario</h2>
     <div class="decision allow">${d.status}</div>
     <div class="levels4">
       <div class="level"><small>Paper Entry</small><strong>${fmt(L.entry,6)}</strong></div>
       <div class="level"><small>Paper Stop</small><strong>${fmt(L.stop,6)}</strong></div>
       <div class="level"><small>Paper TP1</small><strong>${fmt(L.tp1,6)}</strong><div class="rankTag">R:R ${rr1.toFixed(2)}</div></div>
       <div class="level"><small>Paper TP2</small><strong>${fmt(L.tp2,6)}</strong><div class="rankTag">R:R ${rr2.toFixed(2)}</div></div>
     </div><p class="muted">هذه مستويات Paper Research مقفلة مع آخر شمعة مغلقة، وليست أوامر تداول حقيقية.</p>`;
 }

 $('tfIndicators').innerHTML=`<h2>Indicator Detail</h2><div class="metrics">
   ${metric('EMA20',fmt(a.ema20,6))}${metric('EMA50',fmt(a.ema50,6))}${metric('EMA200',fmt(a.ema200,6))}
   ${metric('RSI14',a.rsi.toFixed(2))}${metric('ADX14',a.adx.toFixed(2))}
   ${metric('MACD',fmt(a.macd,6))}${metric('MACD Signal',fmt(a.macdSignal,6))}
   ${metric('Volume/MA20',a.volumeRatio.toFixed(2)+'x')}
   ${metric('Support',fmt(a.support,6))}${metric('Resistance',fmt(a.resistance,6))}${metric('ATR',fmt(a.atr,6))}
 </div>`;
}

window.addEventListener('load',()=>{
 try{
   const sym=new URLSearchParams(location.search).get('symbol');
   if(sym&&$('liveSymbol')){$('liveSymbol').value=sym.toUpperCase();setTimeout(()=>$('runLiveBtn')?.click(),250);}
 }catch(e){}
});
