// Plays CLOSE THE MONTH with bots of different skill and checks that skill
// decides the result: a player who reads the lanes closes the month, one who
// only hops forward or mashes does not. Then draws three demo games through
// the cartridge with a fake canvas to check nothing throws.
// Run: node tests/lanes-bots.js
const fs = require("fs"), path = require("path"), vm = require("vm");
// runInThisContext, not a new context: the planner calls the rules thousands of times a second
const Lanes = vm.runInThisContext("(function(){" + fs.readFileSync(path.join(__dirname, "..", "games", "lanes.js"), "utf8") + "\nreturn Lanes;})()");
const DT = 1 / 60, SEEDS = 300, MAX_T = 300;
const fails = [];
const pct = (a, b) => Math.round((100 * a) / b) + "%";
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- planner: searches hops over the next ~1.5 s using predicted mover positions ---------- */
const H = 8, DEPTH = 11, COMMIT = 3, ACTS = ["wait", "up", "left", "right", "down"];
const MOVE = { wait: [0, 0], up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
function target(s) {
  let best = -1, bd = 1e9;
  Lanes.SLOTS.forEach((sl, i) => { const d = Math.abs(sl.c + 1 - (s.px + 0.5)); if (!s.filled[i] && d < bd) { bd = d; best = i; } });
  return best;
}
function score(s, st, tg) {
  const c = st.px + 0.5, v = Lanes.vel(s, st.row);
  let sc = (Lanes.START_ROW - st.row) * 10;
  if (tg >= 0 && st.row <= Lanes.MID_ROW) sc -= 0.6 * Math.abs(c - (Lanes.SLOTS[tg].c + 1));
  if (v) { const left = v > 0 ? (Lanes.COLS - c) / v : c / -v; if (left < 2) sc -= (2 - left) * 12; }
  return sc;
}
// deadline lanes as a table: blocked[row][col][frame], so the search only looks things up
function deadlines(s, frames) {
  const t = [];
  for (let r = 0; r < Lanes.ROWS; r++) {
    const L = s.lanes[r];
    if (!L || L.kind !== "deadline") continue;
    t[r] = Array.from({ length: Lanes.COLS }, () => new Uint8Array(frames + 1));
    for (let f = 1; f <= frames; f++) for (const it of L.items) {
      const x = Lanes.posAt(s, L, it, f * DT);
      for (let c = Math.max(0, Math.floor(x - 1)); c <= Math.min(Lanes.COLS - 1, Math.ceil(x + it.len)); c++)
        if (c + 0.2 < x + it.len && c + 0.8 > x) t[r][c][f] = 1;
    }
  }
  return t;
}
function plan(s) {
  const tg = target(s), blocked = deadlines(s, DEPTH * H);
  let level = [{ row: s.row, px: s.px, a: null, up: null }], goal = null, deepest = level, depth = 0;
  for (let k = 0; k < DEPTH && !goal; k++) {
    const next = new Map();
    for (const st of level) {
      for (const a of ACTS) {
        let r = st.row, px = st.px;
        if (a !== "wait") {
          const c = Math.round(px) + MOVE[a][1]; r = st.row + MOVE[a][0];
          if (r > Lanes.START_ROW || c < 0 || c > Lanes.COLS - 1) continue;
          px = c;
          if (r === 0) {
            const i = Lanes.slotAt(c);
            if (i >= 0 && !s.filled[i] && (!goal || (i === tg && goal.i !== tg))) goal = { a, up: st, i };
            continue;
          }
        }
        const L = s.lanes[r];
        if (L && L.kind === "deadline") {
          let dead = false;
          for (let f = 1; f <= H && !dead; f++) if (blocked[r][px][k * H + f]) dead = true;
          if (dead) continue;
        } else if (L) {
          // a sign-off carries you, so you stay on it: check the landing, then only the page edge
          const v = Lanes.vel(s, r);
          if (a !== "wait" && Lanes.check(s, r, px + v * DT, (k * H + 1) * DT)) continue;
          px += v * H * DT;
          if (px + 0.5 < 0 || px + 0.5 > Lanes.COLS) continue;
        }
        const key = r * 1000 + Math.round(px * 4);
        if (!next.has(key)) next.set(key, { row: r, px, a, up: st });
      }
    }
    if (!next.size) break;
    level = [...next.values()]; deepest = level; depth = k + 1;
  }
  let end = goal;
  if (!end) { let bs = -1e9; for (const st of deepest) { const sc = score(s, st, tg); if (sc > bs) { bs = sc; end = st; } } }
  const acts = [];
  for (let st = end; st && st.a; st = st.up) acts.unshift(st.a);
  return acts.length ? acts : ["wait"];
}
function plannerBot() {
  return (s, rnd, mem) => {
    mem.n = (mem.n || 0) + 1;
    if (s.wait > 0) { mem.at = 0; mem.acts = null; return {}; }
    if (mem.n < (mem.at || 0)) return {};
    mem.at = mem.n + H;
    // the lanes are deterministic, so a plan holds: follow it for a few hops, then look again
    if (!mem.acts || !mem.acts.length || mem.used >= COMMIT) { mem.acts = plan(s); mem.used = 0; }
    const a = mem.acts.shift(); mem.used++;
    return a === "wait" ? {} : { [a]: true };
  };
}

/* ---------- play ---------- */
function play(bot, seed) {
  const s = Lanes.create(seed), rnd = mulberry(seed * 7 + 3), mem = {};
  for (let i = 0; i < 60 * MAX_T && !s.over && !s.won; i++) { Lanes.step(s, DT, bot(s, rnd, mem)); s.events.length = 0; }
  return s;
}
function suite(name, bot) {
  const rs = Array.from({ length: SEEDS }, (_, i) => play(bot, i + 1));
  const w = rs.filter(s => s.won).length, stuck = rs.filter(s => !s.won && !s.over).length;
  const avg = f => (rs.reduce((a, s) => a + f(s), 0) / rs.length).toFixed(1);
  const lost = k => avg(s => s.lost[k]);
  const won = rs.filter(s => s.won);
  const days = won.length ? (won.reduce((a, s) => a + s.day, 0) / won.length).toFixed(1) : "-";
  const tmax = Math.max(...rs.map(s => s.t));
  console.log(`  ${name.padEnd(22)} win ${pct(w, SEEDS).padStart(4)}  closed ${avg(s => s.closed)}/5  day ${String(days).padStart(3)}  time ${avg(s => s.t).padStart(5)}s (max ${tmax.toFixed(0)})  deadline ${lost("hit")}  fall ${lost("fall")}  off ${lost("off")}  gap ${lost("gap")}  hours ${lost("time")}`);
  if (stuck || tmax > MAX_T) fails.push(`${name}: ${stuck} games did not end within ${MAX_T} s`);
  return w / SEEDS;
}

console.log("CLOSE THE MONTH");
const t0 = Date.now();
const pPlan = suite("planner", plannerBot());
const pUp = suite("only presses up", () => ({ up: true }));
const pRand = suite("random", (s, rnd) => { if (rnd() > 0.15) return {}; const d = ["up", "down", "left", "right", "a"][Math.floor(rnd() * 5)]; return { [d]: true }; });
const pIdle = suite("never moves", () => ({}));
if (pPlan < 0.85) fails.push("lanes: a planner that reads the lanes should close the month at least 85% of the time");
if (pUp > 0.10) fails.push("lanes: only hopping forward should not work");
if (pRand > 0) fails.push("lanes: random hopping should never win");
if (pIdle > 0) fails.push("lanes: standing still should never win");
console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

/* ---------- draw smoke test: three demo games through the cartridge ---------- */
{
  let cart = null;
  const noop = () => {};
  const fake = { fillStyle: "", strokeStyle: "", font: "", textAlign: "", globalAlpha: 1, lineWidth: 1, imageSmoothingEnabled: false };
  ["fillRect", "drawImage", "fillText", "strokeRect", "translate", "save", "restore", "setTransform", "beginPath", "moveTo", "lineTo", "stroke"].forEach(k => fake[k] = noop);
  fake.measureText = () => ({ width: 0 });
  const COL = { lcd: "#FFB547", dim: "#B08A48", dark: "#1C1812", hot: "#FF7A45", faint: "#3a2e18", mid: "#5a4524" };
  const g = { ctx: fake, W: 192, H: 120, COL, FONT: "10px VT323, monospace", BIG: "16px VT323, monospace", SPR: {}, fx: {}, reduce: false,
    text: noop, sprite: () => ({ width: 8, height: 8 }), overlay: noop, fmt: String, sign: String, say: noop, flash: noop, now: () => 0,
    float: noop, banner: noop, line: noop, sfx: noop };
  const win = { RUNWAY: { register: c => { cart = c; } } };
  const sandbox = { window: win, RUNWAY: win.RUNWAY, Lanes, Math, console };
  try {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "games", "carts", "lanes.js"), "utf8"), sandbox);
    if (!cart) throw new Error("cartridge did not register");
    let wins = 0;
    for (let n = 0; n < 3; n++) {
      const s = cart.create(), mem = {};
      for (let i = 0; i < 60 * MAX_T && !s.over && !s.won; i++) {
        cart.step(s, DT, cart.demo(s, mem));
        if (s.events) { s.events.forEach(e => cart.onEvent && cart.onEvent(e, g, s)); s.events.length = 0; }
        cart.draw(g, s);
        if (cart.overlay) cart.overlay(g, s);
        if (i % 5 === 0) { const h = cart.hud(s); if (h.cells.length !== 3 || !h.row2) throw new Error("bad hud"); }
        const m = cart.mood(s); if (!(m >= 0 && m <= 1)) throw new Error("mood out of range: " + m);
      }
      const r = cart.result(s);
      if (!r.title || !Array.isArray(r.rows)) throw new Error("bad result");
      if (s.won) wins++;
    }
    console.log(`\nDRAW SMOKE TEST  3 demo games drawn, ${wins}/3 closed the month`);
  } catch (e) { fails.push("cartridge draw smoke test threw: " + (e && e.stack || e)); }
}

if (fails.length) { console.error("\nFAIL\n- " + fails.join("\n- ")); process.exit(1); }
console.log("\nOK: reading the lanes decides CLOSE THE MONTH.");
