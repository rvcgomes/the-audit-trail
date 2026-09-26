/* ================= RUNWAY handheld: the console =================
   Screen, controls, sound, menu, boot screen, demo mode and the receipt.
   Each game is a cartridge in games/carts/*.js that calls RUNWAY.register().
   The rules of each game live in games/*.js and have no DOM code.

   Arcade cartridge:
     {id, name, sub, help, say, countdown, canvas:"press"|"tap"|"swipe",
      create(seed), step(s, dt, inp), draw(g, s), hud(s) -> {cells, row2},
      onEvent(e, g), result(s) -> {win, title, lines, tip, rows, realLine | real:false},
      mood(s) -> 0..1, demo(s, mem) -> inp}
   Text cartridge:
     {id, name, sub, type:"text", start(ui)}
   inp = {down, dir, press:{a, up, down, left, right}, taps:[{x, y}]} */
(function(){
  var carts = [], byId = {};
  window.RUNWAY = {register:function(c){carts.push(c); byId[c.id] = c}, boot:boot};

  function boot(){
  var dev = document.getElementById("device");
  if(!dev) return;
  var C = window.CONFIG || {};
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(id){return document.getElementById(id)}
  var cv = $("gCanvas"), ctx = cv.getContext("2d"), msg = $("gMsg"), live = $("gLive"), opts = $("gOpts");
  var hud = $("gHud"), hud2 = $("gHud2"), cartEl = $("gCart"), aBtn = $("gA"), bBtn = $("gB"), sndBtn = $("gSnd");
  var receipt = $("gReceipt"), receiptText = $("gReceiptText"), sendBtn = $("gSend"), copyBtn = $("gCopy");
  var W = cv.width, H = cv.height;
  var COL = {lcd:"#FFB547", dim:"#B08A48", dark:"#1C1812", hot:"#FF7A45", faint:"#3a2e18", mid:"#5a4524"};
  var FONT = "10px VT323, monospace", BIG = "16px VT323, monospace";

  /* ---------- sprites ('#' amber, 'd' dim, 'm' mid, 'f' faint, 'o' hot, 'x' dark) ---------- */
  var INK = {"#":COL.lcd, d:COL.dim, m:COL.mid, f:COL.faint, o:COL.hot, x:COL.dark};
  function sprite(rows, scale){
    scale = scale || 1;
    var c = document.createElement("canvas"); c.width = rows[0].length*scale; c.height = rows.length*scale;
    var x = c.getContext("2d");
    rows.forEach(function(r, j){for(var i=0;i<r.length;i++){var ink = INK[r[i]]; if(!ink) continue; x.fillStyle = ink; x.fillRect(i*scale, j*scale, scale, scale)}});
    return c;
  }
  var HEAD = ["...####...","..######..","..#x##x#..","..######..","...####...","..##xx##..",".###xx###.","#..#xx#..#","...####...","...####..."];
  var SPR = {
    run1:sprite(HEAD.concat(["..##..##..",".##....##.",".#......##","##........"])),
    run2:sprite(HEAD.concat(["...#..#...","...#..#...","..##..##..",".........."])),
    jump:sprite(HEAD.concat(["..######..",".##....##.","..........",".........."])),
    coin:sprite(["..####..",".#dddd#.","#dd##dd#","#d#dddd#","#d#dddd#","#dd##dd#",".#dddd#.","..####.."]),
    doc:sprite(["######..","#dddd##.","#d##dd##","#dddddd#","#d####d#","#dddddd#","#d####d#","#dddddd#","#d###dd#","########"])
  };

  /* ---------- sound: effects here, music in music.js (both off by default) ---------- */
  var snd = {on:false, ac:null, quiet:false};
  try{snd.on = localStorage.getItem("runway-sound") === "on"}catch(e){}
  function audio(){
    if(!snd.ac){try{snd.ac = new (window.AudioContext || window.webkitAudioContext)()}catch(e){return null}}
    if(snd.ac.state === "suspended") snd.ac.resume();
    return snd.ac;
  }
  function tone(f, d, type, vol, f2, delay){
    if(!snd.on || snd.quiet) return;
    var ac = audio(); if(!ac) return;
    try{
      var t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
      o.type = type || "square"; o.frequency.setValueAtTime(f, t);
      if(f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(vol || 0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
    }catch(e){}
  }
  function arp(notes, step){notes.forEach(function(n, i){tone(n, step*1.6, "square", 0.03, 0, i*step)})}
  var SFX = {
    blip:function(){tone(660, .05, "square", .025)}, select:function(){tone(880, .06); tone(1320, .08, "square", .03, 0, .06)},
    jump:function(){tone(520, .09, "square", .025, 780)}, coin:function(){tone(988, .05); tone(1319, .08, "square", .03, 0, .05)},
    tick:function(){tone(1200, .04, "square", .02)}, doc:function(){arp([660, 880, 1100], .05)},
    hit:function(){tone(160, .2, "sawtooth", .05, 60)}, gate:function(){tone(440, .12, "triangle", .05)},
    good:function(){arp([660, 990], .06)}, bad:function(){tone(180, .18, "sawtooth", .045, 90)},
    seed:function(){arp([523, 659, 784, 1047], .08)}, nothing:function(){arp([392, 330, 262], .12)},
    clean:function(){tone(880, .18, "square", .04, 1760)}, strike:function(){tone(440, .1)}, fizzle:function(){tone(200, .08, "triangle")},
    windup:function(){tone(300, .12, "triangle", .04, 420)}, hurt:function(){tone(110, .25, "sawtooth", .05, 55)}, guard:function(){tone(700, .05, "triangle")},
    ko:function(){arp([523, 784, 1047], .07)}, line:function(){arp([784, 988, 1175, 1568], .05)}, drop:function(){tone(220, .06, "triangle", .04)},
    power:function(){arp([392, 523, 659, 784, 1047], .045)}, life:function(){arp([659, 523, 392], .09)}
  };
  function music(){return snd.on && !snd.quiet && window.Music ? window.Music : null}
  function setSound(on){
    snd.on = on; sndBtn.setAttribute("aria-pressed", on); sndBtn.textContent = on ? "♪ ON" : "♪ OFF";
    try{localStorage.setItem("runway-sound", on ? "on" : "off")}catch(e){}
    if(window.Music){ if(on){var ac = audio(); if(ac){window.Music.init(ac); window.Music.play(theme)}} else window.Music.stop() }
  }
  var theme = "menu";
  function playTheme(t){theme = t; var m = music(); if(m && seen){m.init(audio()); m.play(t)}}
  function jingle(name){var m = music(); if(m){m.init(audio()); m.jingle(name)} else if(snd.on && !snd.quiet && SFX[name]) SFX[name]()}
  sndBtn.addEventListener("click", function(){setSound(!snd.on); if(snd.on) SFX.select()});

  /* ---------- helpers ---------- */
  function fmt(k){k = Math.max(0, k); return k >= 1000 ? "€" + (k/1000).toFixed(2) + "M" : "€" + Math.round(k) + "k"}
  function sign(n, unit){return (n > 0 ? "+" : "−") + Math.abs(Math.round(n)) + (unit || "")}
  function say(text){live.textContent = ""; setTimeout(function(){live.textContent = String(text).replace(/\n+/g, " ")}, 30)}
  function setHud(cells, row2){
    hud.hidden = false; hud2.hidden = !row2;
    cells.forEach(function(c, i){$("gL" + (i+1)).textContent = c[0]; var v = $("gV" + (i+1)); if(v.textContent !== String(c[1])) v.textContent = c[1]});
    if(row2){
      $("gL4").textContent = row2[0]; $("gV4").textContent = row2[1]; $("gL5").textContent = row2[2];
      $("gBarI").style.width = Math.max(0, Math.min(100, row2[3])) + "%"; $("gBar").classList.toggle("low", !!row2[4]);
    }
  }
  function flash(id, good){var el = $(id); if(!el) return; el.classList.remove("up", "down"); void el.offsetWidth; el.classList.add(good ? "up" : "down")}
  function screen(text){msg.classList.remove("line"); msg.textContent = text; say(text)}
  function line(text){msg.classList.add("line"); msg.textContent = text}
  function options(list, focus, compact){
    opts.innerHTML = ""; opts.classList.toggle("menu", !!compact);
    list.forEach(function(o){
      var b = document.createElement("button"); b.type = "button";
      var t = document.createElement("span"); t.textContent = "▸ " + o[0]; b.appendChild(t);
      if(o[1]){var s = document.createElement("span"); s.className = "s"; s.textContent = o[1]; b.appendChild(s)}
      b.addEventListener("click", function(){SFX.select(); o[2]()}); opts.appendChild(b);
    });
    var f = opts.querySelector("button"); if(f && focus) f.focus({preventScroll:true});
  }
  function moveFocus(d){
    var bs = [].slice.call(opts.querySelectorAll("button")); if(!bs.length) return;
    var i = bs.indexOf(document.activeElement); bs[(i + d + bs.length) % bs.length].focus({preventScroll:true}); SFX.blip();
  }
  function text(t, x, y, color, font, align){ctx.font = font || FONT; ctx.fillStyle = color || COL.lcd; ctx.textAlign = align || "left"; ctx.fillText(t, x, y)}
  function overlay(big, small){
    ctx.fillStyle = "rgba(28,24,18,.75)"; ctx.fillRect(0, 0, W, H);
    text(big, W/2, H/2 + 2, COL.lcd, BIG, "center"); if(small) text(small, W/2, H/2 + 16, COL.dim, FONT, "center");
  }

  /* ---------- state ---------- */
  var mode = "menu", cart = null, S = null, running = false, paused = false, raf = 0, last = 0, countdown = 0, endTimer = 0;
  var floats = [], fx = {}, bannerText = "", hudT = 0, moodT = 0, demo = null, idleT = 0, idleTimer = 0, seen = false, booted = false;
  var inp = {down:false, dir:null, press:{}, taps:[]}, held = {};

  var g = {ctx:ctx, W:W, H:H, COL:COL, FONT:FONT, BIG:BIG, SPR:SPR, fx:fx, reduce:reduce,
    text:text, sprite:sprite, overlay:overlay, fmt:fmt, sign:sign, say:function(t){if(!demo) say(t)}, flash:flash,
    now:function(){return performance.now()},
    float:function(t, x, y, color){floats.push({text:t, x:x, y:y, life:0.9, color:color || COL.lcd})},
    banner:function(t, d){bannerText = t; fx.banner = d || 1.8},
    line:function(t){if(!demo){line(t); say(t)}},
    sfx:function(n){if(!demo && SFX[n]) SFX[n]()}};

  function stop(){
    running = false; if(raf) cancelAnimationFrame(raf); raf = 0; clearTimeout(endTimer);
    inp.down = false; inp.dir = null; inp.press = {}; inp.taps = []; held = {}; aBtn.classList.remove("on");
  }
  function list(){return carts.filter(function(c){return !c.hidden}).sort(function(a, b){return (a.order || 99) - (b.order || 99)})}
  function menu(focus){
    stop(); endDemo(); mode = "menu"; cart = null; cartEl.textContent = "CFO EDITION"; hud.hidden = hud2.hidden = true; cv.hidden = true;
    screen("INSERT A CARTRIDGE");
    options(list().map(function(c){return [c.name, c.sub, function(){start(c.id)}]}), focus, true);
    dev.classList.remove("on"); playTheme("menu"); armIdle();
  }
  function start(id, asDemo){
    stop(); var c = byId[id]; if(!c) return;
    cart = c; if(!asDemo){endDemo(); receipt.hidden = true; dev.classList.add("on")}
    cartEl.textContent = c.name;
    if(c.type === "text"){mode = "text"; cv.hidden = true; opts.innerHTML = ""; opts.classList.remove("menu"); playTheme(c.id); c.start(ui); return}
    mode = "play"; S = c.create(); floats = []; for(var k in fx) delete fx[k];
    opts.innerHTML = ""; opts.classList.remove("menu"); cv.hidden = false;
    line(asDemo ? "DEMO · press A to play" : c.help || "");
    if(!asDemo) say(c.say || c.help || c.name);
    countdown = asDemo ? 0 : (c.countdown == null ? 1.2 : c.countdown); paused = false;
    if(!asDemo){dev.focus({preventScroll:true}); playTheme(c.id)}
    last = performance.now(); running = true; hudTick(true); raf = requestAnimationFrame(frame);
  }

  /* ---------- loop ---------- */
  function frame(now){
    raf = 0; if(!running) return;
    var dt = Math.min(0.05, (now - last)/1000); last = now;
    if(!paused){
      if(countdown > 0) countdown -= dt;
      else{
        var input = demo ? cart.demo(S, demo.mem) : inp;
        cart.step(S, dt, input); inp.press = {}; inp.taps = []; inp.swiped = null;
        events();
        if(demo){demo.t += dt; if(demo.t > 16){nextDemo(); return}}
      }
      tickFx(dt);
    }
    draw(); hudTick(); moodTick(dt);
    if(S.over || S.won){running = false; if(demo){endTimer = setTimeout(nextDemo, 1200)} else endTimer = setTimeout(endArcade, 900); return}
    raf = requestAnimationFrame(frame);
  }
  function tickFx(dt){
    floats.forEach(function(f){f.life -= dt; f.y -= 22*dt}); floats = floats.filter(function(f){return f.life > 0});
    for(var k in fx){fx[k] -= dt; if(fx[k] <= 0) delete fx[k]}
  }
  function events(){
    if(!S.events) return;
    S.events.forEach(function(e){
      if(cart.onEvent) cart.onEvent(e, g, S);
      else if(SFX[e.type]) g.sfx(e.type);
    });
    S.events.length = 0;
  }
  function hudTick(force){
    hudT -= 1; if(hudT > 0 && !force) return; hudT = 5;
    var h = cart.hud(S); setHud(h.cells, h.row2);
  }
  function moodTick(dt){
    moodT -= dt; if(moodT > 0) return; moodT = 0.5;
    var m = music(); if(m && cart.mood && !demo) m.setTension(cart.mood(S));
  }
  function draw(){
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = COL.dark; ctx.fillRect(0, 0, W, H);
    if(fx.shake && !reduce) ctx.translate(Math.round((Math.random() - .5)*4), Math.round((Math.random() - .5)*3));
    ctx.save(); cart.draw(g, S); ctx.restore();
    floats.forEach(function(f){ctx.globalAlpha = Math.min(1, f.life*2); text(f.text, Math.round(f.x), Math.round(f.y), f.color); ctx.globalAlpha = 1});
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if(cart.overlay) cart.overlay(g, S);
    if(fx.banner){
      ctx.globalAlpha = Math.min(1, fx.banner*2);
      ctx.fillStyle = COL.dark; ctx.fillRect(12, 40, W - 24, 24); ctx.strokeStyle = COL.lcd; ctx.strokeRect(12.5, 40.5, W - 25, 23);
      text(bannerText, W/2, 57, COL.lcd, BIG, "center"); ctx.globalAlpha = 1;
    }
    if(demo){ctx.fillStyle = COL.dark; ctx.fillRect(0, H - 13, W, 13); text(Math.floor(performance.now()/500) % 2 ? "DEMO · PRESS A" : "", W/2, H - 3, COL.lcd, FONT, "center")}
    else if(paused) overlay("PAUSED", "press A to carry on");
    else if(countdown > 0) overlay(countdown > 0.5 ? "READY" : "GO", "");
  }

  /* ---------- endings and the receipt ---------- */
  function talk(){return C.email ? [["TALK TO THE REAL CFO", "", function(){var cta = $("cta"); location.href = cta ? cta.href : "mailto:" + C.email}]] : []}
  function again(id){return [["PLAY AGAIN", "", function(){start(id)}], ["MENU", "", function(){menu(true)}]]}
  function showEnd(c, r){
    cv.hidden = true;
    var real = r.realLine || (r.real === false ? "" : "In 2024 I did this for real:\n€3M raised, 18 months added.");
    var t = r.title + "\n\n" + (r.lines || []).join("\n") + (r.tip ? "\n\n" + r.tip : "") + (r.win && real ? "\n\n" + real : "");
    jingle(r.win ? "win" : "lose");
    screen(t); options(again(c.id).concat(r.win ? talk() : []), true);
    dev.classList.toggle("on", !!r.win);
    printReceipt(c, r);
  }
  function endArcade(){if(mode !== "play" || demo) return; mode = "end"; showEnd(cart, cart.result(S))}
  function pad(a, b, w){a = String(a); b = String(b); w = w || 32; var n = Math.max(1, w - a.length - b.length); return a + new Array(n + 1).join(" ") + b}
  function center(t, w){w = w || 32; t = String(t); var n = Math.max(0, Math.floor((w - t.length)/2)); return new Array(n + 1).join(" ") + t}
  function printReceipt(c, r){
    var d = new Date(), date = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    var rule = new Array(33).join("-"), rows = [center("RUNWAY · CFO EDITION"), center("the audit trail"), rule, pad("CARTRIDGE", c.name), pad("DATE", date), rule];
    (r.rows || []).forEach(function(x){rows.push(pad(x[0], x[1]))});
    rows.push(rule, pad("RESULT", r.win ? "PASSED ✓" : "NOT THIS TIME"), rule);
    rows.push(center(r.win ? "Clean opinion. Well played." : "Every trail has a next attempt."), center("Thanks for playing."));
    var body = rows.join("\n");
    receiptText.textContent = body; receipt.hidden = false;
    receipt.classList.remove("print"); void receipt.offsetWidth; receipt.classList.add("print");
    var url = location.href.split("#")[0];
    if(C.email){
      sendBtn.hidden = false;
      sendBtn.href = "mailto:" + C.email + "?subject=" + encodeURIComponent("RUNWAY: " + c.name + (r.win ? ", passed" : ", my attempt")) +
        "&body=" + encodeURIComponent(body + "\n\n" + url + "\n");
    }else sendBtn.hidden = true;
    copyBtn.onclick = function(){
      var done = function(){copyBtn.textContent = "Copied"; setTimeout(function(){copyBtn.textContent = "Copy"}, 1500)};
      try{navigator.clipboard.writeText(body + "\n" + url).then(done, function(){})}catch(e){}
    };
  }

  /* ---------- text cartridges get this ---------- */
  var ui = {screen:screen, options:function(l, f){options(l, f === undefined ? true : f)}, setHud:setHud, flash:flash, fmt:fmt, sign:sign,
    sfx:function(n){if(SFX[n]) SFX[n]()},
    end:function(r){mode = "end"; showEnd(cart, r)}};

  /* ---------- boot screen and demo mode ---------- */
  function bootScreen(){
    if(booted) return; booted = true;
    if(reduce){menu(false); return}
    mode = "boot"; cv.hidden = false; hud.hidden = hud2.hidden = true; opts.innerHTML = ""; line("");
    var t0 = performance.now(), dinged = false;
    (function b(now){
      if(mode !== "boot") return;
      var t = (now - t0)/1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = COL.dark; ctx.fillRect(0, 0, W, H);
      var y = Math.min(56, -10 + t*90);
      text("RUNWAY", W/2, y, COL.lcd, "24px VT323, monospace", "center");
      if(t > 0.8){
        if(!dinged){dinged = true; if(snd.on){tone(1568, .5, "square", .03); tone(2093, .6, "square", .02, 0, .08)}}
        text("CFO EDITION", W/2, 72, COL.dim, FONT, "center"); text("© 2026 RUI GOMES", W/2, 84, COL.dim, FONT, "center");
      }
      if(t > 2.1){menu(false); return}
      requestAnimationFrame(b);
    })(t0);
  }
  function armIdle(){
    clearTimeout(idleTimer);
    if(reduce) return;
    idleTimer = setTimeout(function(){ if(mode === "menu" && seen && !dev.contains(document.activeElement)) startDemo() }, 10000);
  }
  var demoIdx = 0;
  function demoCarts(){return list().filter(function(c){return c.demo && c.type !== "text"})}
  function startDemo(){
    var dc = demoCarts(); if(!dc.length) return;
    snd.quiet = true; if(window.Music) window.Music.stop();
    demo = {mem:{}, t:0}; var c = dc[demoIdx++ % dc.length];
    start(c.id, true); mode = "play";
  }
  function nextDemo(){ if(!demo) return; if(mode === "play" && seen){demo = {mem:{}, t:0}; var dc = demoCarts(); start(dc[demoIdx++ % dc.length].id, true)} else menu(false) }
  function endDemo(){ if(!demo) return; demo = null; snd.quiet = false; }
  function wake(){ if(demo){menu(true); return true} idleT = 0; if(mode === "menu") armIdle(); return false }

  /* ---------- controls ---------- */
  var DIRS = {ArrowUp:"up", ArrowDown:"down", ArrowLeft:"left", ArrowRight:"right", w:"up", s:"down", a:"left", d:"right", W:"up", S:"down", A:"left", D:"right"};
  function dirDown(d){
    if(!running || paused){ if(paused) return unpause(); return }
    held[d] = true; inp.dir = d; inp.press[d] = true;
  }
  function dirUp(d){delete held[d]; inp.dir = held[inp.dir] ? inp.dir : (Object.keys(held)[0] || null)}
  function aDown(){
    if(!running) return false;
    if(paused){unpause(); return true}
    inp.down = true; inp.press.a = true; aBtn.classList.add("on"); return true;
  }
  function aUp(){inp.down = false; aBtn.classList.remove("on")}
  function unpause(){paused = false; last = performance.now(); inp.down = false}
  function activate(){
    var f = opts.contains(document.activeElement) ? document.activeElement : opts.querySelector("button");
    if(f) f.click();
  }
  function canvasPoint(e){var r = cv.getBoundingClientRect(); return {x:(e.clientX - r.left)*W/r.width, y:(e.clientY - r.top)*H/r.height}}

  aBtn.addEventListener("pointerdown", function(e){e.preventDefault(); if(wake()) return; if(!aDown()) activate()});
  ["pointerup", "pointercancel", "pointerleave"].forEach(function(t){aBtn.addEventListener(t, aUp)});
  aBtn.addEventListener("click", function(e){if(e.detail === 0 && !running) activate()});
  bBtn.addEventListener("click", function(){menu(true)});
  document.querySelectorAll("#device [data-dir]").forEach(function(b){
    var d = b.dataset.dir;
    b.addEventListener("pointerdown", function(e){e.preventDefault(); if(wake()) return; if(running) dirDown(d); else moveFocus(d === "up" || d === "left" ? -1 : 1)});
    ["pointerup", "pointercancel", "pointerleave"].forEach(function(t){b.addEventListener(t, function(){dirUp(d)})});
    b.addEventListener("click", function(e){if(e.detail === 0 && !running) moveFocus(d === "up" || d === "left" ? -1 : 1)});
  });
  var swipe = null;
  cv.addEventListener("pointerdown", function(e){
    e.preventDefault(); if(wake()) return; if(!running) return;
    if(paused){unpause(); return}
    var kind = cart && cart.canvas || "press";
    if(kind === "press") aDown();
    else if(kind === "tap"){inp.taps.push(canvasPoint(e))}
    else swipe = {x:e.clientX, y:e.clientY, t:performance.now()};
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(function(t){cv.addEventListener(t, function(e){
    var kind = cart && cart.canvas || "press";
    if(kind === "press") aUp();
    if(kind === "swipe" && swipe && t === "pointerup"){
      var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      if(Math.max(Math.abs(dx), Math.abs(dy)) < 14){inp.press.a = true}
      else{var d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"); inp.press[d] = true; inp.swiped = d}
      swipe = null;
    }
  })});
  dev.addEventListener("keydown", function(e){
    if(wake()){e.preventDefault(); return}
    if(e.key === "Escape" || e.key === "Backspace"){e.preventDefault(); menu(true); return}
    if(running){
      if(DIRS[e.key]){e.preventDefault(); if(!e.repeat) dirDown(DIRS[e.key]); return}
      if(e.key === " " || e.key === "Enter" || e.key === "z" || e.key === "Z"){e.preventDefault(); if(!e.repeat) aDown(); return}
      return;
    }
    if(e.key === "ArrowDown" || e.key === "ArrowRight"){e.preventDefault(); moveFocus(1)}
    else if(e.key === "ArrowUp" || e.key === "ArrowLeft"){e.preventDefault(); moveFocus(-1)}
    else if((e.key === " " || e.key === "Enter") && !opts.contains(document.activeElement) && e.target === dev){e.preventDefault(); activate()}
  });
  dev.addEventListener("keyup", function(e){
    if(DIRS[e.key]) dirUp(DIRS[e.key]);
    if(e.key === " " || e.key === "Enter" || e.key === "z" || e.key === "Z") aUp();
  });
  window.addEventListener("blur", function(){aUp(); held = {}; inp.dir = null});
  dev.addEventListener("focusin", function(){if(demo) menu(true)});

  /* pause when the console leaves the screen or the tab is hidden; boot on first sight */
  function pause(){if(running && !paused && !demo && countdown <= 0){paused = true; inp.down = false; draw()}}
  document.addEventListener("visibilitychange", function(){if(document.hidden) pause()});
  new IntersectionObserver(function(es){es.forEach(function(e){
    seen = e.isIntersecting;
    if(!e.isIntersecting){pause(); if(demo) menu(false); if(window.Music) window.Music.stop()}
    else{ if(!booted) bootScreen(); else if(mode === "menu") armIdle(); if(music() && !demo) playTheme(theme) }
  })}, {threshold:0.4}).observe(dev);

  /* ?debug: step a game by hand (for screenshots and testing) */
  if(/[?&]debug\b/.test(location.search)) window.RUNWAY_DEBUG = {
    carts:carts, start:function(id){booted = true; start(id)}, state:function(){return S}, menu:menu,
    step:function(sec, bot){
      running = false; countdown = 0; var mem = {};
      for(var i=0;i<sec*60 && !(S.over || S.won);i++){cart.step(S, 1/60, bot ? bot(S, mem) : {down:false, dir:null, press:{}, taps:[]}); events(); tickFx(1/60)}
      draw(); hudTick(true);
    }
  };
  /* ?debug&shot=runner:20[&end] opens a cartridge at a moment, for headless screenshots */
  var shot = /[?&]shot=([a-z]+):?([\d.]*)/.exec(location.search);
  if(shot && window.RUNWAY_DEBUG){
    booted = true;
    var st = document.createElement("style"); st.textContent = "*{transition:none!important;animation:none!important}main>section:not(#quest),footer,#quest .copy,.progress{display:none!important}#quest{padding:12px 0!important;border:0!important}"; document.head.appendChild(st);
    document.querySelectorAll(".rev").forEach(function(e){e.classList.add("in")});
    setTimeout(function(){
      dev.scrollIntoView({block:"start"}); var c = byId[shot[1]];
      window.RUNWAY_DEBUG.start(shot[1]);
      if(c && c.type !== "text" && +shot[2]){
        window.RUNWAY_DEBUG.step(+shot[2], c.demo);
        if(/[?&]end\b/.test(location.search) && (S.over || S.won)){mode = "play"; endArcade()}
      }
    }, 300);
  }
  menu(false); mode = "idle";
  }
})();
