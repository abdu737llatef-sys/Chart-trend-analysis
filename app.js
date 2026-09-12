const $=id=>document.getElementById(id);
let deferredPrompt=null,currentLive=null,currentTf='H1';

if('serviceWorker' in navigator)window.addEventListener('load',async()=>{try{
 const reg=await navigator.serviceWorker.register('./service-worker.js?v=5.6.2',{updateViaCache:'none'}); await reg.update();
}catch(e){console.warn(e);}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden');});
$('installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').classList.add('hidden');};

document.querySelectorAll('.modeTab').forEach(b=>b.onclick=()=>{
 const live=b.dataset.mode==='live';
 document.querySelectorAll('.modeTab').forEach(x=>x.classList.toggle('active',x===b));
 $('liveControls').classList.toggle('hidden',!live);
 $('researchControls').classList.toggle('hidden',live);
 $('marketOverview').classList.toggle('hidden',!live || !currentLive);
 $('mtfCards').classList.toggle('hidden',!live || !currentLive);
 $('detailsPanel').classList.toggle('hidden',!live || !currentLive);
 $('researchPanel').classList.toggle('hidden',live);
});

const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const fmt=(x,n=4)=>Number.isFinite(x)?Number(x).toFixed(n):'N/A';
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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

function analyzeLive(cs){
 const c=cs.map(x=>x.close),v=cs.map(x=>x.volume||0),e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),R=rsi(c),A=adx(cs),M=macd(c),I=ichimoku(cs),AT=atr(cs),vma=sma(v,20),piv=confirmedPivots(cs),last=cs.at(-1),i=cs.length-1;
 const E20=lastNN(e20),E50=lastNN(e50),E200=lastNN(e200),r=lastNN(R),adxv=lastNN(A.adx),p=lastNN(A.plus),m=lastNN(A.minus),atrv=lastNN(AT),ten=lastNN(I.tenkan),kij=lastNN(I.kijun),sa=lastNN(I.spanA),sb=lastNN(I.spanB),mac=lastNN(M.line),sig=lastNN(M.signal),hist=lastNN(M.hist),vr=vma[i]?last.volume/vma[i]:1;
 let trend=50;if(last.close>E20&&E20>E50&&E50>E200)trend=90;else if(last.close>E50&&E50>E200)trend=72;else if(last.close<E20&&E20<E50&&E50<E200)trend=10;else if(last.close<E50&&E50<E200)trend=28;
 const top=Math.max(sa,sb),bot=Math.min(sa,sb);let ichi=50;if(last.close>top&&ten>kij)ichi=90;else if(last.close>top)ichi=70;else if(last.close<bot&&ten<kij)ichi=10;else if(last.close<bot)ichi=30;
 let mom=(r>=60?84:r>=55?72:r>=50?60:r>=45?40:r>=40?28:16);mom=(mom+(mac>sig&&hist>0?82:mac>sig?66:mac<sig&&hist<0?18:34))/2;
 let strength=50;if(adxv>=25&&p>m)strength=85;else if(adxv>=20&&p>m)strength=70;else if(adxv>=25&&m>p)strength=15;else if(adxv>=20&&m>p)strength=30;
 const ah=piv.hs.filter(x=>x.confirmed<=i),al=piv.ls.filter(x=>x.confirmed<=i);let structure=50;
 if(ah.length>=2&&al.length>=2){const hh=ah.at(-1).price>ah.at(-2).price,hl=al.at(-1).price>al.at(-2).price,lh=ah.at(-1).price<ah.at(-2).price,ll=al.at(-1).price<al.at(-2).price;if(hh&&hl)structure=90;else if(lh&&ll)structure=10;else if(hh&&ll)structure=62;else if(lh&&hl)structure=38;}
 let volumeFlow=50;if(vr>=1.25&&last.close>last.open)volumeFlow=75;else if(vr>=1.25&&last.close<last.open)volumeFlow=25;
 const score=structure*.24+((trend+ichi)/2)*.28+mom*.18+strength*.14+volumeFlow*.08+50*.08;
 const resistance=ah.length?ah.at(-1).price:Math.max(...cs.slice(-30).map(x=>x.high)),support=al.length?al.at(-1).price:Math.min(...cs.slice(-30).map(x=>x.low));
 const h=new Date(last.time).getUTCHours(),session=h<7?'Asia':h<13?'London':h<16?'London/NY Overlap':h<21?'New York':'Late',regime=adxv>=25?'Trending':adxv<18?'Ranging':'Mixed';
 return{price:last.close,score,side:score>=65?1:score<=35?-1:0,structure,trend:(trend+ichi)/2,momentum:mom,strength,volumeFlow,rsi:r,adx:adxv,atr:atrv,ema20:E20,ema50:E50,ema200:E200,macd:mac,macdSignal:sig,volumeRatio:vr,support,resistance,session,regime};
}

