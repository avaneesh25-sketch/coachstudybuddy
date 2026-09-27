export async function checkProvider(key,fetcher=fetch){
 if(typeof key!=='string'||key.length<12||key.length>512||/\s/.test(key))return {status:400,error:'Enter a valid API key.'};
 try{
  const r=await fetcher('https://api.openai.com/v1/models',{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(12000),cache:'no-store',redirect:'error'});
  if(!r.ok)return {status:r.status===401?401:502,error:r.status===401?'The provider rejected this key.':r.status===429?'The provider is rate limiting requests. Try again shortly.':'Could not verify this key with the provider.'};
  return {status:200,connected:true};
 }catch{return {status:502,error:'Could not reach the provider. Check your connection and try again.'}}
}
