// Plays CASH FLOW with bots of different skill and checks that cash sense
// decides the result: a player who watches the + and − wins, one who only
// stacks well does worse, and random placement loses. Then a draw smoke test.
// Bots play at a human pace: they look at each piece for a moment, tap to
// rotate and move, then drop.
// Run: node tests/blocks-bots.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(root, "games", "blocks.js"), "utf8") + "\nthis.Blocks = Blocks;", ctx);
const B = ctx.Blocks;
const DT = 1 / 60, SEEDS = 300, LIMIT = 300, THINK = +(process.env.THINK || 2.5), TAP = 5 / 60, HIGH = 8;
const fails = [];
const pct = (a, b) => Math.round((100 * a) / b) + "%";
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- placement search ---------- */
// every landing spot for the piece in play: {r, x, grid after clears, cleared rows' cells}
function placements(s) {
  const p = s.piece, out = [], seen = {};
  for (let r = 0; r < 4; r++) for (let x = -3; x < B.COLS + 1; x++) {
    if (!B.fits(s.grid, p.k, r, x, p.y)) continue;
    const y = B.dropY(s.grid, p.k, r, x, p.y), g = s.grid.slice();
    let top = false, key = [];
    for (const c of B.SHAPES[p.k][r]) { const cx = x + c[0], cy = y + c[1]; if (cy < 0) top = true; else { g[cy * B.COLS + cx] = p.sign; key.push(cy * B.COLS + cx); } }
    key = key.sort((a, b) => a - b).join(",");
    if (top || seen[key]) continue;
    seen[key] = 1;
    let ins = 0, outs = 0, lines = 0, red = 0;
    const keep = [];
    for (let yy = 0; yy < B.ROWS; yy++) {
      const row = g.slice(yy * B.COLS, yy * B.COLS + B.COLS);
      if (row.every(v => v)) { lines++; let n = 0; row.forEach(v => { if (v === B.IN) { ins++; n++; } else { outs++; n--; } }); if (n < 0) red++; } else keep.push(...row);
    }
    out.push({ r, x, lines, ins, outs, red, grid: new Array(B.COLS * B.ROWS - keep.length).fill(0).concat(keep) });
  }
  return out;
}
function features(g) {
  let agg = 0, holes = 0, bump = 0, max = 0, prev = -1;
  for (let x = 0; x < B.COLS; x++) {
    let h = 0, seen = false;
    for (let y = 0; y < B.ROWS; y++) {
      const v = g[y * B.COLS + x];
      if (v && !seen) { seen = true; h = B.ROWS - y; }
      else if (!v && seen) holes++;
    }
    agg += h; max = Math.max(max, h);
    if (prev >= 0) bump += Math.abs(h - prev);
    prev = h;
  }
  return { agg, holes, bump, max };
}
// rows already heading for the red: more than four − cells in an open row
function redRisk(g) {
  let risk = 0;
  for (let y = 0; y < B.ROWS; y++) {
    let o = 0;
    for (let x = 0; x < B.COLS; x++) if (g[y * B.COLS + x] === B.OUT) o++;
    if (o > 4) risk += (o - 4) * (o - 4);
  }
  return risk;
}
// money a placement would move right now, in €k
function money(pl) {
  let m = (pl.ins - pl.outs) * B.PER_CELL;
  if (pl.lines >= 2 && m > 0) m *= B.BATCH;
  return m - pl.red * B.FEE;
}
// the classic stacking heuristic; cash-aware adds the ledger
function heuristic(cash) {
  return (s, pl) => {
    const f = features(pl.grid);
    let v = -0.51 * f.agg + 0.76 * pl.lines - 0.36 * f.holes - 0.18 * f.bump - (f.max > 9 ? (f.max - 9) * 2 : 0);
    if (cash) {
      // when the stack is high, staying alive comes first
      const m = money(pl), after = s.cash + m, due = s.pay < 3 ? B.PAYROLL : 0, calm = B.height(s.grid) >= HIGH ? 0.3 : 1;
      v += calm * (0.09 * m - 0.5 * redRisk(pl.grid));
      if (pl.lines && after - due <= 0) v -= 20;
      else if (pl.lines && m < 0 && after < B.PAYROLL * 1.5) v -= 2;
    }
    return v;
  };
}
function randomScore(s, pl, rnd) { return rnd(); }

/* ---------- a paced driver: look, rotate, move, drop ---------- */
function driver(score) {
  return (s, rnd, mem) => {
    const c = { dir: null };
    const p = s.piece;
    if (!p || s.phase !== "fall") return c;
    if (mem.p !== p) {
      // like a person, it hurries when the stack is high
      mem.p = p; mem.born = s.t; mem.next = 0; mem.tries = 0; mem.think = B.height(s.grid) >= HIGH - 1 ? 0.3 : THINK;
      let best = null, bv = -Infinity;
      for (const pl of placements(s)) { const v = score(s, pl, rnd); if (v > bv) { bv = v; best = pl; } }
      mem.plan = best || { r: p.r, x: p.x };
    }
    if (s.t - mem.born < mem.think || s.t < mem.next) return c;
    mem.next = s.t + TAP;
    const plan = mem.plan;
    if (++mem.tries > 14) { c.drop = true; return c; }
    if (p.r !== plan.r) c.rotate = true;
    else if (p.x < plan.x) c.right = true;
    else if (p.x > plan.x) c.left = true;
    else c.drop = true;
    return c;
  };
}

