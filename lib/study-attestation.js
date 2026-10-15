import {createHmac,timingSafeEqual} from 'node:crypto';
import {settings} from './managed-store.js';
export function attest(identity,materials,segments,sections){
 return createHmac('sha256',settings().key).update('coach-study-v1\n'+JSON.stringify({courseId:identity.courseId,session:identity.session,materials,segments,sections})).digest('hex');
}
export function verifyAttestation(identity,pack){
 const supplied=pack.notes?.attestation;if(!/^[a-f0-9]{64}$/.test(supplied||''))return false;
 return timingSafeEqual(Buffer.from(supplied,'hex'),Buffer.from(attest(identity,pack.materials,pack.transcript.segments,pack.notes.sections),'hex'));
}
