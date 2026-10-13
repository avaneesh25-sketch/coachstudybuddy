export function youtubeUrl(raw){try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;let id;if(u.hostname==='youtu.be')id=u.pathname.slice(1);else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)){if(u.pathname==='/watch')id=u.searchParams.get('v');else id=u.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];}return /^[A-Za-z0-9_-]{11}$/.test(id||'')?'https://www.youtube.com/watch?v='+id:null}catch{return null}}
export function documentLink(raw){try{const video=youtubeUrl(raw);if(video)return video;const u=new URL(raw);return u.origin==='https://cdn.filestackcontent.com'&&!u.search&&!u.hash&&/^\/[A-Za-z0-9]{16,64}$/.test(u.pathname)?u.href:null}catch{return null}}
// Click only the observed material title in the selected session's panel.
export function openResourceCard(title,lectureTitle){
 const headings=[...document.querySelectorAll('p.session-name')].filter(e=>e.getClientRects().length&&e.textContent.trim()===lectureTitle);
 let panel=headings[0]?.parentElement;
 for(let i=0;i<5&&panel&&!panel.querySelector('.resourcesBlockContent.clickable');i++)panel=panel.parentElement;
 if(!panel||panel===document.body||panel===document.documentElement)return {error:'Open the selected session panel first.'};
 const cards=[...(panel?.querySelectorAll('.resourcesBlockContent.clickable')||[])].filter(e=>e.getClientRects().length&&e.querySelector('.resourceTitle')?.textContent.trim()===title);
 if(cards.length!==1)return {error:'The selected pre-read card could not be identified. Open it in the portal and retry.'};
 const titleElement=cards[0].querySelector('.resourceTitle');
 if(!titleElement)return {error:'The document title is unavailable.'};
 titleElement.click();return {opened:true};
}
export async function resolveResourceCard(api,tabId,card,lectureTitle){
 let found;const created=new Set();
 const observe=t=>{if(t.openerTabId===tabId){created.add(t.id);const url=documentLink(t.url)||documentLink(t.pendingUrl);if(url)found={id:t.id,url}}};
 const updated=(id,change,t)=>{if(created.has(id))observe({...t,openerTabId:tabId,url:change.url||t.url})};
 // noopener/new-window links may omit tabs.openerTabId. The navigation event
 // identifies the source without guessing from whichever tab appeared last.
 const navigation=details=>{if(details.sourceTabId===tabId)observe({id:details.tabId,openerTabId:tabId,url:details.url})};
 api.tabs.onCreated.addListener(observe);api.tabs.onUpdated.addListener(updated);
 api.webNavigation?.onCreatedNavigationTarget.addListener(navigation);
 try{const [{result}]=await api.scripting.executeScript({target:{tabId},func:openResourceCard,args:[card.name,lectureTitle]});if(result?.error)throw Error(result.error);
  for(let i=0;i<40&&!found;i++)await new Promise(r=>setTimeout(r,200));
  if(!found)throw Error('The connector could not confirm this card’s document tab. If no tab opened, allow pop-ups for the university portal and retry. If a PDF tab did open, update/reload the connector and check its permissions.');
  return {...card,url:found.url,...(youtubeUrl(found.url)?{kind:'youtube'}:{})};
 }finally{api.tabs.onCreated.removeListener(observe);api.tabs.onUpdated.removeListener(updated);api.webNavigation?.onCreatedNavigationTarget.removeListener(navigation)}
}
