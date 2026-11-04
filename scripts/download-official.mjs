import fs from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(realpathSync('node_modules/astro/package.json'));
const sharp=require('sharp');
const list=[
 ['1996-eva','https://image2.b-ch.com/ttl2/466/466_chara_001.jpg','https://www.b-ch.com/titles/466/','©カラー／Project Eva.','TV版授权发行平台角色图：碇真嗣'],
 ['1996-ccs','https://dvs-cover.kodansha.co.jp/0000031602/ErSBkW6cLORKHenzvV1ZFnXZP99vUf2Q9SF87uH0.jpg','https://www.kodansha.co.jp/comic/products/0000031602','©CLAMP／講談社','1996年单行本第1卷封面；漫画版本'],
 ['1996-sakura','https://common.sakura-taisen.com/assets/images/chara/1/chara_01.jpg','https://common.sakura-taisen.com/characters/1/','©SEGA','初代角色的官网回顾图；非首发设定证据'],
 ['1996-escaf','https://www.escaflowne.jp/images/main.jpg','https://www.escaflowne.jp/','©サンライズ・バンダイビジュアル','TV版官网主视觉；完整画面'],
 ['2002-seed','https://gundam-official.com/seed/assets/img/seed/chara/stand/chara1.png','https://gundam-official.com/seed/seed/character/','©創通・サンライズ','现存官网角色头像：基拉；后续发行资料'],
 ['2009-kon','https://www.tbs.co.jp/anime/k-on/k-on_tv/chara/images/chara_photo01_1.gif','https://www.tbs.co.jp/anime/k-on/k-on_tv/chara/chara01.html','©かきふらい・芳文社／桜高軽音部','第一季存档官网角色图：平泽唯'],
 ['2012-hyouka','https://kotenbu.com/images/top120724main_visual1.jpg','https://kotenbu.com/','©米澤穂信・角川書店／神山高校古典部OB会','官网2012年主视觉'],
 ['2019-kimetsu','https://kimetsu.com/anime/risshihen/assets/img/top/kv.jpg','https://kimetsu.com/anime/risshihen/','©吾峠呼世晴／集英社・アニプレックス・ufotable','TV立志篇主视觉'],
 ['2025-gqux','https://gundam-official.com/gquuuuuux/glh/jp/character/2025/05/chara_01_01.png','https://gundam-official.com/gquuuuuux/character/','©創通・サンライズ','2025年官方角色图：阿玛特'],
 ['2023-frieren','https://image2.b-ch.com/fix/8259h.png','https://www.b-ch.com/titles/8259/','©山田鐘人・アベツカサ／小学館／「葬送のフリーレン」製作委員会','2023年第一季授权发行平台宣传图'],
 ['2022-gwitch','https://gundam-official.com/witch-from-mercury/gwitch/jp/character/2023/04/01_front.png','https://gundam-official.com/witch-from-mercury/character/1/','©サンライズ・MBS','官网角色正面图：苏莱塔；现存2023年资料，不作为2022年首发设定证据'],
];
await fs.mkdir('public/images',{recursive:true});
const manifest=JSON.parse(await fs.readFile('data/assets.json','utf8'));
await Promise.all(list.map(async ([id,url,source,credit,note])=>{try{const r=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(r.status);const b=Buffer.from(await r.arrayBuffer());const image=await sharp(b).rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();await fs.writeFile('public/images/'+id+'.webp',image);manifest[id]={src:'/images/'+id+'.webp',source,originalUrl:url,credit,alt:JSON.parse(await fs.readFile('data/entries.json','utf8')).entries.find(e=>e.id===id).zh+'官方图像',note,accessedAt:'2026-11-04'};console.log(id,image.length);}catch(e){console.log(id,'FAILED',e.message)}}));
await fs.writeFile('data/assets.json',JSON.stringify(manifest,null,2)+'\n');
