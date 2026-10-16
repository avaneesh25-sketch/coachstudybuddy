export function portalSessionRequest(action,host=window){
 return new Promise((resolve,reject)=>{
  const id=crypto.randomUUID();
  const cleanup=()=>{clearTimeout(timer);host.removeEventListener('message',listen);};
  function listen(e){if(e.source!==host||e.origin!==host.location.origin||e.data?.channel!=='coachstudybuddy:response'||e.data.id!==id)return;cleanup();e.data.error?reject(Error(e.data.error)):resolve(e.data.data);}
  const timer=setTimeout(()=>{cleanup();reject(Error('Install connector v0.15 in Chrome or Edge, then reload this page.'));},4000);
  host.addEventListener('message',listen);
  host.postMessage({channel:'coachstudybuddy:request',id,action},host.location.origin);
 });
}
