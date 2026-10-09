import {createHash} from 'node:crypto';
import {getDocumentProxy,extractText} from 'unpdf';
import {unzipSync,strFromU8} from 'fflate';
import {XMLParser} from 'fast-xml-parser';
import {InputError,readLimited} from './http.js';
export function allowedDocumentUrl(raw){try{const u=new URL(raw);return u.protocol==='https:'&&u.hostname==='cdn.filestackcontent.com'&&!u.port&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/[A-Za-z0-9]{16,64}$/.test(u.pathname)}catch{return false}}
export async function fetchDocument(url,fetcher=fetch){if(!allowedDocumentUrl(url))throw new InputError('This link is not a supported course document. Use the portal’s normal document link or the file fallback.');const r=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(20000),credentials:'omit'});if(!r.ok)throw new InputError('The document could not be accessed normally. Open it in the portal; no access controls were bypassed.',422);return readLimited(r.body,10*1024*1024)}
export function documentExtension(buffer){
 if(buffer.subarray(0,5).toString()==='%PDF-')return 'pdf';
 let total=0;const entries=unzipSync(new Uint8Array(buffer),{filter:f=>{total+=f.originalSize;if(total>30*1024*1024)throw new InputError('Document archive is too large.');return f.name==='mimetype'||f.name==='ppt/presentation.xml'}});
 if(entries.mimetype&&strFromU8(entries.mimetype).trim()==='application/epub+zip')return 'epub';
 if(entries['ppt/presentation.xml'])return 'pptx';
 throw new InputError('Only PDF, PPTX and unprotected EPUB files can be archived.');
}
export async function extractDocument(buffer,name='Course material'){
 if(!buffer.length||buffer.length>10*1024*1024)throw new InputError('Documents must be under 10 MB.');let pages;
 if(buffer.subarray(0,5).toString()==='%PDF-'){
  const pdf=await getDocumentProxy(new Uint8Array(buffer),{isEvalSupported:false});try{if(pdf.numPages>150)throw new InputError('Use a document with 150 pages or fewer.');const result=await extractText(pdf,{mergePages:false});pages=result.text.map((text,i)=>({number:i+1,text}));}finally{await pdf.loadingTask.destroy()}
 }else if(buffer[0]===80&&buffer[1]===75){
  let expanded=0;const zip=unzipSync(new Uint8Array(buffer),{filter:file=>{expanded+=file.originalSize;if(expanded>30*1024*1024||file.originalSize>5*1024*1024)throw new InputError('Document archive is too large after extraction.');return /^ppt\/slides\/slide\d+\.xml$/.test(file.name)||file.name==='mimetype'||/\.(opf|xhtml|html)$/.test(file.name)||file.name==='META-INF/encryption.xml'}});
  if(zip.mimetype&&strFromU8(zip.mimetype).trim()==='application/epub+zip'){
   if(zip['META-INF/encryption.xml'])throw new InputError('Encrypted EPUB files must be read in their authorized reader.');
   const parser=new XMLParser({ignoreAttributes:false,processEntities:false});
   const opfName=Object.keys(zip).find(n=>n.endsWith('.opf'));if(!opfName)throw new InputError('EPUB reading order is missing.');
   const opf=parser.parse(strFromU8(zip[opfName])).package;const array=v=>Array.isArray(v)?v:v?[v]:[];
   const items=new Map(array(opf?.manifest?.item).map(i=>[i['@_id'],i['@_href']]));const order=array(opf?.spine?.itemref);if(!order.length||order.length>150)throw new InputError('Use an EPUB with at most 150 chapters.');
   pages=order.map((item,i)=>{const href=items.get(item['@_idref']);if(!href||/^[a-z]+:/i.test(href))throw new InputError('Unsupported EPUB chapter.');const path=new URL(href,'https://epub.local/'+opfName).pathname.slice(1);const raw=zip[decodeURIComponent(path)];if(!raw)throw new InputError('EPUB chapter is missing.');const html=strFromU8(raw);if(/<!ENTITY/i.test(html))throw new InputError('Unsupported EPUB entity.');const text=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();return {number:i+1,text}});
   if(pages.reduce((n,p)=>n+p.text.length,0)>180000)throw new InputError('E-book text exceeds this pilot’s limit.');
   return {id:createHash('sha256').update(buffer).digest('hex').slice(0,16),name:String(name).slice(0,160),pages,warnings:['EPUB references use chapter numbers. Images are not interpreted.']};
  }
  const names=Object.keys(zip).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));if(!names.length||names.length>150)throw new InputError('Use a PPTX with 1–150 slides.');
  const parser=new XMLParser({ignoreAttributes:true,processEntities:false});pages=names.map((n,i)=>{const xml=strFromU8(zip[n]);if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new InputError('Unsupported XML in presentation.');const values=[];function walk(v){if(!v||typeof v!=='object')return;for(const [k,item]of Object.entries(v)){if(k==='a:t')values.push(...(Array.isArray(item)?item:[item]).map(String));else if(Array.isArray(item))item.forEach(walk);else walk(item)}}walk(parser.parse(xml));return {number:i+1,text:values.join('\n')}});
 }else throw new InputError('Only PDF and PPTX documents are supported.');
 if(pages.reduce((n,p)=>n+p.text.length,0)>180000)throw new InputError('Document text exceeds this pilot’s limit.');
 return {id:createHash('sha256').update(buffer).digest('hex').slice(0,16),name:String(name).slice(0,160),pages,warnings:pages.some(p=>!p.text.trim())?['Some pages have no extractable text. Images and diagrams require visual review.']:['Text extraction does not interpret diagrams or preserve all layout.']};
}

