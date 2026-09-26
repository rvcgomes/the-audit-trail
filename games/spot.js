/* ================= SPOT THE ERROR: game rules (no DOM) =================
   Ledger lines scroll up the screen for 60 seconds of fieldwork.
   Most are right. About a quarter aren't: a total that doesn't add up,
   VAT that isn't 23%, a date that can't exist, an invoice booked twice.
   Flag the wrong ones before they leave the top. Flagging a right line
   costs one credibility, and so does an error that gets away. Three to start.
   Errors come one per block of four lines (two, now and then, later on),
   so they never bunch up early and never run dry. */
var Spot = (function(){
  var W = 192, H = 120, TOP = 12, ROW = 12, ROUND = 60, V0 = 7, V1 = 16, CRED = 3;
  var PITCH = [24, 30, 36], OUT = TOP - 3, PREFILL = [40, 70, 100];
  var VAT = [500, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function pick(r, a){return a[Math.floor(r()*a.length)]}
  function num(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
  function dd(n){return (n < 10 ? "0" : "") + n}

  /* which lines are wrong: one per block of four, never two in a row early on */
  function plan(r){
    var p = [], prev = -9;
    for(var b=0;b<24;b++){
      var base = b*4, k = b === 0 ? 2 + Math.floor(r()*2) : Math.floor(r()*4);
      if(b < 3 && base + k === prev + 1) k = 1 + Math.floor(r()*3);
      p[base + k] = true; prev = base + k;
      if(b >= 3 && r() < 0.2){var q = Math.floor(r()*4); if(q === k) q = (k + 2) % 4; p[base + q] = true; prev = Math.max(prev, base + q)}
    }
    return p;
  }

  function create(seed){
    var r = rng(seed == null ? (Math.random()*1e9)|0 : seed);
    var s = {t:0, speed:V0, rows:[], slot:0, plan:plan(r), pitch:30, inv:1040 + Math.floor(r()*60), id:0, cur:null,
      cred:CRED, found:0, falses:0, misses:0, clean:0, over:null, won:false, events:[], rnd:r};
    PREFILL.forEach(function(y){add(s, y)});
    s.cur = s.rows[0].id; s.pitch = pick(r, PITCH);
    return s;
  }
  function next(s){s.inv += 1 + Math.floor(s.rnd()*3); return s.inv}

  /* ---------- the four kinds of line ---------- */
  function sum(r, err, t){
    var hi = t < 25 ? 49 : 99, a = (1 + Math.floor(r()*hi))*100, b = (1 + Math.floor(r()*hi))*100, c = a + b, w = c;
    if(err){var d = t < 25 || r() < 0.5 ? 1000 : 100; w = r() < 0.5 && c - d > Math.max(a, b) ? c - d : c + d}
    return {kind:"sum", text:num(a) + " + " + num(b) + " = " + num(w), why:num(a) + " + " + num(b) + " is " + num(c) + "."};
  }
  function vat(r, err, t){
    var b = pick(r, VAT), v = b*23/100, w = v;
    if(err){
      w = t < 25 ? (r() < 0.5 ? b/5 : v + (r() < 0.5 ? -100 : 100)) : v + pick(r, [-50, -30, -20, 20, 30, 50]);
      if(w <= 0) w = v + 100;
    }
    return {kind:"vat", text:"VAT 23% of " + num(b) + " = " + num(w), why:"23% of " + num(b) + " is " + num(v) + "."};
  }
  function date(s, err, t){
    var r = s.rnd, m = Math.floor(r()*12), d = 1 + Math.floor(r()*28), why = "";
    if(!err && t >= 25 && r() < 0.3) d = DAYS[m] > 28 ? 29 + Math.floor(r()*(DAYS[m] - 28)) : 28;
    if(err){
      if(t >= 25 && r() < 0.7){
        var bad = pick(r, [[31, 3], [31, 5], [31, 8], [31, 10], [30, 1], [31, 1]]); d = bad[0]; m = bad[1];
        why = m === 1 ? "February 2026 has 28 days." : MONTHS[m] + " has 30 days.";
      }else{
        var e = Math.floor(r()*3);
        if(e === 0){d = 32; why = "No month has 32 days."}
        else if(e === 1){m = 12; why = "There is no month 13."}
        else{d = 0; why = "There is no day 0."}
      }
    }
    return {kind:"date", text:"Invoice " + next(s) + " · " + dd(d) + "." + dd(m + 1) + ".2026", why:why};
  }
  function amt(s){
    var no = next(s), a = (5 + Math.floor(s.rnd()*95))*100;
    return {kind:"amt", no:no, text:"Invoice " + no + " · €" + num(a), why:""};
  }
  /* the copy of an invoice line still on screen, with time left to spot both */
  function dup(s){
    for(var i=s.rows.length-1;i>=0;i--){
      var o = s.rows[i];
      if(o.kind === "amt" && !o.err && !o.copied && !o.flagged && !o.judged && o.y >= TOP + s.speed*4){
        o.copied = true;
        return {kind:"dup", no:o.no, text:o.text, why:"Invoice " + o.no + " was booked twice.", orig:o.id};
      }
    }
    return null;
  }
  function add(s, y){
    var r = s.rnd, err = !!s.plan[s.slot++], t = s.t, row = null;
    if(err && t >= 20 && r() < 0.6) row = dup(s);
    if(!row){
      var kinds = t < 8 ? ["sum", "date", "amt"] : ["sum", "vat", "date", "amt"], k;
      if(err) kinds = kinds.filter(function(x){return x !== "amt"});
      k = pick(r, kinds);
      if(!err && t >= 18 && s.plan[s.slot] && r() < 0.5) k = "amt";
      row = k === "sum" ? sum(r, err, t) : k === "vat" ? vat(r, err, t) : k === "date" ? date(s, err, t) : amt(s);
    }
    row.id = ++s.id; row.y = y; row.err = err; row.flagged = false; row.judged = false; row.missed = false; row.flash = 0;
    s.rows.push(row);
    return row;
  }

  /* ---------- helpers for the cartridge and the bots ---------- */
  function ev(s, type, text, row){s.events.push({type:type, text:text || "", why:row ? row.why : "", y:row ? row.y : 0, id:row ? row.id : 0})}
  function visible(s){return s.rows.filter(function(r){return !r.judged && r.y < H - 4})}
  function byId(s, id){for(var i=0;i<s.rows.length;i++) if(s.rows[i].id === id) return s.rows[i]; return null}
  function rowAt(s, y){
    if(y < TOP - 2) return null;
    for(var i=0;i<s.rows.length;i++){var r = s.rows[i]; if(!r.judged && y >= r.y - 3 && y < r.y + ROW + 3) return r}
    return null;
  }
  function checked(s){return s.clean + s.found + s.falses + s.misses}
  function accuracy(s){var n = checked(s); return n ? Math.round(100*(s.clean + s.found)/n) : 100}

  function flag(s, row){
    if(!row || row.flagged || row.judged) return false;
    row.flagged = true;
    if(row.err){s.found++; ev(s, "found", "FOUND", row)}
    else{s.falses++; s.cred--; ev(s, "false", row.copied ? "The first booking is fine. Flag the copy." : "That line was right.", row)}
    return true;
  }
  function move(s, d){
    var v = visible(s); if(!v.length) return;
    var i = -1; for(var k=0;k<v.length;k++) if(v[k].id === s.cur) i = k;
    if(i < 0){s.cur = v[0].id; ev(s, "move"); return}
    var j = Math.max(0, Math.min(v.length - 1, i + d));
    if(j !== i){s.cur = v[j].id; ev(s, "move")}
  }

  function step(s, dt, inp){
    if(s.over || s.won) return s;
    inp = inp || {};
    var press = inp.press || {}, taps = inp.taps || [], i;

    /* input first: it acts on the lines the player just saw */
    for(i=0;i<taps.length;i++){var hit = rowAt(s, taps[i].y); if(hit){s.cur = hit.id; flag(s, hit)}}
    if(press.up) move(s, -1);
    else if(press.down) move(s, 1);
    if(press.a && flag(s, byId(s, s.cur))) move(s, 1);

    /* scroll and judge what leaves the top */
    s.t += dt; s.speed = V0 + (V1 - V0)*Math.min(1, s.t/ROUND);
    for(i=0;i<s.rows.length;i++){
      var r = s.rows[i];
      r.y -= s.speed*dt; if(r.flash > 0) r.flash -= dt;
      if(!r.judged && r.y < OUT){
        r.judged = true;
        if(r.err && !r.flagged){r.missed = true; r.flash = 0.7; s.misses++; s.cred--; ev(s, "miss", "MISSED", r)}
        else if(!r.err && !r.flagged) s.clean++;
      }
    }
    s.rows = s.rows.filter(function(r){return r.y + ROW > 0});

    /* new lines come in at the bottom */
    var last = s.rows[s.rows.length - 1];
    if(!last || last.y + s.pitch <= H){add(s, last ? last.y + s.pitch : H); s.pitch = pick(s.rnd, PITCH)}

    var c = byId(s, s.cur);
    if(!c || c.judged){var v = visible(s); s.cur = v.length ? v[0].id : null}

    if(s.cred <= 0){s.cred = 0; s.over = "credibility"; ev(s, "over")}
    else if(s.t >= ROUND){s.t = ROUND; s.won = true; ev(s, "won")}
    return s;
  }

  return {W:W, H:H, TOP:TOP, ROW:ROW, ROUND:ROUND, CRED:CRED,
    create:create, step:step, rowAt:rowAt, visible:visible, byId:byId, checked:checked, accuracy:accuracy};
})();
