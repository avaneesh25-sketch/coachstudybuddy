// Uses the official visible download control; never reads player streams or private API state.
export async function officialTranscript(payload){
 try{
 const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[aria-hidden="true"]');
 const controls=[...document.querySelectorAll('button,a,[role="button"],div,span')].filter(visible);
 const button=controls.find(e=>/^Download Transcript$/i.test(e.textContent.trim())&&e.children.length<3);
 if(!button)throw Error('Open the selected recording and its Download Transcript option in the university tab, then retry.');
 const title=String(payload.title||'').trim();
 let player=button.closest('dialog,[role="dialog"]');if(!player){let parent=button.parentElement;while(parent&&parent!==document.body){if(parent.querySelector('video,iframe')&&parent.innerText.toLowerCase().includes(title.toLowerCase())){player=parent;break}parent=parent.parentElement}}
 if(!title||!player||!player.innerText.toLowerCase().includes(title.toLowerCase()))throw Error('The open player could not be matched to this session. Open the selected session recording first.');
 const safe=a=>{try{const u=new URL(a.href,location.href);return u.protocol==='blob:'&&u.origin===location.origin||u.protocol==='https:'&&(u.origin===location.origin||u.origin==='https://cdn.filestackcontent.com')}catch{return false}};
 const read=async a=>{if(!safe(a))throw Error('The official download uses an unsupported file host. Choose the downloaded transcript in the app.');const r=await fetch(a.href,{credentials:new URL(a.href,location.href).origin===location.origin?'same-origin':'omit',redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('The official transcript could not be downloaded.');const reader=r.body.getReader(),parts=[];let length=0;try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>750000){await reader.cancel();throw Error('Transcript exceeds the 750 KB import limit.')}parts.push(value)}}finally{reader.releaseLock()}return new Blob(parts).text()};
 if(button.tagName==='A'&&button.href&&safe(button))return {text:await read(button)};
 return await new Promise(resolve=>{
  let finished=false;const finish=value=>{if(finished)return;finished=true;observer.disconnect();clearTimeout(timer);resolve(value)};
  const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;const anchors=[...(node.matches('a[href]')?[node]:[]),...node.querySelectorAll('a[href]')];for(const a of anchors)if(a.hasAttribute('download')&&/transcript|\.(txt|srt|vtt|json)$/i.test(a.download||a.textContent)){read(a).then(text=>finish({text})).catch(e=>finish({error:e.message}));return}}});
  const timer=setTimeout(()=>finish({error:'The official download was requested, but its file was not exposed to the connector. Select the downloaded transcript in the app.'}),12000);
  observer.observe(document.body,{childList:true,subtree:true});button.click();
 });
 }catch(e){return {error:e.message||'The official transcript could not be read.'}}
}
