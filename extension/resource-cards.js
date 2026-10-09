export function documentLink(raw){try{const u=new URL(raw);return u.origin==='https://cdn.filestackcontent.com'&&!u.search&&!u.hash&&/^\/[A-Za-z0-9]{16,64}$/.test(u.pathname)?u.href:null}catch{return null}}
// Click only the observed material title in the selected session's panel.
export function openResourceCard(title,lectureTitle){
 const headings=[...document.querySelectorAll('p.session-name')].filter(e=>e.getClientRects().length&&e.textContent.trim()===lectureTitle);
 let panel=headings[0]?.parentElement;
 for(let i=0;i<5&&panel&&!panel.querySelector('.resourcesBlockContent.clickable');i++)panel=panel.parentElement;
 if(!panel||panel===document.body||panel===document.documentElement)return {error:'Open the selected session panel first.'};
 const cards=[...(panel?.querySelectorAll('.resourcesBlockContent.clickable')||[])].filter(e=>e.getClientRects().length&&e.querySelector('.resourceTitle')?.textContent.trim()===title);
 if(cards.length!==1)return {error:'The selected pre-read card could not be identified. Open it in the portal and retry.'};
 cards[0].click();return {opened:true};
}
export async function resolveResourceCard(api,tabId,card,lectureTitle){
 let found;const created=new Set();
 const observe=t=>{if(t.openerTabId===tabId){created.add(t.id);const url=documentLink(t.url||t.pendingUrl);if(url)found={id:t.id,url}}};
 const updated=(id,change,t)=>{if(created.has(id))observe({...t,openerTabId:tabId,url:change.url||t.url})};
 api.tabs.onCreated.addListener(observe);api.tabs.onUpdated.addListener(updated);
 try{const [{result}]=await api.scripting.executeScript({target:{tabId},func:openResourceCard,args:[card.name,lectureTitle]});if(result?.error)throw Error(result.error);
  for(let i=0;i<24&&!found;i++)await new Promise(r=>setTimeout(r,200));
  if(!found)throw Error('The card did not open a supported PDF/PPTX/e-book link. Open it in the portal to check access.');
  await api.tabs.remove(found.id);return {...card,url:found.url};
 }finally{api.tabs.onCreated.removeListener(observe);api.tabs.onUpdated.removeListener(updated)}
}
