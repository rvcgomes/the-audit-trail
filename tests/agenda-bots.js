// Plays FULLY BOOKED with bots that set the price and the agreements differently,
// and checks that the choices decide the result:
//   - a careful bot (books agreement patients only into hours privates won't fill) wins most games;
//   - booking everyone at the default price is a coin toss;
//   - a high price with no agreements loses most games;
//   - no agreements at a sensible price earns less than the careful bot.
// It also checks the verdicts: CARE+ (below the cost of an hour) pays more often when booked with care.
// Run: node tests/agenda-bots.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const read = f => fs.readFileSync(path.join(__dirname, "..", "games", f), "utf8");
const ctx = {};
vm.runInNewContext(read("agenda.js") + "\nthis.Agenda=Agenda;", ctx);
const { Agenda } = ctx;
const DT = 1 / 30, SEEDS = 400, REACT = 0.8, fails = [];
const idle = () => ({ press: {} });

// setup: go up to the price row, set the price, set each agreement, then start
function setup(s, mem, cfg) {
  if (!mem.top) { if (s.sel !== 0) return { press: { up: true } }; mem.top = true; }
  if (s.sel === 0) {
    const want = Agenda.PRICES.indexOf(cfg.price);
    if (s.pi !== want) return { press: s.pi < want ? { right: true } : { left: true } };
    return { press: { down: true } };
  }
  if (s.sel <= Agenda.DEALS.length) {
    const d = Agenda.DEALS[s.sel - 1];
    return { press: !!s.signed[d.id] !== !!cfg.deals[d.id] ? { right: true } : { down: true } };
  }
  return { press: { a: true } };
}
// a player who takes REACT seconds to decide on each patient
function bot(cfg, decide) {
  return (s, mem) => {
    if (s.phase === "setup") return setup(s, mem, cfg);
    if (!s.cur || s.phase !== "week" || Agenda.DECIDE - s.timer < REACT) return idle();
    return { press: decide(s) ? { a: true } : { down: true } };
  };
}
const all = () => true;
// books an agreement patient only if the free hours beat the private patients still expected,
// from what the player can see: the waiting room and the price
function careful(s) {
  const c = s.cur, free = Agenda.free(s);
  if (c.kind === "private") return true;
  if (free <= 0) return false;
  const priv = Agenda.demand(Agenda.price(s)), deals = Agenda.DEALS.reduce((n, d) => n + (s.signed[d.id] ? d.perWeek : 0), 0);
  const expectedPriv = s.queue.length * priv / (priv + deals);
  return free > (Agenda.deal(c.kind).tariff >= Agenda.HOUR ? 0.5 : 0.9) * expectedPriv;
}

const BOTS = {
  careful: bot({ price: 60, deals: { care: true, mutual: true } }, careful),
  bookAll: bot({ price: 50, deals: { care: true, mutual: true } }, all),
  noDeals50: bot({ price: 50, deals: {} }, all),
  greedy90: bot({ price: 90, deals: {} }, all),
  cheap40All: bot({ price: 40, deals: { care: true, mutual: true } }, all)
};

function play(name, seed) {
  const s = Agenda.create(seed), mem = {}, b = BOTS[name];
  for (let i = 0; i < 30 * 60 * 5 && !s.over && !s.won; i++) { Agenda.step(s, DT, b(s, mem)); s.events.length = 0; }
  if (!s.over && !s.won) throw new Error(name + " seed " + seed + " never finished, phase " + s.phase);
  return { won: s.won, cash: s.cash, t: s.t, v: Agenda.verdicts(s), lost: s.stat.private.lost };
}

const res = {};
for (const name of Object.keys(BOTS)) {
  let wins = 0, cash = 0, t = 0, lost = 0; const pays = {}, n = {};
  for (let k = 0; k < SEEDS; k++) {
    const r = play(name, 1000 + k);
    wins += r.won; cash += r.cash; t += r.t; lost += r.lost;
    r.v.forEach(v => { pays[v.id] = (pays[v.id] || 0) + v.pays; n[v.id] = (n[v.id] || 0) + 1; });
  }
  res[name] = { win: wins / SEEDS, cash: cash / SEEDS, t: t / SEEDS, lost: lost / SEEDS, pays: Object.fromEntries(Object.keys(pays).map(k => [k, pays[k] / n[k]])) };
  console.log(name.padEnd(11), "win", Math.round(100 * res[name].win) + "%", " profit €" + Math.round(res[name].cash),
    " lost private", res[name].lost.toFixed(1), " game", Math.round(res[name].t) + "s",
    " pays:", JSON.stringify(Object.fromEntries(Object.entries(res[name].pays).map(([k, v]) => [k, Math.round(100 * v) + "%"]))));
}

const check = (cond, msg) => { if (!cond) fails.push(msg); };
check(res.careful.win >= 0.8, "careful bot should win at least 80%");
check(res.bookAll.win >= 0.3 && res.bookAll.win <= 0.7, "booking everyone at €50 should be a coin toss (30–70%)");
check(res.greedy90.win <= 0.2, "€90 with no agreements should lose most games");
check(res.careful.cash > res.noDeals50.cash, "careful use of agreements should beat no agreements");
check(res.careful.pays.care > res.bookAll.pays.care, "CARE+ should pay more often when booked with care");
check(res.careful.t >= 35 && res.careful.t <= 90, "a game should last 35–90 s");

console.log(fails.length ? "\nFAILED:\n- " + fails.join("\n- ") : "\nOK: the choices decide the result.");
process.exit(fails.length ? 1 : 0);
