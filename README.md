# CX Award Checker

A Chrome extension that finds Cathay Pacific award seats you can book with Asia Miles. Search a whole date range in one go, see seats for every cabin, and click any result to open it on cathaypacific.com.

> This is an unofficial tool. It is not made by or affiliated with Cathay Pacific or Asia Miles.

## What it does

- **Quick check.** Shows Cathay's public award calendar for a route: Available, Limited or None for each day. It's instant and needs no sign-in, but Cathay only publishes this calendar for some routes.
- **Full search.** Runs Cathay's real award search for every day in your date range, using your own signed-in Cathay session. It works for every route, including partner airlines and connecting flights, and shows how many seats each cabin has.
- **Every cabin.** Results show First (F), Business (J), Premium Economy (PY) and Economy (Y) side by side.
- **Click to book.** Every result links to that day's search on cathaypacific.com.
- **Airport search.** Type a city, airport name or code, then pick from the list.

## Install

The extension isn't in the Chrome Web Store yet, so you load it from this folder. You need Chrome 114 or newer, or another Chromium browser such as Edge or Brave.

1. Download this repository: click **Code**, then **Download ZIP**, and unzip it. Or clone it with git.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** with the switch in the top-right corner.
4. Click **Load unpacked** and choose the unzipped folder.
5. Pin the extension: click the puzzle-piece icon in the toolbar, then the pin next to **CX Award Checker**.

To update later, download the new version and click the reload arrow on the extension's card in `chrome://extensions`.

## How to use it

Click the extension's icon. A panel opens on the right side of the browser and stays open while you browse.

1. **Enter the route.** Type a city, airport name or three-letter code in the From and To boxes, then pick from the list. A city with several airports, such as London, needs you to pick one.
2. **Choose a cabin**, or **Any cabin** to see them all.
3. **Pick the start and end dates.**
4. **Choose a search:**
   - **Quick check (calendar)** shows results right away if Cathay publishes a calendar for the route. If it says no calendar is published, use Full search.
   - **Full search on Cathay (sign-in)** opens Cathay's award search in a new tab. Pass Cathay's waiting room and sign in to your Cathay account if asked. Then leave that tab open. The panel fills in day by day, searching one day every few seconds. Click **Stop** to end early.
5. **Read the results.** Numbers are award seats available in each cabin. For a connecting flight, the number is the lowest across its flights.
6. **Click a result** to open that day's search on Cathay and book it.

Tick **Available only** to hide days with no seats.

## Good to know

- **Full search covers up to 60 days per run.** It searches at a human pace on purpose, so a month takes a couple of minutes.
- **Award seats open about 360 days ahead.** Searching further out makes Cathay reject the search.
- **Your session can run out mid-scan.** The extension reopens Cathay's search at the next date and carries on. You may see Cathay's waiting room again.
- **Seats change fast.** Always confirm on Cathay before transferring miles.
- **Quick check data can be a few hours old.** Cathay caches its public calendar.

## Troubleshooting

| What you see | What to do |
|---|---|
| "No award calendar published for this route" | Cathay has no public calendar for it. Use Full search. |
| "Pick airports from the list, or type 3-letter airport codes" | The city has several airports, or the name wasn't recognised. Pick an entry from the list. |
| An error mentioning `err_dds_10032` | A date is probably too far ahead. Search dates within about 360 days. |
| "Cathay refused this date twice" | Cathay is limiting your searches. Wait a while, then start a new search from that date. |
| The panel says "Searched 0 of N days" and doesn't move | Check the Cathay tab. You may need to pass the waiting room or sign in. |
| The panel doesn't open | Update Chrome to version 114 or newer. |

## Privacy

The extension talks only to cathaypacific.com. It never sees your password, and it sends nothing anywhere else. Your last search is saved in your browser so the panel can show it again.

## Support this project

If this tool saved you time or found you a seat, you can buy me a coffee:

[![Buy me a coffee via PayPal](https://img.shields.io/badge/Buy%20me%20a%20coffee-PayPal-00457C?logo=paypal&logoColor=white)](PAYPAL_LINK_HERE)

## For developers

| File | What it does |
|---|---|
| `manifest.json` | Extension settings and permissions |
| `popup.html`, `popup.js` | The side panel: search form, quick check and results |
| `background.js` | Opens the side panel when you click the toolbar icon |
| `results.js` | Runs on Cathay's results page and searches each date in your session |
| `bridge.js` | Passes the search job and results between Cathay's page and the panel |
| `search-error.js` | Catches a search Cathay rejected and reports it in the panel |

Run the self-check with Node.js:

```
node results.test.js
```

The full-search method follows the [Cathay Award Search Fixer](https://greasyfork.org/en/scripts/449998-cathay-award-search-fixer-2022) userscript.
