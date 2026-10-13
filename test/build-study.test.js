import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStudyMaterial} from '../lib/build-study.js';
const sources={lecture:{lectureId:'2'},materials:[{id:'doc'}],transcript:{segments:[{text:'lecture'}]},warnings:['One material unavailable']};
function dependencies(events=[]){return {loadSources:async()=>{events.push('sources');return sources},generateNotes:async()=>{events.push('ai');return {sections:[],limitations:[]}},renderPdf:async()=>{events.push('pdf');return 'PDF'},offerDownload:async()=>events.push('download'),savePrivateCopy:async()=>{events.push('save');return {commit:'saved'}}}}
test('one action imports, generates, downloads and saves in order',async()=>{const events=[];const r=await buildStudyMaterial(dependencies(events));assert.deepEqual(events,['sources','ai','pdf','download','save']);assert.equal(r.saved.commit,'saved');assert.deepEqual(r.pack.notes.limitations,sources.warnings)});
test('private save failure preserves generated pack and PDF for save-only retry',async()=>{const r=await buildStudyMaterial({...dependencies(),savePrivateCopy:async()=>{throw Error('Save unavailable')}});assert.equal(r.pdf,'PDF');assert.ok(r.pack.notes);assert.equal(r.saveError,'Save unavailable');assert.equal(r.saved,null)});
test('missing transcript stops before a paid AI request',async()=>{let charged=false;await assert.rejects(buildStudyMaterial({...dependencies(),loadSources:async()=>({...sources,transcript:null}),generateNotes:async()=>{charged=true}}),/transcript/);assert.equal(charged,false)});
test('missing materials stops before AI or saving',async()=>{const events=[];await assert.rejects(buildStudyMaterial({...dependencies(events),loadSources:async()=>({...sources,materials:[]})}),/materials/);assert.deepEqual(events,[])});
