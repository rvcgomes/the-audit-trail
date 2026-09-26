// Plays THE AUDIT TRAIL with bots of different skill and checks that skill
// decides the result: a careful player wins, a careless one mostly doesn't,
// wandering never does, and no game runs forever. Then draws three demo games
// through the cartridge with a fake screen to check nothing throws.
// Run: node tests/maze-bots.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const read = f => fs.readFileSync(path.join(__dirname, "..", "games", f), "utf8");
const ctx = {};
vm.runInNewContext(read("maze.js") + "\nthis.Maze=Maze;", ctx);
const { Maze } = ctx;
const DT = 1 / 60, SEEDS = +process.env.SEEDS || 300, LIMIT = 4 * 60;
const fails = [];
const pct = (a, b) => Math.round((100 * a) / b) + "%";
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- bots ---------- */
// smart: BFS to the nearest tick, keeps 2 tiles from unresolved findings, hunts resolved ones
const smart = (s, rnd, mem) => Maze.autopilot(s, mem, { avoid: true, hunt: true });
// greedy: BFS to the nearest tick, ignores the findings
const greedy = (s, rnd, mem) => Maze.autopilot(s, mem, {});
// random walk: picks a random open way at every tile, rarely turns back
function walker(s, rnd, mem) {
  const P = s.player, moving = P.dir && P.p > 0;
  const nx = moving ? (P.x + Maze.DX[P.dir] + Maze.COLS) % Maze.COLS : P.x, ny = moving ? P.y + Maze.DY[P.dir] : P.y;
  const key = nx + "," + ny;
  if (mem.key !== key) {
    mem.key = key;
    const ways = Maze.DIRS.filter(d => Maze.open(s, nx, ny, d));
    const fwd = ways.filter(d => !P.dir || Maze.DX[d] !== -Maze.DX[P.dir] || Maze.DY[d] !== -Maze.DY[P.dir]);
    const pick = fwd.length && rnd() < 0.9 ? fwd : ways;
    mem.want = pick[Math.floor(rnd() * pick.length)];
  }
  return { down: false, dir: mem.want, press: {}, taps: [] };
}

function play(bot, seed) {
  const s = Maze.create(seed), rnd = mulberry(seed * 7 + 3), mem = {};
  for (let i = 0; i < 60 * LIMIT && !s.over && !s.won; i++) { Maze.step(s, DT, bot(s, rnd, mem)); s.events.length = 0; }
  return s;
}
function suite(name, bot) {
  const rs = Array.from({ length: SEEDS }, (_, i) => play(bot, i + 1));
  const w = rs.filter(s => s.won).length, stuck = rs.filter(s => !s.won && !s.over).length;
  const avg = f => rs.reduce((a, s) => a + f(s), 0) / rs.length;
  const wins = rs.filter(s => s.won), winT = wins.length ? wins.reduce((a, s) => a + s.t, 0) / wins.length : 0;
  console.log(`  ${name.padEnd(22)} win ${pct(w, SEEDS).padStart(4)}  out of sign-offs ${pct(rs.filter(s => s.over === "lives").length, SEEDS).padStart(4)}  deadline ${pct(rs.filter(s => s.over === "deadline").length, SEEDS).padStart(4)}  level ${avg(s => s.level).toFixed(2)}  ticked ${avg(s => s.lines).toFixed(0).padStart(3)}  resolved ${avg(s => s.resolved).toFixed(1)}  game ${avg(s => s.t).toFixed(0).padStart(3)}s  win in ${winT.toFixed(0).padStart(3)}s  stuck ${stuck}`);
  if (stuck) fails.push(name + ": " + stuck + " games did not end within " + LIMIT + "s");
  if (rs.some(s => s.t > LIMIT)) fails.push(name + ": a game ran past " + LIMIT + "s");
  return w / SEEDS;
}
console.log("THE AUDIT TRAIL (" + SEEDS + " seeded games per bot)");
const wSmart = suite("smart", smart);
const wGreedy = suite("greedy, ignores them", greedy);
const wWalk = suite("random walk", walker);
if (wSmart < 0.7) fails.push("maze: the smart bot should win at least 70%");
if (wSmart - wGreedy < 0.25) fails.push("maze: ignoring the findings should cost at least 25 points of win rate");
if (wWalk > 0.05) fails.push("maze: a random walk should not win");

/* ---------- draw smoke test through the cartridge ---------- */
let cart = null;
const noop = () => {};
const fakeCtx = { fillRect: noop, drawImage: noop, fillText: noop, strokeRect: noop, translate: noop, save: noop, restore: noop, setTransform: noop,
  beginPath: noop, arc: noop, fill: noop, stroke: noop, measureText: () => ({ width: 0 }) };
const COL = { lcd: "#FFB547", dim: "#B08A48", dark: "#1C1812", hot: "#FF7A45", faint: "#3a2e18", mid: "#5a4524" };
const g = { ctx: fakeCtx, W: 192, H: 120, COL, FONT: "10px VT323, monospace", BIG: "16px VT323, monospace", SPR: {}, fx: {}, reduce: false,
  text: noop, sprite: () => ({ width: 8, height: 8 }), overlay: noop, fmt: String, sign: String, say: noop, flash: noop, now: () => 0,
  float: noop, banner: noop, line: noop, sfx: noop };
const RUNWAY = { register: c => { cart = c; } };
const cctx = { Maze, RUNWAY, window: { RUNWAY, Maze }, Math };
try {
  vm.runInNewContext(read("carts/maze.js"), cctx);
  if (!cart) throw new Error("the cartridge did not register");
  for (const k of ["id", "name", "sub", "help", "say", "create", "step", "draw", "hud", "result", "mood", "demo"]) if (cart[k] == null) throw new Error("cart." + k + " is missing");
  let frames = 0;
  for (let n = 0; n < 3; n++) {
    const s = cart.create(), mem = {};
    for (let i = 0; i < 60 * LIMIT && !s.over && !s.won; i++) {
      cart.step(s, DT, cart.demo(s, mem));
      (s.events || []).forEach(e => cart.onEvent ? cart.onEvent(e, g, s) : 0); s.events.length = 0;
      cart.draw(g, s); if (cart.overlay) cart.overlay(g, s);
      const h = cart.hud(s), m = cart.mood(s);
      if (!h.cells || h.cells.length !== 3 || !h.row2) throw new Error("hud shape");
      if (!(m >= 0 && m <= 1)) throw new Error("mood out of range: " + m);
      frames++;
    }
    const r = cart.result(s);
    if (!r.title || !r.rows || r.rows.length < 3 || r.rows.length > 5) throw new Error("result shape");
  }
  console.log("\n  draw smoke test: 3 demo games, " + frames + " frames drawn, nothing threw");
} catch (e) { fails.push("draw smoke test: " + (e.stack || e)); }

if (fails.length) { console.error("\nFAIL\n- " + fails.join("\n- ")); process.exit(1); }
console.log("\nOK: skill decides THE AUDIT TRAIL, and the cartridge draws.");
