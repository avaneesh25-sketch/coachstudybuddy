import {configuration,transport} from './providers.js';
export async function checkProvider(key,fetcher,options={}){
 if(typeof key!=='string'||key.length<12||key.length>512||/\s/.test(key))return {status:400,error:'Enter a valid API key.'};
 try{const c=configuration(options);const r=await transport(c,fetcher)(c.baseUrl+'/models',{headers:c.provider==='gemini'?{'x-goog-api-key':key}:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(12000),cache:'no-store',redirect:'error'});
 if(!r.ok)return {status:[400,401,403].includes(r.status)?401:502,error:[400,401,403].includes(r.status)?'The selected provider rejected this key or its permissions.':r.status===429?'Provider quota or rate limit reached.':'Could not verify this key. The endpoint must support listing models.'};
 return {status:200,connected:true};
 }catch(e){return {status:e.status||502,error:e.status===400?e.message:'Could not reach the provider. Check the endpoint and try again.'}}
}
