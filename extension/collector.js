export function collectVisibleMaterials(){
 const allowed=raw=>{try{const u=new URL(raw);return u.origin==='https://cdn.filestackcontent.com'&&!u.search&&!u.hash&&/^\/[A-Za-z0-9]{16,64}$/.test(u.pathname)}catch{return false}};
 if(allowed(location.href))return {sourceUrl:location.href,title:document.title,course:'Course document',materials:[{url:location.href,name:document.title}],warning:'Document imported separately. Confirm it belongs to the lecture you are capturing.'};
 if(location.origin!=='https://coach.mastersunion.org'||location.pathname!=='/academics-detail')throw Error('Open a course lecture page or its document first.');
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[aria-hidden="true"]');
 const headings=[...document.querySelectorAll('h1,h2,h3,h4,h5')].filter(visible);
 const marker=headings.find(e=>e.textContent.trim()==='Materials');
 if(!marker)throw Error('Open the selected lecture’s Materials panel before importing.');
 let scope=marker.parentElement;for(let i=0;i<3&&scope?.parentElement;i++){if(scope.querySelector('a[href]'))break;const next=scope.parentElement;if(next.textContent.length>10000)break;scope=next}
 const materials=[...scope.querySelectorAll('a[href]')].filter(visible).filter(a=>allowed(a.href)).map(a=>({url:a.href,name:(a.innerText||a.getAttribute('title')||'Course material').trim()}));
 const unique=[...new Map(materials.map(m=>[m.url,m])).values()].slice(0,20);
 const course=headings.find(e=>e.tagName==='H4'&&!['Course Details','Details','Sessions','Resources','Assignment','Grades'].includes(e.textContent.trim()))?.textContent.trim()||'Selected course';
 const title=(scope.textContent.match(/Session\s+\d+\s*:[^\n]{1,180}/)||[])[0]||'Selected lecture';
 return {sourceUrl:location.href,course,title,materials:unique,warning:unique.length?'Confirm these visible materials belong to the selected lecture.':'No directly linked documents were found. Open a material normally in the portal, then import that document tab. Interactive cards are not bypassed.'};
}
