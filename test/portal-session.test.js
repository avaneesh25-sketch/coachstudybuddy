import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../extension/session-status.js',import.meta.url),'utf8').replace('export function','function');
function detect({path='/courses',links=[],sessions=[],password=false,origin='https://coach.mastersunion.org'}={}){
 const element=v=>({...v,getClientRects:()=>[1],closest:()=>null});
 const context={URL,location:{origin,pathname:path},getComputedStyle:()=>({visibility:'visible'}),document:{querySelectorAll:s=>s==='a[href]'?links.map(href=>element({href})):s==='p.name'?sessions.map(textContent=>element({textContent})):password?[element({})]:[]}};
 return vm.runInNewContext(source+';readPortalSession().signedIn',context);
}
test('login screen and empty page never unlock workspace',()=>{assert.equal(detect({password:true}),false);assert.equal(detect(),false);});
test('signed-in course list and session page open workspace',()=>{assert.equal(detect({links:['https://coach.mastersunion.org/academics-detail?courseCode=FIFI7202&termCourseId=example']}),true);assert.equal(detect({path:'/academics-detail',sessions:['Session 2: Finance']}),true);});
test('wrong origin and external course links are ignored',()=>{assert.equal(detect({origin:'https://example.com',sessions:['Session 1: Intro'],path:'/academics-detail'}),false);assert.equal(detect({links:['https://example.com/academics-detail?courseCode=X&termCourseId=Y']}),false);});
test('password screen wins over stale course links',()=>{assert.equal(detect({password:true,links:['https://coach.mastersunion.org/academics-detail?courseCode=X&termCourseId=Y']}),false);});
test('connector request ignores unrelated messages and cleans up after a matching response',async()=>{
 const {portalSessionRequest}=await import('../lib/connector-client.js');
 const listeners=new Set();let posted;
 const host={location:{origin:'https://coachstudybuddy.vercel.app'},addEventListener:(type,fn)=>listeners.add(fn),removeEventListener:(type,fn)=>listeners.delete(fn),postMessage:m=>{posted=m;}};
 const pending=portalSessionRequest('session-status',host);
 const reply={channel:'coachstudybuddy:response',id:posted.id,data:{signedIn:true}};
 for(const fn of listeners)fn({source:host,origin:'https://example.com',data:reply});
 assert.equal(listeners.size,1);
 for(const fn of listeners)fn({source:host,origin:host.location.origin,data:{...reply,id:'wrong'}});
 assert.equal(listeners.size,1);
 for(const fn of listeners)fn({source:host,origin:host.location.origin,data:reply});
 assert.equal((await pending).signedIn,true);
 assert.equal(listeners.size,0);
});
