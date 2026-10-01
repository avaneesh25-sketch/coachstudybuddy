import {sameOrigin,jsonBody,failure} from '../../../lib/http.js';
import {studyPdf} from '../../../lib/study-pdf.js';
export async function POST(request){try{sameOrigin(request);const bytes=await studyPdf(await jsonBody(request,1500000));return new Response(bytes,{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="session-summary.pdf"','Cache-Control':'no-store'}})}catch(e){return failure(e)}}
