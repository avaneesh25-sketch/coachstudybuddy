import {createHash} from 'node:crypto';
import {InputError} from './http.js';
import {sessionPath,libraryPath} from './library.js';
import {studyPdf} from './study-pdf.js';
import {fetchDocument,documentExtension} from './materials.js';
import {safeName} from './library.js';
export function githubToken(request){const token=request.headers.get('x-github-token');if(!token||token.length<20||token.length>512||/\s/.test(token))throw new InputError('Connect your GitHub token first.',401);return token}
export async function githubApi(token,path,body,fetcher=fetch){
 const response=await fetcher('https://api.github.com'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new InputError(response.status===401?'GitHub rejected this token.':response.status===409?'The repository changed during saving. Refresh and retry.':'GitHub could not complete the request. Check repository access and token permissions.',response.status===401?401:502);return response.json();
}
export async function privateRepo(token,repo,fetcher){if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo||''))throw new InputError('Choose a repository.');const data=await githubApi(token,`/repos/${repo}`,undefined,fetcher);if(data.private!==true||!data.permissions?.push)throw new InputError('Study files require a private repository you can write to.',403);if(!data.default_branch)throw new InputError('Initialize the repository with a README first.');return data}
export async function videoIdentity(token,fetcher){
 const emails=await githubApi(token,'/user/emails?per_page=100',undefined,fetcher);
 const allowedHash=process.env.VIDEO_OWNER_EMAIL_SHA256;
 return !!allowedHash&&Array.isArray(emails)&&emails.some(e=>e.verified===true&&typeof e.email==='string'&&createHash('sha256').update(e.email.trim().toLowerCase()).digest('hex')===allowedHash);
}
export async function saveSession(token,repo,pack,fetcher=fetch){
 const meta=await privateRepo(token,repo,fetcher),folder=sessionPath(pack.lecture),pdf=await studyPdf(pack),root=`/repos/${repo}`;
 const files=[['summary.pdf',pdf],['transcript.json',Buffer.from(JSON.stringify(pack.transcript,null,2))],['study-pack.json',Buffer.from(JSON.stringify(pack,null,2))]];
 files.push(...await originalMaterials(pack.materials,fetcher));
 return commitFiles(token,repo,meta,folder,files,fetcher);
}
async function originalMaterials(materials,fetcher){const files=[];
 for(const material of (materials||[]).slice(0,5)){if(!material.sourceUrl)continue;const bytes=await fetchDocument(material.sourceUrl,fetcher);const ext=documentExtension(bytes);files.push([`materials/${safeName(material.name)||'document'}-${createHash('sha256').update(bytes).digest('hex').slice(0,8)}.${ext}`,bytes]);}
 return files;
}
export async function saveMaterials(token,repo,pack,fetcher=fetch){const meta=await privateRepo(token,repo,fetcher),folder=sessionPath(pack.lecture),files=await originalMaterials(pack.materials,fetcher);if(!files.length)throw new InputError('Import accessible source documents first.');return commitFiles(token,repo,meta,folder,files,fetcher);}
async function commitFiles(token,repo,meta,folder,files,fetcher){const root=`/repos/${repo}`;
 const ref=await githubApi(token,`${root}/git/ref/heads/${encodeURIComponent(meta.default_branch)}`,undefined,fetcher);
 const commit=await githubApi(token,`${root}/git/commits/${ref.object.sha}`,undefined,fetcher);
 const tree=[];for(const [name,bytes]of files){const blob=await githubApi(token,`${root}/git/blobs`,{encoding:'base64',content:bytes.toString('base64')},fetcher);tree.push({path:`${folder}/${name}`,mode:'100644',type:'blob',sha:blob.sha})}
 const nextTree=await githubApi(token,`${root}/git/trees`,{base_tree:commit.tree.sha,tree},fetcher);
 const next=await githubApi(token,`${root}/git/commits`,{message:`Save ${folder}`,tree:nextTree.sha,parents:[ref.object.sha]},fetcher);
 const response=await fetcher(`https://api.github.com${root}/git/refs/heads/${encodeURIComponent(meta.default_branch)}`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({sha:next.sha,force:false}),redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new InputError('The save could not be committed, possibly because the branch changed. Retry; existing files were not overwritten.',409);
 return {folder,url:`https://github.com/${repo}/tree/${encodeURIComponent(meta.default_branch)}/${folder.split('/').map(encodeURIComponent).join('/')}`,commit:next.sha};
}

export async function browseLibrary(token,repo,path='',fetcher=fetch){
 const encoded=libraryPath(path);const meta=await privateRepo(token,repo,fetcher);
 const rows=await githubApi(token,`/repos/${repo}/contents/${encoded}?ref=${encodeURIComponent(meta.default_branch)}`,undefined,fetcher);
 if(!Array.isArray(rows))throw new InputError('Select a library folder.');
 const depth=path?path.split('/').length:0;
 if(depth===3&&rows.some(r=>r.type==='dir'&&r.name==='materials')){const sources=await githubApi(token,`/repos/${repo}/contents/${encoded}/materials?ref=${encodeURIComponent(meta.default_branch)}`,undefined,fetcher);if(Array.isArray(sources))rows.push(...sources.filter(r=>r.type==='file'));}
 return {folders:rows.filter(r=>r.type==='dir'&&(depth!==0||/^Term\s+\d+/i.test(r.name))&&(depth!==2||/^Session\s+\d+/i.test(r.name))).map(r=>({name:r.name})).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})),files:rows.filter(r=>r.type==='file'&&/\.(pdf|epub|pptx|zip)$/i.test(r.name)).map(r=>({name:r.name,path:r.path}))};
}

export async function downloadLibraryFile(token,repo,path,fetcher=fetch){
 const parts=typeof path==='string'?path.split('/'):[];
 if(parts.length<4||parts.length>5||parts.some(p=>!p||p==='.'||p==='..'||/[\\\x00-\x1f]/.test(p))||!/^Term \d+/.test(parts[0])||!/^Session \d+/.test(parts[2])||! /\.(pdf|epub|pptx|zip)$/i.test(parts.at(-1)))throw new InputError('Choose a saved study document.');
 const meta=await privateRepo(token,repo,fetcher);
 const data=await githubApi(token,`/repos/${repo}/contents/${parts.map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(meta.default_branch)}`,undefined,fetcher);
 if(data.type!=='file'||data.size>10*1024*1024||!data.sha)throw new InputError('Saved file unavailable or exceeds 10 MB.');
 const blob=await githubApi(token,`/repos/${repo}/git/blobs/${data.sha}`,undefined,fetcher);
 if(blob.encoding!=='base64'||blob.size>10*1024*1024)throw new InputError('Unsupported saved file.');
 const bytes=Buffer.from(blob.content,'base64');if(bytes.length>10*1024*1024)throw new InputError('Saved file exceeds 10 MB.');
 return {bytes,name:parts.at(-1)};
}
