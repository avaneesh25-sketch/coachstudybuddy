export async function buildStudyMaterial({loadSources,generateNotes,renderPdf,offerDownload,savePrivateCopy,onProgress=()=>{}}){
 onProgress('Importing lecture sources');
 const sources=await loadSources();
 if(!sources.transcript?.segments?.length)throw Error('An official transcript is needed. Open the lecture player or use the transcript recovery option.');
 if(!sources.materials?.length)throw Error('No readable materials were imported. Resolve the material import before building.');
 onProgress('Generating study notes');
 const notes=await generateNotes(sources);
 const pack={...sources,notes:{...notes,limitations:[...(notes.limitations||[]),...(sources.warnings||[])]}};
 onProgress('Preparing your PDF');
 const pdf=await renderPdf(pack);
 await offerDownload(pdf,pack);
 onProgress('Saving private copy');
 try{const saved=await savePrivateCopy(pack);return {pack,pdf,saved,saveError:null}}
 catch(error){return {pack,pdf,saved:null,saveError:error.message||'Private save failed.'}}
}
