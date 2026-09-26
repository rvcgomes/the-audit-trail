/* ================= Cartridge: CLOSE THE MONTH =================
   Drawing and wording only; the rules are in lanes.js.
   The board is 16×10 tiles of 12px: the whole 192×120 screen. */
(function(){
  if(!window.RUNWAY || !window.Lanes) return;

  var SP = null;
  var BODY = ["..######..",".########.",".#x####x#.",".########.","..######..","...#oo#...","..##oo##..",".#.#oo#.#."];
  function sprites(g){
    if(SP) return SP;
    var stand = BODY.concat(["...####...","..##..##.."]), hop = BODY.concat(["..######..",".#......#."]);
    SP = {
      stand:g.sprite(stand), hop:g.sprite(hop),
      hurt:g.sprite(stand.map(function(r){return r.replace(/#/g, "o").replace(/x/g, "#")})),
      tick:g.sprite(["......#",".....#.","#...#..",".#.#...","..#...."])
    };
    return SP;
  }

  /* demo: searches hops over the next second or so with the lanes' own prediction */
  function demoBot(){
    var H = 8, DEPTH = 9, DT = 1/60, ACTS = ["wait", "up", "left", "right", "down"];
    var MV = {wait:[0, 0], up:[-1, 0], down:[1, 0], left:[0, -1], right:[0, 1]};
    function target(s){
      var best = -1, bd = 1e9;
      Lanes.SLOTS.forEach(function(sl, i){var d = Math.abs(sl.c + 1 - (s.px + 0.5)); if(!s.filled[i] && d < bd){bd = d; best = i}});
      return best;
    }
    function score(s, st, tg){
      var c = st.px + 0.5, v = Lanes.vel(s, st.row), sc = (Lanes.START_ROW - st.row)*10;
      if(tg >= 0 && st.row <= Lanes.MID_ROW) sc -= 0.6*Math.abs(c - (Lanes.SLOTS[tg].c + 1));
      if(v){var left = v > 0 ? (Lanes.COLS - c)/v : c/-v; if(left < 2) sc -= (2 - left)*12}
      return sc;
    }
    function plan(s){
      var tg = target(s), level = [{row:s.row, px:s.px, a:null, up:null}], goal = null, deepest = level;
      for(var k=0;k<DEPTH && !goal;k++){
        var next = {}, list = [];
        level.forEach(function(st){
          ACTS.forEach(function(a){
            var r = st.row, px = st.px, f, dead = false;
            if(a !== "wait"){
              var c = Math.round(px) + MV[a][1]; r = st.row + MV[a][0];
              if(r > Lanes.START_ROW || c < 0 || c > Lanes.COLS - 1) return;
              px = c;
              if(r === 0){var i = Lanes.slotAt(c); if(i >= 0 && !s.filled[i] && (!goal || (i === tg && goal.i !== tg))) goal = {a:a, up:st, i:i}; return}
            }
            var v = Lanes.vel(s, r);
            for(f=1;f<=H && !dead;f++){px += v*DT; if(Lanes.check(s, r, px, (k*H + f)*DT)) dead = true}
            var key = r*1000 + Math.round(px*4);
            if(dead || next[key]) return;
            next[key] = {row:r, px:px, a:a, up:st}; list.push(next[key]);
          });
        });
        if(!list.length) break;
        level = deepest = list;
      }
      var end = goal, bs = -1e9, acts = [];
      if(!end) deepest.forEach(function(st){var sc = score(s, st, tg); if(sc > bs){bs = sc; end = st}});
      for(var st = end; st && st.a; st = st.up) acts.unshift(st.a);
      return acts.length ? acts : ["wait"];
    }
    return function(s, mem){
      var inp = {down:false, dir:null, press:{}, taps:[]};
      mem.n = (mem.n || 0) + 1;
      if(s.wait > 0){mem.at = 0; mem.acts = null; return inp}
      if(mem.n < (mem.at || 0)) return inp;
      mem.at = mem.n + H;
      if(!mem.acts || !mem.acts.length || mem.used >= 3){mem.acts = plan(s); mem.used = 0}
      var a = mem.acts.shift(); mem.used++;
      if(a !== "wait") inp.press[a] = true;
      return inp;
    };
  }

  /* a deadline label that does not fit its block falls back to a short word */
  var SHORT = {"BOARD PACK":"BOARD", "BANK REC":"BANK", "INVOICES":"INVOICE", "PAYROLL":"PAY"};
  function label(g, t, w){g.ctx.font = g.FONT; return g.ctx.measureText(t).width <= w - 4 || !SHORT[t] ? t : SHORT[t]}
  function open(s){return Lanes.SLOTS.filter(function(sl, i){return !s.filled[i]}).map(function(sl){return sl.name}).join(", ")}
  function mostLost(s){var best = null; for(var k in s.lost) if(s.lost[k] && (!best || s.lost[k] > s.lost[best])) best = k; return best}
  var TIPS = {
    hit:"Deadlines run in patterns. Wait on a safe row and watch one lane at a time.",
    fall:"Up top, only a sign-off holds you. Hop when one is right above you.",
    off:"A sign-off carries you along. Hop off before it takes you off the page.",
    time:"Every day has 24 hours. Waiting is fine, standing still all day is not.",
    gap:"Land inside an open slot, not on the wall between two.",
    twice:"A task closed once stays closed. Aim for an open slot."
  };

  RUNWAY.register({
    id:"lanes", order:5, name:"CLOSE THE MONTH", sub:"cross", countdown:1.2, canvas:"swipe",
    help:"Arrows or swipe to hop. Dodge the deadlines, ride the sign-offs, close all five.",
    say:"Close the Month. Use the arrow keys or swipe to hop one square at a time. Cross four lanes of deadlines, then ride the moving sign-offs to the top and close cash, receivables, payables, payroll and reporting. You have three lives and 24 hours a day.",
    realLine:"At Weezie I cut the time to close the month by 34%.",
    create:function(){return Lanes.create()},
    step:function(s, dt, inp){Lanes.step(s, dt, inp.press)},
    demo:function(s, mem){if(!mem.bot) mem.bot = demoBot(); return mem.bot(s, mem)},
    mood:function(s){
      var time = Math.max(0, 1 - s.hours/Lanes.HOURS), lane = s.row >= 5 && s.row <= 8 ? 0.3 : s.row >= 1 && s.row <= 3 ? 0.4 : 0;
      return Math.max(0, Math.min(1, 0.1 + lane + time*0.5 + (s.lives === 1 ? 0.1 : 0)));
    },
    hud:function(s){
      var left = 100*s.hours/Lanes.HOURS;
      return {cells:[["CLOSED", s.closed + "/5"], ["LIVES", s.lives], ["HOURS", Math.ceil(s.hours)]],
        row2:["DAY", s.day, "TIME", left, left < 25]};
    },
    onEvent:function(e, g, s){
      var C = g.COL, x = Math.max(2, Math.min(g.W - e.text.length*5 - 2, e.x - e.text.length*2.5));
      if(e.type === "jump") g.sfx("jump");
      else if(e.type === "good"){
        g.sfx("good"); g.float(e.text, x, e.y + 22); g.flash("gV1", true);
        if(!s.won) g.line(e.text + ". Still open: " + open(s) + ".");
      }
      else if(e.type === "hit" || e.type === "hurt"){
        g.sfx(e.type); g.fx.shake = 0.2; g.float(e.text, x, Math.max(12, e.y), C.hot); g.flash("gV2", false);
        g.line(e.text + (s.lives ? ". A day lost to rework." : "."));
      }
      else if(e.type === "day") g.line("DAY " + s.day + " · still open: " + open(s));
      else if(e.type === "line"){g.sfx("line"); g.banner("MONTH CLOSED", 2); g.say("Month closed on day " + s.day + ".")}
    },
    draw:function(g, s){
      var ctx = g.ctx, C = g.COL, W = g.W, T = Lanes.TILE, sp = sprites(g), r, i, L, it, x, y, w;
      /* safe rows and the goal band */
      ctx.fillStyle = C.faint; ctx.fillRect(0, 0, W, T); ctx.fillRect(0, 4*T, W, T); ctx.fillRect(0, 9*T, W, T);
      g.text("RIDE THE SIGN-OFFS", W/2, 4*T + 9, C.mid, g.FONT, "center");
      g.text("DODGE THE DEADLINES", W/2, 9*T + 9, C.mid, g.FONT, "center");
      /* empty sign-off lanes read as gaps: a row of faint dots */
      ctx.fillStyle = C.faint;
      for(r=1;r<=3;r++) for(x=3;x<W;x+=6) ctx.fillRect(x, r*T + 6, 2, 1);
      /* lane separators */
      for(r=1;r<Lanes.ROWS;r++){ctx.fillStyle = C.faint; ctx.fillRect(0, r*T, W, 1)}
      /* goal slots */
      Lanes.SLOTS.forEach(function(sl, i){
        var sx = sl.c*T, done = s.filled[i];
        ctx.fillStyle = done ? C.lcd : C.dark; ctx.fillRect(sx, 1, 2*T, T - 1);
        if(!done){ctx.strokeStyle = C.dim; ctx.strokeRect(sx + 0.5, 1.5, 2*T - 1, T - 2)}
        g.text(sl.name, sx + T, 9, done ? C.dark : C.dim, g.FONT, "center");
      });
      /* movers */
      for(r=1;r<Lanes.ROWS;r++){
        L = s.lanes[r]; if(!L) continue;
        y = r*T;
        for(i=0;i<L.items.length;i++){
          it = L.items[i]; x = Math.round(it.x*T); w = it.len*T;
          if(x >= W || x + w <= 0) continue;
          if(L.kind === "deadline"){
            ctx.fillStyle = L.hot ? C.hot : C.dim; ctx.fillRect(x + 1, y + 2, w - 2, T - 3);
            g.text(label(g, it.t, w), x + w/2, y + 9, C.dark, g.FONT, "center");
          }else{
            ctx.fillStyle = C.faint; ctx.fillRect(x + 1, y + 2, w - 2, T - 3);
            ctx.strokeStyle = C.lcd; ctx.strokeRect(x + 1.5, y + 2.5, w - 3, T - 4);
            for(var k=0;k<it.len;k++) ctx.drawImage(sp.tick, x + k*T + 3, y + 4);
          }
        }
      }
      /* the player */
      if(s.wait > 0 && s.dead){
        if(Math.floor(s.wait*10) % 2 || g.reduce) ctx.drawImage(sp.hurt, Math.round(s.deadX*T) + 1, s.deadRow*T + 1);
      }else if(!(s.wait > 0)){
        var fr = s.hopT < 0.09 ? sp.hop : sp.stand;
        ctx.drawImage(fr, Math.round(s.px*T) + 1, s.row*T + 1 - (s.hopT < 0.09 ? 1 : 0));
      }
      if(s.over || s.won){
        ctx.fillStyle = C.dark; ctx.fillRect(0, 50, W, 20);
        g.text(s.won ? "MONTH CLOSED" : "CLOSE SLIPPED", W/2, 65, s.won ? C.lcd : C.hot, g.BIG, "center");
      }
    },
    result:function(s){
      var misses = 0; for(var k in s.lost) misses += s.lost[k];
      var rows = [["Tasks closed", s.closed + "/5"], ["Closed on day", s.won ? s.day : "-"], ["Lives left", s.lives], ["Misses", misses], ["Hops", s.hops]];
      if(s.won){
        var verdict = s.day <= 5 ? "Five tasks, five days, no rework." : (s.day - 5) + (s.day - 5 === 1 ? " day" : " days") + " lost to rework. Same close, later.";
        return {win:true, title:"MONTH CLOSED ON DAY " + s.day + ".", lines:["Cash, AR, AP, payroll and reporting all signed off.", verdict],
          rows:rows, realLine:"At Weezie I cut the time to close the month by 34%."};
      }
      var why = mostLost(s);
      return {win:false, title:"CLOSE SLIPPED.\n" + s.closed + " OF 5 TASKS CLOSED.", lines:["Still open: " + open(s) + "."],
        tip:TIPS[why] || TIPS.hit, rows:rows};
    }
  });
})();