function barrierOutcome(cs,i,dir,atrv,h=12){
 const e=cs[i].close,f=atrv,a=atrv,F=dir===1?e+f:e-f,A=dir===1?e-a:e+a;
 for(let j=i+1;j<=Math.min(cs.length-1,i+h);j++){const hf=dir===1?cs[j].high>=F:cs[j].low<=F,ha=dir===1?cs[j].low<=A:cs[j].high>=A;if(hf&&ha)return'amb';if(hf)return'win';if(ha)return'loss';}
 return'timeout';
}
function quickOOS(cs){
 const AT=atr(cs),rows=[];
 for(let i=220;i<cs.length-13;i++){const a=analyzeLive(cs.slice(0,i+1));if(a.side===0)continue;rows.push({dir:a.side,out:barrierOutcome(cs,i,a.side,AT[i])});}
 const test=rows.slice(Math.floor(rows.length*.7));
 function side(dir){const r=test.filter(x=>x.dir===dir&&(x.out==='win'||x.out==='loss')),w=r.filter(x=>x.out==='win').length,l=r.filter(x=>x.out==='loss').length;return{n:r.length,acc:r.length?w/r.length:0,pf:l?w/l:(w?99:0)};}
 return{long:side(1),short:side(-1)};
}

async function fetchHistory(symbol,interval,market,total=900){
 const clean=symbol.toUpperCase().replace(/[^A-Z0-9]/g,''),base=market==='futures'?'https://fapi.binance.com/fapi/v1/klines':'https://data-api.binance.vision/api/v3/klines';let end=Date.now(),all=[];
 while(all.length<total){const limit=Math.min(1000,total-all.length),u=`${base}?symbol=${clean}&interval=${interval}&limit=${limit}&endTime=${end}`,r=await fetch(u),d=await r.json();if(!r.ok||!Array.isArray(d))throw new Error(d?.msg||'تعذر جلب Binance');if(!d.length)break;const b=d.map(x=>({time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]}));all=[...b,...all];end=b[0].time-1;if(b.length<limit)break;}
 const seen=new Set();return all.filter(x=>!seen.has(x.time)&&seen.add(x.time)).sort((a,b)=>a.time-b.time).slice(-total);
}
async function marketContext(){
 const [b,e]=await Promise.all([fetchHistory('BTCUSDT','1h','spot',500),fetchHistory('ETHUSDT','1h','spot',500)]),ba=analyzeLive(b),ea=analyzeLive(e),score=ba.score*.6+ea.score*.4;
 return{btc:ba.score,eth:ea.score,score,direction:score>=60?'Bullish':score<=40?'Bearish':'Neutral'};
}
function paperLevels(a,oos,minSample,minPF){
 if(a.side===0)return{allowed:false,reason:'لا توجد إشارة اتجاهية تتجاوز Threshold.'};
 const stats=a.side===1?oos.long:oos.short,allowed=stats.n>=minSample&&stats.pf>=minPF&&stats.acc>=.52,buffer=.10*a.atr;let entry,stop,tp1,tp2;
 if(a.side===1){entry=Math.max(a.price,a.resistance+buffer);stop=Math.min(a.support-buffer,entry-1.15*a.atr);const risk=entry-stop;tp1=entry+risk;tp2=entry+2*risk;}
 else{entry=Math.min(a.price,a.support-buffer);stop=Math.max(a.resistance+buffer,entry+1.15*a.atr);const risk=stop-entry;tp1=entry-risk;tp2=entry-2*risk;}
 return{allowed,reason:allowed?'اجتازت العينة التاريخية والدقة وPF شروط البحث.':`Blocked: OOS n=${stats.n}, accuracy ${(stats.acc*100).toFixed(1)}%, PF ${stats.pf.toFixed(2)}.`,entry,stop,tp1,tp2,stats};
}

