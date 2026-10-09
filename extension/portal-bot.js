// The model chooses only IDs from this read-only navigation allowlist, never code or coordinates.
export async function portalBot(action,payload={}){
 try{
  if(location.origin!=='https://coach.mastersunion.org'||location.pathname!=='/courses')throw Error('Open the university Courses page first.');
  const term=String(payload.term),code=String(payload.code||'').trim().toUpperCase();
  if(!/^\d$/.test(term)||!/^[-A-Z0-9/]{2,80}$/.test(code))throw Error('Choose a term and subject code.');
  const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[aria-hidden="true"]');
  const all=s=>[...document.querySelectorAll(s)].filter(visible);
  const label=e=>e.textContent.replace(/Current/g,'').replace(/\s+/g,' ').trim();
  const selected=label(document.querySelector('#termFilter .selectedOption')||{textContent:''});
  const entries=[];
  for(const e of all('#termFilter .selectedOption'))entries.push({element:e,kind:'open-term',label:label(e)});
  for(const e of all('#termFilter label'))if(label(e)==='Term '+term)entries.push({element:e,kind:'select-term',label:label(e)});
  if(selected==='Term '+term)for(const e of all('a[href]')){let u;try{u=new URL(e.href)}catch{continue}if(u.origin===location.origin&&u.pathname==='/academics-detail'&&u.searchParams.get('courseCode')?.toUpperCase()===code&&u.searchParams.get('termCourseId'))entries.push({element:e,kind:'course',label:label(e).slice(0,240),url:u.href});}
  const candidates=entries.map((e,id)=>({id,kind:e.kind,label:e.label}));
  if(action==='bot-observe')return {selectedTerm:selected,candidates};
  const target=entries[payload.id];if(!target||target.label!==payload.label||target.kind!==payload.kind)throw Error('The page changed. Read it again before acting.');
  if(target.kind==='course')return {course:{id:new URL(target.url).searchParams.get('termCourseId'),code,name:target.label,url:target.url}};
  const before=all('a[href]').map(e=>e.href).join('|');target.element.click();
  if(target.kind==='select-term'){let changed=false;for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,250));const after=all('a[href]').map(e=>e.href).join('|');if(after&&after!==before){changed=true;break;}}if(!changed)throw Error('Course list has not refreshed after term selection. Retry.');}
  else await new Promise(r=>setTimeout(r,350));return {acted:target.kind};
 }catch(e){return {error:e.message};}
}
