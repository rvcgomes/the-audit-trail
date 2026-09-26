/* ================= Cartridges: RUNWAY RUN, BOARD FIGHT, DECISIONS =================
   Drawing and wording only; the rules are in runner.js, fight.js, decisions.js. */
(function(){
  if(!window.RUNWAY) return;

  /* ---------------- RUNWAY RUN ----------------
     The runner's world is 256×144, seen through a camera 24px down,
     so on the 192×120 screen everything reads about a third bigger. */
  var CAM = 24, SP = null;
  function sprites(g){
    if(SP) return SP;
    SP = {
      churn:g.sprite(["#............#","##..........##",".###......###.","..###.oo.###..","...########...","....######....",".....#..#.....",".............."]),
      churn2:g.sprite(["..............","..............","..............","#####.oo.#####",".############.","....######....",".....#..#.....",".............."]),
      bosses:[
        g.sprite(["........#.......",".......##.......",".......###......","......####...#..","......#####.##..",".....######.##..","....##########..","...####.#######.","...###...######.","..###.....#####.","..###.o..o#####.","..###.....####..","...##.xxx.###...","...###...####...","....#########...","......#####....."], 2),
        g.sprite([".......##.......","....########....","...##########...","..####.##..###..","..###..##.......","..####.##.......","...#########....",".....#########..",".......##.####..",".......##..###..","..###..##.####..","...##########...","....########....",".......##.......","................","................"], 2),
        g.sprite(["................","..####....####..","..#oo#....#oo#..","..####....####..","..####....####..","..####....####..","..####....####..","..####....####..","..#####..#####..","..############..","...##########...","....########....",".....######.....","................","................","................"], 2),
        g.sprite(["................","..##...##...##..",".####.####.####.",".#oo#.#oo#.#oo#.",".####.####.####.","..##...##...##..",".####.####.####.","################","################",".#............#.",".#............#.",".#............#.",".#............#.","................","................","................"], 2)
      ]
    };
    return SP;
  }
  function runnerBot(){
    return function(s, mem){
      var PX = Runner.PX, PW = Runner.PW, want = false;
      s.objs.forEach(function(o){
        if(o.done || mem[o.x + o.type]) return;
        var d = (o.x - (PX + PW))/s.speed;
        if(o.type === "cost" && d < 0.19 && d > 0){mem[o.x + o.type] = 1; want = Math.random() < 0.93}
        if(o.type === "doc" && d < 0.3 && d > 0){mem[o.x + o.type] = 1; want = true; mem.h = s.t + 0.24}
        if(o.type === "coin" && o.y < 100 && d < 0.2 && d > 0){mem[o.x + o.type] = 1; want = true}
      });
      return {down:want || (mem.h > s.t && !s.ground), dir:null, press:{}, taps:[]};
    };
  }

  RUNWAY.register({
    id:"runner", order:2, name:"RUNWAY RUN", sub:"jump", countdown:1.4, canvas:"press",
    help:"Tap A to jump, hold for higher. Grab the papers: they fill the data room.",
    say:"Runway Run. Tap A or Space to jump, hold to jump higher. Collect the papers to fill the data room before month 6.",
    create:function(){return Runner.create()},
    step:function(s, dt, inp){Runner.step(s, dt, inp.down)},
    demo:function(s, mem){if(!mem.bot) mem.bot = runnerBot(); return mem.bot(s, mem)},
    mood:function(s){return Math.max(0, Math.min(1, 1 - Runner.runway(s)/8))},
    hud:function(s){
      return {cells:[["MONTH", Math.min(18, s.month)], ["CASH", fmtK(s.cash)], ["RUNWAY", Math.min(99, Math.floor(Runner.runway(s))) + " mo"]],
        row2:["DATA ROOM", s.docs + "/5", "TEAM", s.team, s.team < 30]};
    },
    onEvent:function(e, g, s){
      if(e.type === "coin"){g.sfx("coin"); g.float(e.text, e.x, e.y - 4 - CAM)}
      else if(e.type === "doc"){g.sfx("doc"); g.float(e.text, e.x - 20, e.y - 4 - CAM); g.flash("gV4", true)}
      else if(e.type === "hit"){g.sfx("hit"); g.float(e.text, Runner.PX, e.y - 18 - CAM, g.COL.hot); g.fx.shake = 0.18; g.flash("gV2", false)}
      else if(e.type === "jump") g.sfx("jump");
      else if(e.type === "prompt"){var p = s.prompt; g.line(p.prompt + "  ▲ jump: " + p.up.t + " · ▼ stay: " + p.down.t)}
      else if(e.type === "gate"){g.banner(e.text.split(". ")[0], 1.8); g.line(e.text); g.sfx("gate")}
      else if(e.type === "seed"){g.banner(e.text, 2.2); g.say(e.text); g.sfx(s.raised ? "seed" : "nothing"); g.flash("gV2", s.raised > 0)}
    },
    draw:function(g, s){
      var ctx = g.ctx, C = g.COL, W = g.W, GR = Runner.GROUND, scroll = s.t*s.speed, sp = sprites(g);
      ctx.translate(0, -CAM);
      ctx.fillStyle = C.faint;
      for(var i=0;i<10;i++){var span = W + 48, bx = ((i*27 - scroll*0.25) % span + span) % span - 24, bh = 12 + (i*53 % 30); ctx.fillRect(Math.round(bx), GR - bh, 16, bh)}
      ctx.fillStyle = C.dim; ctx.fillRect(0, GR, W, 1);
      var off = scroll % 10; for(var x = -off; x < W; x += 10) ctx.fillRect(Math.round(x), GR + 5, 4, 1);
      s.objs.forEach(function(o){
        var ox = Math.round(o.x), oy = Math.round(o.y);
        if(ox > W + 20) return;
        if(o.type === "coin" && !o.done) ctx.drawImage(g.SPR.coin, ox, oy);
        else if(o.type === "doc" && !o.done) ctx.drawImage(g.SPR.doc, ox, oy + Math.round(Math.sin(s.t*6)*1.5));
        else if(o.type === "churn") ctx.drawImage(Math.floor(s.t*8) % 2 ? sp.churn : sp.churn2, ox, oy);
        else if(o.type === "cost"){
          ctx.fillStyle = o.done ? C.mid : C.dim; ctx.fillRect(ox, oy, o.w, o.h);
          g.text(o.kind === "TAX" ? "%" : o.kind === "FX" ? "$" : "€", ox + o.w/2, oy + o.h - 3, C.dark, g.FONT, "center");
        }else if(o.type === "gate"){
          ctx.fillStyle = C.faint; ctx.fillRect(ox + 6, 40, 2, GR - 40);
          ctx.fillStyle = o.choice === "up" ? C.lcd : C.mid; ctx.fillRect(ox, 42, 14, GR - 84);
          ctx.fillStyle = o.choice === "down" ? C.lcd : C.mid; ctx.fillRect(ox, GR - 30, 14, 30);
          g.text("▲", ox + 7, 68, C.dark, g.FONT, "center"); g.text("▼", ox + 7, GR - 12, C.dark, g.FONT, "center");
          if(!o.done){g.text(o.gate.up.t, ox - 4, 60, C.lcd, g.FONT, "right"); g.text(o.gate.down.t, ox - 4, GR - 18, C.lcd, g.FONT, "right")}
        }
      });
      var fr = !s.ground ? g.SPR.jump : (Math.floor(s.t*10) % 2 ? g.SPR.run1 : g.SPR.run2);
      if(!(s.inv > 0 && Math.floor(s.t*20) % 2)) ctx.drawImage(fr, Runner.PX, Math.round(s.y));
      if(s.over || s.won) g.text(s.won ? "MONTH 18" : s.over === "cash" ? "OUT OF CASH" : "THE TEAM LEFT", W/2, 84, s.won ? C.lcd : C.hot, g.BIG, "center");
    },
    overlay:function(g, s){
      var ctx = g.ctx, C = g.COL, total = Runner.MONTHS*Runner.MONTH, bw = g.W - 16;
      ctx.fillStyle = C.faint; ctx.fillRect(8, 3, bw, 3);
      ctx.fillStyle = C.lcd; ctx.fillRect(8, 3, Math.round(bw*Math.min(1, s.t/total)), 3);
      [[6.5, "SEED"], [9, "?"], [14, "?"]].forEach(function(m){var x = 8 + Math.round(bw*m[0]/18); ctx.fillStyle = C.hot; ctx.fillRect(x, 1, 1, 7); g.text(m[1], x + 2, 14, C.dim)});
    },
    result:function(s){
      var rows = [["Month reached", Math.min(18, s.month)], ["Cash left", fmtK(s.cash)], ["Team", Math.round(s.team) + "%"], ["Data room", s.docs + "/5"], ["Surprises hit", s.hits]];
      if(s.won){
        var verdict = s.team < 30 ? "The cash made it. The team barely did." : s.cash >= 1500 ? "Room to plan the next round calmly." : "You made it, with not much left.";
        return {win:true, title:"MONTH 18. YOU MADE IT.", lines:["Cash " + fmtK(s.cash) + " · team " + Math.round(s.team) + "%", "Data room " + s.docs + "/5 · " + s.hits + " surprises hit", verdict], rows:rows};
      }
      var tip = s.over === "team" ? "Every surprise cost team trust too." : s.docs < Runner.DOCS_FULL ? "The data room had " + s.docs + " of 5 papers. Hold A to jump higher." : "Too many surprises. Jump a little earlier.";
      return {win:false, title:(s.over === "team" ? "THE TEAM WALKED OUT\nIN MONTH " : "OUT OF CASH IN MONTH ") + Math.min(18, s.month) + ".", lines:[], tip:tip, rows:rows};
    }
  });

  /* ---------------- BOARD FIGHT ---------------- */
  function fightBot(){
    return function(s, mem){
      var inp = {down:false, dir:null, press:{}, taps:[]};
      if(s.phase !== "fight") return inp;
      var b = s.boss, target = (b.zone[0] + b.zone[1])/2;
      if(s.charging){inp.down = !(s.winding && b.windup - s.wind > 0.15) && s.power < target; return inp}
      if(s.cool <= 0 && !s.winding && s.next > target/b.rate*1.15) inp.down = true;
      return inp;
    };
  }
  RUNWAY.register({
    id:"fight", order:6, name:"BOARD FIGHT", sub:"charge", countdown:0, canvas:"press",
    help:"Hold A to charge, let go inside the zone. When the boss shows !, let go.",
    say:"Board Fight. Hold A or Space to charge, release inside the marked zone. Release when the boss shows an exclamation mark.",
    create:function(){return Fight.create()},
    step:function(s, dt, inp){Fight.step(s, dt, inp.down)},
    demo:function(s, mem){if(!mem.bot) mem.bot = fightBot(); return mem.bot(s, mem)},
    mood:function(s){return Math.max(0, Math.min(1, 1 - s.runway/Fight.RUNWAY + (s.round >= 3 ? 0.3 : 0)))},
    hud:function(s){
      return {cells:[["ROUND", (s.round + 1) + "/4"], ["BOSS", s.boss.name.replace("THE ", "")], ["RUNWAY", s.runway + " mo"]],
        row2:["TIME", Math.max(0, Math.ceil(Fight.ROUND_TIME - s.roundT)) + "s", "QUARTER", 100*(1 - s.roundT/Fight.ROUND_TIME), s.roundT > Fight.ROUND_TIME - 5]};
    },
    onEvent:function(e, g, s){
      var C = g.COL, fx = g.fx;
      if(e.type === "round") g.line(s.boss.name + ": " + s.boss.line);
      else if(e.type === "clean"){g.sfx("clean"); fx.beam = 0.3; fx.clean = 1; g.float(e.text, 104, 40, C.lcd); fx.bossHit = 0.25}
      else if(e.type === "strike"){g.sfx("strike"); fx.beam = 0.18; fx.clean = 0; g.float(e.text, 112, 44); fx.bossHit = 0.2}
      else if(e.type === "fizzle"){g.sfx("fizzle"); g.float(e.text, 14, 52, C.dim)}
      else if(e.type === "guard"){g.sfx("guard"); fx.guard = 0.25; fx.wave = 0.18; g.float(e.text, 12, 50, C.dim)}
      else if(e.type === "windup") g.sfx("windup");
      else if(e.type === "hurt" || e.type === "backfire" || e.type === "timeout"){g.sfx("hurt"); fx.shake = 0.25; fx.wave = e.type === "hurt" ? 0.2 : 0; g.float(e.text, 8, 44, C.hot); g.flash("gV3", false); g.say(e.text)}
      else if(e.type === "ko"){g.sfx("ko"); fx.ko = 1.2; g.say(e.text)}
    },
    draw:function(g, s){
      var ctx = g.ctx, C = g.COL, W = g.W, fx = g.fx, reduce = g.reduce, now = g.now(), sp = sprites(g);
      var GR = 92, b = s.boss, bx = 136, by = GR - 32, px = 24, py = GR - 28;
      ctx.fillStyle = C.dim; ctx.fillRect(0, GR, W, 1);
      g.text("RUNWAY", 6, 10, C.dim);
      for(var k=0;k<Fight.RUNWAY;k++){ctx.fillStyle = k < s.runway ? C.lcd : C.faint; ctx.fillRect(6 + k*7, 13, 5, 4)}
      g.text(b.name, W - 6, 10, C.dim, g.FONT, "right");
      ctx.fillStyle = C.faint; ctx.fillRect(W - 76, 13, 70, 4); ctx.fillStyle = C.hot; ctx.fillRect(W - 76, 13, Math.round(70*b.hp/b.max), 4);
      var shakeB = (s.winding || fx.bossHit) && !reduce ? Math.round(Math.sin(now/25)*1.5) : 0, bob = reduce ? 0 : Math.round(Math.sin(now/300)*2);
      if(!(fx.ko && Math.floor(fx.ko*12) % 2) && !(s.phase === "clear" && !fx.ko)) ctx.drawImage(sp.bosses[s.round], bx + shakeB, by + bob);
      if(s.winding && s.phase === "fight") g.text("!", bx + 16, by - 6, Math.floor(now/90) % 2 ? C.hot : C.lcd, g.BIG, "center");
      var inZone = s.power >= b.zone[0] && s.power <= b.zone[1];
      if(s.charging){
        var r = 16 + (reduce ? 0 : Math.sin(now/60)*2);
        ctx.fillStyle = s.power > b.zone[1] ? C.hot : inZone ? C.lcd : C.dim;
        for(var a=0;a<16;a++){var an = a/16*Math.PI*2 + now/400; ctx.fillRect(Math.round(px + 10 + Math.cos(an)*r), Math.round(py + 14 + Math.sin(an)*r*0.9), 2, 2)}
      }
      var hero = s.charging ? g.SPR.jump : g.SPR.run2;
      ctx.drawImage(hero, px, py, hero.width*2, hero.height*2);
      if(fx.guard){ctx.fillStyle = C.lcd; ctx.fillRect(px + 24, py - 2, 2, 32)}
      if(fx.beam){
        var th = fx.clean ? 8 + Math.round(Math.sin(now/30)*2) : 3, y0 = py + 12 - th/2;
        ctx.fillStyle = C.lcd; ctx.fillRect(px + 22, y0, bx - px - 20, th);
        if(fx.clean){ctx.fillStyle = C.dark; ctx.fillRect(px + 22, y0 + th/2 - 1, bx - px - 20, 2)}
      }
      if(fx.wave){var wx = bx - Math.round((1 - fx.wave/0.2)*(bx - px - 24)); ctx.fillStyle = C.hot; ctx.fillRect(wx, GR - 16, 4, 16); ctx.fillRect(wx + 6, GR - 10, 3, 10)}
      var mx = 10, my = 108, mw = W - 20, scale = mw/Fight.BACKFIRE;
      ctx.fillStyle = C.faint; ctx.fillRect(mx, my, mw, 7);
      ctx.fillStyle = C.mid; ctx.fillRect(mx + Math.round(b.zone[0]*scale), my - 2, Math.round((b.zone[1] - b.zone[0])*scale), 11);
      ctx.fillStyle = s.power > b.zone[1] ? C.hot : C.lcd; ctx.fillRect(mx, my + 1, Math.round(Math.min(Fight.BACKFIRE, s.power)*scale), 5);
      ctx.fillStyle = C.dim; ctx.fillRect(mx + Math.round(Fight.MIN_HIT*scale), my + 7, 1, 3); ctx.fillRect(mx + Math.round(100*scale), my - 3, 1, 13);
      g.text("POWER", mx, my - 4, C.dim);
      if(s.phase === "intro"){ctx.fillStyle = "rgba(28,24,18,.85)"; ctx.fillRect(0, 30, W, 36); g.text("ROUND " + (s.round + 1), W/2, 44, C.dim, g.FONT, "center"); g.text(b.name, W/2, 60, C.lcd, g.BIG, "center")}
      if(fx.ko) g.text(b.name + " DOWN", W/2, 48, C.lcd, g.BIG, "center");
      if(s.over) g.text("OUT OF RUNWAY", W/2, 52, C.hot, g.BIG, "center");
      if(s.won) g.text("SEED CLOSED", W/2, 52, C.lcd, g.BIG, "center");
    },
    result:function(s){
      var rows = [["Bosses beaten", s.round + (s.won ? 1 : 0) + "/4"], ["Clean hits", s.clean], ["Runway left", s.runway + " mo"]];
      if(s.won) return {win:true, title:"SEED CLOSED. FOUR BOSSES DOWN.", lines:["Clean hits " + s.clean + " · runway left " + s.runway + " months"], rows:rows};
      var tip = s.clean < s.hits/2 ? "Let go inside the marked zone: a clean hit does three times the damage." : "When the boss shows !, let go. Getting caught charging costs two months.";
      return {win:false, title:"OUT OF RUNWAY AGAINST\n" + s.boss.name + ".", lines:[], tip:tip, rows:rows};
    }
  });

  /* ---------------- DECISIONS (text) ---------------- */
  function fmtK(k){k = Math.max(0, k); return k >= 1000 ? "€" + (k/1000).toFixed(2) + "M" : "€" + Math.round(k) + "k"}
  RUNWAY.register({
    id:"decisions", order:7, name:"DECISIONS", sub:"think", type:"text",
    start:function(ui){
      var D = Decisions.newGame(Math.random);
      function hud(){
        var r = Decisions.runway(D);
        ui.setHud([["MONTH", D.m], ["CASH", ui.fmt(D.cash)], ["RUNWAY", r === Infinity ? "PROFIT" : Math.min(99, Math.floor(Math.max(0, r))) + " mo"]],
          ["REVENUE", "€" + Math.round(D.rev) + "k/mo", "TEAM", D.trust, D.trust < 35]);
      }
      function snap(){return {cash:D.cash, rev:D.rev, trust:D.trust}}
      function delta(b){
        var out = ["cash " + ui.sign(D.cash - b.cash, "k")];
        if(D.rev !== b.rev) out.push("revenue " + ui.sign(D.rev - b.rev, "k/mo"));
        if(D.trust !== b.trust) out.push("team " + ui.sign(D.trust - b.trust));
        return out.join(" · ");
      }
      function card(pre){
        var c = D.deck[D.q];
        if(c === "raise"){
          var b = snap(), r = Decisions.raise(D), ok = Decisions.quarter(D);
          hud(); ui.flash("gV2", D.raised > 0); ui.sfx(D.raised ? "seed" : "nothing");
          pre = pre.concat(["Q3 · " + r.replace(/\n/g, " ") + " (" + delta(b) + ")"]);
          if(!ok) return end(pre);
          c = D.deck[D.q];
        }
        if(D.q >= 6) return end(pre);
        ui.screen(pre.map(function(l){return "» " + l}).join("\n") + "\n\nQ" + (D.q + 1) + ": " + c.q);
        ui.options(Decisions.shuffle(c.o, Math.random).map(function(o){
          return [o.t, "", function(){
            var b = snap(), r = Decisions.choose(D, o, Math.random), ok = Decisions.quarter(D);
            hud(); ui.flash("gV2", D.cash >= b.cash);
            var lines = [r.replace(/\n/g, " "), delta(b)];
            if(!ok) return end(lines);
            card(lines);
          }];
        }));
      }
      function end(pre){
        var r = Decisions.runway(D), head = pre.map(function(l){return "» " + l});
        var rows = [["Month reached", D.m], ["Cash left", ui.fmt(D.cash)], ["Revenue", "€" + Math.round(D.rev) + "k/mo"], ["Team", D.trust + "%"]];
        if(D.over === "cash") return ui.end({win:false, title:head.join("\n") + "\n\nOUT OF CASH IN MONTH " + D.m + ".", lines:[], tip:"Runway ends a few moves before the money does.", rows:rows});
        if(D.over === "trust") return ui.end({win:false, title:head.join("\n") + "\n\nMONTH " + D.m + ". THE TEAM WALKED OUT.", lines:[], tip:"Cash is half of runway. People are the other half.", rows:rows});
        var left = r === Infinity ? "profitable" : Math.floor(r) + " months";
        var verdict = r === Infinity ? "Profitable. Investors will call you." : r >= 12 ? "Room to plan the next round calmly." : r >= 6 ? "You'll be raising again within months." : "You made it, with almost nothing left.";
        ui.end({win:true, title:head.join("\n") + "\n\nMONTH 18. YOU MADE IT.", lines:["Cash " + ui.fmt(D.cash) + " · runway " + left + " · team " + D.trust + "%", verdict], rows:rows.concat([["Runway left", left]])});
      }
      hud(); card(["€1.2M in the bank, €150k burn a month. Reach month 18."]);
    }
  });
})();
