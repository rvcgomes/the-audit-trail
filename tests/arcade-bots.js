// Plays RUNWAY RUN and BOARD FIGHT with bots of different skill and checks
// that skill decides the result: a good player wins, careless ones don't.
// Run: node tests/arcade-bots.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const ctx = {};
for (const f of ["runner.js", "fight.js"])
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "games", f), "utf8") + "\nthis.Runner=typeof Runner!=='undefined'?Runner:this.Runner;this.Fight=typeof Fight!=='undefined'?Fight:this.Fight;", ctx);
const { Runner, Fight } = ctx;
const DT = 1 / 60, SEEDS = 300;
const fails = [];
const pct = (a, b) => Math.round((100 * a) / b) + "%";

/* ---------- runner bots ---------- */
// skill: probability of reacting to each thing correctly; wantDocs: goes for the papers
function runnerBot(skill, opts = {}) {
  return (s, rnd, mem) => {
    const ahead = o => o.x - (Runner.PX + Runner.PW);
    const lookT = 0.19 + (mem.late || 0);
    let want = false, hold = false;
    for (const o of s.objs) {
      if (o.done || o.decided) continue;
      const d = ahead(o) / s.speed;
      if (o.type === "cost" && d < lookT && d > 0) { o.decided = true; o.jump = rnd() < skill; }
      if (o.type === "doc" && d < 0.3 && d > 0) { o.decided = true; o.jump = opts.docs !== false && rnd() < skill; o.high = true; }
      if (o.type === "coin" && o.y < 100 && d < 0.2 && d > 0) { o.decided = true; o.jump = opts.coins !== false && rnd() < skill * 0.9; }
      if (o.type === "gate" && d < 0.25 && d > 0) { o.decided = true; o.jump = (opts.gate || (() => rnd() < 0.5))(o.gate); }
    }
    // never jump into churn if skilled
    const churnNear = s.objs.some(o => o.type === "churn" && !o.done && ahead(o) / s.speed < 0.45 && o.x + o.w > Runner.PX - 6);
    for (const o of s.objs) if (o.jump && !o.fired) {
      if (churnNear && rnd() < skill) { o.fired = true; continue; }
      o.fired = true; want = true; if (o.high) mem.holdUntil = s.t + 0.24;
    }
    hold = mem.holdUntil > s.t;
    return want || (hold && !s.ground);
  };
}
function playRunner(bot, seed) {
  const s = Runner.create(seed), rnd = mulberry(seed * 7 + 1), mem = {};
  for (let i = 0; i < 60 * 70 && !s.over && !s.won; i++) { Runner.step(s, DT, bot(s, rnd, mem)); s.events.length = 0; }
  return s;
}
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function runnerSuite(name, bot) {
  const rs = Array.from({ length: SEEDS }, (_, i) => playRunner(bot, i + 1));
  const w = rs.filter(s => s.won).length;
  const avg = k => (rs.reduce((a, s) => a + s[k], 0) / rs.length).toFixed(1);
  const seed = rs.filter(s => s.raised === 3000).length;
  console.log(`  ${name.padEnd(26)} win ${pct(w, SEEDS).padStart(4)}  cash-out ${pct(rs.filter(s => s.over === "cash").length, SEEDS).padStart(4)}  walk-out ${pct(rs.filter(s => s.over === "team").length, SEEDS).padStart(4)}  €3M ${pct(seed, SEEDS).padStart(4)}  docs ${avg("docs")}  hits ${avg("hits")}  coins ${avg("coins")}`);
  return w / SEEDS;
}
console.log("RUNWAY RUN");
const rPerfect = runnerSuite("perfect", runnerBot(1));
const rGood = runnerSuite("good (90%)", runnerBot(0.9));
const rMid = runnerSuite("average (75%)", runnerBot(0.75));
const rPoor = runnerSuite("poor (50%)", runnerBot(0.5));
const rNoDocs = runnerSuite("perfect, skips the papers", runnerBot(1, { docs: false }));
const rIdle = runnerSuite("never jumps", () => false);
const rSpam = runnerSuite("jumps all the time", (s) => s.ground);
if (rPerfect < 0.97) fails.push("runner: a perfect player should always win");
if (rGood < 0.6) fails.push("runner: a good player should usually win");
if (rPoor > 0.25) fails.push("runner: a poor player wins too often");
if (rNoDocs > 0.1) fails.push("runner: skipping the data room should not work");
if (rIdle > 0 || rSpam > 0.05) fails.push("runner: doing nothing (or mashing) should not win");

/* ---------- fight bots ---------- */
function fightBot(skill, opts = {}) {
  return (s, rnd, mem) => {
    if (s.phase !== "fight") return false;
    const b = s.boss, target = (b.zone[0] + b.zone[1]) / 2 + (rnd() - 0.5) * (1 - skill) * 60;
    if (s.charging) {
      if (s.winding && b.windup - s.wind > 0.2 && opts.careful !== false && (mem.w === s.wind ? mem.r : (mem.r = rnd() < skill))) { mem.w = s.wind; return false; }
      return s.power < (opts.release || target);
    }
    const need = target / b.rate;
    if (s.cool > 0) return false;
    if (!s.winding && (opts.careful === false || s.next > need * (1.1 + (1 - skill)))) return true;
    return false;
  };
}
function playFight(bot, seed) {
  const s = Fight.create(seed), rnd = mulberry(seed * 13 + 5), mem = {};
  for (let i = 0; i < 60 * 400 && !s.over && !s.won; i++) { Fight.step(s, DT, bot(s, rnd, mem)); s.events.length = 0; }
  return s;
}
function fightSuite(name, bot) {
  const rs = Array.from({ length: SEEDS }, (_, i) => playFight(bot, i + 1));
  const w = rs.filter(s => s.won).length;
  const reached = rs.reduce((a, s) => a + s.round + (s.won ? 1 : 0), 0) / rs.length;
  console.log(`  ${name.padEnd(26)} win ${pct(w, SEEDS).padStart(4)}  bosses beaten ${reached.toFixed(1)}/4  clean hits ${(rs.reduce((a, s) => a + s.clean, 0) / rs.length).toFixed(1)}  months lost ${(rs.reduce((a, s) => a + s.taken, 0) / rs.length).toFixed(1)}`);
  return w / SEEDS;
}
console.log("\nBOARD FIGHT");
const fPerfect = fightSuite("perfect", fightBot(1));
const fGood = fightSuite("good (85%)", fightBot(0.85));
const fMid = fightSuite("average (65%)", fightBot(0.65));
const fGreedy = fightSuite("never lets go on '!'", fightBot(1, { careful: false }));
const fEarly = fightSuite("always releases at 40%", fightBot(1, { release: 40 }));
const fHold = fightSuite("holds forever", (s) => s.phase === "fight");
const fMash = fightSuite("mashes", (s, r) => s.phase === "fight" && r() < 0.5);
if (fPerfect < 0.97) fails.push("fight: a perfect player should always win");
if (fGood < 0.5) fails.push("fight: a good player should usually win");
if (fGreedy > 0.2) fails.push("fight: ignoring the wind-up should not work");
if (fEarly > 0.3) fails.push("fight: weak early hits should not be enough");
if (fHold > 0 || fMash > 0) fails.push("fight: holding or mashing should not win");

if (fails.length) { console.error("\nFAIL\n- " + fails.join("\n- ")); process.exit(1); }
console.log("\nOK: skill decides both arcade games.");
