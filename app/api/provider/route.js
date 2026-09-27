import {checkProvider} from '../../../lib/provider.js';
export async function POST(request){
 const headers={'Cache-Control':'no-store'};
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Use the connection form in this app.'},{status:403,headers});
 try{
  const reader=request.body?.getReader();if(!reader)throw Error();let raw='',length=0;const decoder=new TextDecoder();
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2048){await reader.cancel();return Response.json({error:'Request too large.'},{status:413,headers})}raw+=decoder.decode(value,{stream:true})}
  raw+=decoder.decode();const {apiKey}=JSON.parse(raw);const {status,...body}=await checkProvider(apiKey);return Response.json(body,{status,headers});
 }catch{return Response.json({error:'Invalid connection request.'},{status:400,headers})}
}
