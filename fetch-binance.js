// Download historical candles from Binance into data/*.json
// Usage: node tools/fetch-binance.js --symbols BTCUSDT,ETHUSDT --market spot --h1 8000 --d1 2500
// Node >= 18 (built-in fetch). "spot" uses data-api.binance.vision (works from GitHub runners);
// "futures" uses fapi.binance.com which is geo-blocked from some regions (HTTP 451).
const fs=require('fs'),path=require('path');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d;};
const symbols=arg('symbols','BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT,ADAUSDT,DOGEUSDT,LINKUSDT,AVAXUSDT,LTCUSDT').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
const market=arg('market','spot'),nH1=+arg('h1',8000),nD1=+arg('d1',2500),outDir=arg('out','data');
const base=market==='futures'?'https://fapi.binance.com/fapi/v1/klines':'https://data-api.binance.vision/api/v3/klines';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url,tries=4){for(let t=1;t<=tries;t++){try{const r=await fetch(url);if(r.status===451)throw new Error('HTTP 451 (region blocked) — use --market spot');if(r.status===429||r.status===418){await sleep(2000*t);continue;}if(!r.ok)throw new Error('HTTP '+r.status);return await r.json();}catch(e){if(t===tries||String(e.message).includes('451'))throw e;await sleep(800*t);}}}
async function history(symbol,interval,total){
  let end=Date.now(),all=[];
  while(all.length<total){
    const limit=Math.min(1000,total-all.length+1);
    const d=await get(`${base}?symbol=${symbol}&interval=${interval}&limit=${limit}&endTime=${end}`);
    if(!Array.isArray(d)||!d.length)break;
    const now=Date.now(),b=d.map(x=>({time:+x[0],open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5],closeTime:+x[6]})).filter(x=>x.closeTime<now);
    if(!b.length)break;all=[...b,...all];end=b[0].time-1;if(d.length<limit-1)break;await sleep(150);
  }
  const seen=new Set();return all.filter(x=>!seen.has(x.time)&&seen.add(x.time)).sort((a,b)=>a.time-b.time).slice(-total);
}
(async()=>{
  fs.mkdirSync(outDir,{recursive:true});let okN=0;
  for(const s of symbols){
    try{
      const H1=await history(s,'1h',nH1),D1=await history(s,'1d',nD1);
      fs.writeFileSync(path.join(outDir,`${s}_${market}.json`),JSON.stringify({symbol:s,market,fetchedAt:new Date().toISOString(),H1,D1}));
      console.log(`OK   ${s}: H1=${H1.length} D1=${D1.length}`);okN++;
    }catch(e){console.log(`FAIL ${s}: ${e.message}`);}
  }
  if(!okN){console.error('No data downloaded.');process.exit(1);}
})();
