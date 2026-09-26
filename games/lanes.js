/* ================= CLOSE THE MONTH: game rules (no DOM) =================
   A lane-crossing game on a 16×10 grid of 12px tiles. Each crossing closes
   one task of the month-end close. Row 9 is the start, rows 5–8 are
   deadlines that rush along (touch one and you lose a life), row 4 is safe,
   rows 1–3 only hold you if you stand on a moving sign-off (they carry you;
   off the page is a life), and row 0 has five slots: CASH, AR, AP, PAYROLL,
   REPORT. Land in an open slot to close it. Each attempt is one day of
   24 hours (1 hour a second). Close all five with three lives. */
var Lanes = (function(){
  var TILE = 12, COLS = 16, ROWS = 10, START_ROW = 9, MID_ROW = 4, START_COL = 7;
  var EDGE = 4, LOOP = COLS + 2*EDGE;
  var HOURS = 24, LIVES = 3, COOL = 0.12, DEAD_PAUSE = 0.9, FILL_PAUSE = 0.7, SPEED_UP = 0.08;
  var SLOTS = [{name:"CASH", c:1}, {name:"AR", c:4}, {name:"AP", c:7}, {name:"PAYROLL", c:10}, {name:"REPORT", c:13}];
  var DEADLINES = [{t:"VAT", len:2}, {t:"PAYROLL", len:3}, {t:"BANK REC", len:4}, {t:"BOARD PACK", len:4}, {t:"INVOICES", len:4}];
  var DEADLINE_LANES = [{row:8, dir:-1, speed:1.4}, {row:7, dir:1, speed:2.1}, {row:6, dir:-1, speed:1.2}, {row:5, dir:1, speed:2.7}];
  var SIGNOFF_LANES = [{row:3, dir:1, speed:1.2}, {row:2, dir:-1, speed:1.6}, {row:1, dir:1, speed:1.0}];

  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function shuffle(a,r){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
  function wrap(x){return x - LOOP*Math.floor((x + EDGE)/LOOP)}

  function create(seed){
    var r = rng(seed == null ? (Math.random()*1e9)|0 : seed), flip = r() < 0.5 ? -1 : 1;
    var lanes = [], labels = shuffle(DEADLINES, r);
    for(var k=0;k<ROWS;k++) lanes.push(null);
    DEADLINE_LANES.forEach(function(L, i){
      var d = labels[i], n = d.len <= 2 ? 3 : 2, gap = LOOP/n, x0 = r()*LOOP, items = [];
      for(var j=0;j<n;j++) items.push({x:wrap(x0 + j*gap + r()*1.5), len:d.len, t:d.t});
      lanes[L.row] = {kind:"deadline", row:L.row, dir:L.dir*flip, speed:L.speed*(0.9 + r()*0.2), items:items};
    });
    SIGNOFF_LANES.forEach(function(L){
      var n = 3, gap = LOOP/n, x0 = r()*LOOP, items = [];
      for(var j=0;j<n;j++) items.push({x:wrap(x0 + j*gap), len:2 + Math.floor(r()*3)});
      lanes[L.row] = {kind:"signoff", row:L.row, dir:L.dir*flip, speed:L.speed*(0.9 + r()*0.2), items:items};
    });
    var top = 0;
    for(var q=5;q<=8;q++) if(!top || lanes[q].speed > lanes[top].speed) top = q;
    lanes[top].hot = true;
    return {
      t:0, row:START_ROW, px:START_COL, cool:0, queue:null, hopT:9, face:"up",
      lives:LIVES, hours:HOURS, day:1, filled:[false, false, false, false, false], closed:0, mult:1,
      wait:0, dead:null, deadRow:0, deadX:0, hops:0, lost:{hit:0, fall:0, off:0, time:0, gap:0, twice:0},
      lanes:lanes, over:null, won:false, events:[]
    };
  }
  function ev(s, type, text, x, y){s.events.push({type:type, text:text || "", x:x == null ? s.px*TILE : x, y:y == null ? s.row*TILE : y})}
  function vel(s, row){var L = s.lanes[row]; return L && L.kind === "signoff" ? L.dir*L.speed*s.mult : 0}
  function posAt(s, L, it, tau){return wrap(it.x + L.dir*L.speed*s.mult*(tau || 0))}
  function slotAt(c){for(var i=0;i<SLOTS.length;i++) if(c === SLOTS[i].c || c === SLOTS[i].c + 1) return i; return -1}

  /* what happens to a player at (row, px) tau seconds from now: 0 = fine, or the reason it is not */
  function check(s, row, px, tau){
    var L = s.lanes[row];
    if(!L) return 0;
    var i, x;
    if(L.kind === "deadline"){
      for(i=0;i<L.items.length;i++){x = posAt(s, L, L.items[i], tau); if(px + 0.2 < x + L.items[i].len && px + 0.8 > x) return "hit"}
      return 0;
    }
    var c = px + 0.5;
    if(c < 0 || c > COLS) return "off";
    for(i=0;i<L.items.length;i++){x = posAt(s, L, L.items[i], tau); if(c >= x && c <= x + L.items[i].len) return 0}
    return "fall";
  }

  var WHY = {hit:"", fall:"NOT SIGNED OFF", off:"CARRIED OFF THE PAGE", time:"OUT OF HOURS", gap:"MISSED THE SLOT", twice:"ALREADY CLOSED"};
  function lose(s, kind, text){
    s.lives--; s.lost[kind]++; s.wait = DEAD_PAUSE; s.dead = kind; s.deadRow = s.row; s.deadX = s.px;
    ev(s, kind === "hit" ? "hit" : "hurt", text || WHY[kind]);
    if(s.lives <= 0){s.lives = 0; s.over = kind}
  }
  function land(s, c){
    var i = slotAt(c);
    if(i < 0) return lose(s, "gap");
    if(s.filled[i]) return lose(s, "twice");
    s.filled[i] = true; s.closed++; s.mult = 1 + SPEED_UP*s.closed; s.wait = FILL_PAUSE; s.dead = null;
    ev(s, "good", SLOTS[i].name + " CLOSED", (SLOTS[i].c + 1)*TILE, 0);
    if(s.closed >= SLOTS.length){s.won = true; ev(s, "line", "MONTH CLOSED")}
  }
  function respawn(s){
    s.row = START_ROW; s.px = START_COL; s.cool = 0; s.queue = null; s.hours = HOURS; s.dead = null; s.day++; s.face = "up";
    ev(s, "day", "DAY " + s.day);
  }
  function hop(s, d){
    var dr = d === "up" ? -1 : d === "down" ? 1 : 0, dc = d === "left" ? -1 : d === "right" ? 1 : 0;
    var c = Math.round(s.px) + dc, r = s.row + dr;
    if(r > START_ROW || c < 0 || c > COLS - 1) return false;
    s.px = c; s.row = r; s.cool = COOL; s.hops++; s.hopT = 0; s.face = d; ev(s, "jump");
    if(r === 0) land(s, c);
    return true;
  }
  function move(s, dt){
    for(var r=0;r<ROWS;r++){
      var L = s.lanes[r]; if(!L) continue;
      for(var i=0;i<L.items.length;i++) L.items[i].x = wrap(L.items[i].x + L.dir*L.speed*s.mult*dt);
    }
  }

  /* press = {a, up, down, left, right}: edges this frame */
  function step(s, dt, press){
    if(s.over || s.won) return s;
    press = press || {};
    s.t += dt; s.hopT += dt;
    if(s.wait > 0){
      move(s, dt); s.wait -= dt;
      if(s.wait <= 0){s.wait = 0; respawn(s)}
      return s;
    }
    s.hours -= dt; s.cool -= dt;
    var d = press.up || press.a ? "up" : press.left ? "left" : press.right ? "right" : press.down ? "down" : null;
    if(d && s.cool > 0){s.queue = d; d = null}
    else if(!d && s.queue && s.cool <= 0){d = s.queue; s.queue = null}
    if(d){s.queue = null; hop(s, d); if(s.wait > 0 || s.over || s.won) return s}
    move(s, dt);
    s.px += vel(s, s.row)*dt;
    var bad = check(s, s.row, s.px, 0);
    if(bad) lose(s, bad, bad === "hit" ? hitBy(s) : null);
    else if(s.hours <= 0){s.hours = 0; lose(s, "time")}
    return s;
  }
  function hitBy(s){
    var L = s.lanes[s.row];
    for(var i=0;i<L.items.length;i++){var it = L.items[i]; if(s.px + 0.2 < it.x + it.len && s.px + 0.8 > it.x) return it.t + " HIT YOU"}
    return "DEADLINE HIT";
  }

  return {TILE:TILE, COLS:COLS, ROWS:ROWS, START_ROW:START_ROW, MID_ROW:MID_ROW, HOURS:HOURS, LIVES:LIVES, COOL:COOL,
    SLOTS:SLOTS, create:create, step:step, check:check, vel:vel, posAt:posAt, slotAt:slotAt, wrap:wrap};
})();
