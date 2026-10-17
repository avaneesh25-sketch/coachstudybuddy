import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {validateNotes} from './notes.js';
import {citationLabel} from './library.js';
import {InputError} from './http.js';
export async function studyPdf(pack){
 if(!pack?.transcript?.segments||!Array.isArray(pack.materials))throw new InputError('Add transcript and materials first.');
 const notes=validateNotes(pack.notes,pack.materials,pack.transcript.segments);
 const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.12,.12,.13),gold=rgb(.63,.43,.08);let page,y;
 const clean=t=>String(t||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/[·•]/g,'-').replace(/[^\x20-\x7e\n]/g,'?');
 function newPage(){page=pdf.addPage([595.28,841.89]);y=763;page.drawRectangle({x:0,y:820,width:596,height:22,color:ink});page.drawText('COACHSTUDYBUDDY / SESSION WALKTHROUGH',{x:48,y:796,size:9,font:bold,color:gold})}
 function write(text,size=11,font=regular,color=ink){
  const width=499,lineHeight=size*1.48;
  for(const paragraph of clean(text).split('\n')){let line='';const words=paragraph.split(/\s+/);const lines=[];
   for(let word of words){while(font.widthOfTextAtSize(word,size)>width){let cut=word.length-1;while(font.widthOfTextAtSize(word.slice(0,cut),size)>width)cut--;if(line){lines.push(line);line=''}lines.push(word.slice(0,cut));word=word.slice(cut)}if(font.widthOfTextAtSize(line+' '+word,size)>width){lines.push(line);line=word}else line+=(line?' ':'')+word}lines.push(line);
   for(const value of lines){if(y-lineHeight<60)newPage();page.drawText(value,{x:48,y,size,font,color});y-=lineHeight}y-=5;
  }
 }
 newPage();write(pack.lecture?.title||'Session walkthrough',23,bold);write([pack.lecture?.term,pack.lecture?.subjectName,pack.lecture?.course].filter(Boolean).join(' / '),11,bold,gold);write('A guided walkthrough of the supplied lecture and resources. AI-generated; review claims against the cited sources.',10);y-=10;
 write('Sources included',16,bold);
 const time=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');
 const timed=pack.transcript.segments.filter(s=>Number.isFinite(s.start)&&Number.isFinite(s.end));
 write('Lecture transcript: '+pack.transcript.segments.length+' segments'+(timed.length?' / supplied timestamps '+time(Math.min(...timed.map(s=>s.start)))+' to '+time(Math.max(...timed.map(s=>s.end))):' / untimed')+'. Timestamp range does not establish continuous or complete coverage.',10);
 const cited=new Set(notes.sections.flatMap(s=>s.sources));
 for(const m of pack.materials){write(m.name,11,bold);write(m.pages.length+(m.kind==='youtube'?' video transcript section(s)':' extracted page(s)/slide(s)/chapter(s)')+' / '+(m.pages.some(p=>cited.has(`${m.id}:p${p.number}`))?'Cited in walkthrough':'Not cited - coverage unconfirmed'),9);if(m.sourceUrl)write(m.sourceUrl,8);for(const warning of m.warnings||[])write(warning,9);}
 if(!pack.materials.length)write('Transcript only. No pre-read, post-read, slide deck or video transcript was supplied.',10);
 write('Completeness check',13,bold);write('This guide covers supplied readable evidence, not a verified inventory of every course resource. Missing pages, inaccessible resources and videos without transcripts cannot be reconstructed. Consult the limitations at the end.',10);
 newPage();write('Walkthrough contents',19,bold);notes.sections.forEach((s,i)=>write((i+1)+'. '+s.heading,10));
 newPage();for(const [i,section] of notes.sections.entries()){if(y<145)newPage();write(section.kind.toUpperCase(),8,bold,gold);write((i+1)+'. '+section.heading,15,bold);write(section.text);write(section.sources.map(id=>citationLabel(id,pack)).join(' | '),8);y-=12}
 if(y<180)newPage();write('Coverage and limitations',15,bold);for(const limitation of notes.limitations)write('- '+limitation,10);write(pack.transcript.clock||'Transcript coverage has not been independently verified.',9);write('Extracted text does not include visual interpretation of diagrams. Teaching-style observations describe supplied evidence only. Unsupported characters in this PDF appear as ?; retain the JSON study pack for original text.',9);
 const pages=pdf.getPages();pages.forEach((p,i)=>p.drawText(`${i+1} / ${pages.length}`,{x:490,y:32,font:regular,size:9,color:ink}));return Buffer.from(await pdf.save());
}

