# The audit trail

A one-page introduction for job applications: from IFRS audit at PwC to CFO and Head of HR at Weezie, fractional finance work with VCLevel, and a pixel-art handheld with three small games about runway.

Live at <https://rvcgomes.github.io/the-audit-trail/>

## One link per application

Don't edit the page for each company. Open `link.html` (on the live site: `/the-audit-trail/link.html`), type the company name and, optionally, one to three sentences on why that company. It gives you a URL like:

```
https://rvcgomes.github.io/the-audit-trail/?co=Emidat&why=...
```

The name and the text travel in the link, so every company sees its own version and nothing about your applications is stored in this public repository.

## What to edit in `index.html`

The `CONFIG` block at the top:

| Key | What it does |
|---|---|
| `email`, `linkedin`, `vclevel` | Contact and evidence links |
| `cv` | Path to a CV PDF committed next to `index.html`. Empty = no CV link. |
| `evidence.seed`, `evidence.award` | Public links for the seed round and the Coverflex award. Empty = "on request". |

## The handheld

Three cartridges on the same console, all original art (no third-party characters):

| Cartridge | Rules | Play |
|---|---|---|
| RUNWAY RUN | `games/runner.js` | Tap to jump, hold to jump higher. Coins are revenue, blocks are surprise costs, the papers fill the data room before the seed in month 6. Two gates ask a question: jump for the top answer, stay down for the bottom one. |
| BOARD FIGHT | `games/fight.js` | Hold to charge, let go inside the zone for a clean hit. When the boss shows `!`, let go. Four bosses: the Burn, the Dollar, the Poacher, the Board. |
| DECISIONS | `games/decisions.js` | Six quarters, one decision each, with the consequence shown straight away. |

`games/console.js` draws the screen and handles the A/B buttons, the d-pad, the keyboard (Space, arrows, Esc) and touch. Sound is off until the visitor turns it on.

The rules files have no DOM code, so they can be tested on their own. After changing any of them, run:

```
node tests/decisions-balance.js
node tests/arcade-bots.js
```

- `decisions-balance.js` plays every possible DECISIONS game (76,800) and fails if an option is always better than the other or a choice never changes the outcome.
- `arcade-bots.js` plays 300 games of each arcade cartridge with bots of different skill and fails unless skill decides the result: a perfect player always wins, careless play (skipping the data room, holding forever, ignoring the `!`) doesn't.

`?debug` in the URL exposes `window.RUNWAY_DEBUG` to step a game by hand, which is how the screenshots are taken.

## Share image

`og.png` (1200×630) is what LinkedIn, WhatsApp and email show when the link is pasted.

## Publishing

GitHub Pages serves the `main` branch from the root. Pushing to `main` updates the live page within a minute.