$('runLiveBtn').onclick=async()=>{
 const b=$('runLiveBtn');b.disabled=true;$('status').textContent='جاري جلب M15/H1/D1 واختبار كل فريم تاريخيًا...';
 try{
   const symbol=$('liveSymbol').value.trim().toUpperCase(),market=$('liveMarket').value,minSample=+$('liveMinSample').value,minPF=+$('liveMinPF').value,defs=[['M15','15m',1000],['H1','1h',1000],['D1','1d',700]];
   const sets=await Promise.all(defs.map(x=>fetchHistory(symbol,x[1],market,x[2]))),ctx=await marketContext();
   const frames=defs.map((d,i)=>{const a=analyzeLive(sets[i]),oos=quickOOS(sets[i]),scenario=paperLevels(a,oos,minSample,minPF);return{tf:d[0],a,oos,scenario};});
   const dirs=frames.map(x=>x.a.side).filter(x=>x!==0),agreement=dirs.length?Math.abs(dirs.reduce((s,x)=>s+x,0))/dirs.length:0;
   currentLive={symbol,market,ctx,frames,agreement};renderLive();$('status').textContent='اكتمل التحليل الشامل.';
 }catch(e){$('status').textContent='خطأ: '+e.message;}finally{b.disabled=false;}
};

function metric(label,value,cls=''){return`<div class="metric"><small>${label}</small><b class="${cls}">${value}</b></div>`;}
function renderLive(){
 const x=currentLive;$('marketOverview').classList.remove('hidden');$('mtfCards').classList.remove('hidden');$('detailsPanel').classList.remove('hidden');
 $('marketOverview').innerHTML=`<h2>Market Overview — ${esc(x.symbol)}</h2><div class="metrics">${metric('BTC H1 context',x.ctx.btc.toFixed(1))}${metric('ETH H1 context',x.ctx.eth.toFixed(1))}${metric('Market direction',x.ctx.direction,x.ctx.direction==='Bullish'?'good':x.ctx.direction==='Bearish'?'bad':'warn')}${metric('MTF agreement',(x.agreement*100).toFixed(0)+'%')}</div>`;
 $('mtfCards').innerHTML=x.frames.map(f=>`<div class="tfcard"><h3>${f.tf}</h3><div class="direction ${f.a.side===1?'bullish':f.a.side===-1?'bearish':'neutral'}">${f.a.side===1?'BULLISH':f.a.side===-1?'BEARISH':'NEUTRAL'}</div><div class="score">${f.a.score.toFixed(1)}</div><p class="muted">${f.a.session} • ${f.a.regime}</p><div class="decision ${f.scenario.allowed?'allow':'block'}">${f.scenario.allowed?'PAPER SCENARIO ALLOWED':'PAPER SCENARIO BLOCKED'}</div></div>`).join('');
 $('tfTabs').innerHTML=x.frames.map(f=>`<button class="tab ${f.tf===currentTf?'active':''}" data-tf="${f.tf}">${f.tf}</button>`).join('');
 $('tfTabs').querySelectorAll('.tab').forEach(b=>b.onclick=()=>{currentTf=b.dataset.tf;$('tfTabs').querySelectorAll('.tab').forEach(z=>z.classList.toggle('active',z.dataset.tf===currentTf));renderTf();});
 if(!x.frames.some(f=>f.tf===currentTf))currentTf='H1';renderTf();
}
function renderTf(){
 const f=currentLive.frames.find(z=>z.tf===currentTf),a=f.a,s=f.scenario,st=a.side===1?f.oos.long:f.oos.short;
 $('tfSummary').innerHTML=`<h2>${currentLive.symbol} — ${f.tf}</h2><div class="score ${a.side===1?'bullish':a.side===-1?'bearish':'neutral'}">${a.score.toFixed(1)}/100</div><div class="metrics">${metric('Direction',a.side===1?'Bullish':a.side===-1?'Bearish':'Neutral')}${metric('Price',fmt(a.price,6))}${metric('Session',a.session)}${metric('Regime',a.regime)}${metric('OOS side N',a.side?st.n:'-')}${metric('OOS side accuracy',a.side?(st.acc*100).toFixed(1)+'%':'-')}${metric('OOS side PF',a.side?st.pf.toFixed(2):'-')}${metric('Market context',currentLive.ctx.direction)}</div>`;
 $('tfScenario').className=`card ${s.allowed?'filterAllowed':'filterBlocked'}`;
 $('tfScenario').innerHTML=`<h2>${f.tf} — Paper Scenario</h2><div class="decision ${s.allowed?'allow':'block'}">${s.allowed?'ALLOWED FOR PAPER RESEARCH':'BLOCKED'}</div><p>${esc(s.reason)}</p>${a.side?`<div class="levels4"><div class="level"><small>Paper Entry</small><strong>${fmt(s.entry,6)}</strong></div><div class="level"><small>Paper Stop</small><strong>${fmt(s.stop,6)}</strong></div><div class="level"><small>Paper TP1</small><strong>${fmt(s.tp1,6)}</strong></div><div class="level"><small>Paper TP2</small><strong>${fmt(s.tp2,6)}</strong></div></div><p class="muted">هذه مستويات محاكاة فقط.</p>`:''}`;
 $('tfEvidence').innerHTML=`<h2>Technical Evidence</h2><div class="evidencegrid">${metric('Structure',a.structure.toFixed(0))}${metric('Trend EMA+Ichimoku',a.trend.toFixed(0))}${metric('Momentum',a.momentum.toFixed(0))}${metric('ADX strength',a.strength.toFixed(0))}${metric('Volume flow',a.volumeFlow.toFixed(0))}${metric('Support',fmt(a.support,6))}${metric('Resistance',fmt(a.resistance,6))}${metric('ATR',fmt(a.atr,6))}</div>`;
 $('tfIndicators').innerHTML=`<h2>Indicators</h2><div class="metrics">${metric('EMA20',fmt(a.ema20,6))}${metric('EMA50',fmt(a.ema50,6))}${metric('EMA200',fmt(a.ema200,6))}${metric('RSI14',a.rsi.toFixed(2))}${metric('ADX14',a.adx.toFixed(2))}${metric('MACD',fmt(a.macd,6))}${metric('MACD Signal',fmt(a.macdSignal,6))}${metric('Volume/MA20',a.volumeRatio.toFixed(2)+'x')}</div>`;
}
$('runResearchBtn').onclick=async()=>{$('researchPanel').classList.remove('hidden');$('status').textContent='Research mode في V5.4 مبسط؛ استخدم V5.3 للبحث التفصيلي.';$('researchSummary').innerHTML='<h2>Research Mode</h2><p>V5.4 يركز على التحليل المباشر متعدد الفريمات.</p>';$('researchSides').innerHTML='';$('researchCalibration').innerHTML='';};


// V5.6: open a symbol from Market Scanner in the Live MTF analyzer.
window.addEventListener('load',()=>{
  try{
    const sym=new URLSearchParams(location.search).get('symbol');
    if(sym && document.getElementById('liveSymbol')){
      document.getElementById('liveSymbol').value=sym.toUpperCase();
      setTimeout(()=>document.getElementById('runLiveBtn')?.click(),250);
    }
  }catch(e){}
});
