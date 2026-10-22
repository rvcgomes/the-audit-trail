/* ================= FULL DIARY: game rules (no DOM) =================
   A clinic for four weeks. Before the first week: set the private price and
   choose which agreements to sign. Then patients arrive one at a time; book
   them or turn them away. The diary has eight hours a week, and each hour costs
   the same whether it's booked or not.
   - A higher private price brings fewer private patients.
   - An agreement sends patients at its own tariff. Some of them come back
     later as private patients (acquisition through the agreement).
   - When the diary is full, a private patient who arrives is lost.
   At the end each agreement gets a verdict: what it paid, what it brought
   in private patients, and what it pushed out of a full diary.
   These are game numbers, not market data. */
var Agenda = (function(){
  var WEEKS = 4, SLOTS = 8, HOUR = 34, DECIDE = 1.7, GAP = 0.25, NOSHOW = 0.1, BREAK = 1.4;
  var PRICES = [40, 45, 50, 55, 60, 65, 70, 75, 80, 90], PRICE0 = 2;
  /* private patients a week at a given price */
  function demand(p){return Math.max(0.6, 12 - 0.12*p)}
  var DEALS = [
    {id:"care", name:"INSURER", tariff:20, perWeek:3.5, refer:0.2},
    {id:"mutual", name:"HEALTH PLAN", tariff:32, perWeek:2, refer:0.1}
  ];
  var ROWS = 1 + DEALS.length + 1;   /* price, each agreement, start */
  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  function create(seed){
    var r = rng(seed == null ? (Math.random()*1e9)|0 : seed);
    var s = {r:r, t:0, phase:"setup", sel:ROWS - 1, pi:PRICE0, signed:{}, week:0, slots:[], queue:[], cur:null, timer:0, wait:0,
      carry:0, carry_from:[], cash:0, events:[], over:false, won:false,
      stat:{private:{booked:0, came:0, revenue:0, lost:0, turned:0}, weeks:[]}};
    DEALS.forEach(function(d){s.signed[d.id] = true; s.stat[d.id] = {booked:0, came:0, revenue:0, referred:0, referredRevenue:0, pushed:0, turned:0}});
    return s;
  }
  function price(s){return PRICES[s.pi]}
  function deal(id){for(var i=0;i<DEALS.length;i++) if(DEALS[i].id === id) return DEALS[i]; return null}
  function count(r, mean){var n = Math.floor(mean); if(r() < mean - n) n++; return n}

  function startWeek(s){
    var r = s.r, q = [], i, k;
    for(i=0;i<count(r, demand(price(s)));i++) q.push({kind:"private"});
    for(i=0;i<s.carry;i++) q.push({kind:"private", from:s.carry_from[i]});
    DEALS.forEach(function(d){if(s.signed[d.id]) for(k=0;k<count(r, d.perWeek);k++) q.push({kind:d.id})});
    for(i=q.length - 1;i>0;i--){var j = Math.floor(r()*(i + 1)), x = q[i]; q[i] = q[j]; q[j] = x}
    s.queue = q; s.carry = 0; s.carry_from = []; s.slots = []; s.week++;
    s.wk = {lost:0, byDeal:{}};
    s.events.push({type:"week", week:s.week});
    s.wait = 0.6; s.cur = null;
  }
  function next(s){
    if(!s.queue.length){endWeek(s); return}
    s.cur = s.queue.shift(); s.timer = DECIDE;
    s.cur.price = s.cur.kind === "private" ? price(s) : deal(s.cur.kind).tariff;
    s.events.push({type:"arrive", kind:s.cur.kind, price:s.cur.price, full:s.slots.length >= SLOTS});
  }
  function book(s){
    var c = s.cur; if(!c) return;
    if(s.slots.length >= SLOTS){
      if(c.kind === "private"){s.stat.private.lost++; s.wk.lost++}
      s.events.push({type:"full", kind:c.kind});
    }else{
      s.slots.push(c);
      var st = c.kind === "private" ? s.stat.private : s.stat[c.kind];
      st.booked++;
      if(c.kind !== "private"){s.wk.byDeal[c.kind] = (s.wk.byDeal[c.kind] || 0) + 1}
      s.events.push({type:"book", kind:c.kind, price:c.price, slot:s.slots.length - 1});
    }
    s.cur = null; s.wait = GAP;
  }
  function turn(s, why){
    var c = s.cur; if(!c) return;
    if(c.kind === "private"){
      if(s.slots.length >= SLOTS){s.stat.private.lost++; s.wk.lost++} else s.stat.private.turned++;
    }else s.stat[c.kind].turned++;
    s.events.push({type:why || "turn", kind:c.kind});
    s.cur = null; s.wait = GAP;
  }
  function endWeek(s){
    var r = s.r, rev = 0, p = price(s);
    s.slots.forEach(function(c){
      c.came = r() >= NOSHOW;
      if(!c.came) return;
      rev += c.price;
      if(c.kind === "private"){
        s.stat.private.came++; s.stat.private.revenue += c.price;
        if(c.from){s.stat[c.from].referredRevenue += c.price}
      }else{
        var st = s.stat[c.kind]; st.came++; st.revenue += c.price;
        if(r() < deal(c.kind).refer){st.referred++; s.carry++; s.carry_from.push(c.kind)}
      }
    });
    /* private patients lost to a full diary are put down to the agreement patients holding hours that week */
    var held = 0, id;
    for(id in s.wk.byDeal) held += s.wk.byDeal[id];
    if(s.wk.lost && held){
      var pushed = Math.min(s.wk.lost, held);
      for(id in s.wk.byDeal) s.stat[id].pushed += pushed*s.wk.byDeal[id]/held;
    }
    var cost = SLOTS*HOUR, profit = rev - cost;
    s.cash += profit;
    s.stat.weeks.push({week:s.week, revenue:rev, cost:cost, profit:profit, booked:s.slots.length, lost:s.wk.lost});
    s.events.push({type:"weekEnd", week:s.week, revenue:rev, cost:cost, profit:profit, noShows:s.slots.filter(function(c){return !c.came}).length});
    s.cur = null;
    if(s.week >= WEEKS){
      if(s.cash > 0){s.won = true; s.events.push({type:"won"})} else {s.over = true; s.events.push({type:"over"})}
      s.phase = "done";
    }else{s.phase = "break"; s.wait = BREAK}
  }

  function step(s, dt, inp){
    if(s.over || s.won) return;
    var p = inp.press || {};
    s.t += dt;
    if(s.phase === "setup"){
      if(p.up){s.sel = (s.sel + ROWS - 1) % ROWS; s.events.push({type:"move"})}
      if(p.down){s.sel = (s.sel + 1) % ROWS; s.events.push({type:"move"})}
      var d = p.left ? -1 : p.right ? 1 : 0;
      if(d && s.sel === 0){s.pi = Math.max(0, Math.min(PRICES.length - 1, s.pi + d)); s.events.push({type:"price", price:price(s)})}
      else if(d && s.sel > 0 && s.sel <= DEALS.length){var id = DEALS[s.sel - 1].id; s.signed[id] = !s.signed[id]; s.events.push({type:"sign", id:id, on:s.signed[id]})}
      if(p.a){
        if(s.sel > 0 && s.sel <= DEALS.length){var id2 = DEALS[s.sel - 1].id; s.signed[id2] = !s.signed[id2]; s.events.push({type:"sign", id:id2, on:s.signed[id2]})}
        else{s.phase = "week"; s.carry_from = []; startWeek(s)}
      }
      return;
    }
    if(s.phase === "break"){
      s.wait -= dt; if(s.wait <= 0){s.phase = "week"; startWeek(s)}
      return;
    }
    if(s.phase !== "week") return;
    if(!s.cur){s.wait -= dt; if(s.wait <= 0) next(s); return}
    if(p.a) book(s);
    else if(p.down || p.left) turn(s);
    else{s.timer -= dt; if(s.timer <= 0) turn(s, "left")}
  }

  /* verdict for each signed agreement: what it paid, plus the private patients it
     brought, minus the private revenue it pushed out of a full diary */
  function verdicts(s){
    var p = price(s);
    return DEALS.filter(function(d){return s.signed[d.id]}).map(function(d){
      var st = s.stat[d.id], pushed = Math.round(st.pushed*10)/10;
      var net = st.revenue + st.referredRevenue - st.pushed*p*(1 - NOSHOW);
      return {id:d.id, name:d.name, tariff:d.tariff, booked:st.booked, came:st.came, revenue:st.revenue,
        referred:st.referred, referredRevenue:st.referredRevenue, pushed:pushed, net:Math.round(net), pays:net > 0, belowHour:d.tariff < HOUR};
    });
  }
  function free(s){return SLOTS - s.slots.length}

  return {WEEKS:WEEKS, SLOTS:SLOTS, HOUR:HOUR, DECIDE:DECIDE, PRICES:PRICES, DEALS:DEALS, ROWS:ROWS, NOSHOW:NOSHOW,
    create:create, step:step, price:price, demand:demand, deal:deal, verdicts:verdicts, free:free};
})();
