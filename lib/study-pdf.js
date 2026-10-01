import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {validateNotes} from './notes.js';
import {citationLabel} from './library.js';
import {InputError} from './http.js';
export async function studyPdf(pack){
 if(!pack?.transcript?.segments||!Array.isArray(pack.materials))throw new InputError('Add transcript and materials first.');
 validateNotes(pack.notes,pack.materials,pack.transcript.segments);
 const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.12,.12,.13),gold=rgb(.63,.43,.08);let page,y;
 const clean=t=>String(t||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/[^\x20-\x7e\n]/g,'?');
 function newPage(){page=pdf.addPage([595.28,841.89]);y=763;page.drawRectangle({x:0,y:820,width:596,height:22,color:ink});page.drawText('COACHSTUDYBUDDY / SESSION SUMMARY',{x:48,y:796,size:9,font:bold,color:gold})}
 function write(text,size=11,font=regular,color=ink){
  const width=499,lineHeight=size*1.48;
  for(const paragraph of clean(text).split('\n')){let line='';const words=paragraph.split(/\s+/);const lines=[];
   for(let word of words){while(font.widthOfTextAtSize(word,size)>width){let cut=word.length-1;while(font.widthOfTextAtSize(word.slice(0,cut),size)>width)cut--;if(line){lines.push(line);line=''}lines.push(word.slice(0,cut));word=word.slice(cut)}if(font.widthOfTextAtSize(line+' '+word,size)>width){lines.push(line);line=word}else line+=(line?' ':'')+word}lines.push(line);
   for(const value of lines){if(y-lineHeight<60)newPage();page.drawText(value,{x:48,y,size,font,color});y-=lineHeight}y-=5;
  }
 }
 newPage();write(pack.lecture?.title||'Session summary',23,bold);write([pack.lecture?.term,pack.lecture?.course].filter(Boolean).join(' / '),11,bold,gold);write('AI-generated study notes. Review claims against the cited sources.',9);y-=10;
 for(const section of pack.notes.sections){if(y<145)newPage();write(section.kind.toUpperCase(),8,bold,gold);write(section.heading,15,bold);write(section.text);write(section.sources.map(id=>citationLabel(id,pack)).join(' | '),8);y-=12}
 write('Coverage and limitations',15,bold);for(const limitation of pack.notes.limitations)write('- '+limitation,10);write(pack.transcript.clock||'Transcript coverage has not been independently verified.',9);write('Extracted text does not include visual interpretation of diagrams. Teaching-style observations describe supplied evidence only. Unsupported characters in this PDF appear as ?; retain the JSON study pack for original text.',9);
 const pages=pdf.getPages();pages.forEach((p,i)=>p.drawText(`${i+1} / ${pages.length}`,{x:490,y:32,font:regular,size:9,color:ink}));return Buffer.from(await pdf.save());
}
