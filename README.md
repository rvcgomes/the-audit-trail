# The audit trail

A one-page introduction for job applications: from IFRS audit at PwC to CFO and Head of HR at Weezie, fractional finance work with VCLevel, and a small game about runway.

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

## The game

The rules live in the `Runway` block inside `index.html`, with no DOM code, so they can be tested on their own. After changing a card, run:

```
node tests/runway-balance.js
```

It plays every possible game (76,800) and fails if any option is always better than the other, if a choice never changes the outcome, or if the win rate leaves the 20–60% range.

## Publishing

GitHub Pages serves the `main` branch from the root. Pushing to `main` updates the live page within a minute.
