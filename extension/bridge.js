// Runs only on the app origins declared in manifest.json.
window.addEventListener('message',async event=>{
 if(event.source!==window||event.origin!==location.origin)return;
 const m=event.data;if(m?.channel!=='coachstudybuddy:request'||!['ping','login','courses','lectures','materials','transcript'].includes(m.action)||typeof m.id!=='string')return;
 try{const response=await chrome.runtime.sendMessage({action:m.action,payload:m.payload});window.postMessage({channel:'coachstudybuddy:response',id:m.id,...response},location.origin)}catch{window.postMessage({channel:'coachstudybuddy:response',id:m.id,error:'Connector unavailable. Reload the app after installing or updating it.'},location.origin)}
});
