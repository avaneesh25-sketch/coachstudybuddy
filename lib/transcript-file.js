import {InputError} from './http.js';

const time = value => {
 const parts=value.replace(',','.').split(':').map(Number);
 if(parts.length<2||parts.length>3||parts.some(x=>!Number.isFinite(x)||x<0)||parts.at(-1)>=60||parts.at(-2)>=60&&parts.length===3)throw new InputError('Invalid transcript timestamp.');
 return parts.reduce((n,p)=>n*60+p,0);
};
export function parseTranscript(text){
 if(typeof text!=='string'||!text.trim()||text.length>750000)throw new InputError('Choose a nonempty transcript under 750 KB.');
 text=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 if(/^\s*<(?:!doctype|html)/i.test(text))throw new InputError('This is a login or web page, not a transcript.');
 let segments=[];
 if(/^\s*(?:\{|\[\s*\{)/.test(text)){
  let data;try{data=JSON.parse(text)}catch{throw new InputError('The transcript JSON is invalid.')}
  const rows=Array.isArray(data)?data:data.segments;
  if(!Array.isArray(rows))throw new InputError('Transcript JSON must contain segments.');
  segments=rows.map(s=>({start:s.start??null,end:s.end??null,text:s.text}));
 }else{
  const stamp='(?:\\d{1,3}:)?\\d{1,2}:\\d{2}(?:[.,]\\d{1,3})?';
  const cue=new RegExp('^('+stamp+')\\s*-->\\s*('+stamp+')[^\\n]*\\n([\\s\\S]*)$');
  for(const block of text.split(/\n\s*\n/)){
   const lines=block.trim().split('\n');if(/^\d+$/.test(lines[0]))lines.shift();
   const match=lines.join('\n').match(cue);
   if(match)segments.push({start:time(match[1]),end:time(match[2]),text:match[3].replace(/<[^>]*>/g,'').trim()});
  }
  if(!segments.length){
   if(text.includes('-->'))throw new InputError('Subtitle timestamps could not be read.');
   const marked=new RegExp('^\\[?('+stamp+')\\]?\\s+(.+)$');
   segments=text.split('\n').filter(x=>x.trim()).map(line=>{const m=line.match(marked);return m?{start:time(m[1]),end:null,text:m[2]}:{start:null,end:null,text:line.trim()}});
  }
 }
 if(!segments.length||segments.length>10000)throw new InputError('Transcript has no readable speech or too many segments.');
 for(const s of segments){if(typeof s.text!=='string'||!s.text.trim()||[s.start,s.end].some(t=>t!==null&&(!Number.isFinite(t)||t<0||t>86400))||s.end!==null&&(s.start===null||s.end<s.start))throw new InputError('Transcript contains invalid speech or timestamps.')}
 return {segments:segments.map((s,i)=>({...s,id:i+1,text:s.text.trim()})),origin:'official-file',clock:'Times are preserved from the supplied transcript. Missing timestamps remain untimed; completeness is not independently verified.'};
}
