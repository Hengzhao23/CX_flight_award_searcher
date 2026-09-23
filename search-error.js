// Cathay sends a rejected award search back to its search form, with the error code in the URL
// (the "error_list" parameter its booking panel reads). Record it so the side panel stops waiting.
(async () => {
  const q = new URLSearchParams(location.search);
  const code = q.get('error_list') || q.get('ERRORMSG[1]');
  if (!code) return;
  const { job } = await chrome.storage.local.get('job');
  if (job?.status !== 'running') return;
  const hint = /10032/.test(code) ? ' Cathay gives no reason for this one. Check that every date is within about 360 days of today.' : '';
  job.results.push({ date: job.dates[job.next], error: `Cathay rejected the search (${code}).${hint}` });
  job.status = 'stopped';
  await chrome.storage.local.set({ job });
})();
