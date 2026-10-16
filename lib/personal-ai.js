import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {InputError} from './http.js';
import {managedProvider} from './managed-ai.js';
import {consume} from './managed-store.js';
export const PERSONAL_COOKIE='csb-personal';
function secret(env){if(!env.SUPABASE_SERVICE_ROLE_KEY)throw new InputError('Personal processing is not configured.',503);return env.SUPABASE_SERVICE_ROLE_KEY;}
function signature(value,env){return createHmac('sha256',secret(env)).update('personal-processing:'+value).digest('hex');}
export function createPersonalSession(env=process.env,now=Date.now()){const value=randomUUID()+'.'+(now+86400000);return value+'.'+signature(value,env);}
export function readPersonalSession(token,env=process.env,now=Date.now()){
 if(typeof token!=='string')return null;
 const [id,expires,sig,...rest]=token.split('.');
 if(rest.length||!/^[a-f0-9-]{36}$/.test(id||'')||!/^\d{13}$/.test(expires||'')||!(/^[a-f0-9]{64}$/).test(sig||'')||Number(expires)<=now||Number(expires)>now+86400000)return null;
 const expected=signature(id+'.'+expires,env);
 return timingSafeEqual(Buffer.from(sig),Buffer.from(expected))?{id}:null;
}
export function personalToken(request){return (request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(PERSONAL_COOKIE+'='))?.slice(PERSONAL_COOKIE.length+1);}
export async function authorizePersonal(request,kind,{env=process.env,consumeUsage=consume}={}){
 const visitor=readPersonalSession(personalToken(request),env);
 if(!visitor)throw new InputError('Personal session expired. Retry to reconnect; your audio is preserved.',401);
 const provider=managedProvider(kind,env);
 await consumeUsage(visitor,kind);
 return provider;
}
export function personalFailureMessage(error){
 if(/quota|rate limit|billing/i.test(error.message))return new InputError('The site’s AI allowance or provider rate limit has been reached. Your sources are preserved. Retry later; completed audio parts will not be sent again.',429);
 if(error.status===401)return new InputError('The site’s AI provider key was rejected. The administrator needs to update it. Your sources are preserved.',503);
 return error;
}
