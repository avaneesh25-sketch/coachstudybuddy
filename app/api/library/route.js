import {sameOrigin,jsonBody,reply,failure} from '../../../lib/http.js';
import {githubToken,githubApi,saveSession} from '../../../lib/github-library.js';
export const maxDuration=180;
export async function POST(request){try{sameOrigin(request);const token=githubToken(request),body=await jsonBody(request,1500000);if(body.action==='repositories'){const repositories=[];for(let page=1;page<=10;page++){const data=await githubApi(token,`/user/repos?per_page=100&page=${page}&sort=updated`);repositories.push(...data.filter(r=>r.private&&r.permissions?.push).map(r=>({name:r.full_name})));if(data.length<100)break}return reply({repositories})}return reply(await saveSession(token,body.repository,body.pack))}catch(e){return failure(e)}}
