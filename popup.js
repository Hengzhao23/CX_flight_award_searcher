const $ = id => document.getElementById(id);
const LABEL = { H: 'Available', L: 'Limited', NA: 'None' };
const CABIN_NAMES = { fir: 'First (F)', bus: 'Business (J)', pey: 'Premium Economy (PY)', eco: 'Economy (Y)' };
const FORM_CABIN = { fir: 'F', bus: 'C', pey: 'W', eco: 'Y', F: 'F', J: 'C', PY: 'W', Y: 'Y' }; // Cathay's search-form codes
const MAX_DAYS = 60;
const ymd = d => d.replaceAll('-', '');
const dash = d => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
$('start').value = new Date().toISOString().slice(0, 10);
$('end').value = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);

// Airport suggestions come from the list Cathay's own redemption form uses.
let airports = [];
fetch('https://api.cathaypacific.com/redibe/airport/origin/en_HK')
  .then(r => r.json())
  .then(d => {
    airports = d.airports ?? [];
    $('airports').replaceChildren(...airports.map(a => Object.assign(document.createElement('option'),
      { value: `${a.cityName} - ${a.airportFullName} (${a.airportCode}), ${a.countryName}` })));
  })
  .catch(() => {}); // suggestions are a convenience; typed codes still work

// Accepts a code ("HKG"), a picked suggestion ("... (HKG), Hong Kong") or a city name ("Zurich").
function airportCode(text) {
  const t = text.trim();
  const m = t.match(/\(([A-Z]{3})\)/) || t.match(/^([a-z]{3})$/i);
  if (m) return m[1].toUpperCase();
  const inCity = airports.filter(a => a.cityName.toLowerCase() === t.toLowerCase());
  return inCity.length === 1 ? inCity[0].airportCode : undefined; // several airports: pick one from the list
}

function readRoute() {
  const from = airportCode($('from').value), to = airportCode($('to').value);
  if (!from || !to) $('msg').textContent = 'Pick airports from the list, or type 3-letter airport codes.';
  return from && to ? { from, to } : null;
}

// Cathay's own award search (the request its "Redeem flights" form sends) for one day.
function searchUrl(from, to, cabin, date) {
  const home = 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/redeem-flights/redeem-flight-awards.html';
  const url = new URL('https://api.cathaypacific.com/redibe/IBEFacade');
  url.search = new URLSearchParams({
    ACTION: 'RED_AWARD_SEARCH', ENTRYPOINT: home, ENTRYLANGUAGE: 'en', ENTRYCOUNTRY: 'HK',
    RETURNURL: home, ERRORURL: home, LOGINURL: 'https://www.cathaypacific.com/cx/en_HK/sign-in.html',
    CABINCLASS: FORM_CABIN[cabin] ?? 'Y', BRAND: 'CX', ADULT: 1, CHILD: 0, FLEXIBLEDATE: 'false',
    'ORIGIN[1]': from, 'DESTINATION[1]': to, 'DEPARTUREDATE[1]': date,
  });
  return url.href;
}

// Turns a result cell into a link that opens that day's award search on Cathay.
function linkCell(td, href) {
  const a = Object.assign(document.createElement('a'), { href, target: '_blank', title: 'Open this search on Cathay', textContent: td.textContent });
  td.replaceChildren(a);
}

