# The audit trail

A one-page introduction for job applications: from IFRS audit at PwC to CFO and Head of HR at Weezie, fractional finance work with VCLevel, and a pixel-art handheld with seven small retro games.

Live at <https://rvcgomes.github.io/the-audit-trail/> (full) and <https://rvcgomes.github.io/the-audit-trail/short.html> (short).

## Two versions

`index.html` is the full page. `short.html` is about a third shorter: one PwC chapter instead of two, no interlude, and less space between sections. It is **generated** from `index.html`; never edit it by hand. After any change to `index.html`:

```
python tools/make_short.py
python tools/make_short.py --check   # fails if short.html is out of date
```

Both pages load the same `styles.css`; the short one adds a small screen-only style block for spacing. The merged PwC chapter is written in the script: if the PwC chapters in `index.html` change, the script stops and asks for the merged text to be updated.

The script stops and names the piece it couldn't find if `index.html` changed in a way it doesn't expect. `link.html` lets you pick the version for each link.

## One link per application

Don't edit the page for each company. Open `link.html` (on the live site: `/the-audit-trail/link.html`), type the company name and, optionally, one to three sentences on why that company. It gives you a URL like:

```
https://rvcgomes.github.io/the-audit-trail/?co=Acme&why=...
```

The name and the text travel in the link, so every company sees its own version and nothing about your applications is stored in this public repository.

## What to edit in `index.html`

The `CONFIG` block at the top. The sources behind the circled letters (A–F) are popovers written into the HTML at the end of `<main>` (`<div class="srcs">`); each letter is a button with `popovertarget="src-X"`.

| Key | What it does |
|---|---|
| `email`, `linkedin`, `vclevel` | Contact and evidence links |
| `cv` | Path to a CV PDF committed next to `index.html`. Empty = no CV link. |

## The handheld

Seven cartridges on one console, all original art and music (no third-party characters or tunes):

| Cartridge | Rules | Cartridge file | Play |
|---|---|---|---|
| THE AUDIT TRAIL | `games/maze.js` | `games/carts/maze.js` | Maze. Tick every line while four findings chase you; a source document turns the tables for a few seconds. |
| RUNWAY RUN | `games/runner.js` | `games/carts/classic.js` | Runner. Tap to jump, hold to jump higher; fill the data room before the seed in month 6; two gates ask a question. |
| CASH FLOW | `games/blocks.js` | `games/carts/blocks.js` | Falling blocks. + is money in, − is money out; each full row closes a week; payroll is due every 13 s; a red week pays a fee. |
| SPOT THE ERROR | `games/spot.js` | `games/carts/spot.js` | Ledger lines scroll up; tap the wrong ones (sums, VAT, dates, duplicates). False flags and misses cost credibility. |
| CLOSE THE MONTH | `games/lanes.js` | `games/carts/lanes.js` | Lane crossing. Dodge the deadlines, ride the sign-offs, close five tasks. |
| BOARD FIGHT | `games/fight.js` | `games/carts/classic.js` | Hold to charge, let go inside the zone; let go when the boss shows `!`. |
| DECISIONS | `games/decisions.js` | `games/carts/classic.js` | Six quarters, one decision each, consequence shown straight away. |

`games/console.js` is the console: screen, A/B buttons, d-pad, keyboard (Space, arrows, Esc), touch and swipe, the boot screen, demo mode after 10 s idle, and the receipt printed at the end of each game (with "Send to Rui"). The cartridge contract is documented at the top of that file.

`games/music.js` is original chiptune synthesised with WebAudio, one theme per cartridge. `setTension()` speeds it up and, above 0.6, turns a major theme minor; above 0.75 a heartbeat kick joins. Sound and music stay off until the visitor presses ♪.

The rules files have no DOM code, so they can be tested on their own. After changing any of them, run the matching test:

```
node tests/decisions-balance.js
node tests/arcade-bots.js      # RUNWAY RUN and BOARD FIGHT
node tests/maze-bots.js
node tests/blocks-bots.js
node tests/spot-bots.js
node tests/lanes-bots.js
node tests/input.js          # real keyboard, touch and swipe in headless Chrome; needs `python -m http.server 8765`
node tests/input.js http://localhost:8765/tests/input.html?page=short.html   # the same on the short version
```

Each plays hundreds of seeded games with bots of different skill and fails unless skill decides the result (a careful player wins, careless play loses, no game gets stuck). The arcade tests also draw every frame of a few demo games against a fake canvas.

`?debug` in the URL exposes `window.RUNWAY_DEBUG` to step a game by hand. `?debug&shot=maze:20` opens a cartridge 20 seconds in (add `&end` to jump to the ending and receipt), for screenshots with headless Chrome.

## Share image

`og.png` (1200×630) is what LinkedIn, WhatsApp and email show when the link is pasted.

## Publishing

GitHub Pages serves the `main` branch from the root. Pushing to `main` updates the live page within a minute.
