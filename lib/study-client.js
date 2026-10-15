export function studyHeaders(lecture){return {'x-course-url':lecture?.courseUrl||'','x-session-id':String(lecture?.lectureId||'')};}
export async function libraryRequest(action,lecture,pack){
 const r=await fetch('/api/study/library',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,lecture,pack})});
 if(!r.ok){const data=await r.json();throw Error(data.error||'Library unavailable.');}
 if(action==='download'){const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='session-'+lecture.lectureId+'-summary.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return;}
 return r.json();
}
