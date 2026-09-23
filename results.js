// Runs inside Cathay's award results page (world: MAIN) so it can reuse the page's own search
// session and ask the same server for more dates. The side panel's job arrives through bridge.js. Request/response format follows the
// "Cathay Award Search Fixer" userscript (greasyfork 449998), which does the same thing.
(() => {
  const AVAIL = 'https://book.cathaypacific.com/CathayPacificAwardV3/dyn/air/booking/availability';
  // Cathay's per-segment cabin codes: F first, B business, N premium economy, E/R economy.
  const CABINS = [['F', ['F']], ['J', ['B']], ['PY', ['N']], ['Y', ['E', 'R']]];

  const seats = (seg, codes) => codes.reduce((n, c) => n + (+seg.cabins?.[c]?.status || 0), 0);
  // Cathay sends local times as UTC timestamps, so read them back as UTC.
  const fmt = t => new Date(t).toISOString().slice(0, 16).replace('T', ' ');

  // Cathay's response -> one row per itinerary that has a seat in any cabin.
  // A connecting itinerary only has as many seats as its tightest segment.
  function summarize(bom) {
    const m = bom.modelObject;
    if (m?.isContainingErrors) throw new Error(m.messages?.[0]?.text || 'Cathay returned an error');
    const flights = m?.availabilities?.upsell?.bounds?.[0]?.flights ?? [];
    return flights.map(f => {
      const s = f.segments;
      const row = {
        flights: s.map(x => x.flightIdentifier.marketingAirline + x.flightIdentifier.flightNumber).join(' + '),
        route: [s[0].originLocation, ...s.map(x => x.destinationLocation)].map(c => c.slice(-3)).join('-'),
        dep: fmt(s[0].flightIdentifier.originDate),
      };
      for (const [k, codes] of CABINS) row[k] = Math.min(...s.map(x => seats(x, codes)));
      return row;
    }).filter(r => CABINS.some(([k]) => r[k] > 0));
  }

  function main() {
    if (typeof requestParams === 'undefined') return; // not a results page
    const vars = typeof requestParams === 'string' ? JSON.parse(requestParams) : { ...requestParams };
    const submitUrl = typeof formSubmitUrl !== 'undefined' ? formSubmitUrl : `${AVAIL}?TAB_ID=${vars.TAB_ID}`;
    const send = msg => window.postMessage({ cxac: true, ...msg }, location.origin);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    // Cathay's error pages carry a JSON "errorBom" with the human-readable reason.
    const cathayError = html => {
      try {
        const bom = JSON.parse(html.match(/errorBom = ([^;]+)/)[1]);
        return bom.modelObject?.messages?.[0]?.subText || bom.modelObject?.messages?.[0]?.text;
      } catch { return ''; }
    };

    async function trySearch(date) {
      const req = { ...vars, B_DATE_1: date + '0000' };
      for (const k of ['ENCT', 'SERVICE_ID', 'DIRECT_LOGIN', 'ENC']) delete req[k];
      // Values arrive already encoded from Cathay, so send them as-is, like Cathay's page does.
      const res = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json, text/plain, */*' },
        body: Object.entries(req).map(([k, v]) => `${k}=${v}`).join('&'),
      });
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        return summarize(data.modelObject ? data : JSON.parse(data.pageBom));
      } catch (e) {
        if (!/JSON/.test(e.name + e.message)) throw e; // Cathay answered, e.g. "no flights": report it
        throw Object.assign(new Error(cathayError(text) || `Search failed (HTTP ${res.status}).`), { retryable: true });
      }
    }

    // A refused search is often a short rate limit, so retry once after a pause.
    async function search(date) {
      try { return await trySearch(date); } catch (e) { if (!e.retryable) throw e; }
      await sleep(8000);
      return trySearch(date);
    }

    // bridge.js hands over the dates still to search; results go back the same way.
    let started = false, stopped = false;
    window.addEventListener('message', async e => {
      if (e.source !== window || !e.data?.cxac) return;
      if (e.data.type === 'stop') stopped = true;
      if (e.data.type !== 'job' || started) return;
      started = true;
      for (const [i, date] of e.data.dates.entries()) {
        if (i) await sleep(3000); // ponytail: fixed gap to search at a human pace; raise it if Cathay starts refusing
        if (stopped) return;
        try {
          send({ type: 'result', date, rows: await search(date) });
        } catch (err) {
          // This page's session is used up: bridge.js reopens Cathay's search at this date.
          if (err.retryable) return send({ type: 'reseed', date });
          send({ type: 'result', date, error: err.message });
        }
      }
    });
    send({ type: 'ready' });
  }

  if (typeof window === 'undefined') module.exports = { summarize };
  else main();
})();
