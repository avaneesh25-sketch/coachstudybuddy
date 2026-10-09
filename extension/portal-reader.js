// Only visible page content is read. No cookies, tokens, private APIs or framework state.
export async function portalAction(action,payload){
 try{
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[aria-hidden="true"]');
 const all=(selector,root=document)=>[...root.querySelectorAll(selector)].filter(visible);
 const wait=async fn=>{for(let i=0;i<40;i++){const value=fn();if(value)return value;await new Promise(r=>setTimeout(r,250))}return null};
 if(location.origin!=='https://coach.mastersunion.org')throw Error('Sign in to the university portal first.');
 if(action==='courses'||action==='open-term'){
  if(payload.term!==undefined){
   const term=String(payload.term);if(!/^\d$/.test(term))throw Error('Choose a valid term.');
   const selected=()=>document.querySelector('#termFilter .selectedOption')?.textContent.trim().replace(/\s+/g,' ');
   if(selected()!=='Term '+term){
    const control=await wait(()=>all('#termFilter .selectedOption')[0]);
    if(!control)throw Error('Portal reachable, but its term dropdown was not found. Try AI-assisted search.');
    control.click();
    const choice=await wait(()=>all('#termFilter label').find(e=>e.textContent.trim().replace(/Current/g,'').replace(/\s+/g,' ').trim()==='Term '+term));
    if(!choice)throw Error('Term '+term+' is not available in this account.');
    const before=all('a[href]').map(e=>e.href).join('|');
    choice.click();
    if(!await wait(()=>selected()==='Term '+term))throw Error('The portal did not confirm Term '+term+'.');
    if(!await wait(()=>{const after=all('a[href]').map(e=>e.href).join('|');return after&&after!==before;}))throw Error('The term changed but courses have not refreshed. Wait and retry.');
   }

  }

  if(action==='open-term')return {opened:true,term:payload.term};
  const links=await wait(()=>{const a=all('a[href]').filter(a=>{try{const u=new URL(a.href);return u.origin===location.origin&&u.pathname==='/academics-detail'}catch{return false}});return a.length?a:null});
  if(!links)throw Error('No courses visible. Complete university sign-in and dismiss any portal prompt, then search again.');
  const code=String(payload.code||'').trim().toUpperCase();
  const courses=links.map(a=>{const u=new URL(a.href);return {id:u.searchParams.get('termCourseId'),code:u.searchParams.get('courseCode'),name:a.innerText.trim().replace(/\s+/g,' ').slice(0,240),url:u.href}}).filter(c=>c.id&&c.code?.toUpperCase()===code);
  return {courses:[...new Map(courses.map(c=>[c.id,c])).values()]};
 }
 const labels=await wait(()=>{const found=all('p.name').filter(e=>/^Session\s+\d+\s*:/i.test(e.textContent.trim()));return found.length?found:null});
 if(!labels)throw Error('No lecture list visible. Open Sessions in the course and try again.');
 const listLabels=labels.filter(e=>e.closest('.flex-cont'));
 const lectureLabels=listLabels.length?listLabels:labels;
 const lectures=lectureLabels.map(e=>({id:e.textContent.trim().match(/^Session\s+(\d+)/i)[1],title:e.textContent.trim(),date:e.parentElement.querySelector('.date')?.textContent.trim()||''}));
 if(action==='lectures')return {lectures:[...new Map(lectures.map(l=>[l.id,l])).values()]};
 const matches=labels.filter(e=>e.textContent.trim().match(/^Session\s+(\d+)/i)[1]===String(payload.lectureId));
 const chosen=matches.find(e=>e.closest('.flex-cont'))||matches[0];if(!chosen)throw Error('The selected lecture is no longer visible. Refresh the lecture list.');
 const header=chosen.closest('.flex-cont');const card=header?.parentElement;if(!card)throw Error('The selected session card could not be located. Transcript download is separate: use Import official transcript from open player.');
 if(!all('div.view',card).length){header.click();await wait(()=>all('div.view',card).length)}
 const view=all('div.view',card).find(e=>e.textContent.trim()==='View All');if(view)view.click();
 const materialHeading=await wait(()=>all('h1,h2,h3,h4,h5').find(e=>/^Materials$/i.test(e.textContent.trim())));
 const scopes=[{root:card,category:'Lecture materials'}];
 if(materialHeading){let root=materialHeading.parentElement;for(let i=0;i<3&&root.parentElement;i++){if(root.querySelector('a[href]'))break;if(root.parentElement.textContent.length>20000)break;root=root.parentElement}scopes.push({root,category:'Materials'})}
 // Open only named read-only resource sections. Never assignments, feedback or submissions.
 for(const label of ['Pre-Read','Pre - Read Material','Resources']){
  const control=all('button,[role="tab"],h4',card).find(e=>e.textContent.trim()===label);
  if(control){control.click();await new Promise(r=>setTimeout(r,350))}
 }
 // Course resources are included only when their section explicitly names this session.
 for(const h of all('h3,h4,h5').filter(e=>/^(Resources|Pre\s*-?\s*Reads?|Materials)$/i.test(e.textContent.trim()))){const root=h.parentElement;if(new RegExp('Session\\s+'+String(payload.lectureId)+'\\s*:','i').test(root.innerText))scopes.push({root,category:h.textContent.trim()})}
 const preRead=all('div,span,a',card).find(e=>e.children.length===0&&/^\(?\s*Click to View\s*\)?$/i.test(e.textContent.trim()));if(preRead){preRead.click();await new Promise(r=>setTimeout(r,500));for(const h of all('h2,h3,h4,h5').filter(e=>/^Pre\s*-?\s*Read(?: Material)?$/i.test(e.textContent.trim()))){let root=h.parentElement;for(let i=0;i<2&&root.parentElement&&!root.querySelector('a[href]');i++)root=root.parentElement;scopes.push({root,category:'Pre-read'})}}
 const panelBody=materialHeading?.closest('.body');
 const panelTitle=panelBody?.parentElement?.querySelector('p.session-name')?.textContent.trim();
 const cards=panelTitle===chosen.textContent.trim()?all('.resourcesBlockContent.clickable',panelBody).map(e=>({name:e.querySelector('.resourceTitle')?.textContent.trim(),category:'Pre-read'})).filter(e=>e.name):[];
 const materials=[],unsupported=[];
 for(const {root,category}of scopes)for(const a of all('a[href]',root)){let u;try{u=new URL(a.href)}catch{continue}if(!['https:','http:'].includes(u.protocol)||u.origin===location.origin)continue;const name=(a.innerText||a.title||'Course document').trim();if(!name||/^mailto:/.test(a.href))continue;
 if(u.origin==='https://cdn.filestackcontent.com'&&!u.search&&!u.hash&&/^\/[A-Za-z0-9]{16,64}$/.test(u.pathname))materials.push({name,url:u.href,category});else if(/pdf|ppt|read|case|material|resource/i.test(name))unsupported.push({name,category})}
 const unique=[...new Map(materials.map(m=>[m.url,m])).values()].slice(0,20);
 return {materials:unique,cards,unsupported,lecture:lectures.find(l=>l.id===String(payload.lectureId)),warning:unique.length?'Only accessible document links are imported. Interactive cards and protected files may require opening in the portal.':'The lecture opened, but no supported document links were visible. Open Materials or Pre-Read in the portal, then retry. No files were uploaded or restrictions bypassed.'};
 }catch(e){return {error:e.message||'Unable to inspect this portal page.'}}
}
