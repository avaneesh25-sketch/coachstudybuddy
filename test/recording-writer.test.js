import test from 'node:test';
import assert from 'node:assert/strict';
import {recordingWriter} from '../lib/recording-writer.js';
test('recording writes in order and finalizes after the last chunk',async()=>{const events=[];const writer=recordingWriter({write:async b=>{await new Promise(r=>setTimeout(r,2));events.push(await b.text())},close:async()=>events.push('closed')},()=>assert.fail());writer.write(new Blob(['first']));writer.write(new Blob(['last']));await writer.close();assert.deepEqual(events,['first','last','closed']);});
test('storage errors stop recording and never report success',async()=>{let errors=0;const writer=recordingWriter({write:async()=>{throw Error('disk full')},close:async()=>{}},()=>errors++);writer.write(new Blob(['x']));await assert.rejects(writer.close(),/disk full/);assert.equal(errors,1);});
test('slow storage has bounded pending memory',async()=>{let errors=0;const writer=recordingWriter({write:async()=>{},close:async()=>{}},()=>errors++,3);writer.write(new Blob(['1234']));await assert.rejects(writer.close(),/Storage cannot keep up/);assert.equal(errors,1);});
