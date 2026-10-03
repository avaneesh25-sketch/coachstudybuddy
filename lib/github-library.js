import {createHash} from 'node:crypto';
import {InputError} from './http.js';
import {sessionPath,libraryPath} from './library.js';
import {studyPdf} from './study-pdf.js';
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
 const ref=await githubApi(token,`${root}/git/ref/heads/${encodeURIComponent(meta.default_branch)}`,undefined,fetcher);
 const commit=await githubApi(token,`${root}/git/commits/${ref.object.sha}`,undefined,fetcher);
 const files=[['summary.pdf',pdf],['transcript.json',Buffer.from(JSON.stringify(pack.transcript,null,2))],['study-pack.json',Buffer.from(JSON.stringify(pack,null,2))]];
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
 return {folders:rows.filter(r=>r.type==='dir'&&(depth!==0||/^Term\s+\d+/i.test(r.name))&&(depth!==2||/^Session\s+\d+/i.test(r.name))).map(r=>({name:r.name})).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})),files:rows.filter(r=>r.type==='file'&&/\.pdf$/i.test(r.name)).map(r=>({name:r.name,url:`https://github.com/${repo}/blob/${encodeURIComponent(meta.default_branch)}/${r.path.split('/').map(encodeURIComponent).join('/')}`}))};
}
