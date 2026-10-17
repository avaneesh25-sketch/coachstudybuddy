export async function buildStudyMaterial({loadSources,generateNotes,renderPdf,offerDownload,savePrivateCopy,onProgress=()=>{}}){
 onProgress('Importing lecture sources');
 const sources=await loadSources();
 if(!sources.transcript?.segments?.length)throw Error('An official transcript is needed. Open the lecture player or use the transcript recovery option.');
 if(!Array.isArray(sources.materials))sources.materials=[];
 if(!sources.materials.length)sources.warnings=[...(sources.warnings||[]),'Transcript-only summary: no slides, pre-reads or post-reads were supplied; comparison with course materials was not possible.'];
 onProgress('Generating study notes');
 const notes=await generateNotes(sources);
 const pack={...sources,notes:{...notes,limitations:[...(notes.limitations||[]),...(sources.warnings||[]),...sources.materials.flatMap(m=>(m.warnings||[]).map(w=>m.name+': '+w))]}};
 onProgress('Preparing your PDF');
 const pdf=await renderPdf(pack);
 await offerDownload(pdf,pack);
 if(!savePrivateCopy)return {pack,pdf,saved:null,saveError:null};
 onProgress('Saving private copy');
 try{const saved=await savePrivateCopy(pack);return {pack,pdf,saved,saveError:null}}
 catch(error){return {pack,pdf,saved:null,saveError:error.message||'Private save failed.'}}
}