function play(bot, seed) {
  const s = B.create(seed), rnd = mulberry(seed * 11 + 3), mem = {};
  for (let i = 0; i < LIMIT * 60 && !s.over && !s.won; i++) { B.step(s, DT, bot(s, rnd, mem)); s.events.length = 0; }
  return s;
}
function suite(name, bot) {
  const rs = Array.from({ length: SEEDS }, (_, i) => play(bot, i + 1));
  const w = rs.filter(s => s.won).length, avg = f => rs.reduce((a, s) => a + f(s), 0) / rs.length;
  const open = rs.filter(s => !s.over && !s.won).length;
  console.log(`  ${name.padEnd(22)} win ${pct(w, SEEDS).padStart(4)}  cash-out ${pct(rs.filter(s => s.over === "cash").length, SEEDS).padStart(4)}  jammed ${pct(rs.filter(s => s.over === "jam").length, SEEDS).padStart(4)}  weeks ${avg(s => Math.min(13, s.weeks)).toFixed(1)}  cash ${avg(s => Math.max(0, s.cash)).toFixed(0)}k  payrolls ${avg(s => s.paid).toFixed(1)}  time ${avg(s => s.t).toFixed(0)}s  max ${Math.max(...rs.map(s => s.t)).toFixed(0)}s`);
  if (open) fails.push(`${name}: ${open} games still running after ${LIMIT}s`);
  return w / SEEDS;
}

console.log("CASH FLOW");
const wCash = suite("cash-aware heuristic", driver(heuristic(true)));
const wNaive = suite("ignores + and −", driver(heuristic(false)));
const wRandom = suite("random placement", driver(randomScore));
if (wCash < 0.85) fails.push("a cash-aware player should win at least 85%");
if (!(wNaive <= wCash - 0.1 || wNaive < 0.8)) fails.push("ignoring + and − should cost at least 10 points of wins (or stay under 80%)");
if (wRandom > 0.05) fails.push("random placement should not win");

/* ---------- draw smoke test: the cartridge with a fake console ---------- */
(function () {
  const noop = () => {};
  const c2d = { fillRect: noop, drawImage: noop, fillText: noop, strokeRect: noop, translate: noop, save: noop, restore: noop, setTransform: noop,
    beginPath: noop, moveTo: noop, lineTo: noop, stroke: noop, measureText: () => ({ width: 0 }) };
  const g = { ctx: c2d, W: 192, H: 120, COL: { lcd: "#FFB547", dim: "#B08A48", dark: "#1C1812", hot: "#FF7A45", faint: "#3a2e18", mid: "#5a4524" },
    FONT: "10px VT323, monospace", BIG: "16px VT323, monospace", SPR: {}, fx: {}, reduce: false,
    text: noop, sprite: () => ({ width: 8, height: 8 }), overlay: noop, fmt: k => "€" + Math.round(k) + "k", sign: n => String(n),
    say: noop, flash: noop, now: () => 0, float: noop, banner: noop, line: noop, sfx: noop };
  let cart = null;
  const win = { RUNWAY: { register: c => { if (c.id === "blocks") cart = c; } }, Blocks: B };
  const sb = { window: win, RUNWAY: win.RUNWAY, Blocks: B, Math, console };
  try {
    vm.runInNewContext(fs.readFileSync(path.join(root, "games", "carts", "blocks.js"), "utf8"), sb);
    if (!cart) throw new Error("cartridge did not register");
    const wins = [];
    for (let n = 0; n < 3; n++) {
      const s = cart.create(), mem = {};
      for (let i = 0; i < 60 * LIMIT && !s.over && !s.won; i++) {
        cart.step(s, DT, cart.demo(s, mem));
        s.events.forEach(e => cart.onEvent && cart.onEvent(e, g, s)); s.events.length = 0;
        cart.draw(g, s); if (cart.overlay) cart.overlay(g, s);
        if (i % 5 === 0) cart.hud(s);
        cart.mood(s);
      }
      const r = cart.result(s), h = cart.hud(s);
      if (typeof r.title !== "string" || !Array.isArray(r.rows) || r.rows.length < 3 || r.rows.length > 5) throw new Error("result shape");
      if (h.cells.some(c => c[0].length > 9 || String(c[1]).length > 7) || h.row2[0].length > 9 || String(h.row2[1]).length > 7) throw new Error("hud too long: " + JSON.stringify(h));
      wins.push(r.win ? "won" : s.over + " in week " + s.weeks);
    }
    if (cart.help.length > 90) throw new Error("help is " + cart.help.length + " chars");
    console.log("\nDRAW SMOKE TEST\n  3 demo games drawn: " + wins.join(", "));
  } catch (e) { fails.push("draw smoke test: " + (e && e.stack || e)); }
})();

if (fails.length) { console.error("\nFAIL\n- " + fails.join("\n- ")); process.exit(1); }
console.log("\nOK: cash sense decides CASH FLOW.");
