// Plays SPOT THE ERROR with bots of different care and checks that care
// decides the result: a careful reader wins, flagging or ignoring everything doesn't.
// Then plays the cartridge's own demo through draw() with a fake screen.
// Run: node tests/spot-bots.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const read = f => fs.readFileSync(path.join(__dirname, "..", "games", f), "utf8");
const ctx = {};
vm.runInNewContext(read("spot.js") + "\nthis.Spot=Spot;", ctx);
const { Spot } = ctx;
const DT = 1 / 60, SEEDS = 300;
const fails = [];
const pct = (a, b) => Math.round((100 * a) / b) + "%";
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const idle = () => ({ down: false, dir: null, press: {}, taps: [] });
const tapRow = r => ({ down: false, dir: null, press: {}, taps: [{ x: 96, y: r.y + Spot.ROW / 2 }] });
// when each line was first fully on screen (the bot's own eyes, not the engine's)
function look(s, mem) {
  mem.seen = mem.seen || {};
  for (const r of Spot.visible(s)) if (mem.seen[r.id] == null && r.y >= Spot.TOP && r.y + Spot.ROW <= Spot.H) mem.seen[r.id] = s.t;
  return r => mem.seen[r.id] != null && s.t - mem.seen[r.id] >= 1.2;
}

/* ---------- bots ---------- */
// misread: chance of getting a line wrong (flags a right one, skips a wrong one)
function readerBot(misread) {
  return (s, rnd, mem) => {
    const read = look(s, mem);
    mem.call = mem.call || {};
    for (const r of Spot.visible(s)) {
      if (r.flagged || !read(r)) continue;
      if (mem.call[r.id] == null) mem.call[r.id] = r.err !== (rnd() < misread);
      if (mem.call[r.id]) return tapRow(r);
    }
    return idle();
  };
}
const flagAll = (s, rnd, mem) => {
  mem.seen = mem.seen || {};
  for (const r of Spot.visible(s)) if (!r.flagged && r.y + Spot.ROW <= Spot.H) return tapRow(r);
  return idle();
};
// keyboard only: ▲ ▼ to the wrong line, A to flag it, one key every 0.12 s
function keyBot(s, rnd, mem) {
  const read = look(s, mem), v = Spot.visible(s), inp = idle();
  if (s.t < (mem.wait || 0)) return inp;
  const ti = v.findIndex(r => r.err && !r.flagged && read(r));
  if (ti < 0) return inp;
  const ci = v.findIndex(r => r.id === s.cur);
  mem.wait = s.t + 0.12;
  if (ci === ti) inp.press.a = true; else inp.press[ci < ti ? "down" : "up"] = true;
  return inp;
}

function play(bot, seed) {
  const s = Spot.create(seed), rnd = mulberry(seed * 7 + 3), mem = {};
  for (let i = 0; i < 60 * 70 && !s.over && !s.won; i++) { Spot.step(s, DT, bot(s, rnd, mem)); s.events.length = 0; }
  return s;
}
function suite(name, bot) {
  const rs = Array.from({ length: SEEDS }, (_, i) => play(bot, i + 1));
  const w = rs.filter(s => s.won).length;
  const avg = f => (rs.reduce((a, s) => a + f(s), 0) / rs.length).toFixed(1);
  console.log(`  ${name.padEnd(28)} win ${pct(w, SEEDS).padStart(4)}  found ${avg(s => s.found).padStart(4)}  false flags ${avg(s => s.falses).padStart(4)}  missed ${avg(s => s.misses).padStart(4)}  lines ${avg(Spot.checked).padStart(4)}  time ${avg(s => s.t).padStart(4)}s`);
  return w / SEEDS;
}

console.log("SPOT THE ERROR");
const careful = suite("careful (reads, then flags)", readerBot(0));
const keys = suite("careful, keyboard only", keyBot);
const sloppy = suite("sloppy (misreads 15%)", readerBot(0.15));
const all = suite("flags everything", flagAll);
const never = suite("never flags", () => idle());
if (careful < 0.95) fails.push("spot: a careful reader should win at least 95%");
if (keys < 0.9) fails.push("spot: the keyboard should be as good as tapping");
if (all > 0.05) fails.push("spot: flagging everything should lose at least 95%");
if (never > 0) fails.push("spot: never flagging should never win");
if (sloppy < 0.15 || sloppy > 0.75) fails.push("spot: a sloppy reader should win between 15% and 75%");

