import test from 'node:test';import assert from 'node:assert/strict';import {portalAction} from '../extension/portal-reader.js';import {readFile} from 'node:fs/promises';
const visible={getClientRects:()=>[1],closest:()=>null};
async function dom(action,payload,elements){const old={document:globalThis.document,location:globalThis.location,getComputedStyle:globalThis.getComputedStyle};try{globalThis.location={origin:'https://coach.mastersunion.org'};globalThis.getComputedStyle=()=>({visibility:'visible'});globalThis.document={querySelectorAll:()=>elements};return await portalAction(action,payload)}finally{Object.assign(globalThis,old)}}
test('course search keeps duplicate subject codes distinct by term and excludes unrelated links',async()=>{const a=(id,code='MAST7204',host='coach.mastersunion.org')=>({...visible,href:`https://${host}/academics-detail?courseCode=${code}&termCourseId=${id}`,innerText:'Business Strategy'});const r=await dom('courses',{code:' mast7204 '},[a('term1'),a('term2'),a('term1'),a('other','OTHER'),a('evil','MAST7204','evil.example')]);assert.deepEqual(r.courses.map(c=>c.id),['term1','term2'])});
test('lecture choices come from actual visible session labels',async()=>{const e=(title)=>({...visible,textContent:title,parentElement:{querySelector:()=>({textContent:'15 Sep'})}});const r=await dom('lectures',{},[e('Session 1: Topic A'),e('Session 2: Topic B'),e('Unrelated note')]);assert.deepEqual(r.lectures.map(l=>l.id),['1','2']);assert.equal(r.lectures[0].date,'15 Sep')});
test('missing selected lecture fails without importing other session resources',async()=>{const r=await dom('materials',{lectureId:'9'},[{...visible,textContent:'Session 1: Topic A',parentElement:{querySelector:()=>null}}]);assert.match(r.error,/selected lecture/)});
test('course discovery works for unrelated codes, punctuation and duplicate codes',async()=>{
 const codes=['CEP-PM','CEP-FO/COS/Strategy','DTP7203','FIFI7202','SAMA7203','MAST7203','MAST7203',...Array.from({length:30},(_,i)=>'TEST-'+(1700+i*37))];
 const links=codes.map((code,i)=>({...visible,href:'https://coach.mastersunion.org/academics-detail?courseCode='+encodeURIComponent(code)+'&termCourseId=course'+i,innerText:'Subject '+i}));
 for(const code of new Set(codes)){const r=await dom('courses',{code:' '+code.toLowerCase()+' '},links);assert.equal(r.courses.length,codes.filter(c=>c===code).length);assert.ok(r.courses.every(c=>c.code===code));}
 assert.deepEqual((await dom('courses',{code:'NOT-ENROLLED'},links)).courses,[]);
});
test('extension bridge is restricted to the production and local app origins',async()=>{const m=JSON.parse((await readFile(new URL('../extension/manifest.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));assert.equal(m.version,'0.11.0');assert.equal(m.background.service_worker,'background.js');assert.ok(m.host_permissions.includes('https://coach.mastersunion.org/*'));assert.ok(!m.host_permissions.includes('<all_urls>'));assert.deepEqual(m.content_scripts[0].matches,['https://coachstudybuddy.vercel.app/*','http://127.0.0.1:3001/*','http://localhost:3001/*'])});

test('already-open detail heading does not shadow the matching session card',async()=>{
 const old={document:globalThis.document,location:globalThis.location,getComputedStyle:globalThis.getComputedStyle};let opened=false;
 const link={...visible,href:'https://cdn.filestackcontent.com/ABCDEFGHIJKLMNOPQRST',innerText:'Session 2 PDF'};
 const scope={querySelector:()=>link,querySelectorAll:s=>s==='a[href]'?[link]:[],textContent:'Session 2: Coke'};
 const heading={...visible,textContent:'Materials',parentElement:scope};
 const view={...visible,textContent:'View All',click(){opened=true}};
 const card={querySelectorAll:s=>s==='div.view'?[view]:[],textContent:'Session 2: Coke'};
 const header={parentElement:card,click(){}};
 const overlay={...visible,textContent:'Session 2: Coke',parentElement:{querySelector:()=>null}};
 const row={...visible,textContent:'Session 2: Coke',closest:s=>s==='.flex-cont'?header:null,parentElement:{querySelector:()=>({textContent:'17 Sep'})}};
 globalThis.location={origin:'https://coach.mastersunion.org'};globalThis.getComputedStyle=()=>({visibility:'visible'});
 globalThis.document={querySelectorAll:s=>s==='p.name'?[overlay,row]:s==='h1,h2,h3,h4,h5'?[heading]:[]};
 try{const result=await portalAction('materials',{lectureId:'2'});assert.equal(result.error,undefined);assert.ok(opened);assert.equal(result.materials[0].name,'Session 2 PDF');assert.equal(result.lecture.date,'17 Sep');}finally{Object.assign(globalThis,old)}
});
