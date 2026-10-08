export function recordingWriter(file, onFailure, maxPending = 64 * 1024 * 1024) {
  let chain = Promise.resolve(), pending = 0, failure = null;
  function fail(error) { if (!failure) { failure = error; onFailure(error); } }
  return {
    write(blob) {
      if (!blob.size || failure) return;
      if (pending + blob.size > maxPending) { fail(new Error('Storage cannot keep up. Recording stopped; check the partial file.')); return; }
      pending += blob.size;
      chain = chain.then(async () => { if (!failure) await file.write(blob); }).catch(fail).finally(() => { pending -= blob.size; });
    },
    async close() { await chain; try { await file.close(); } catch (error) { fail(error); } if (failure) throw failure; }
  };
}
