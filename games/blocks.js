/* ================= CASH FLOW: game rules (no DOM) =================
   Falling blocks with a ledger. Every piece is money in (+) or money out (−).
   A full row is a week closed: its cash effect is (+ cells − − cells) × €8k.
   A week that closes with more − than + also pays a €20k overdraft fee, and
   closing 2+ rows at once is a batch run (×1.5 when the net is positive).
   Payroll (€30k) comes due every 13 seconds of play. Close 13 weeks without
   running out of cash or jamming the stack. The lesson: it is not only how
   much comes in, it is which week it lands in. Spread the − so no week
   closes in the red.
   Input per frame: {dir:"left"|"right"|"down"|null, left, right, rotate, drop}
   (left/right/rotate/drop are edges; dir is what is held). */
var Blocks = (function(){
  var COLS = 10, ROWS = 13, WEEKS = 13;
  var START = 150, PAYROLL = 30, PAY_EVERY = 13, PER_CELL = 8, BATCH = 1.5, FEE = 20;
  var G0 = 1.0, G1 = 0.45, SOFT = 0.04, LOCK = 0.4, RESETS = 12, DAS = 0.18, ARR = 0.07, ARE = 0.15, CLEAR = 0.35;
  var IN = 1, OUT = 2, SIGN_BAG = [1, 1, 1, 1, 1, 1, 2, 2, 2, 2];
  var NAMES = ["I", "O", "T", "S", "Z", "J", "L"];
  /* sideways first, then up one row (a floor kick), then two columns for the I */
  var KICKS = [[[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1]], [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[0,-2]]];
  var BOXES = [
    ["....", "####", "....", "...."], ["##", "##"], [".#.", "###", "..."],
    [".##", "##.", "..."], ["##.", ".##", "..."], ["#..", "###", "..."], ["..#", "###", "..."]
  ];

  /* every rotation of every piece as a list of [x, y] inside its box */
  var SH = BOXES.map(function(b){
    var n = b.length, cells = [], out = [];
    b.forEach(function(r, y){for(var x=0;x<n;x++) if(r[x] === "#") cells.push([x, y])});
    for(var k=0;k<4;k++){out.push(cells); cells = cells.map(function(c){return [n - 1 - c[1], c[0]]})}
    return out;
  });
  var SPAWN_X = BOXES.map(function(b){return Math.floor((COLS - b.length)/2)});
  var SPAWN_Y = SH.map(function(r){return -Math.min.apply(null, r[0].map(function(c){return c[1]}))});

  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function shuffle(a,r){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}

  function create(seed){
    var s = {
      grid:[], piece:null, next:null, kinds:[], signs:[],
      phase:"fall", wait:0, clearing:null, clearT:0, fall:0, lockT:0, resets:0, das:0, dasDir:0,
      t:0, pay:PAY_EVERY, cash:START, weeks:0, pieces:0, paid:0, last:null,
      collected:0, paidOut:0, payroll:0, bonus:0, fees:0, red:0, batches:0, best:null, worst:null, low:START,
      over:null, won:false, events:[], rnd:rng(seed == null ? (Math.random()*1e9)|0 : seed)
    };
    for(var i=0;i<COLS*ROWS;i++) s.grid.push(0);
    s.next = draw(s); spawn(s);
    return s;
  }
  function draw(s){
    if(!s.kinds.length) s.kinds = shuffle([0, 1, 2, 3, 4, 5, 6], s.rnd);
    if(!s.signs.length) s.signs = shuffle(SIGN_BAG, s.rnd);
    return {k:s.kinds.pop(), sign:s.signs.pop()};
  }
  function ev(s, type, o){o = o || {}; o.type = type; s.events.push(o)}

  function fits(grid, k, r, x, y){
    var cs = SH[k][r & 3];
    for(var i=0;i<4;i++){
      var cx = x + cs[i][0], cy = y + cs[i][1];
      if(cx < 0 || cx >= COLS || cy >= ROWS) return false;
      if(cy >= 0 && grid[cy*COLS + cx]) return false;
    }
    return true;
  }
  function dropY(grid, k, r, x, y){while(fits(grid, k, r, x, y + 1)) y++; return y}
  function height(grid){for(var y=0;y<ROWS;y++) for(var x=0;x<COLS;x++) if(grid[y*COLS + x]) return ROWS - y; return 0}
  function gravity(s){return G0 - (G0 - G1)*Math.min(1, s.weeks/(WEEKS - 1))}
  function grounded(s){var p = s.piece; return !fits(s.grid, p.k, p.r, p.x, p.y + 1)}
  function nudge(s){if(grounded(s) && s.resets < RESETS){s.lockT = 0; s.resets++}}

  function spawn(s){
    var n = s.next; s.next = draw(s);
    s.piece = {k:n.k, sign:n.sign, r:0, x:SPAWN_X[n.k], y:SPAWN_Y[n.k]};
    s.phase = "fall"; s.fall = 0; s.lockT = 0; s.resets = 0;
    if(!fits(s.grid, n.k, 0, s.piece.x, s.piece.y)){s.over = "jam"; ev(s, "bad", {text:"JAMMED"})}
  }
  function move(s, dx){
    var p = s.piece;
    if(!fits(s.grid, p.k, p.r, p.x + dx, p.y)) return false;
    p.x += dx; nudge(s); return true;
  }
  function rotate(s){
    var p = s.piece, r = (p.r + 1) & 3, kicks = KICKS[NAMES[p.k] === "I" ? 1 : 0];
    for(var i=0;i<kicks.length;i++){
      var dx = kicks[i][0], dy = kicks[i][1];
      if(fits(s.grid, p.k, r, p.x + dx, p.y + dy)){p.r = r; p.x += dx; p.y += dy; nudge(s); return true}
    }
    return false;
  }

  function lock(s){
    var p = s.piece, cs = SH[p.k][p.r], top = false;
    cs.forEach(function(c){var cx = p.x + c[0], cy = p.y + c[1]; if(cy < 0) top = true; else s.grid[cy*COLS + cx] = p.sign});
    s.piece = null; s.pieces++;
    ev(s, "drop", {x:p.x, y:p.y, sign:p.sign});
    if(top){s.over = "jam"; ev(s, "bad", {text:"JAMMED"}); return}
    var full = [];
    for(var y=0;y<ROWS;y++){var n = 0; for(var x=0;x<COLS;x++) if(s.grid[y*COLS + x]) n++; if(n === COLS) full.push(y)}
    if(!full.length){s.phase = "wait"; s.wait = ARE; return}
    var net = 0, ins = 0, outs = 0, red = 0;
    full.forEach(function(y){
      var n = 0;
      for(var x=0;x<COLS;x++){if(s.grid[y*COLS + x] === IN){ins++; n++} else{outs++; n--}}
      if(n < 0) red++;
    });
    net = (ins - outs)*PER_CELL;
    var batch = full.length >= 2, bonus = batch && net > 0 ? Math.round(net*(BATCH - 1)) : 0, fee = red*FEE;
    net += bonus - fee;
    s.cash += net; s.collected += ins*PER_CELL; s.paidOut += outs*PER_CELL; s.bonus += bonus; s.fees += fee; s.red += red; if(batch) s.batches++;
    s.weeks += full.length; s.last = net; s.low = Math.min(s.low, s.cash);
    if(s.best === null || net > s.best) s.best = net;
    if(s.worst === null || net < s.worst) s.worst = net;
    s.clearing = full; s.clearT = CLEAR; s.phase = "clear";
    ev(s, "line", {rows:full, net:net, ins:ins, outs:outs, fee:fee, bonus:bonus, week:Math.min(WEEKS, s.weeks), batch:batch, y:full[0]});
    ev(s, net >= 0 ? "good" : "bad", {net:net, y:full[0]});
    if(bonus) ev(s, "power", {bonus:bonus, y:full[0]});
    if(s.cash <= 0) s.over = "cash";
    else if(s.weeks >= WEEKS) s.won = true;
  }
  function collapse(s){
    var keep = [], y, x;
    for(y=0;y<ROWS;y++) if(s.clearing.indexOf(y) < 0) for(x=0;x<COLS;x++) keep.push(s.grid[y*COLS + x]);
    var g = [];
    for(var i=0;i<COLS*ROWS - keep.length;i++) g.push(0);
    s.grid = g.concat(keep); s.clearing = null;
  }

  function step(s, dt, c){
    if(s.over || s.won) return s;
    c = c || {};
    s.t += dt; s.pay -= dt;
    if(s.pay <= 0){
      s.pay += PAY_EVERY; s.cash -= PAYROLL; s.payroll += PAYROLL; s.paid++; s.low = Math.min(s.low, s.cash);
      ev(s, "hurt", {text:"PAYROLL −€" + PAYROLL + "k"});
      if(s.cash <= 0){s.over = "cash"; return s}
    }
    if(s.phase === "clear"){s.clearT -= dt; if(s.clearT <= 0){collapse(s); spawn(s)} return s}
    if(s.phase === "wait"){s.wait -= dt; if(s.wait <= 0) spawn(s); return s}

    var p = s.piece;
    if(c.rotate) rotate(s);
    var d = c.left ? -1 : c.right ? 1 : 0;
    if(d){move(s, d); s.dasDir = d; s.das = DAS}
    else if(c.dir === "left" || c.dir === "right"){
      var hd = c.dir === "left" ? -1 : 1;
      if(s.dasDir !== hd){s.dasDir = hd; s.das = DAS}
      else{s.das -= dt; while(s.das <= 0){if(!move(s, hd)){s.das = 0; break} s.das += ARR}}
    }else s.dasDir = 0;

    if(c.drop){p.y = dropY(s.grid, p.k, p.r, p.x, p.y); lock(s); return s}

    var g = gravity(s), iv = c.dir === "down" ? Math.min(SOFT, g) : g;
    s.fall += dt;
    while(s.fall >= iv){
      s.fall -= iv;
      if(fits(s.grid, p.k, p.r, p.x, p.y + 1)){p.y++; s.lockT = 0}
      else{s.fall = 0; break}
    }
    if(grounded(s)){s.lockT += dt; if(s.lockT >= LOCK) lock(s)}
    return s;
  }

  return {COLS:COLS, ROWS:ROWS, WEEKS:WEEKS, START:START, PAYROLL:PAYROLL, PAY_EVERY:PAY_EVERY, PER_CELL:PER_CELL, BATCH:BATCH, FEE:FEE,
    IN:IN, OUT:OUT, NAMES:NAMES, SHAPES:SH,
    create:create, step:step, fits:fits, dropY:dropY, height:height, gravity:gravity};
})();
