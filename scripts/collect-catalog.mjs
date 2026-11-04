// Read-only title lookup using the endpoint declared by b-ch.com's public search form.
import fs from 'node:fs/promises';
const {entries}=JSON.parse(await fs.readFile('data/entries.json','utf8'));
const found={};let queue=entries.filter(e=>e.kind==='anime');
await fs.mkdir('.local',{recursive:true});
async function worker(){while(queue.length){const e=queue.shift();try{const r=await fetch('https://appsvr.b-ch.com/api/ttlsrch/ajax_title_text_search2',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({mode:'title',keyword:e.ja}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(r.status);const j=await r.json();found[e.id]=j.data.map(v=>({id:v.id,name:v.name}));console.log(e.id,JSON.stringify(found[e.id]));}catch(err){console.log(e.id,err.message)}}}
await Promise.all(Array.from({length:3},worker));
await fs.writeFile('.local/catalog-candidates.json',JSON.stringify(found,null,2));
