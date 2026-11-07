import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
export function validateData({entries,periods,assets,essays}){
 const errors=[];const ids=new Set(), titles=new Set();
 const kinds=new Set(['anime','manga','game','illustration']);
 const facets=new Set(['line','eye','face','color','body','hair','staging','texture','proportion']);
 if(entries.length!==120)errors.push('Expected exactly 120 entries');
 if(periods.length!==6)errors.push('Expected six periods');
 let next=1996;
 for(const p of periods){if(p.range[0]!==next||p.range[1]<p.range[0])errors.push(`Non-contiguous period ${p.id}`);next=p.range[1]+1;}
 if(next!==2026)errors.push('Periods must end in 2025');
 for(let year=1996;year<=2025;year++)if(entries.filter(e=>e.year===year).length!==4)errors.push(`${year} must have four entries`);
 for(const e of entries){
  if(ids.has(e.id))errors.push(`Duplicate id ${e.id}`);ids.add(e.id);
  if(titles.has(e.zh))errors.push(`Duplicate work ${e.zh}`);titles.add(e.zh);
  if(!/^[a-z0-9-]+$/.test(e.id)||!e.id.startsWith(String(e.year)+'-'))errors.push(`Invalid id ${e.id}`);
  if(!Number.isInteger(e.year)||e.year<1996||e.year>2025||e.status!=='core')errors.push(`Out of scope ${e.id}`);
  const p=periods.find(p=>p.id===e.period);if(!p||e.year<p.range[0]||e.year>p.range[1])errors.push(`Period mismatch ${e.id}`);
  if(!kinds.has(e.kind)||!facets.has(e.facet))errors.push(`Invalid kind/facet ${e.id}`);
  if(!e.zh||!e.why||!Array.isArray(e.tags))errors.push(`Missing editorial fields ${e.id}`);
  for(const field of e.verifiedFields||[])if(!(e.sources||[]).some(s=>s.fields?.includes(field)&&/^https:\/\//.test(s.url)&&s.accessedAt))errors.push(`Unsourced verified field ${e.id}.${field}`);
  if(e.confidence==='high'&&!e.sources?.length)errors.push(`Unsourced high confidence ${e.id}`);
 }
 for(const [id,a] of Object.entries(assets)){
  if(!ids.has(id))errors.push(`Unknown image entry ${id}`);
  if(!/^\/images\/[\w-]+\.webp$/.test(a.src)||!/^https:\/\//.test(a.source)||!/^https:\/\//.test(a.originalUrl)||!a.credit||!a.alt||!a.note||!a.accessedAt)errors.push(`Invalid image metadata ${id}`);
 }
 for(const [id,e] of Object.entries(essays))if(!ids.has(id)||!e.lead||!Array.isArray(e.sections)||e.sections.length<3||e.sections.some(s=>s.length!==2||!s[0]||!s[1]))errors.push(`Invalid essay ${id}`);
 return errors;
}
export function check(release=false){
 const entries=load('data/entries.json').entries,periods=load('data/periods.json').periods,assets=load('data/assets.json'),essays=load('data/essays.json');
 const errors=validateData({entries,periods,assets,essays});
 for(const [id,a]of Object.entries(assets))if(!fs.existsSync(path.join(root,'public',a.src)))errors.push(`Missing image file ${id}`);
 if(release){for(const e of entries){if(!assets[e.id])errors.push(`Missing release image ${e.id}`);if(!essays[e.id])errors.push(`Missing release essay ${e.id}`);if(!e.sources?.length)errors.push(`Missing release sources ${e.id}`);}}
 if(errors.length)throw new Error(errors.join('\n'));
 console.log(`Data OK: ${entries.length} entries, 30 years, 6 periods, ${Object.keys(assets).length} official images, ${Object.keys(essays).length} essays.`);
 if(release)console.log('Release coverage OK: every entry has an image, an expanded essay and a source entry. Rights clearance and field verification still require human review.');
 else console.log(`Coverage: ${Object.keys(assets).length}/120 images; ${Object.keys(essays).length}/120 expanded essays. Local review build; public rights review still required.`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{check(process.argv.includes('--release'));}catch(e){console.error(e.message);process.exitCode=1;}}
