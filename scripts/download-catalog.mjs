// Deliberately curated IDs: do not select the first search result (sequels/remakes differ).
import fs from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(realpathSync('node_modules/astro/package.json'))('sharp');
const mapping=JSON.parse(await fs.readFile('data/catalog-sources.json','utf8'));
const assets=JSON.parse(await fs.readFile('data/assets.json','utf8'));
const {entries}=JSON.parse(await fs.readFile('data/entries.json','utf8'));
await fs.mkdir('.local',{recursive:true});
await fs.mkdir('public/images',{recursive:true});
let queue=Object.entries(mapping);
const decode=t=>t.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#039;',"'").replaceAll('&copy;','©');
async function worker(){while(queue.length){const [id,catalogId]=queue.shift();if(assets[id])continue;try{
 const source=`https://www.b-ch.com/titles/${catalogId}/`;
 const r=await fetch(source,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(r.status);const html=await r.text();
 await fs.writeFile(`.local/catalog-${id}.html`,html);
 const raw=html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
 const credit=decode(html.match(/<meta property="og:description" content="([^"]+)"/i)?.[1]||'');
 if(!raw||!/(©|[（(]C[）)])/i.test(credit))throw Error('Missing image or rights statement');
 const originalUrl=decode(raw);const response=await fetch(originalUrl,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`Image ${response.status}`);
 const b=Buffer.from(await response.arrayBuffer());const image=await sharp(b).rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:78}).toBuffer();
 await fs.writeFile(`public/images/${id}.webp`,image);
 assets[id]={src:`/images/${id}.webp`,source,originalUrl,credit,alt:`${entries.find(e=>e.id===id).zh}授权发行宣传图`,note:'对应版本的授权发行平台宣传图；非原始设定证据',accessedAt:'2026-11-04'};
 console.log(id,image.length);
}catch(e){console.log(id,'FAILED',e.message)}}}
await Promise.all(Array.from({length:3},worker));await fs.writeFile('data/assets.json',JSON.stringify(assets,null,2)+'\n');
