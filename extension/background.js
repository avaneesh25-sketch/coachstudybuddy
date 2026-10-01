import {portalAction} from './portal-reader.js';
import {officialTranscript} from './transcript-reader.js';
const appOrigins=new Set(['https://coachstudybuddy.vercel.app','http://127.0.0.1:3001','http://localhost:3001']);
let working=false;
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 let origin;try{origin=new URL(sender.url).origin}catch{return}
 if(!appOrigins.has(origin))return;
 if(message.action==='ping'){reply({data:{version:'0.4.0'}});return}
 if(!['login','courses','lectures','materials','transcript'].includes(message.action))return;
 if(working){reply({error:'A portal search is already running. Wait for it to finish.'});return}
 working=true;run(message).then(data=>reply({data})).catch(e=>reply({error:e.message||'Portal search failed.'})).finally(()=>{working=false});return true;
});
async function run({action,payload={}}){
 const tabs=await chrome.tabs.query({url:'https://coach.mastersunion.org/*'});
 let tab=tabs.find(t=>t.active)||tabs[0];
 if(action==='login'){if(tab)await chrome.tabs.update(tab.id,{active:true});else tab=await chrome.tabs.create({url:'https://coach.mastersunion.org/courses',active:true});return {opened:true}}
 if(action==='transcript'){if(!tab)throw Error('Open your lecture recording in the university portal first.');const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:officialTranscript,args:[payload]});if(result?.error)throw Error(result.error);return result;}
 let url='https://coach.mastersunion.org/courses';
 if(action!=='courses'){const u=new URL(payload.courseUrl);if(u.origin!=='https://coach.mastersunion.org'||u.pathname!=='/academics-detail'||!u.searchParams.get('courseCode')||!u.searchParams.get('termCourseId'))throw Error('Select a course found in your portal.');url=u.href}
 if(!tab)tab=await chrome.tabs.create({url,active:true});else if(tab.url!==url)await chrome.tabs.update(tab.id,{url});
 for(let i=0;i<40;i++){const current=await chrome.tabs.get(tab.id);if(current.status==='complete'){if(/\/login|\/auth|\/sso/i.test(current.url))throw Error('Sign in on the university portal, then return here and search again.');break}await new Promise(r=>setTimeout(r,250))}
 const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:portalAction,args:[action,payload]});
 if(result?.error)throw Error(result.error);if(!result)throw Error('Could not read the portal. Sign in and try again.');return result;
}
