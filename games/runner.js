/* ================= RUNWAY RUN: game rules (no DOM) =================
   A one-button runner. 18 months, 3.2 seconds each.
   Tap to jump, hold to jump higher. Burn drains cash all the time.
   Coins are revenue, obstacles are surprise costs, the papers up high
   fill the data room, and the data room decides the seed in month 6.
   Two gates ask a question: be in the air (top) or on the ground (bottom). */
var Runner = (function(){
  var W = 256, GROUND = 124, PX = 36, PW = 10, PH = 14;
  var G = 1400, JUMP_V = -360, HOLD_G = 0.42, HOLD_MAX = 0.22;
  var MONTH = 3.2, MONTHS = 18;
  var START = {cash:1200, burn:150, team:60};
  var COIN = 12, HIT = {cash:80, team:8}, CHURN = {cash:50, team:5};
  var DOC_TIMES = [0.8, 1.9, 3.0, 4.2, 5.3], DOCS_FULL = 4, SEED_MONTH = 6.5;
  var GATE_MONTHS = [9, 14];
  var GATES = [
    {prompt:"Your best engineer has an offer 30% higher.",
      up:{t:"SALARY BANDS", fx:{burn:8, team:20}, r:"Pay is visible. Nobody leaves."},
      down:{t:"COUNTER-OFFER", fx:{burn:3, team:-25}, r:"She stays. Three others find out."}},
    {prompt:"The plan says five hires this quarter.",
      up:{t:"HIRE FIVE", fx:{burn:40, team:10, coin:6}, r:"Payroll up. Every coin is worth more."},
      down:{t:"HIRE TWO", fx:{burn:15, team:-5}, r:"Runway safe. The team is stretched."}},
    {prompt:"A third of revenue is in USD and the euro is moving.",
      up:{t:"HEDGE", fx:{cash:-15}, r:"Hedged. The swing barely touches you."},
      down:{t:"LET IT RIDE", luck:{p:.5, win:{fx:{cash:40}, r:"Lucky: +€40k."}, lose:{fx:{cash:-150}, r:"The dollar drops. −€150k."}}}}
  ];
  var KINDS = [{k:"INVOICE", w:10, h:13}, {k:"TAX", w:13, h:16}, {k:"FX", w:12, h:11}];

  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function shuffle(a,r){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}

  function create(seed){
    var r = rng(seed == null ? (Math.random()*1e9)|0 : seed);
    var gates = shuffle(GATES, r).slice(0, 2).map(function(g){return {prompt:g.prompt, up:g.up, down:g.down, spawned:false}});
    return {
      t:0, month:0, cash:START.cash, burn:START.burn, team:START.team, coin:COIN,
      y:GROUND-PH, vy:0, ground:true, prevDown:false, holdT:0,
      speed:120, objs:[], gap:1.4, quiet:0, docs:0, docNext:0, raised:null,
      gates:gates, gateNext:0, prompt:null, inv:0, hits:0, coins:0,
      over:null, won:false, events:[], rnd:r
    };
  }
  function speedAt(t){return 120 + 70*Math.min(1, t/(MONTHS*MONTH))}
  function travel(s){return (W - PX)/s.speed}
  function ev(s, type, text, x, y){s.events.push({type:type, text:text||"", x:x==null?PX:x, y:y==null?s.y:y})}
  function fx(s, e){
    for(var k in e){ if(k==="coin") s.coin += e[k]; else s[k] += e[k]; }
    s.team = Math.max(0, Math.min(100, s.team));
  }

  function spawn(s){
    var r = s.rnd, m = s.t/MONTH, x = W + 8;
    var roll = r();
    if(m > 2.5 && roll < 0.14){
      s.objs.push({type:"churn", x:x, y:GROUND-PH-26, w:14, h:8});
    }else if(roll < 0.55){
      var k = KINDS[Math.floor(r()*KINDS.length)];
      s.objs.push({type:"cost", kind:k.k, x:x, y:GROUND-k.h, w:k.w, h:k.h});
    }else{
      var high = r() < 0.5, n = 3;
      for(var i=0;i<n;i++) s.objs.push({type:"coin", x:x+i*14, y:high?GROUND-54:GROUND-12, w:8, h:8});
    }
    s.gap = Math.max(0.72, 1.35 - m*0.03) * (0.8 + r()*0.45);
  }

  function step(s, dt, down){
    if(s.over || s.won) return s;
    s.t += dt; s.month = Math.floor(s.t/MONTH); s.speed = speedAt(s.t);
    s.cash -= s.burn*dt/MONTH;
    if(s.inv > 0) s.inv -= dt;

    /* jump */
    if(down && !s.prevDown && s.ground){s.vy = JUMP_V; s.ground = false; s.holdT = 0; ev(s,"jump")}
    if(!s.ground){
      var g = G;
      if(down && s.vy < 0 && s.holdT < HOLD_MAX){g = G*HOLD_G; s.holdT += dt}
      s.vy += g*dt; s.y += s.vy*dt;
      if(s.y >= GROUND-PH){s.y = GROUND-PH; s.vy = 0; s.ground = true}
    }
    s.prevDown = down;

    /* scheduled things: data room papers, gates, the seed */
    var lead = travel(s);
    if(s.docNext < DOC_TIMES.length && s.t >= DOC_TIMES[s.docNext]*MONTH - lead){
      s.objs.push({type:"doc", x:W+8, y:GROUND-PH-68, w:8, h:10}); s.docNext++; s.quiet = Math.max(s.quiet, 0.6);
    }
    if(s.gateNext < s.gates.length){
      var gt = GATE_MONTHS[s.gateNext]*MONTH;
      if(!s.prompt && s.t >= gt - lead - 2.2){s.prompt = s.gates[s.gateNext]; ev(s,"prompt",s.prompt.prompt); s.quiet = 99}
      if(s.prompt && !s.prompt.spawned && s.t >= gt - lead){
        s.prompt.spawned = true;
        s.objs.push({type:"gate", x:W+8, y:6, w:14, h:GROUND-6, gate:s.prompt});
      }
    }
    if(s.raised === null && s.t >= SEED_MONTH*MONTH){
      s.raised = s.docs >= DOCS_FULL ? 3000 : s.docs >= 3 ? 1500 : 0;
      s.cash += s.raised;
      ev(s, "seed", s.raised === 3000 ? "SEED CLOSED: €3M" : s.raised ? "SMALLER ROUND: €1.5M" : "NO TERM SHEET", 128, 50);
    }

    /* spawner */
    if(s.quiet > 0 && s.quiet < 90) s.quiet -= dt;
    var docSoon = s.docNext < DOC_TIMES.length && s.t >= DOC_TIMES[s.docNext]*MONTH - lead - 0.7;
    if(s.quiet <= 0 && !docSoon){s.gap -= dt; if(s.gap <= 0) spawn(s)}

    /* move + collide */
    var bx = PX+1, by = s.y+1, bw = PW-2, bh = PH-1;
    for(var i=0;i<s.objs.length;i++){
      var o = s.objs[i]; o.x -= s.speed*dt;
      if(o.done) continue;
      if(o.type === "gate"){
        if(o.x + o.w/2 <= PX + PW/2){
          o.done = true;
          var up = s.y + PH < GROUND - 16, c = up ? o.gate.up : o.gate.down, txt;
          if(c.luck){var out = s.rnd() < c.luck.p ? c.luck.win : c.luck.lose; fx(s, out.fx); txt = out.r}
          else{fx(s, c.fx); txt = c.r}
          o.choice = up ? "up" : "down";
          ev(s, "gate", c.t + ". " + txt, PX, up ? 30 : 90);
          s.prompt = null; s.gateNext++; s.quiet = 0.8;
        }
        continue;
      }
      if(bx < o.x+o.w && bx+bw > o.x && by < o.y+o.h && by+bh > o.y){
        if(o.type === "coin"){o.done = true; s.cash += s.coin; s.coins++; ev(s,"coin","+"+s.coin+"k",o.x,o.y)}
        else if(o.type === "doc"){o.done = true; s.docs++; ev(s,"doc","DATA ROOM "+s.docs+"/5",o.x,o.y)}
        else if(s.inv <= 0){
          var hit = o.type === "churn" ? CHURN : HIT;
          o.done = true; s.cash -= hit.cash; s.team = Math.max(0, s.team - hit.team); s.inv = 1; s.hits++;
          ev(s, "hit", (o.type === "churn" ? "CHURN" : o.kind) + " −" + hit.cash + "k", o.x, o.y);
        }
      }
    }
    s.objs = s.objs.filter(function(o){return o.x + o.w > -20 && !(o.done && o.type !== "gate" && o.type !== "cost" && o.type !== "churn")});

    if(s.cash <= 0){s.cash = 0; s.over = "cash"}
    else if(s.team <= 0){s.over = "team"}
    else if(s.t >= MONTHS*MONTH){s.won = true; s.month = MONTHS}
    return s;
  }
  function runway(s){return s.burn > 0 ? s.cash/s.burn : Infinity}

  return {W:W, H:144, GROUND:GROUND, PX:PX, PW:PW, PH:PH, MONTH:MONTH, MONTHS:MONTHS, DOCS_FULL:DOCS_FULL,
    create:create, step:step, runway:runway};
})();
