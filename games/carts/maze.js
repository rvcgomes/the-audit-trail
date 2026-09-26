/* ================= Cartridge: THE AUDIT TRAIL =================
   Drawing and wording only; the rules are in maze.js.
   The maze is 23×13 tiles of 8px, drawn 4px in and 14px down,
   so the strip at the top holds the level, the document timer and the score. */
(function(){
  if(!window.RUNWAY || !window.Maze) return;

  var T = 8, OX = 4, OY = 14, SP = null;
  var RESOLVED = {
    "RESTATEMENT":"Restatement resolved: the figures tie to source.",
    "LATE INVOICE":"Late invoice resolved: cut-off tested.",
    "MISSING RECEIPT":"Missing receipt resolved: found in the file.",
    "ROUNDING ERROR":"Rounding error resolved: immaterial, noted."
  };
  // the auditor is a magnifying glass, lens first; drawn facing right, turned for the rest
  var LENS = [".......", "...###.", "..#d..#", "###...#", "..#...#", "...###.", "......."];
  var FACES = [
    ["...o...", "..ooo..", "..oxo..", ".ooxoo.", ".ooooo.", "oooxooo", "ooooooo"],   // RESTATEMENT: a warning sign
    [".ooooo.", "oooxooo", "oooxooo", "oooxxxo", "ooooooo", ".ooooo.", "o.....o"],   // LATE INVOICE: a clock
    ["ooooooo", "oxxxxxo", "ooooooo", "oxxxooo", "ooooooo", "ooooooo", "o.o.o.o"],   // MISSING RECEIPT: a torn receipt
    ["..ooo..", ".ooxoo.", "ooxxxoo", "oooxooo", "ooxxxoo", ".ooooo.", "..ooo.."]    // ROUNDING ERROR: a ± coin
  ];
  var DOC = ["###..", "#.##.", "#...#", "#ddd#", "#...#", "#ddd#", "#####"];
  var CHECK = ["....d", "...d.", "d.d..", ".d..."];

  function turn(rows){ // 90° anticlockwise: right becomes up
    var n = rows.length, out = [];
    for(var r=0;r<n;r++){var line = ""; for(var c=0;c<n;c++) line += rows[c][n - 1 - r]; out.push(line)}
    return out;
  }
  function flipX(rows){return rows.map(function(r){return r.split("").reverse().join("")})}
  function flipY(rows){return rows.slice().reverse()}
  function ink(rows, from, to){return rows.map(function(r){return r.split(from).join(to)})}

  /* the walls, drawn once into one sprite: faint blocks with a dim edge where they meet a corridor */
  function walls(){
    var M = Maze.MAP, C = Maze.COLS, R = Maze.ROWS, rows = [];
    function wall(x, y){return x < 0 || x >= C || y < 0 || y >= R || M[y][x] === "#"}
    for(var py=0;py<R*T;py++){
      var line = "";
      for(var px=0;px<C*T;px++){
        var x = Math.floor(px/T), y = Math.floor(py/T), lx = px % T, ly = py % T, ch = M[y][x];
        if(ch === "-"){line += (ly === 3 || ly === 4) && lx % 3 !== 2 ? "m" : "."; continue}
        if(ch !== "#"){line += "."; continue}
        var l = lx === 0, r = lx === T - 1, u = ly === 0, d = ly === T - 1;
        var edge = (l && !wall(x - 1, y)) || (r && !wall(x + 1, y)) || (u && !wall(x, y - 1)) || (d && !wall(x, y + 1)) ||
          (l && u && !wall(x - 1, y - 1)) || (r && u && !wall(x + 1, y - 1)) || (l && d && !wall(x - 1, y + 1)) || (r && d && !wall(x + 1, y + 1));
        line += edge ? "d" : "f";
      }
      rows.push(line);
    }
    return rows;
  }
  function sprites(g){
    if(SP) return SP;
    var right = LENS, up = turn(LENS);
    var glint = function(rows){return ink(rows, "d", ".")};
    SP = {
      walls:g.sprite(walls()),
      you:{right:g.sprite(right), left:g.sprite(flipX(right)), up:g.sprite(up), down:g.sprite(flipY(up))},
      you2:{right:g.sprite(glint(right)), left:g.sprite(glint(flipX(right))), up:g.sprite(glint(up)), down:g.sprite(glint(flipY(up)))},
      faces:FACES.map(function(f){return g.sprite(f)}),
      dim:FACES.map(function(f){return g.sprite(ink(f, "o", "d"))}),
      faint:FACES.map(function(f){return g.sprite(ink(f, "o", "f"))}),
      doc:g.sprite(DOC), doc2:g.sprite(ink(DOC, "#", "d")), check:g.sprite(CHECK)
    };
    return SP;
  }
  function px(v){return OX + Math.round(v*T)}
  function py(v){return OY + Math.round(v*T)}
  function pct(s){return Math.round(100*(s.total - s.left)/s.total)}
  function signoffs(n){return n === 1 ? "1 sign-off left." : n + " sign-offs left."}

  RUNWAY.register({
    id:"maze", order:1, name:"THE AUDIT TRAIL", sub:"trace", countdown:1.2, canvas:"swipe",
    help:"Arrows or swipe to move. Tick every line. The source document turns the tables.",
    say:"The Audit Trail. Use the arrow keys or swipe to move through the ledger maze and tick every line. Four findings chase you. A source document in each corner lets you resolve them for a few seconds. You have three sign-offs.",
    realLine:"Before you trust a number, find out where it came from.",
    create:function(){return Maze.create()},
    step:function(s, dt, inp){Maze.step(s, dt, inp)},
    demo:function(s, mem){return Maze.autopilot(s, mem, {avoid:true, hunt:true})},
    mood:function(s){
      if(s.phase !== "play") return 0.3;
      var m = 1 - (Maze.closest(s) - 1)/8 + (s.lt > Maze.DEADLINE - 20 ? 0.2 : 0);
      return Math.max(0, Math.min(1, m));
    },
    hud:function(s){
      var left = Math.max(0, Maze.DEADLINE - s.lt);
      return {cells:[["LEVEL", s.level + "/" + s.levels], ["TICKED", pct(s) + "%"], ["SIGN-OFF", s.lives]],
        row2:["SCORE", s.score, "DEADLINE", 100*left/Maze.DEADLINE, left < 20]};
    },
    onEvent:function(e, g, s){
      var C = g.COL, x = px(e.x), y = py(e.y);
      if(e.type === "tick"){if(s.lines % 2 === 0) g.sfx("tick")}
      else if(e.type === "power"){g.sfx("power"); g.float("SOURCE", x - 8, y, C.lcd); g.line("Source document in hand. For a few seconds the findings can be resolved.")}
      else if(e.type === "ko"){g.sfx("ko"); g.float("+200", x - 4, y, C.lcd); g.flash("gV4", true); g.line(RESOLVED[e.text] || e.text + " resolved.")}
      else if(e.type === "hurt"){g.sfx("hurt"); g.fx.shake = 0.25; g.flash("gV3", false); g.line(e.text + " caught you. " + (s.lives > 0 ? signoffs(s.lives) : "No sign-offs left."))}
      else if(e.type === "line"){g.sfx("line"); g.banner(s.won ? "EVERY LINE TICKED" : e.text, 1.6); g.flash("gV2", true)}
      else if(e.type === "level"){g.banner("LEVEL " + s.level, 1.4); g.line("Level " + s.level + ": faster findings, shorter documents.")}
      else if(e.type === "warn"){g.sfx("bad"); g.line("20 seconds to the deadline.")}
      else if(e.type === "late"){g.sfx("bad"); g.line("The deadline passed with lines still open.")}
    },
    draw:function(g, s){
      var ctx = g.ctx, C = g.COL, W = g.W, sp = sprites(g), t = s.t, x, y;
      ctx.drawImage(sp.walls, OX, OY);
      /* the lines: open ones are dots, ticked ones leave a faint mark (the trail) */
      for(y=0;y<Maze.ROWS;y++) for(x=0;x<Maze.COLS;x++){
        var ch = s.grid[y][x], X = OX + x*T, Y = OY + y*T;
        if(ch === "."){ctx.fillStyle = C.lcd; ctx.fillRect(X + 3, Y + 3, 2, 2)}
        else if(ch === ","){ctx.fillStyle = C.mid; ctx.fillRect(X + 2, Y + 4, 1, 1); ctx.fillRect(X + 3, Y + 5, 1, 1); ctx.fillRect(X + 4, Y + 4, 1, 1); ctx.fillRect(X + 5, Y + 3, 1, 1)}
        else if(ch === "o") ctx.drawImage(Math.floor(t*3) % 3 ? sp.doc : sp.doc2, X + 1, Y);
      }
      /* the findings */
      s.chasers.forEach(function(c, i){
        var p = Maze.pos(c), cx = px(p.x), cy = py(p.y);
        if(c.mode === "home"){ctx.drawImage(sp.check, cx + 1, cy + 2); return}
        if(c.mode === "house" && !g.reduce) cy += Math.floor(t*3 + i) % 2;
        var img = sp.faces[i];
        if(c.res) img = Math.floor(t*(s.power < 1.5 ? 10 : 4)) % 2 ? sp.faint[i] : sp.dim[i];
        ctx.drawImage(img, cx, cy);
      });
      /* you */
      var P = s.player, pp = Maze.pos(P), face = P.face || "left";
      var blink = s.phase === "caught" && Math.floor(t*10) % 2;
      if(!blink) ctx.drawImage((P.dir && Math.floor(t*6) % 2 ? sp.you2 : sp.you)[face], px(pp.x), py(pp.y));
      /* the tunnel mouths hide whatever is passing through */
      ctx.fillStyle = C.dark; ctx.fillRect(0, OY + 5*T, OX, T); ctx.fillRect(OX + Maze.COLS*T, OY + 5*T, W - OX - Maze.COLS*T, T);
      var msg = s.won ? "CLEAN OPINION" : s.over === "deadline" ? "DEADLINE MISSED" : s.over ? "NOT SIGNED OFF" : s.phase === "caught" ? "SIGN-OFF LOST" : s.phase === "clear" ? "LEVEL " + s.level + " TICKED" : "";
      if(msg){
        ctx.fillStyle = C.dark; ctx.fillRect(W/2 - 62, 51, 124, 17);
        g.text(msg, W/2, 64, s.won || s.phase === "clear" ? C.lcd : C.hot, g.BIG, "center");
      }
    },
    overlay:function(g, s){
      var ctx = g.ctx, C = g.COL, W = g.W;
      g.text("LEVEL " + s.level, 4, 10, C.dim);
      g.text(String(s.score), W - 4, 10, C.lcd, g.FONT, "right");
      var left = Maze.DEADLINE - s.lt;
      if(s.power > 0){
        var bw = 60, f = s.power/s.cfg.power;
        g.text("SOURCE", W/2 - bw/2 - 3, 10, C.lcd, g.FONT, "right");
        ctx.fillStyle = C.faint; ctx.fillRect(W/2 - bw/2, 5, bw, 4);
        ctx.fillStyle = s.power < 1.5 ? C.hot : C.lcd; ctx.fillRect(W/2 - bw/2, 5, Math.round(bw*f), 4);
      }
      else if(left < 20 && s.phase === "play") g.text("DEADLINE " + Math.max(0, Math.ceil(left)) + "s", W/2, 10, Math.floor(s.t*2) % 2 ? C.hot : C.lcd, g.FONT, "center");
    },
    result:function(s){
      var rows = [["Level reached", s.level + "/" + s.levels], ["Lines ticked", s.lines], ["Findings resolved", s.resolved], ["Sign-offs left", s.lives + "/" + Maze.LIVES], ["Score", s.score]];
      if(s.won){
        var verdict = s.caught === 0 ? "No finding ever reached you." : s.resolved >= 6 ? "You used the source documents well." : "Every line traced back to source.";
        return {win:true, title:"CLEAN OPINION.\nEVERY LINE TICKED.", lines:["Score " + s.score + " · " + s.resolved + " findings resolved", "Signed with " + s.lives + " of " + Maze.LIVES + " sign-offs left.", verdict], rows:rows};
      }
      if(s.over === "deadline") return {win:false, title:"DEADLINE MISSED ON LEVEL " + s.level + ".", lines:[pct(s) + "% of the lines ticked."],
        tip:"Clear one area before the next: going back for single lines costs the most time.", rows:rows};
      var tip = s.resolved === 0 ? "Take a source document when a finding is close. While it lasts, findings run and you can catch them."
        : "Findings rarely turn round. Follow behind them, not in front of them.";
      return {win:false, title:"OUT OF SIGN-OFFS ON LEVEL " + s.level + ".", lines:[pct(s) + "% of the lines ticked."], tip:tip, rows:rows};
    }
  });
})();
