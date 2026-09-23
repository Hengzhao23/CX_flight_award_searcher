// Links the side panel's search job (chrome.storage) with results.js, which runs in the page
// itself and so cannot use extension APIs. Messages go through window.postMessage.
const send = msg => window.postMessage({ cxac: true, ...msg }, location.origin);

// Only the tab that started the scan works on it; seat links in the side panel open other
// Cathay tabs. sessionStorage is per tab, so it marks the scan's tab across page loads.
async function myJob() {
  const { job } = await chrome.storage.local.get('job');
  if (job?.status !== 'running') return;
  if (sessionStorage.getItem('cxacJob') !== String(job.id)) {
    if (job.claimed) return;
    job.claimed = true;
    sessionStorage.setItem('cxacJob', job.id);
    await chrome.storage.local.set({ job });
  }
  return job;
}

async function sendJob() {
  const job = await myJob();
  if (job) send({ type: 'job', dates: job.dates.slice(job.next) });
}

async function handle(m) {
  if (m.type === 'ready') return sendJob();
  const job = await myJob();
  if (!job) return;
  const date = job.dates[job.next];
  if (m.type === 'result' && m.date === date) {
    job.results.push({ date, rows: m.rows, error: m.error });
    if (++job.next >= job.dates.length) job.status = 'done';
  } else if (m.type === 'reseed' && m.date === date) {
    if (job.reseeded === date) {
      // Already reopened the search for this date once; stop instead of looping.
      job.results.push({ date, error: 'Cathay refused this date twice. Wait a while, then search again from here.' });
      job.status = 'stopped';
    } else {
      job.reseeded = date;
      await chrome.storage.local.set({ job });
      const url = new URL(job.url);
      url.searchParams.set('DEPARTUREDATE[1]', date);
      location.href = url.href;
      return;
    }
  } else return;
  await chrome.storage.local.set({ job });
}

let queue = Promise.resolve(); // one storage update at a time
window.addEventListener('message', e => {
  if (e.source === window && e.data?.cxac && e.data.type !== 'job' && e.data.type !== 'stop') queue = queue.then(() => handle(e.data));
});
chrome.storage.onChanged.addListener(c => {
  if (c.job && c.job.newValue?.status !== 'running') send({ type: 'stop' });
});
queue = queue.then(sendJob);
