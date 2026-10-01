import {InputError} from './http.js';
export function safeName(value){return String(value||'').normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/\.{2,}/g,' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'').slice(0,100)}
export function sessionPath(lecture){
 const term=safeName(lecture?.term),course=safeName(lecture?.course),id=String(lecture?.lectureId||'');
 if(!term||!course||!/^\d{1,3}$/.test(id))throw new InputError('Choose a term, subject and numbered session before saving.');
 const title=safeName(String(lecture.title||'').replace(/^Session\s+\d+\s*[:\-]?\s*/i,''));
 if(!title)throw new InputError('Add the session name.');
 return `${term}/${course}/Session ${Number(id)} - ${title}`;
}
export const timeLabel=n=>n===null||n===undefined?'Untimed':`${Math.floor(n/3600)?Math.floor(n/3600)+':':''}${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`;
export function citationLabel(id,pack){if(/^t\d+$/.test(id)){const s=pack.transcript.segments.find(x=>`t${x.id}`===id);return s?`Transcript ${timeLabel(s.start)}${s.end===null?'':' - '+timeLabel(s.end)} (${id})`:id}for(const m of pack.materials){const p=m.pages.find(p=>`${m.id}:p${p.number}`===id);if(p)return `${m.name}, page/slide ${p.number}`}return id}
