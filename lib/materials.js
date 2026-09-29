import {createHash} from 'node:crypto';
import {getDocumentProxy,extractText} from 'unpdf';
import {unzipSync,strFromU8} from 'fflate';
import {XMLParser} from 'fast-xml-parser';
import {InputError,readLimited} from './http.js';
export function allowedDocumentUrl(raw){try{const u=new URL(raw);return u.protocol==='https:'&&u.hostname==='cdn.filestackcontent.com'&&!u.port&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/[A-Za-z0-9]{16,64}$/.test(u.pathname)}catch{return false}}
export async function fetchDocument(url,fetcher=fetch){if(!allowedDocumentUrl(url))throw new InputError('This link is not a supported course document. Use the portal’s normal document link or the file fallback.');const r=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(20000),credentials:'omit'});if(!r.ok)throw new InputError('The document could not be accessed normally. Open it in the portal; no access controls were bypassed.',422);return readLimited(r.body,10*1024*1024)}
export async function extractDocument(buffer,name='Course material'){
 if(!buffer.length||buffer.length>10*1024*1024)throw new InputError('Documents must be under 10 MB.');let pages;
 if(buffer.subarray(0,5).toString()==='%PDF-'){
  const pdf=await getDocumentProxy(new Uint8Array(buffer),{isEvalSupported:false});try{if(pdf.numPages>150)throw new InputError('Use a document with 150 pages or fewer.');const result=await extractText(pdf,{mergePages:false});pages=result.text.map((text,i)=>({number:i+1,text}));}finally{await pdf.loadingTask.destroy()}
 }else if(buffer[0]===80&&buffer[1]===75){
  let expanded=0;const zip=unzipSync(new Uint8Array(buffer),{filter:file=>{expanded+=file.originalSize;if(expanded>30*1024*1024||file.originalSize>5*1024*1024)throw new InputError('PowerPoint archive is too large after extraction.');return /^ppt\/slides\/slide\d+\.xml$/.test(file.name)}});
  const names=Object.keys(zip).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));if(!names.length||names.length>150)throw new InputError('Use a PPTX with 1–150 slides.');
  const parser=new XMLParser({ignoreAttributes:true,processEntities:false});pages=names.map((n,i)=>{const xml=strFromU8(zip[n]);if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new InputError('Unsupported XML in presentation.');const values=[];function walk(v){if(!v||typeof v!=='object')return;for(const [k,item]of Object.entries(v)){if(k==='a:t')values.push(...(Array.isArray(item)?item:[item]).map(String));else if(Array.isArray(item))item.forEach(walk);else walk(item)}}walk(parser.parse(xml));return {number:i+1,text:values.join('\n')}});
 }else throw new InputError('Only PDF and PPTX documents are supported.');
 if(pages.reduce((n,p)=>n+p.text.length,0)>180000)throw new InputError('Document text exceeds this pilot’s limit.');
 return {id:createHash('sha256').update(buffer).digest('hex').slice(0,16),name:String(name).slice(0,160),pages,warnings:pages.some(p=>!p.text.trim())?['Some pages have no extractable text. Images and diagrams require visual review.']:['Text extraction does not interpret diagrams or preserve all layout.']};
}