// Quick check: Cathay's public award calendar, one request per cabin, merged by date.
$('f').onsubmit = async e => {
  e.preventDefault();
  const r = readRoute();
  if (!r) return;
  $('msg').textContent = 'Loading…';
  $('out').replaceChildren();
  const cabins = $('cabin').value === 'any' ? Object.keys(CABIN_NAMES) : [$('cabin').value];
  try {
    const byDate = {};
    await Promise.all(cabins.map(async c => {
      const res = await fetch(`https://api.cathaypacific.com/afr/search/availability/en.${r.from}.${r.to}.${c}.CX.1.${ymd($('start').value)}.${ymd($('end').value)}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      for (const d of (await res.json()).availabilities?.std ?? []) (byDate[d.date] ??= {})[c] = d.availability;
    }));
    const days = Object.keys(byDate).sort();
    if (!days.length) return ($('msg').textContent = 'No award calendar published for this route. Use Full search instead.');
    const shown = $('onlyAvail').checked ? days.filter(d => cabins.some(c => byDate[d][c] && byDate[d][c] !== 'NA')) : days;
    $('msg').textContent = `${shown.length} of ${days.length} days shown. Click a result to open it on Cathay.`;
    const head = $('out').createTHead().insertRow();
    for (const h of ['Date', ...cabins.map(c => CABIN_NAMES[c])]) head.append(Object.assign(document.createElement('th'), { textContent: h }));
    for (const date of shown) {
      const tr = $('out').insertRow();
      tr.insertCell().textContent = dash(date);
      for (const c of cabins) {
        const a = byDate[date][c] ?? 'NA';
        const td = Object.assign(tr.insertCell(), { textContent: LABEL[a] ?? a, className: a });
        if (a !== 'NA') linkCell(td, searchUrl(r.from, r.to, c, date));
      }
    }
  } catch (err) {
    $('msg').textContent = `Failed: ${err.message}`;
  }
};

// Full search: saves the route and dates as a job and opens Cathay's search in a new tab.
// You pass Cathay's queue and sign-in there; on the results page, results.js searches each
// date and bridge.js saves the results, which show up below.
$('full').onclick = async () => {
  const r = readRoute();
  if (!r) return;
  const dates = [];
  for (let d = new Date(`${$('start').value}T00:00Z`); d <= new Date(`${$('end').value}T00:00Z`) && dates.length < MAX_DAYS; d.setUTCDate(d.getUTCDate() + 1))
    dates.push(ymd(d.toISOString().slice(0, 10)));
  if (!dates.length) return ($('msg').textContent = 'The end date must be on or after the start date.');
  const tooFar = ymd(new Date(Date.now() + 360 * 864e5).toISOString().slice(0, 10));
  $('msg').textContent = [
    dates.length === MAX_DAYS ? `Searching the first ${MAX_DAYS} days of that range.` : '',
    dates.at(-1) > tooFar ? 'Some dates are more than 360 days away. Cathay may not have released award seats for them yet.' : '',
  ].join(' ');
  const url = searchUrl(r.from, r.to, $('cabin').value, dates[0]); // results list every cabin anyway
  await chrome.storage.local.set({ job: { id: Date.now(), url, ...r, route: `${r.from} → ${r.to}`, dates, next: 0, results: [], status: 'running' } });
  chrome.tabs.create({ url });
};

function render(job) {
  $('job').hidden = !job;
  if (!job) return;
  $('jobtitle').textContent = `${job.route}, ${dash(job.dates[0])} to ${dash(job.dates.at(-1))}`;
  $('stop').hidden = job.status !== 'running';
  $('jobmsg').textContent = {
    running: `Searched ${job.next} of ${job.dates.length} days. Keep the Cathay tab open.`,
    done: 'Done. Numbers are award seats per cabin. Click one to open it on Cathay.',
    stopped: `Stopped after ${job.next} of ${job.dates.length} days.`,
  }[job.status];
  const body = $('jobout').tBodies[0];
  body.replaceChildren();
  for (const r of job.results) {
    if (r.error || !r.rows.length) {
      if (!r.error && $('onlyAvail').checked) continue;
      const tr = body.insertRow();
      tr.insertCell().textContent = dash(r.date);
      Object.assign(tr.insertCell(), { textContent: r.error || 'No award seats', colSpan: 7 });
    }
    for (const f of r.rows ?? []) {
      const tr = body.insertRow();
      for (const c of [dash(r.date), f.flights, f.route, f.dep.slice(11)]) tr.insertCell().textContent = c;
      for (const k of ['F', 'J', 'PY', 'Y']) {
        const td = Object.assign(tr.insertCell(), { textContent: f[k], className: f[k] > 0 ? 'n' : '' });
        if (f[k] > 0 && job.from) linkCell(td, searchUrl(job.from, job.to, k, r.date));
      }
    }
  }
}

const showJob = () => chrome.storage.local.get('job').then(({ job }) => render(job));
showJob();
chrome.storage.onChanged.addListener(c => c.job && render(c.job.newValue));
$('onlyAvail').onchange = showJob;
$('stop').onclick = async () => {
  const { job } = await chrome.storage.local.get('job');
  if (job) chrome.storage.local.set({ job: { ...job, status: 'stopped' } });
};
