/* ================= RUNWAY handheld: screen, controls, cartridges =================
   Draws RUNWAY RUN and BOARD FIGHT on a 192×120 pixel canvas and runs
   DECISIONS as text. The rules live in runner.js, fight.js, decisions.js. */
(function(){
  var dev = document.getElementById("device");
  if(!dev || !window.Runner || !window.Fight || !window.Decisions) return;
  var C = window.CONFIG || {};
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(id){return document.getElementById(id)}
  var cv = $("gCanvas"), ctx = cv.getContext("2d"), msg = $("gMsg"), live = $("gLive"), opts = $("gOpts");
  var hud = $("gHud"), hud2 = $("gHud2"), cartEl = $("gCart"), aBtn = $("gA"), bBtn = $("gB"), sndBtn = $("gSnd");
  var W = 192, H = 120;
  var COL = {lcd:"#FFB547", dim:"#B08A48", dark:"#1C1812", hot:"#FF7A45", faint:"#3a2e18", mid:"#5a4524"};
  var FONT = "10px VT323, monospace", BIG = "16px VT323, monospace";

  /* ---------- sprites ('#' amber, 'o' hot, 'x' dark) ---------- */
  function sprite(rows, scale){
    scale = scale || 1;
    var c = document.createElement("canvas"); c.width = rows[0].length*scale; c.height = rows.length*scale;
    var x = c.getContext("2d");
    rows.forEach(function(r, j){for(var i=0;i<r.length;i++){var ch = r[i]; if(ch === ".") continue;
      x.fillStyle = ch === "o" ? COL.hot : ch === "x" ? COL.dark : ch === "d" ? COL.dim : COL.lcd; x.fillRect(i*scale, j*scale, scale, scale)}});
    return c;
  }
  var HEAD = ["...####...","..######..","..#x##x#..","..######..","...####...","..##xx##..",".###xx###.","#..#xx#..#","...####...","...####..."];
  var P = {
    run1: HEAD.concat(["..##..##..",".##....##.",".#......##","##........"]),
    run2: HEAD.concat(["...#..#...","...#..#...","..##..##..",".........."]),
    jump: HEAD.concat(["..######..",".##....##.","..........",".........."])
  };
  var SPR = {
    run1:sprite(P.run1), run2:sprite(P.run2), jump:sprite(P.jump),
    hero:sprite(P.run2, 2), heroCharge:sprite(P.jump, 2),
    coin:sprite(["..####..",".#dddd#.","#dd##dd#","#d#dddd#","#d#dddd#","#dd##dd#",".#dddd#.","..####.."]),
    doc:sprite(["######..","#dddd##.","#d##dd##","#dddddd#","#d####d#","#dddddd#","#d####d#","#dddddd#","#d###dd#","########"]),
    churn:sprite(["#............#","##..........##",".###......###.","..###.oo.###..","...########...","....######....",".....#..#.....",".............."]),
    churn2:sprite(["..............","..............","..............","#####.oo.#####",".############.","....######....",".....#..#.....",".............."]),
    bosses:[
      sprite(["........#.......",".......##.......",".......###......","......####...#..","......#####.##..",".....######.##..","....##########..","...####.#######.","...###...######.","..###.....#####.","..###.o..o#####.","..###.....####..","...##.xxx.###...","...###...####...","....#########...","......#####....."], 2),
      sprite([".......##.......","....########....","...##########...","..####.##..###..","..###..##.......","..####.##.......","...#########....",".....#########..",".......##.####..",".......##..###..","..###..##.####..","...##########...","....########....",".......##.......","................","................"], 2),
      sprite(["................","..####....####..","..#oo#....#oo#..","..####....####..","..####....####..","..####....####..","..####....####..","..####....####..","..#####..#####..","..############..","...##########...","....########....",".....######.....","................","................","................"], 2),
      sprite(["................","..##...##...##..",".####.####.####.",".#oo#.#oo#.#oo#.",".####.####.####.","..##...##...##..",".####.####.####.","################","################",".#............#.",".#............#.",".#............#.",".#............#.","................","................","................"], 2)
    ]
  };

  /* ---------- sound (off by default) ---------- */
  var snd = {on:false, ac:null};
  try{snd.on = localStorage.getItem("runway-sound") === "on"}catch(e){}
  function tone(f, d, type, vol, f2, delay){
    if(!snd.on) return;
    try{
      if(!snd.ac) snd.ac = new (window.AudioContext || window.webkitAudioContext)();
      var ac = snd.ac, t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
      o.type = type || "square"; o.frequency.setValueAtTime(f, t);
      if(f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(vol || 0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
    }catch(e){}
  }
  function arp(notes, step){notes.forEach(function(n, i){tone(n, step*1.6, "square", 0.03, 0, i*step)})}
  var SFX = {
    jump:function(){tone(520, .09, "square", .025, 780)}, coin:function(){tone(988, .05); tone(1319, .08, "square", .03, 0, .05)},
    doc:function(){arp([660, 880, 1100], .05)}, hit:function(){tone(160, .2, "sawtooth", .05, 60)}, gate:function(){tone(440, .12, "triangle", .05)},
    seed:function(){arp([523, 659, 784, 1047], .08)}, nothing:function(){arp([392, 330, 262], .12)},
    clean:function(){tone(880, .18, "square", .04, 1760)}, strike:function(){tone(440, .1)}, fizzle:function(){tone(200, .08, "triangle")},
    windup:function(){tone(300, .12, "triangle", .04, 420)}, hurt:function(){tone(110, .25, "sawtooth", .05, 55)}, guard:function(){tone(700, .05, "triangle")},
    ko:function(){arp([523, 784, 1047], .07)}, win:function(){arp([523, 659, 784, 1047, 1319], .09)}, lose:function(){arp([392, 311, 262, 196], .14)}
  };
  function setSound(on){
    snd.on = on; sndBtn.setAttribute("aria-pressed", on); sndBtn.textContent = on ? "♪ ON" : "♪ OFF";
    try{localStorage.setItem("runway-sound", on ? "on" : "off")}catch(e){}
  }
  setSound(snd.on);
  sndBtn.addEventListener("click", function(){setSound(!snd.on); if(snd.on) SFX.coin()});

  /* ---------- helpers ---------- */
  function fmt(k){k = Math.max(0, k); return k >= 1000 ? "€" + (k/1000).toFixed(2) + "M" : "€" + Math.round(k) + "k"}
  function sign(n, unit){return (n > 0 ? "+" : "−") + Math.abs(Math.round(n)) + (unit || "")}
  function say(text){live.textContent = ""; setTimeout(function(){live.textContent = text.replace(/\n+/g, " ")}, 30)}
  function setHud(cells, row2){
    hud.hidden = false; hud2.hidden = !row2;
    cells.forEach(function(c, i){$("gL" + (i+1)).textContent = c[0]; var v = $("gV" + (i+1)); if(v.textContent !== String(c[1])) v.textContent = c[1]});
    if(row2){
      $("gL4").textContent = row2[0]; $("gV4").textContent = row2[1]; $("gL5").textContent = row2[2];
      $("gBarI").style.width = Math.max(0, Math.min(100, row2[3])) + "%"; $("gBar").classList.toggle("low", !!row2[4]);
    }
  }
  function flash(id, good){var el = $(id); el.classList.remove("up", "down"); void el.offsetWidth; el.classList.add(good ? "up" : "down")}
  function screen(text){msg.classList.remove("line"); msg.textContent = text; say(text)}
  function options(list, focus){
    opts.innerHTML = "";
    list.forEach(function(o){
      var b = document.createElement("button"); b.type = "button";
      var t = document.createElement("span"); t.textContent = "▸ " + o[0]; b.appendChild(t);
      if(o[1]){var s = document.createElement("span"); s.className = "s"; s.textContent = o[1]; b.appendChild(s)}
      b.addEventListener("click", o[2]); opts.appendChild(b);
    });
    var f = opts.querySelector("button"); if(f && focus) f.focus({preventScroll:true});
  }
  function moveFocus(d){
    var bs = [].slice.call(opts.querySelectorAll("button")); if(!bs.length) return;
    var i = bs.indexOf(document.activeElement); bs[(i + d + bs.length) % bs.length].focus({preventScroll:true});
  }

  /* ---------- state ---------- */
  var mode = "menu", S = null, D = null, down = false, running = false, paused = false, raf = 0, last = 0, countdown = 0, endTimer = 0;
  var floats = [], fx = {}, bannerText = "", hudT = 0;

  function stop(){running = false; if(raf) cancelAnimationFrame(raf); raf = 0; clearTimeout(endTimer); down = false; aBtn.classList.remove("on")}

  var CARTS = [
    {id:"runner", name:"RUNWAY RUN", sub:"jump · about 60 seconds"},
    {id:"fight", name:"BOARD FIGHT", sub:"charge · four bosses"},
    {id:"decisions", name:"DECISIONS", sub:"think · six quarters"}
  ];
  function menu(focus){
    stop(); mode = "menu"; cartEl.textContent = "CFO EDITION"; hud.hidden = hud2.hidden = true; cv.hidden = true;
    screen("INSERT A CARTRIDGE\n\n€1.2M in the bank, €150k burn a month.\nReach month 18.");
    options(CARTS.map(function(c){return [c.name, c.sub, function(){start(c.id)}]}), focus);
    dev.classList.remove("on");
  }
  function start(id){
    stop(); dev.classList.add("on");
    cartEl.textContent = CARTS.filter(function(c){return c.id === id})[0].name;
    if(id === "decisions") return startDecisions();
    mode = id; S = id === "runner" ? Runner.create() : Fight.create();
    floats = []; fx = {}; opts.innerHTML = ""; cv.hidden = false;
    msg.classList.add("line");
    msg.textContent = id === "runner" ? "Tap A to jump, hold for higher. Grab the papers: they fill the data room." : "Hold A to charge, let go inside the zone. When the boss shows !, let go.";
    say(id === "runner" ? "Runway Run. Tap A or Space to jump, hold to jump higher. Collect the papers to fill the data room before month 6." : "Board Fight. Hold A or Space to charge, release inside the marked zone. Release when the boss shows an exclamation mark.");
    countdown = id === "runner" ? 1.6 : 0; paused = false;
    dev.focus({preventScroll:true});
    last = performance.now(); running = true; hudTick(true); raf = requestAnimationFrame(frame);
  }

  /* ---------- loop ---------- */
  function frame(now){
    raf = 0; if(!running) return;
    var dt = Math.min(0.05, (now - last)/1000); last = now;
    if(!paused){
      if(countdown > 0) countdown -= dt;
      else{(mode === "runner" ? Runner : Fight).step(S, dt, down); events()}
      tickFx(dt);
    }
    draw(); hudTick();
    if(S.over || S.won){running = false; endTimer = setTimeout(endArcade, 900); return}
    raf = requestAnimationFrame(frame);
  }
  function tickFx(dt){
    floats.forEach(function(f){f.life -= dt; f.y -= 22*dt}); floats = floats.filter(function(f){return f.life > 0});
    for(var k in fx){fx[k] -= dt; if(fx[k] <= 0) delete fx[k]}
  }
  function float(text, x, y, color){floats.push({text:text, x:x, y:y, life:0.9, color:color || COL.lcd})}
  function events(){
    S.events.forEach(function(e){
      if(SFX[e.type] && e.type !== "seed" && e.type !== "gate" && e.type !== "win") SFX[e.type]();
      if(mode === "runner"){
        if(e.type === "coin") float(e.text, e.x, e.y - 4);
        else if(e.type === "doc"){float(e.text, e.x - 20, e.y - 4); flash("gV4", true)}
        else if(e.type === "hit"){float(e.text, Runner.PX, e.y - 18, COL.hot); fx.shake = 0.18; flash("gV2", false)}
        else if(e.type === "prompt"){var g = S.prompt; msg.textContent = g.prompt + "  ▲ jump: " + g.up.t + " · ▼ stay: " + g.down.t; say(msg.textContent)}
        else if(e.type === "gate"){fx.banner = 1.8; bannerText = e.text.split(". ")[0]; msg.textContent = e.text; say(e.text); SFX.gate()}
        else if(e.type === "seed"){fx.banner = 2.2; bannerText = e.text; say(e.text); if(S.raised === 0) SFX.nothing(); else SFX.seed(); flash("gV2", S.raised > 0)}
      }else{
        if(e.type === "round"){msg.textContent = S.boss.name + ": " + S.boss.line; say(msg.textContent)}
        else if(e.type === "clean"){fx.beam = 0.3; fx.clean = 1; float(e.text, 104, 40, COL.lcd); fx.bossHit = 0.25}
        else if(e.type === "strike"){fx.beam = 0.18; fx.clean = 0; float(e.text, 112, 44); fx.bossHit = 0.2}
        else if(e.type === "fizzle") float(e.text, 14, 52, COL.dim);
        else if(e.type === "guard"){fx.guard = 0.25; fx.wave = 0.18; float(e.text, 12, 50, COL.dim)}
        else if(e.type === "hurt" || e.type === "backfire" || e.type === "timeout"){fx.shake = 0.25; fx.wave = e.type === "hurt" ? 0.2 : 0; float(e.text, 8, 44, COL.hot); flash("gV3", false); say(e.text)}
        else if(e.type === "ko"){fx.ko = 1.2; say(e.text)}
      }
    });
    S.events.length = 0;
  }
  function hudTick(force){
    hudT -= 1; if(hudT > 0 && !force) return; hudT = 5;
    if(mode === "runner"){
      var r = Runner.runway(S);
      setHud([["MONTH", Math.min(18, S.month)], ["CASH", fmt(S.cash)], ["RUNWAY", Math.min(99, Math.floor(r)) + " mo"]],
        ["DATA ROOM", S.docs + "/5", "TEAM", S.team, S.team < 30]);
    }else if(mode === "fight"){
      setHud([["ROUND", (S.round + 1) + "/4"], ["BOSS", S.boss.name.replace("THE ", "")], ["RUNWAY", S.runway + " mo"]],
        ["TIME", Math.max(0, Math.ceil(Fight.ROUND_TIME - S.roundT)) + "s", "QUARTER", 100*(1 - S.roundT/Fight.ROUND_TIME), S.roundT > Fight.ROUND_TIME - 5]);
    }
  }

  /* ---------- drawing ----------
     The canvas is 192×120. The runner's world is 256×144, seen through a
     camera that starts 24px down, so everything reads about a third bigger. */
  var CAM = 24;
  function text(t, x, y, color, font, align){ctx.font = font || FONT; ctx.fillStyle = color || COL.lcd; ctx.textAlign = align || "left"; ctx.fillText(t, x, y)}
  function draw(){
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = COL.dark; ctx.fillRect(0, 0, W, H);
    var sx = fx.shake && !reduce ? Math.round((Math.random() - .5)*4) : 0, sy = fx.shake && !reduce ? Math.round((Math.random() - .5)*3) : 0;
    ctx.translate(sx, sy - (mode === "runner" ? CAM : 0));
    if(mode === "runner") drawRunner(S); else drawFight(S);
    floats.forEach(function(f){ctx.globalAlpha = Math.min(1, f.life*2); text(f.text, Math.round(f.x), Math.round(f.y), f.color); ctx.globalAlpha = 1});
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if(mode === "runner") drawMonths(S);
    if(fx.banner){
      ctx.globalAlpha = Math.min(1, fx.banner*2);
      ctx.fillStyle = COL.dark; ctx.fillRect(12, 40, W - 24, 24); ctx.strokeStyle = COL.lcd; ctx.strokeRect(12.5, 40.5, W - 25, 23);
      text(bannerText, W/2, 57, COL.lcd, BIG, "center"); ctx.globalAlpha = 1;
    }
    if(paused) overlay("PAUSED", "press A to carry on");
    else if(countdown > 0) overlay(countdown > 0.8 ? "READY" : "GO", "");
  }
  function overlay(big, small){
    ctx.fillStyle = "rgba(28,24,18,.75)"; ctx.fillRect(0, 0, W, H);
    text(big, W/2, H/2 + 2, COL.lcd, BIG, "center"); if(small) text(small, W/2, H/2 + 16, COL.dim, FONT, "center");
  }
  /* months bar, in screen space, with the seed and the gates marked */
  function drawMonths(s){
    var total = Runner.MONTHS*Runner.MONTH, bw = W - 16;
    ctx.fillStyle = COL.faint; ctx.fillRect(8, 3, bw, 3);
    ctx.fillStyle = COL.lcd; ctx.fillRect(8, 3, Math.round(bw*Math.min(1, s.t/total)), 3);
    [[6.5, "SEED"], [9, "?"], [14, "?"]].forEach(function(m){var x = 8 + Math.round(bw*m[0]/18); ctx.fillStyle = COL.hot; ctx.fillRect(x, 1, 1, 7); text(m[1], x + 2, 14, COL.dim)});
  }

  function drawRunner(s){
    var GR = Runner.GROUND, scroll = s.t*s.speed;
    /* skyline */
    ctx.fillStyle = COL.faint;
    for(var i=0;i<10;i++){var span = W + 48, bx = ((i*27 - scroll*0.25) % span + span) % span - 24, bh = 12 + (i*53 % 30); ctx.fillRect(Math.round(bx), GR - bh, 16, bh)}
    /* ground */
    ctx.fillStyle = COL.dim; ctx.fillRect(0, GR, W, 1);
    var off = scroll % 10; for(var x = -off; x < W; x += 10) ctx.fillRect(Math.round(x), GR + 5, 4, 1);
    /* things */
    s.objs.forEach(function(o){
      var ox = Math.round(o.x), oy = Math.round(o.y);
      if(ox > W + 20) return;
      if(o.type === "coin" && !o.done) ctx.drawImage(SPR.coin, ox, oy);
      else if(o.type === "doc" && !o.done) ctx.drawImage(SPR.doc, ox, oy + Math.round(Math.sin(s.t*6)*1.5));
      else if(o.type === "churn") ctx.drawImage(Math.floor(s.t*8) % 2 ? SPR.churn : SPR.churn2, ox, oy);
      else if(o.type === "cost"){
        ctx.fillStyle = o.done ? COL.mid : COL.dim; ctx.fillRect(ox, oy, o.w, o.h);
        text(o.kind === "TAX" ? "%" : o.kind === "FX" ? "$" : "€", ox + o.w/2, oy + o.h - 3, COL.dark, FONT, "center");
      }else if(o.type === "gate"){
        var upOn = o.choice === "up", dnOn = o.choice === "down";
        ctx.fillStyle = COL.faint; ctx.fillRect(ox + 6, 40, 2, GR - 40);
        ctx.fillStyle = upOn ? COL.lcd : COL.mid; ctx.fillRect(ox, 42, 14, GR - 84);
        ctx.fillStyle = dnOn ? COL.lcd : COL.mid; ctx.fillRect(ox, GR - 30, 14, 30);
        text("▲", ox + 7, 68, COL.dark, FONT, "center"); text("▼", ox + 7, GR - 12, COL.dark, FONT, "center");
        if(!o.done){text(o.gate.up.t, ox - 4, 60, COL.lcd, FONT, "right"); text(o.gate.down.t, ox - 4, GR - 18, COL.lcd, FONT, "right")}
      }
    });
    /* player */
    var fr = !s.ground ? SPR.jump : (Math.floor(s.t*10) % 2 ? SPR.run1 : SPR.run2);
    if(!(s.inv > 0 && Math.floor(s.t*20) % 2)) ctx.drawImage(fr, Runner.PX, Math.round(s.y));
    if(s.over || s.won) text(s.won ? "MONTH 18" : s.over === "cash" ? "OUT OF CASH" : "THE TEAM LEFT", W/2, 84, s.won ? COL.lcd : COL.hot, BIG, "center");
  }

  function drawFight(s){
    var GR = 92, b = s.boss, bx = 136, by = GR - 32, px = 24, py = GR - 28;
    ctx.fillStyle = COL.dim; ctx.fillRect(0, GR, W, 1);
    /* runway pips and the boss bar */
    text("RUNWAY", 6, 10, COL.dim);
    for(var k=0;k<Fight.RUNWAY;k++){ctx.fillStyle = k < s.runway ? COL.lcd : COL.faint; ctx.fillRect(6 + k*7, 13, 5, 4)}
    text(b.name, W - 6, 10, COL.dim, FONT, "right");
    ctx.fillStyle = COL.faint; ctx.fillRect(W - 76, 13, 70, 4); ctx.fillStyle = COL.hot; ctx.fillRect(W - 76, 13, Math.round(70*b.hp/b.max), 4);
    /* boss */
    var shakeB = (s.winding || fx.bossHit) && !reduce ? Math.round(Math.sin(performance.now()/25)*1.5) : 0;
    var bob = reduce ? 0 : Math.round(Math.sin(performance.now()/300)*2);
    if(!(fx.ko && Math.floor(fx.ko*12) % 2) && !(s.phase === "clear" && !fx.ko)) ctx.drawImage(SPR.bosses[s.round], bx + shakeB, by + bob);
    if(s.winding && s.phase === "fight"){var bl = Math.floor(performance.now()/90) % 2; text("!", bx + 16, by - 6, bl ? COL.hot : COL.lcd, BIG, "center")}
    /* hero with charge aura */
    var inZone = s.power >= b.zone[0] && s.power <= b.zone[1];
    if(s.charging){
      var r = 16 + (reduce ? 0 : Math.sin(performance.now()/60)*2), c = s.power > b.zone[1] ? COL.hot : inZone ? COL.lcd : COL.dim;
      ctx.fillStyle = c;
      for(var a=0;a<16;a++){var an = a/16*Math.PI*2 + performance.now()/400; ctx.fillRect(Math.round(px + 10 + Math.cos(an)*r), Math.round(py + 14 + Math.sin(an)*r*0.9), 2, 2)}
    }
    ctx.drawImage(s.charging ? SPR.heroCharge : SPR.hero, px, py);
    if(fx.guard){ctx.fillStyle = COL.lcd; ctx.fillRect(px + 24, py - 2, 2, 32)}
    /* attacks */
    if(fx.beam){
      var th = fx.clean ? 8 + Math.round(Math.sin(performance.now()/30)*2) : 3, y0 = py + 12 - th/2;
      ctx.fillStyle = COL.lcd; ctx.fillRect(px + 22, y0, bx - px - 20, th);
      ctx.fillStyle = COL.dark; if(fx.clean) ctx.fillRect(px + 22, y0 + th/2 - 1, bx - px - 20, 2);
    }
    if(fx.wave){var wx = bx - Math.round((1 - fx.wave/0.2)*(bx - px - 24)); ctx.fillStyle = COL.hot; ctx.fillRect(wx, GR - 16, 4, 16); ctx.fillRect(wx + 6, GR - 10, 3, 10)}
    /* power meter */
    var mx = 10, my = 108, mw = W - 20, scale = mw/Fight.BACKFIRE;
    ctx.fillStyle = COL.faint; ctx.fillRect(mx, my, mw, 7);
    ctx.fillStyle = COL.mid; ctx.fillRect(mx + Math.round(b.zone[0]*scale), my - 2, Math.round((b.zone[1] - b.zone[0])*scale), 11);
    ctx.fillStyle = s.power > b.zone[1] ? COL.hot : COL.lcd; ctx.fillRect(mx, my + 1, Math.round(Math.min(Fight.BACKFIRE, s.power)*scale), 5);
    ctx.fillStyle = COL.dim; ctx.fillRect(mx + Math.round(Fight.MIN_HIT*scale), my + 7, 1, 3); ctx.fillRect(mx + Math.round(100*scale), my - 3, 1, 13);
    text("POWER", mx, my - 4, COL.dim);
    /* round intro and results */
    if(s.phase === "intro"){ctx.fillStyle = "rgba(28,24,18,.85)"; ctx.fillRect(0, 30, W, 36); text("ROUND " + (s.round + 1), W/2, 44, COL.dim, FONT, "center"); text(b.name, W/2, 60, COL.lcd, BIG, "center")}
    if(fx.ko) text(b.name + " DOWN", W/2, 48, COL.lcd, BIG, "center");
    if(s.over) text("OUT OF RUNWAY", W/2, 52, COL.hot, BIG, "center");
    if(s.won) text("SEED CLOSED", W/2, 52, COL.lcd, BIG, "center");
  }

  /* ---------- endings ---------- */
  function talk(){return C.email ? [["TALK TO THE REAL CFO", "", function(){var cta = $("cta"); location.href = cta ? cta.href : "mailto:" + C.email}]] : []}
  function again(id){return [["PLAY AGAIN", "", function(){start(id)}], ["MENU", "", function(){menu(true)}]]}
  function endArcade(){
    if(mode !== "runner" && mode !== "fight") return;
    var s = S, t, win = !!s.won;
    cv.hidden = true;
    if(mode === "runner"){
      if(win){
        var verdict = s.team < 30 ? "The cash made it. The team barely did." : s.cash >= 1500 ? "Room to plan the next round calmly." : "You made it, with not much left.";
        t = "MONTH 18. YOU MADE IT.\n\nCash " + fmt(s.cash) + " · team " + Math.round(s.team) + "%\nData room " + s.docs + "/5 · " + s.hits + " surprises hit\n" + verdict + "\n\nIn 2024 I did this for real:\n€3M raised, 18 months added.";
      }else{
        var why = s.over === "team" ? "Every surprise cost team trust too." : s.docs < Runner.DOCS_FULL ? "The data room had " + s.docs + " of 5 papers. Hold A to jump higher." : "Too many surprises. Jump earlier.";
        t = (s.over === "team" ? "THE TEAM WALKED OUT\nIN MONTH " : "OUT OF CASH IN MONTH ") + Math.min(18, s.month) + ".\n\n" + why;
      }
    }else{
      if(win) t = "SEED CLOSED. FOUR BOSSES DOWN.\n\nClean hits " + s.clean + " · runway left " + s.runway + " months\n\nIn 2024 I did this for real:\n€3M raised, 18 months added.";
      else{
        var tip = s.clean < s.hits/2 ? "Let go inside the marked zone: a clean hit does three times the damage." : "When the boss shows !, let go. Getting caught charging costs two months.";
        t = "OUT OF RUNWAY AGAINST\n" + s.boss.name + ".\n\n" + tip;
      }
    }
    (win ? SFX.win : SFX.lose)();
    screen(t); options(again(mode).concat(win ? talk() : []), true);
    dev.classList.toggle("on", win);
  }

  /* ---------- DECISIONS (text cartridge) ---------- */
  function decHud(){
    var r = Decisions.runway(D);
    setHud([["MONTH", D.m], ["CASH", fmt(D.cash)], ["RUNWAY", r === Infinity ? "PROFIT" : Math.min(99, Math.floor(Math.max(0, r))) + " mo"]],
      ["REVENUE", "€" + Math.round(D.rev) + "k/mo", "TEAM", D.trust, D.trust < 35]);
  }
  function snap(s){return {cash:s.cash, rev:s.rev, trust:s.trust}}
  function delta(b, a){
    var out = ["cash " + sign(a.cash - b.cash, "k")];
    if(a.rev !== b.rev) out.push("revenue " + sign(a.rev - b.rev, "k/mo"));
    if(a.trust !== b.trust) out.push("team " + sign(a.trust - b.trust));
    return out.join(" · ");
  }
  function startDecisions(){
    mode = "decisions"; D = Decisions.newGame(Math.random); cv.hidden = true; opts.innerHTML = "";
    decHud(); decCard(["€1.2M in the bank, €150k burn a month. Reach month 18."]);
  }
  function decCard(pre){
    var card = D.deck[D.q];
    if(card === "raise"){
      var b = snap(D), r = Decisions.raise(D), ok = Decisions.quarter(D);
      decHud(); flash("gV2", D.raised > 0);
      pre = pre.concat(["Q3 · " + r.replace(/\n/g, " ") + " (" + delta(b, D) + ")"]);
      if(!ok) return decEnd(pre);
      card = D.deck[D.q];
    }
    if(D.q >= 6) return decEnd(pre);
    screen(pre.map(function(l){return "» " + l}).join("\n") + "\n\nQ" + (D.q + 1) + ": " + card.q);
    options(Decisions.shuffle(card.o, Math.random).map(function(o, i){
      return [o.t, "", function(){
        var b = snap(D), r = Decisions.choose(D, o, Math.random), ok = Decisions.quarter(D);
        decHud(); flash("gV2", D.cash >= b.cash);
        var lines = [r.replace(/\n/g, " "), delta(b, D)];
        if(!ok) return decEnd(lines);
        decCard(lines);
      }];
    }), true);
  }
  function decEnd(pre){
    var t, head = pre.map(function(l){return "» " + l}).join("\n") + "\n\n";
    if(D.over === "cash") t = "OUT OF CASH IN MONTH " + D.m + ".\nRunway ends a few moves before the money does.";
    else if(D.over === "trust") t = "MONTH " + D.m + ". THE TEAM WALKED OUT.\nCash is half of runway. People are the other half.";
    else{
      var r = Decisions.runway(D), left = r === Infinity ? "profitable" : Math.floor(r) + " months";
      var verdict = r === Infinity ? "Profitable. Investors will call you." : r >= 12 ? "Room to plan the next round calmly." : r >= 6 ? "You'll be raising again within months." : "You made it, with almost nothing left.";
      t = "MONTH 18. YOU MADE IT.\nCash " + fmt(D.cash) + " · runway " + left + " · team " + D.trust + "%\n" + verdict;
    }
    (D.over ? SFX.lose : SFX.win)();
    screen(head + t); options(again("decisions").concat(D.over ? [] : talk()), true);
  }

  /* ---------- controls ---------- */
  function press(on){
    if(mode === "runner" || mode === "fight"){
      if(!running) return;
      if(paused){if(on){paused = false; last = performance.now()} down = false; return}
      down = on; aBtn.classList.toggle("on", on);
    }
  }
  function activate(){
    if(running) return;
    var f = opts.contains(document.activeElement) ? document.activeElement : opts.querySelector("button");
    if(f) f.click();
  }
  aBtn.addEventListener("pointerdown", function(e){e.preventDefault(); if(running) press(true); else activate()});
  ["pointerup", "pointercancel", "pointerleave"].forEach(function(t){aBtn.addEventListener(t, function(){press(false)})});
  aBtn.addEventListener("click", function(e){if(e.detail === 0) activate()});
  cv.addEventListener("pointerdown", function(e){e.preventDefault(); press(true)});
  ["pointerup", "pointercancel", "pointerleave"].forEach(function(t){cv.addEventListener(t, function(){press(false)})});
  bBtn.addEventListener("click", function(){menu(true)});
  document.querySelectorAll("#device [data-dir]").forEach(function(b){
    b.addEventListener("click", function(){var d = b.dataset.dir; if(running){ if(d === "up"){press(true); setTimeout(function(){press(false)}, 120)} } else moveFocus(d === "up" || d === "left" ? -1 : 1)});
  });
  var ACT = {" ":1, "Spacebar":1, "ArrowUp":1, "w":1, "W":1};
  dev.addEventListener("keydown", function(e){
    if(e.key === "Escape" || e.key === "Backspace"){e.preventDefault(); menu(true); return}
    if(running){
      if(ACT[e.key]){e.preventDefault(); if(!e.repeat) press(true)}
      return;
    }
    if(e.key === "ArrowDown" || e.key === "ArrowRight"){e.preventDefault(); moveFocus(1)}
    else if(e.key === "ArrowUp" || e.key === "ArrowLeft"){e.preventDefault(); moveFocus(-1)}
    else if((e.key === " " || e.key === "Enter") && !opts.contains(document.activeElement) && e.target === dev){e.preventDefault(); activate()}
  });
  dev.addEventListener("keyup", function(e){if(ACT[e.key]) press(false)});
  window.addEventListener("blur", function(){press(false)});

  /* pause when the console leaves the screen or the tab is hidden */
  function pause(){if(running && !paused && countdown <= 0){paused = true; down = false; draw()}}
  document.addEventListener("visibilitychange", function(){if(document.hidden) pause()});
  new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting) pause()})}, {threshold:0.35}).observe(cv);

  /* ?debug: step the game by hand (for screenshots and testing) */
  if(/[?&]debug\b/.test(location.search)) window.RUNWAY_DEBUG = {
    start:start, state:function(){return S},
    step:function(sec, hold){
      running = false; countdown = 0;
      for(var i=0;i<sec*60;i++){(mode === "runner" ? Runner : Fight).step(S, 1/60, !!(hold && hold(S))); events(); tickFx(1/60)}
      draw(); hudTick(true);
    }
  };
  menu(false);
})();
