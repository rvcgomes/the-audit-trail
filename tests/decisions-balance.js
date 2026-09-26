// Plays every possible DECISIONS game and checks the balance rules.
// Run: node tests/runway-balance.js
const fs = require("fs"), path = require("path"), vm = require("vm");

const src = fs.readFileSync(path.join(__dirname, "..", "games", "decisions.js"), "utf8");
const ctx = {};
vm.runInNewContext(src + "\nthis.Decisions = Decisions;", ctx);
const R = ctx.Decisions;

function perms(a, k) {
  if (k === 0) return [[]];
  const out = [];
  a.forEach((x, i) => perms(a.filter((_, j) => j !== i), k - 1).forEach(p => out.push([x, ...p])));
  return out;
}
const SLOTS = [0, 1, 3, 4, 5];

function play(deck, mask, lucky) {
  const s = R.newGame(() => 0);
  s.deck = deck;
  for (let q = 0; q < 6; q++) {
    const c = deck[q];
    if (c === "raise") R.raise(s);
    else R.choose(s, c.o[(mask >> SLOTS.indexOf(q)) & 1], () => (lucky ? 0 : 0.99));
    if (!R.quarter(s)) return { out: s.over, raised: s.raised, score: -1 };
  }
  const r = R.runway(s);
  return { out: "win", raised: s.raised, score: r === Infinity ? 999 : r };
}

const games = new Map();
for (const e of perms(R.EARLY, 2))
  for (const l of perms(R.LATE, 3)) {
    const deck = [e[0], e[1], "raise", l[0], l[1], l[2]];
    const id = deck.map(d => (d === "raise" ? "R" : d.q)).join("|");
    for (let mask = 0; mask < 32; mask++)
      for (const lucky of [true, false]) games.set(id + "#" + lucky + "#" + mask, { deck, mask, lucky, ...play(deck, mask, lucky) });
  }

const all = [...games.values()];
const count = f => all.filter(f).length;
const pct = (a, b) => ((100 * a) / b).toFixed(1) + "%";
const wins = count(g => g.out === "win");
const seed = all.filter(g => g.raised === 3000), small = all.filter(g => g.raised === 1500);

// For every card: in how many games does each option do strictly better than the other?
const cards = {};
for (const [key, g] of games) {
  SLOTS.forEach((slot, b) => {
    if ((g.mask >> b) & 1) return;
    const o = games.get(key.replace(/#\d+$/, "#" + (g.mask | (1 << b))));
    const c = (cards[g.deck[slot].q] = cards[g.deck[slot].q] || { first: 0, second: 0, flips: 0 });
    if (g.score > o.score) c.first++;
    else if (g.score < o.score) c.second++;
    if (g.out !== o.out) c.flips++;
  });
}

console.log(`games: ${all.length}  wins: ${pct(wins, all.length)}  out of cash: ${pct(count(g => g.out === "cash"), all.length)}  team walked out: ${pct(count(g => g.out === "trust"), all.length)}`);
console.log(`after €3M seed: ${pct(seed.filter(g => g.out === "win").length, seed.length)} win   after €1.5M: ${pct(small.filter(g => g.out === "win").length, small.length)} win`);
console.log("\ncard (first option better / second better / outcome flips)");
for (const [q, c] of Object.entries(cards)) console.log(`  ${String(c.first).padStart(5)} ${String(c.second).padStart(5)} ${String(c.flips).padStart(5)}  ${q}`);

const fails = [];
if (wins / all.length < 0.2 || wins / all.length > 0.6) fails.push("win rate outside 20–60%");
if (!seed.some(g => g.out !== "win")) fails.push("after the €3M seed nothing can go wrong");
if (!small.some(g => g.out === "win") || small.every(g => g.out === "win")) fails.push("the €1.5M round is decided before the late cards");
if (!count(g => g.out === "trust")) fails.push("the team can never walk out");
for (const [q, c] of Object.entries(cards)) {
  if (!c.first || !c.second) fails.push("dominant option: " + q);
  if (!c.flips) fails.push("choice never changes the outcome: " + q);
}
if (fails.length) { console.error("\nFAIL\n- " + fails.join("\n- ")); process.exit(1); }
console.log("\nOK: every card can change the outcome and no option is always better.");
