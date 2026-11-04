import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const errors=[];
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);}
const pages=walk(root).filter(p=>p.endsWith('.html'));
for(const page of pages){const html=fs.readFileSync(page,'utf8');const route='/'+path.relative(root,page).replaceAll('\\','/');
 if(!html.includes('lang="zh-CN"')||!/<title>[^<]+<\/title>/.test(html))errors.push(`Missing page metadata ${route}`);
 for(const [,raw] of html.matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)){
  if(/^(https?:|data:|mailto:|javascript:)/.test(raw))continue;
  const url=new URL(raw.replaceAll('&amp;','&'),'http://local'+route);
  let target=path.join(root,decodeURIComponent(url.pathname));
  if(url.pathname.endsWith('/'))target=path.join(target,'index.html');
  if(!fs.existsSync(target))errors.push(`${route} -> missing ${url.pathname}`);
 }
}
if(pages.length!==131)errors.push(`Expected 131 static pages, got ${pages.length}`);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Static site OK: ${pages.length} HTML pages, all local links and assets resolve.`);
