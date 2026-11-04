import {entries,periods,kinds,facets,assets} from '../lib/data';
const $=(s:string)=>document.querySelector<HTMLElement>(s)!;
let current=1996, pinned:number|null=null, hoverTimer:ReturnType<typeof setTimeout>;
let selected:string[]=[];
const axis=$('.year-axis');
const filter=document.querySelector<HTMLSelectElement>('#kind-filter')!;
const years=[...axis.querySelectorAll<HTMLButtonElement>('button')];
const validYear=(v:unknown)=>Number.isInteger(Number(v))&&Number(v)>=1996&&Number(v)<=2025;
function applyFilter(){
 const panel=$(`[data-panel="${current}"]`);let count=0;
 panel.querySelectorAll<HTMLElement>('.work-card').forEach(card=>{card.hidden=filter.value!=='all'&&card.dataset.kind!==filter.value;if(!card.hidden)count++});
 panel.querySelector<HTMLElement>('.empty-filter')!.hidden=count>0;
 $('#result-count').textContent=`本年 ${count} 件样本${filter.value==='all'?'':` · ${kinds[filter.value]}`}`;
 $('#year-announcement').textContent=`${current} 年，${$('#result-count').textContent}`;
}
function show(year:number,updateUrl=true){
 if(!validYear(year))return;current=year;
 document.querySelectorAll<HTMLElement>('[data-panel]').forEach(p=>p.hidden=Number(p.dataset.panel)!==year);
 const period=periods.find(p=>year>=p.range[0]&&year<=p.range[1])!;
 $('#active-year').textContent=String(year);$('#active-period').textContent=period.name;$('#active-code').textContent=`PERIOD ${period.id.slice(1).padStart(2,'0')}`;
 $('#year-state').textContent=pinned===year?'已固定 · 可悬停预览其他年份':pinned?'预览中 · 移出后回到固定年份':'悬停预览，点击固定年份';
 $('#unpin').hidden=pinned===null;
 years.forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.year)===year)));
 document.querySelectorAll<HTMLElement>('[data-period]').forEach(b=>b.classList.toggle('active',b.dataset.period===period.id));
 ($('#prev-year') as HTMLButtonElement).disabled=year===1996;($('#next-year') as HTMLButtonElement).disabled=year===2025;
 document.documentElement.style.setProperty('--current-accent',period.accent);
 if(updateUrl){const url=new URL(location.href);url.searchParams.set('year',String(year));if(filter.value==='all')url.searchParams.delete('kind');else url.searchParams.set('kind',filter.value);history.replaceState(null,'',url);}
 applyFilter();
}
function pin(y:number,focus=false){clearTimeout(hoverTimer);pinned=y;show(y);$('#year-announcement').textContent=`已固定 ${y} 年，${$('#result-count').textContent}`;const b=years.find(b=>Number(b.dataset.year)===y)!;if(focus)b.focus();b.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
document.querySelectorAll<HTMLButtonElement>('[data-year]').forEach(b=>{
 b.addEventListener('click',()=>pin(Number(b.dataset.year)));
 if(b.closest('.year-axis')){b.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>show(Number(b.dataset.year)),120)}});b.addEventListener('pointerleave',()=>clearTimeout(hoverTimer));}
});
axis.addEventListener('pointerleave',()=>{clearTimeout(hoverTimer);if(pinned!==null)show(pinned)});
axis.addEventListener('keydown',e=>{if(!(e instanceof KeyboardEvent))return;const keys:Record<string,number>={ArrowLeft:Math.max(1996,current-1),ArrowRight:Math.min(2025,current+1),Home:1996,End:2025};if(e.key in keys){e.preventDefault();pin(keys[e.key],true)}});
$('#prev-year').addEventListener('click',()=>pin(current-1));$('#next-year').addEventListener('click',()=>pin(current+1));
$('#unpin').addEventListener('click',()=>{pinned=null;show(current)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!($('#compare-dialog') as HTMLDialogElement).open){pinned=null;show(current)}});
filter.addEventListener('change',()=>show(current));document.querySelectorAll('[data-reset-filter]').forEach(b=>b.addEventListener('click',()=>{filter.value='all';show(current)}));
function restore(){const params=new URLSearchParams(location.search);filter.value=Object.hasOwn(kinds,params.get('kind')||'')?params.get('kind')!:'all';pinned=params.has('year')&&validYear(params.get('year'))?Number(params.get('year')):null;show(pinned??1996,false);}
restore();window.addEventListener('popstate',restore);
function updateTray(){
 $('#compare-tray').hidden=selected.length===0;
 $('#compare-count').textContent=selected.map(id=>entries.find(e=>e.id===id)!.zh).join(' / ')+`（${selected.length}/2）`;
 ($('#compare-open') as HTMLButtonElement).disabled=selected.length!==2;
 document.querySelectorAll<HTMLButtonElement>('[data-compare]').forEach(b=>{const active=selected.includes(b.dataset.compare!);b.textContent=active?'✓ 已加入':'＋ 对比';b.setAttribute('aria-pressed',String(active));b.disabled=selected.length===2&&!active});
}
document.querySelectorAll<HTMLButtonElement>('[data-compare]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.compare!;selected=selected.includes(id)?selected.filter(s=>s!==id):[...selected,id].slice(0,2);updateTray()}));
$('#compare-clear').addEventListener('click',()=>{selected=[];updateTray()});
$('#compare-open').addEventListener('click',()=>{
 const target=$('#compare-content');target.replaceChildren();
 selected.forEach(id=>{const e=entries.find(e=>e.id===id)!;const section=document.createElement('section');const a=assets[id];if(a){const img=document.createElement('img');img.src=a.src;img.alt=a.alt;section.append(img);const source=document.createElement('a');source.href=a.source;source.textContent=`公式图出处 ↗ · ${a.note}`;source.target='_blank';source.rel='noreferrer';section.append(source)}else{const p=document.createElement('p');p.className='notice';p.textContent='公式图待收录';section.append(p)}const title=document.createElement('h3');title.textContent=`${e.year} · ${e.zh}`;section.append(title);for(const text of [`观察维度：${facets[e.facet]}`,e.why,`角色设计 / 作者：${e.designer||e.creator||'待核'}`]){const p=document.createElement('p');p.textContent=text;section.append(p)}const link=document.createElement('a');link.href=`/works/${id}/`;link.textContent='阅读作品条目 ↗';section.append(link);target.append(section)});
 ($('#compare-dialog') as HTMLDialogElement).showModal();
});
