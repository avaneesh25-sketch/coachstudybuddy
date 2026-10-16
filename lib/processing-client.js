export function processingPath(kind,config){return config.personal?'/api/personal/'+kind:config.managed?'/api/study/'+kind:'/api/'+kind;}
export async function processingFetch(kind,config,options,fetcher=fetch){
 if(config.personal){const session=await fetcher('/api/personal/session',{method:'POST',signal:options.signal});if(!session.ok){const body=await session.json();throw Error(body.error||'Could not connect personal processing.');}}
 return fetcher(processingPath(kind,config),options);
}
