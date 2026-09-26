/* ================= THE AUDIT TRAIL: game rules (no DOM) =================
   A maze of ledger lines. Every dot is a line to tick; tick them all to
   clear the level. Four findings chase you:
     RESTATEMENT      heads for your tile
     LATE INVOICE     heads for the tile 4 ahead of you, a little slower
     MISSING RECEIPT  mostly turns at random
     ROUNDING ERROR   chases from afar, backs off to its corner up close
   They leave the house one by one and never turn back on their own, except
   when they all regroup (every 15-20 s, for a few seconds each heads for its
   own corner). The source documents in the corners resolve them for a few
   seconds: they turn round, slow down, run, and can be caught (+200, back to
   the house). Three sign-offs. Two levels on the same map, the second with
   faster findings and shorter documents. Each level has a deadline, so every
   game ends. Turns are buffered: the last direction pressed is taken at the
   next tile where it is open, and reversing is instant.
   Positions are in tiles: an entity sits on tile (x, y) and is p of the
   way (0..1) to the next tile in its direction. Row 5 wraps (the tunnel). */
var Maze = (function(){
  var MAP = [
    "#######################",
    "#o.........#.........o#",
    "#.###.####.#.####.###.#",
    "#.....................#",
    "#.###.#.###-###.#.###.#",
    " .....#.#HHHHH#.#..... ",
    "#.###.#.#######.#.###.#",
    "#.....................#",
    "#.###.####.#.####.###.#",
    "#.......#..P..#.......#",
    "#.#####.#.###.#.#####.#",
    "#o...................o#",
    "#######################"
  ];
  var COLS = 23, ROWS = 13, N = COLS*ROWS;
  var START = {x:11, y:9}, OUT = {x:11, y:3}, HOME = {x:11, y:5};
  var DIRS = ["up", "left", "down", "right"], DX = {up:0, down:0, left:-1, right:1}, DY = {up:-1, down:1, left:0, right:0};
  var OPP = {up:"down", down:"up", left:"right", right:"left"};
  var LEVELS = [
    {player:7.0, chaser:5.0, resolved:3.2, power:6, release:[0, 2, 5, 8], hunt:15, regroup:5},
    {player:7.1, chaser:5.2, resolved:3.5, power:4, release:[0, 1, 3, 5], hunt:20, regroup:4}
  ];
  var FINDINGS = [
    {name:"RESTATEMENT", kind:"chase", x:11, y:3, out:true, corner:{x:21, y:1}},
    {name:"LATE INVOICE", kind:"ahead", x:10, y:5, corner:{x:1, y:1}, pace:0.88},
    {name:"MISSING RECEIPT", kind:"wander", x:11, y:5, corner:{x:21, y:11}},
    {name:"ROUNDING ERROR", kind:"shy", x:12, y:5, corner:{x:1, y:11}}
  ];
  var TICK = 10, DOC = 50, CATCH = 200, CLEAR = 500, LIVES = 3, DEADLINE = 110;
  var HOME_SPEED = 12, LEAVE_SPEED = 3.5, HIT = 0.7, CORNER = 0.3, CAUGHT_WAIT = 1.4, CLEAR_WAIT = 1.8;

  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function wrap(x){return (x + COLS) % COLS}
  function ev(s, type, text, x, y){s.events.push({type:type, text:text||"", x:x==null?s.player.x:x, y:y==null?s.player.y:y})}

  /* ---------- the map ---------- */
  function cell(s, x, y){return y < 0 || y >= ROWS ? "#" : s.grid[y][wrap(x)]}
  // who: "player" and roaming findings stay in the corridors; "house" may also use the house and its door
  function passable(ch, who){return ch !== "#" && (who === "house" || (ch !== "-" && ch !== "H"))}
  function open(s, x, y, d, who){return passable(cell(s, x + DX[d], y + DY[d]), who || "player")}
  function pos(e){return {x:e.x + (e.dir ? DX[e.dir]*e.p : 0), y:e.y + (e.dir ? DY[e.dir]*e.p : 0)}}
  function near(e){return e.dir && e.p >= 0.5 ? {x:wrap(e.x + DX[e.dir]), y:e.y + DY[e.dir]} : {x:e.x, y:e.y}}
  function gap(a, b){var dx = a.x - b.x, dy = a.y - b.y; if(dx < 0) dx = -dx; if(COLS - dx < dx) dx = COLS - dx; return dx + (dy < 0 ? -dy : dy)}

  /* the way through the house: the first step from (x0, y0) towards tile "to" */
  var MARK = [], FIRST = [], Q = [], stamp = 0;
  function route(s, x0, y0, to){
    stamp++;
    var head = 0, tail = 0, k = y0*COLS + x0, goal = to.y*COLS + to.x;
    MARK[k] = stamp; FIRST[k] = null; Q[tail++] = k;
    while(head < tail){
      k = Q[head++];
      if(k === goal && FIRST[k]) return FIRST[k];
      var x = k % COLS, y = (k - x)/COLS;
      for(var i=0;i<4;i++){
        var d = DIRS[i], nx = wrap(x + DX[d]), ny = y + DY[d];
        if(ny < 0 || ny >= ROWS) continue;
        var nk = ny*COLS + nx;
        if(MARK[nk] === stamp || !passable(s.grid[ny][nx], "house")) continue;
        MARK[nk] = stamp; FIRST[nk] = FIRST[k] || d; Q[tail++] = nk;
      }
    }
    return null;
  }
  // the corridors never change: NEXT[k*4 + i] is the tile one step in DIRS[i] from tile k, or -1
  var NEXT = [];
  (function(){
    for(var k=0;k<N;k++){
      var x = k % COLS, y = (k - x)/COLS;
      for(var i=0;i<4;i++){
        var nx = wrap(x + DX[DIRS[i]]), ny = y + DY[DIRS[i]];
        NEXT[k*4 + i] = MAP[y][x] !== "#" && passable(MAP[y][x], "player") && ny >= 0 && ny < ROWS && passable(MAP[ny][nx], "player") ? ny*COLS + nx : -1;
      }
    }
  })();
  // steps from the nearest unresolved finding out in the maze to every tile
  var TD = [], TQ = [];
  function threat(s){
    var head = 0, tail = 0, i, k, x, y, ending = s.power < 1.5;
    for(i=0;i<N;i++) TD[i] = 99;
    for(i=0;i<s.chasers.length;i++){
      var c = s.chasers[i];
      if(c.res && !ending) continue;
      // one on its way out of the house is as good as standing at the door
      if(c.mode === "leave" || (c.mode === "house" && c.wait < 0.6)){k = OUT.y*COLS + OUT.x; if(TD[k] > 1){TD[k] = 1; TQ[tail++] = k} continue}
      if(c.mode === "house" || c.mode === "home") continue;
      // findings never turn back on their own, so the way behind one is clear,
      // unless a regroup (which turns them all round) is about to start or end
      var fwd = c.dir && !(c.res && ending) && s.cycle > 0.6;
      for(var j=0;j<2;j++){
        if(j && !c.dir) break;
        x = j ? wrap(c.x + DX[c.dir]) : c.x; y = j ? c.y + DY[c.dir] : c.y;
        k = y*COLS + x;
        if(TD[k] > 0 && passable(s.grid[y][x], "player")){TD[k] = 0; if(j || !fwd) TQ[tail++] = k}
      }
    }
    while(head < tail){
      k = TQ[head++];
      for(i=0;i<4;i++){
        var nk = NEXT[k*4 + i];
        if(nk >= 0 && TD[nk] > TD[k] + 1){TD[nk] = TD[k] + 1; TQ[tail++] = nk}
      }
    }
    return TD;
  }

  /* ---------- setup ---------- */
  function create(seed){
    var s = {level:1, levels:LEVELS.length, score:0, lives:LIVES, t:0, lt:0, power:0, lines:0, resolved:0, caught:0,
      phase:"play", wait:0, warned:false, over:null, won:false, events:[],
      player:{x:START.x, y:START.y, dir:null, p:0, want:null, face:"left"}, chasers:[],
      rnd:rng(seed == null ? (Math.random()*1e9)|0 : seed)};
    FINDINGS.forEach(function(f, i){s.chasers.push({name:f.name, kind:f.kind, i:i})});
    load(s); return s;
  }
  function load(s){
    s.cfg = LEVELS[s.level - 1];
    s.grid = MAP.map(function(r){return r.replace("P", " ").split("")});
    s.total = 0; s.grid.forEach(function(r){r.forEach(function(c){if(c === "." || c === "o") s.total++})});
    s.left = s.total; s.lt = 0; s.warned = false;
    place(s);
  }
  function place(s){
    var P = s.player;
    P.x = START.x; P.y = START.y; P.dir = null; P.p = 0; P.want = null; P.face = "left";
    s.power = 0; s.regroup = false; s.cycle = s.cfg.hunt;
    s.chasers.forEach(function(c){
      var f = FINDINGS[c.i];
      c.x = f.x; c.y = f.y; c.p = 0; c.res = false;
      c.dir = f.out ? "left" : null; c.mode = f.out ? "roam" : "house"; c.wait = s.cfg.release[c.i];
    });
  }

  /* ---------- movement ---------- */
  function move(s, e, dist, turn, arrive){
    var guard = 0;
    while(dist > 1e-9 && guard++ < 20){
      if(e.p === 0) turn(s, e);
      if(!e.dir) return;
      var need = 1 - e.p;
      if(dist < need){e.p += dist; return}
      dist -= need; e.x = wrap(e.x + DX[e.dir]); e.y += DY[e.dir]; e.p = 0;
      arrive(s, e);
      if(s.phase !== "play") return;
    }
  }
  function playerTurn(s, P){
    if(P.want && open(s, P.x, P.y, P.want)) P.dir = P.want;
    else if(P.dir && !open(s, P.x, P.y, P.dir)) P.dir = null;
    if(P.dir) P.face = P.dir;
  }
  function playerArrive(s, P){
    var c = s.grid[P.y][P.x];
    if(c === "."){s.grid[P.y][P.x] = ","; s.left--; s.lines++; s.score += TICK; ev(s, "tick", "", P.x, P.y)}
    else if(c === "o"){
      s.grid[P.y][P.x] = " "; s.left--; s.score += DOC; s.power = s.cfg.power;
      s.chasers.forEach(function(k){
        if(k.mode === "home") return;
        k.res = true;
        if(k.mode === "roam" && k.dir && k.p > 0){k.x = wrap(k.x + DX[k.dir]); k.y += DY[k.dir]; k.dir = OPP[k.dir]; k.p = 1 - k.p}
        else if(k.mode === "roam" && k.dir) k.dir = OPP[k.dir];
      });
      ev(s, "power", "SOURCE DOCUMENT", P.x, P.y);
    }
    if(s.left <= 0) clear(s);
  }
  function target(s, c){
    var P = s.player, t = near(P);
    if(s.regroup) return FINDINGS[c.i].corner;
    if(c.kind === "ahead"){var d = P.dir || P.face; return {x:t.x + DX[d]*4, y:t.y + DY[d]*4}}
    if(c.kind === "shy" && gap(t, c) <= 6) return FINDINGS[c.i].corner;
    return t;
  }
  function chaserTurn(s, c){
    if(c.mode === "leave" || c.mode === "home"){var r = route(s, c.x, c.y, c.mode === "leave" ? OUT : HOME); if(r) c.dir = r; return}
    var opts = [];
    for(var i=0;i<4;i++){var d = DIRS[i]; if(d !== OPP[c.dir] && open(s, c.x, c.y, d, "roam")) opts.push(d)}
    if(!opts.length){c.dir = OPP[c.dir] || null; return}
    if(opts.length === 1){c.dir = opts[0]; return}
    if(c.res || (c.kind === "wander" && s.rnd() < 0.65)){c.dir = opts[Math.floor(s.rnd()*opts.length)]; return}
    var t = target(s, c), best = opts[0], bd = 1e9;
    opts.forEach(function(d){var dx = c.x + DX[d] - t.x, dy = c.y + DY[d] - t.y, dd = dx*dx + dy*dy; if(dd < bd){bd = dd; best = d}});
    c.dir = best;
  }
  function chaserArrive(s, c){
    if(c.mode === "leave" && c.x === OUT.x && c.y === OUT.y) c.mode = "roam";
    else if(c.mode === "home" && c.x === HOME.x && c.y === HOME.y){c.mode = "house"; c.wait = 1; c.dir = null}
  }
  function speed(s, c){
    return c.mode === "home" ? HOME_SPEED : c.mode === "leave" ? LEAVE_SPEED : c.res ? s.cfg.resolved : s.cfg.chaser*(FINDINGS[c.i].pace || 1);
  }

  /* ---------- the rules ---------- */
  function clear(s){
    s.score += CLEAR; ev(s, "line", "LEVEL " + s.level + " TICKED");
    if(s.level >= LEVELS.length){s.won = true; return}
    s.phase = "clear"; s.wait = CLEAR_WAIT;
  }
  function collide(s){
    var pp = pos(s.player);
    for(var i=0;i<s.chasers.length;i++){
      var c = s.chasers[i];
      if(c.mode === "house" || c.mode === "home") continue;
      var cp = pos(c);
      if(gap(pp, cp) >= HIT) continue;
      if(c.res){c.res = false; c.mode = "home"; s.score += CATCH; s.resolved++; ev(s, "ko", c.name, cp.x, cp.y)}
      else{s.lives--; s.caught++; s.phase = "caught"; s.wait = CAUGHT_WAIT; ev(s, "hurt", c.name, pp.x, pp.y); return}
    }
  }
  function step(s, dt, inp){
    if(s.over || s.won) return s;
    var P = s.player, pr = (inp && inp.press) || {};
    for(var i=0;i<4;i++) if(pr[DIRS[i]]) P.want = DIRS[i];
    if(inp && inp.dir) P.want = inp.dir;
    s.t += dt;
    if(s.phase !== "play"){
      s.wait -= dt;
      if(s.wait <= 0){
        if(s.phase === "caught"){if(s.lives <= 0){s.over = "lives"; return s} place(s)}
        else{s.level++; load(s); ev(s, "level", "LEVEL " + s.level)}
        s.phase = "play";
      }
      return s;
    }
    s.lt += dt;
    if(s.lt >= DEADLINE){s.over = "deadline"; ev(s, "late", "DEADLINE"); return s}
    if(!s.warned && s.lt >= DEADLINE - 20){s.warned = true; ev(s, "warn", "20 SECONDS")}
    if(s.power <= 0){
      s.cycle -= dt;
      if(s.cycle <= 0){
        s.regroup = !s.regroup; s.cycle = s.regroup ? s.cfg.regroup : s.cfg.hunt;
        s.chasers.forEach(function(c){if(c.mode === "roam" && c.dir && c.p > 0){c.x = wrap(c.x + DX[c.dir]); c.y += DY[c.dir]; c.dir = OPP[c.dir]; c.p = 1 - c.p}});
      }
    }
    if(s.power > 0){s.power -= dt; if(s.power <= 0){s.power = 0; s.chasers.forEach(function(c){c.res = false})}}

    /* you: reverse at once; a turn pressed just after leaving a tile is taken there;
       otherwise the buffered direction is taken at the next tile where it is open */
    if(P.want && P.dir && P.p > 0 && P.want !== P.dir){
      if(P.want === OPP[P.dir]){P.x = wrap(P.x + DX[P.dir]); P.y += DY[P.dir]; P.dir = P.want; P.face = P.dir; P.p = 1 - P.p}
      else if(P.p < CORNER && open(s, P.x, P.y, P.want)){P.dir = P.want; P.face = P.dir; P.p = 0}
    }
    move(s, P, s.cfg.player*dt, playerTurn, playerArrive);
    if(s.phase !== "play" || s.won) return s;
    collide(s); if(s.phase !== "play") return s;

    /* the findings */
    s.chasers.forEach(function(c){
      if(c.mode === "house"){c.wait -= dt; if(c.wait <= 0){c.mode = "leave"; c.dir = null; c.p = 0} return}
      move(s, c, speed(s, c)*dt, chaserTurn, chaserArrive);
    });
    collide(s);
    return s;
  }

  /* ---------- helpers for the HUD, the music and the demo ---------- */
  function closest(s){
    var pp = pos(s.player), best = 99;
    s.chasers.forEach(function(c){if(!c.res && (c.mode === "roam" || c.mode === "leave")) best = Math.min(best, gap(pp, pos(c)))});
    return best;
  }
  /* the autopilot (the demo and the test bots): BFS to the nearest unticked line, from both
     ends of the edge you are on: onward from the tile ahead (the turn to buffer) or back from
     the tile behind (reverse now, at a 2-step penalty so it does not dither).
     o.avoid: never enter a tile within 2 steps of an unresolved finding, or one a finding
     reaches before you; prefer lines away from them; keep the source documents for when one
     is close; with no safe line in reach, run for open space. o.hunt: catch resolved findings
     while the document lasts. Without options it is a greedy ticker that ignores them. */
  // plan: BFS from starts [[x, y, delay]] (a delayed start joins that many steps late) to the
  // best tile where goal(x, y) holds. With a threat field D it skips tiles within R of a finding
  // or reached by one first (D <= steps*ratio), and also returns the safest tile as an escape.
  // Results carry the first step from their start and which start they came from.
  var PM = [], PF = [], PD = [], PO = [], PQ = [], pstamp = 0;
  function plan(s, starts, D, R, ratio, goal, maxD){
    pstamp++;
    var head = 0, tail = 0, k, found = null, esc = null, escScore = -1e9, late = [];
    function seed(st, j){k = st[1]*COLS + st[0]; if(PM[k] === pstamp) return; PM[k] = pstamp; PF[k] = null; PD[k] = st[2] || 0; PO[k] = j; PQ[tail++] = k}
    starts.forEach(function(st, j){if(st[2]) late.push([st, j]); else seed(st, j)});
    while(head < tail || late.length){
      while(late.length && (head >= tail || PD[PQ[head]] >= late[0][0][2])){var l = late.shift(); seed(l[0], l[1])}
      if(head >= tail) break;
      k = PQ[head++];
      var x = k % COLS, y = (k - x)/COLS;
      if(PD[k] > 0 && PF[k]){
        // with findings about, a line next to one counts as further away than it is
        if(goal(x, y)){
          var cost = PD[k] + (D && D[k] < 5 ? 3*(5 - D[k]) : 0);
          if(!found || cost < found.cost) found = {dir:PF[k], dist:PD[k], from:PO[k], cost:cost};
          if(!D) return {goal:found};
        }
        if(D){var sc = D[k]*100 - PD[k]; if(sc > escScore){escScore = sc; esc = {dir:PF[k], dist:PD[k], from:PO[k]}}}
      }
      if(found && !D) break;
      if(maxD && PD[k] >= maxD) continue;
      for(var i=0;i<4;i++){
        var nk = NEXT[k*4 + i], nd = PD[k] + 1;
        if(nk < 0 || PM[nk] === pstamp) continue;
        if(D && (D[nk] <= R || D[nk] <= nd*ratio)) continue;
        PM[nk] = pstamp; PF[nk] = PF[k] || DIRS[i]; PD[nk] = nd; PO[nk] = PO[k]; PQ[tail++] = nk;
      }
    }
    return {goal:found, escape:esc};
  }
  function autopilot(s, mem, o){
    var inp = {down:false, dir:null, press:{}, taps:[]};
    if(s.phase !== "play") return inp;
    o = o || {};
    var P = s.player, moving = !!(P.dir && P.p > 0), R = o.radius || 2;
    var nx = moving ? wrap(P.x + DX[P.dir]) : P.x, ny = moving ? P.y + DY[P.dir] : P.y, key = nx + "," + ny + "," + P.dir;
    mem.f = (mem.f || 0) + 1;
    if(mem.key === key && mem.f % (o.avoid ? 2 : 4)){inp.dir = mem.want; return inp}
    mem.key = key;
    var D = o.avoid ? threat(s) : null, ratio = s.cfg.chaser/s.cfg.player, want = null, r = null, starts = [];
    var ahead = ny*COLS + nx, back = P.y*COLS + P.x;
    function safe(k){return !D || D[k] > R}
    // a line on the tile ahead is as good as ticked: only turn back if the tile ahead is unsafe
    var line = s.grid[ny][nx] === "." || s.grid[ny][nx] === "o";
    if(safe(ahead)) starts.push([nx, ny, 0, "ahead"]);
    if(moving && safe(back) && !(line && safe(ahead))) starts.push([P.x, P.y, 2, "back"]);
    if(starts.length){
      if(o.hunt && s.power > 0.4){
        var reach = Math.floor((s.power - 0.3)*s.cfg.player*0.7);
        if(reach > 0) r = plan(s, starts, null, 0, 0, function(x, y){
          return s.chasers.some(function(c){if(!c.res || c.mode !== "roam") return false; var t = near(c); return t.x === x && t.y === y});
        }, reach).goal;
      }
      if(!r){
        var docOk = !D || D[ahead] <= R + 3 || D[back] <= R + 3;
        var any = function(x, y){var c = s.grid[y][x]; return c === "." || c === "o"};
        var pl = plan(s, starts, D, R, ratio, function(x, y){var c = s.grid[y][x]; return c === "." || (c === "o" && docOk)});
        r = pl.goal;
        if(!r && !docOk) r = plan(s, starts, D, R, ratio, any).goal;
        if(!r && D) r = plan(s, starts, D, R, 0, any).goal;
        if(!r) r = pl.escape;
      }
      // from the tile behind: reverse, or turn there if you have only just left it.
      // From the tile ahead, "then come back" must wait until the line there is ticked.
      if(r){
        var fromBack = starts[r.from][3] === "back";
        if(fromBack) want = r.dir !== OPP[P.dir] && P.p >= CORNER ? OPP[P.dir] : r.dir;
        else want = moving && r.dir === OPP[P.dir] && line ? P.dir : r.dir;
      }
    }
    if(!r && D){
      // boxed in: take the neighbouring tile furthest from every finding
      var best = -1;
      if(moving && D[back] > D[ahead] + 1){best = D[back]; want = OPP[P.dir]}
      for(var i=0;i<4;i++){
        var d = DIRS[i]; if(!open(s, nx, ny, d)) continue;
        var t = (ny + DY[d])*COLS + wrap(nx + DX[d]);
        if(D[t] > best){best = D[t]; want = d}
      }
    }
    mem.want = want || P.dir;
    inp.dir = mem.want; if(want) inp.press[want] = true;
    return inp;
  }

  return {MAP:MAP, COLS:COLS, ROWS:ROWS, LEVELS:LEVELS, FINDINGS:FINDINGS, DEADLINE:DEADLINE, LIVES:LIVES, DX:DX, DY:DY, DIRS:DIRS,
    create:create, step:step, open:open, pos:pos, closest:closest, autopilot:autopilot};
})();