/* ---------- the content: what the lines say ---------- */
{
  const kinds = {}, errKinds = {};
  let long = 0, errs = 0, lines = 0, dupBad = 0, earlyPair = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const s = Spot.create(seed), all = [], on = new Map();
    const note = () => { for (const r of s.rows) if (!on.has(r.id)) { on.set(r.id, r); all.push(r); } };
    note();
    for (let i = 0; i < 60 * 60 && !s.won; i++) {
      Spot.step(s, DT, idle()); s.events.length = 0; s.cred = 3; note();
    }
    all.forEach((r, i) => {
      lines++; kinds[r.kind] = (kinds[r.kind] || 0) + 1;
      if (r.err) { errs++; errKinds[r.kind] = (errKinds[r.kind] || 0) + 1; }
      if (r.text.length > 36) long++;
      if (i > 0 && i < 12 && r.err && all[i - 1].err) earlyPair++;
      if (r.kind === "dup" && !all.some(o => o.id === r.orig && o.text === r.text)) dupBad++;
    });
  }
  console.log(`\n  lines per game ${(lines / SEEDS).toFixed(1)}  errors ${pct(errs, lines)}  kinds ${JSON.stringify(kinds)}  error kinds ${JSON.stringify(errKinds)}`);
  if (long) fails.push("spot: " + long + " lines longer than 36 characters");
  if (earlyPair) fails.push("spot: two errors next to each other early on");
  if (dupBad) fails.push("spot: a duplicate without its original");
  if (errs / lines < 0.2 || errs / lines > 0.33) fails.push("spot: about a quarter of the lines should be wrong");
}

/* ---------- draw smoke test: the cartridge's demo, frame by frame ---------- */
{
  let cart = null;
  const sandbox = { Spot, Math, String, console };
  sandbox.window = sandbox;
  sandbox.RUNWAY = { register: c => { cart = c; } };
  vm.runInNewContext(read(path.join("carts", "spot.js")), sandbox);
  const finite = (...a) => a.forEach(n => { if (typeof n !== "number" || !isFinite(n)) throw new Error("bad coordinate " + n); });
  const noop = () => {};
  const c2d = {
    fillRect: finite, strokeRect: finite, drawImage: (img, ...a) => finite(...a), fillText: noop, translate: finite,
    save: noop, restore: noop, setTransform: noop, beginPath: noop, moveTo: finite, lineTo: finite, stroke: noop,
    measureText: () => ({ width: 0 })
  };
  const g = {
    ctx: c2d, W: 192, H: 120, FONT: "10px VT323, monospace", BIG: "16px VT323, monospace", fx: {}, reduce: false,
    COL: { lcd: "#FFB547", dim: "#B08A48", dark: "#1C1812", hot: "#FF7A45", faint: "#3a2e18", mid: "#5a4524" },
    text: (t, x, y) => { if (t == null || /undefined|NaN/.test(String(t))) throw new Error("bad text " + t); finite(x, y); },
    sprite: () => ({ width: 8, height: 8 }), overlay: noop, float: (t, x, y) => finite(x, y), banner: noop, line: t => { if (/undefined/.test(t)) throw new Error("bad line " + t); },
    sfx: noop, flash: noop, say: noop, now: () => 0, fmt: String, sign: String
  };
  const need = ["id", "name", "sub", "help", "say", "canvas", "create", "step", "draw", "hud", "result", "mood", "demo"];
  try {
    if (!cart) throw new Error("the cartridge did not register");
    need.forEach(k => { if (cart[k] == null) throw new Error("missing " + k); });
    if (cart.help.length > 90) throw new Error("help is " + cart.help.length + " characters");
    const games = [];
    for (let n = 0; n < 4; n++) {
      const s = cart.create(), mem = {};
      for (let i = 0; i < 60 * 70 && !s.over && !s.won; i++) {
        cart.step(s, DT, n < 3 ? cart.demo(s, mem) : idle());
        s.events.forEach(e => cart.onEvent(e, g, s)); s.events.length = 0;
        cart.draw(g, s); if (cart.overlay) cart.overlay(g, s);
        const h = cart.hud(s), m = cart.mood(s);
        if (h.cells.length !== 3 || h.row2.length !== 5) throw new Error("hud shape");
        h.cells.concat([h.row2.slice(0, 2)]).forEach(c => { if (String(c[0]).length > 9 || String(c[1]).length > 7) throw new Error("hud text too long: " + c); });
        if (!(m >= 0 && m <= 1)) throw new Error("mood " + m);
      }
      const r = cart.result(s);
      if (!r.title || !r.rows || r.rows.length < 3 || r.rows.length > 5) throw new Error("result shape");
      games.push((r.win ? "win" : "lose") + " (" + s.found + " found, " + s.falses + " false, " + s.misses + " missed)");
    }
    console.log("\n  draw smoke test: demo " + games.slice(0, 3).join(", ") + "; idle " + games[3]);
  } catch (e) { fails.push("spot: draw smoke test threw: " + e.message); }
}

if (fails.length) { console.error("\nFAIL\n- " + fails.join("\n- ")); process.exit(1); }
console.log("\nOK: reading carefully decides SPOT THE ERROR.");
