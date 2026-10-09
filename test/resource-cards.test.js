import test from 'node:test';
import assert from 'node:assert/strict';
import {documentLink,resolveResourceCard} from '../extension/resource-cards.js';
import {downloadLibraryFile} from '../lib/github-library.js';
import {extractDocument,documentExtension} from '../lib/materials.js';
import {zipSync,strToU8} from 'fflate';
test('EPUB follows declared reading order and refuses encrypted books',async()=>{
 const files={mimetype:strToU8('application/epub+zip'),'book/content.opf':strToU8('<package><manifest><item id="a" href="a.xhtml"/><item id="b" href="b.xhtml"/></manifest><spine><itemref idref="b"/><itemref idref="a"/></spine></package>'),'book/a.xhtml':strToU8('<html><body>First</body></html>'),'book/b.xhtml':strToU8('<html><body>Second<script>ignore</script></body></html>')};
 const bytes=Buffer.from(zipSync(files));assert.equal(documentExtension(bytes),'epub');const doc=await extractDocument(bytes,'Book');assert.deepEqual(doc.pages.map(p=>p.text),['Second','First']);
 files['META-INF/encryption.xml']=strToU8('<encryption/>');await assert.rejects(extractDocument(Buffer.from(zipSync(files))),/Encrypted/);
});
test('resource resolver accepts only normal official document destinations',()=>{
 assert.equal(documentLink('https://cdn.filestackcontent.com/ABCDEFGHIJKLMNOPQRST'),'https://cdn.filestackcontent.com/ABCDEFGHIJKLMNOPQRST');
 for(const url of ['https://evil.test/ABCDEFGHIJKLMNOPQRST','https://cdn.filestackcontent.com/ABCDEFGHIJKLMNOPQRST?secret=x','http://localhost/x'])assert.equal(documentLink(url),null);
});
test('resource card resolver ignores other tabs and removes only the document it opened',async()=>{
 let created,updated;const removed=[];const api={tabs:{onCreated:{addListener:f=>created=f,removeListener:f=>{assert.equal(f,created)}},onUpdated:{addListener:f=>updated=f,removeListener:f=>assert.equal(f,updated)},remove:async id=>removed.push(id)},scripting:{executeScript:async()=>{created({id:4,openerTabId:999,url:'https://cdn.filestackcontent.com/ZZZZZZZZZZZZZZZZZZZZ'});created({id:5,openerTabId:2,url:'about:blank'});updated(5,{url:'https://cdn.filestackcontent.com/ABCDEFGHIJKLMNOPQRST'},{id:5});return [{result:{opened:true}}]}}};
 const result=await resolveResourceCard(api,2,{name:'Pre-read'},'Session 2: Topic');assert.equal(result.url,'https://cdn.filestackcontent.com/ABCDEFGHIJKLMNOPQRST');assert.deepEqual(removed,[5]);
});
test('library downloads authenticate private repo and never expose raw download URLs',async()=>{
 const calls=[];const fake=async url=>{calls.push(url);return Response.json(url.includes('/contents/')?{type:'file',size:5,sha:'abc'}:url.includes('/git/blobs/')?{encoding:'base64',size:5,content:Buffer.from('%PDF-').toString('base64')}:{private:true,permissions:{push:true},default_branch:'main'})};
 const r=await downloadLibraryFile('token','owner/repo','Term 2/Business Strategy (MAST7204)/Session 1 - Strategy/summary.pdf',fake);assert.equal(r.bytes.toString(),'%PDF-');assert.equal(r.name,'summary.pdf');assert.equal(calls.length,3);
 await assert.rejects(downloadLibraryFile('token','owner/repo','Term 2/../Session 1/summary.pdf',fake));
 await assert.rejects(downloadLibraryFile('token','owner/repo','Term 2/Subject/Session 1/summary.pdf',async()=>Response.json({private:false,permissions:{push:true}})),/private/);
});
