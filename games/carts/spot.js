/* ================= Cartridge: SPOT THE ERROR =================
   Drawing and wording only; the rules are in spot.js.
   A light-gun game where the target is a ledger: tap a wrong line to flag it. */
(function(){
  if(!window.RUNWAY || !window.Spot) return;
  /* wording in the page's language (the Portuguese pages set <html lang="pt">) */
  var PT = typeof document !== "undefined" && document.documentElement.lang === "pt";
  function T(en, pt){return PT ? pt : en}
  Spot.setLang(PT ? "pt" : "en");

  var SP = null;
  function sprites(g){
    if(SP) return SP;
    SP = {
      tick:g.sprite([".......o","......o#",".....o#.","o...o#..","#o.o#...",".#o#....","..#....."]),
      cross:g.sprite(["d...d",".d.d.","..d..",".d.d.","d...d"])
    };
    return SP;
  }
  /* the demo reads like an auditor: waits until a line is on screen a moment, walks the cursor there, flags it */
  function spotBot(){
    return function(s, mem){
      var inp = {down:false, dir:null, press:{}, taps:[]}, v = Spot.visible(s), target = null, i;
      mem.seen = mem.seen || {};
      v.forEach(function(r){if(mem.seen[r.id] == null && r.y >= Spot.TOP && r.y + Spot.ROW <= Spot.H) mem.seen[r.id] = s.t});
      for(i=0;i<v.length;i++){var r = v[i]; if(r.err && !r.flagged && mem.seen[r.id] != null && s.t - mem.seen[r.id] > 0.9 && r.y < 92){target = r; break}}
      if(!target || s.t < (mem.wait || 0)) return inp;
      var ci = -1, ti = v.indexOf(target);
      for(i=0;i<v.length;i++) if(v[i].id === s.cur) ci = i;
      mem.wait = s.t + 0.16;
      if(ci === ti) inp.press.a = true; else inp.press[ci < ti ? "down" : "up"] = true;
      return inp;
    };
  }

  RUNWAY.register({
    id:"spot", order:4, name:T("SPOT THE ERROR", "ENCONTRE O ERRO"), sub:T("spot", "erro"), countdown:1.2, canvas:"tap",
    help:T("Tap a wrong line to flag it. ▲ ▼ and A work too. Don't flag the right ones.", "Toque numa linha errada para a assinalar. ▲ ▼ e A também servem. Não assinale as certas."),
    say:T("Spot the Error. Ledger lines scroll up the screen for sixty seconds. Tap a wrong line to flag it, or move with the arrow keys and press A or Space. Flagging a right line, or letting a wrong one leave the top, costs credibility.", "Encontre o erro. Linhas do balancete sobem no ecrã durante sessenta segundos. Toque numa linha errada para a assinalar, ou mova-se com as setas e prima A ou Espaço. Assinalar uma linha certa, ou deixar uma errada sair pelo topo, custa credibilidade."),
    realLine:T("I started my career doing exactly this, at PwC.", "Comecei a carreira a fazer exatamente isto, na PwC."),
    create:function(){return Spot.create()},
    step:function(s, dt, inp){Spot.step(s, dt, inp)},
    demo:function(s, mem){if(!mem.bot) mem.bot = spotBot(); return mem.bot(s, mem)},
    mood:function(s){return Math.max(0, Math.min(1, 0.6*s.t/Spot.ROUND + 0.2*(Spot.CRED - s.cred)))},
    hud:function(s){
      return {cells:[[T("FINDINGS", "ACHADOS"), s.found], [T("MISSED", "ESCAPARAM"), s.misses], [T("TIME", "TEMPO"), Math.max(0, Math.ceil(Spot.ROUND - s.t)) + "s"]],
        row2:[T("ACCURACY", "PRECISÃO"), Spot.accuracy(s) + "%", T("CREDIBILITY", "CREDIB."), 100*s.cred/Spot.CRED, s.cred === 1]};
    },
    onEvent:function(e, g, s){
      var C = g.COL;
      if(e.type === "found"){g.sfx("good"); g.float(T("FOUND", "ACHADO"), 150, e.y, C.lcd); g.line(T("Found. ", "Encontrado. ") + e.why); g.flash("gV1", true)}
      else if(e.type === "hint"){g.sfx("blip"); g.line(e.text)}
      else if(e.type === "false"){g.sfx("bad"); g.fx.shake = 0.2; g.float("−1", 170, e.y, C.hot); g.line(e.text + (e.why ? " " + e.why : "")); g.flash("gV4", false)}
      else if(e.type === "miss"){g.sfx("hurt"); g.fx.shake = 0.2; g.float(T("MISSED", "ESCAPOU"), 150, Spot.TOP + 8, C.hot); g.line(T("Missed. ", "Escapou. ") + e.why); g.flash("gV2", false)}
      else if(e.type === "move") g.sfx("blip");
      else if(e.type === "over"){g.say(T("Credibility gone. Qualified opinion.", "Credibilidade perdida. Opinião com reservas."))}
      else if(e.type === "won"){g.sfx("clean"); g.say(T("Sixty seconds. Clean opinion.", "Sessenta segundos. Opinião sem reservas."))}
    },
    draw:function(g, s){
      var ctx = g.ctx, C = g.COL, W = g.W, ROW = Spot.ROW, sp = sprites(g), blink = Math.floor(s.t*8) % 2;
      ctx.fillStyle = C.faint; ctx.fillRect(W - 18, Spot.TOP, 1, g.H - Spot.TOP);
      s.rows.forEach(function(r){
        var y = Math.round(r.y);
        if(y > g.H || y + ROW < 0) return;
        var col = r.missed ? (r.flash > 0 && blink ? C.hot : C.mid) : r.flagged ? (r.err ? C.lcd : C.mid) : C.lcd;
        if(r.missed && r.flash > 0){ctx.fillStyle = C.hot; ctx.fillRect(2, y + ROW - 1, W - 4, 1)}
        g.text(r.text, 6, y + 10, col, "12px VT323, monospace");
        ctx.fillStyle = C.faint; ctx.fillRect(6, y + ROW, W - 26, 1);
        if(r.flagged && r.err) ctx.drawImage(sp.tick, W - 14, y + 2);
        else if(r.flagged) ctx.drawImage(sp.cross, W - 12, y + 3);
        if(r.id === s.cur && !r.judged && !s.over && !s.won){ctx.strokeStyle = C.lcd; ctx.strokeRect(2.5, y + 0.5, W - 5, ROW)}
      });
      if(s.over || s.won){
        ctx.fillStyle = C.dark; ctx.fillRect(10, 52, W - 20, 24); ctx.strokeStyle = s.won ? C.lcd : C.hot; ctx.strokeRect(10.5, 52.5, W - 21, 23);
        g.text(s.won ? T("CLEAN OPINION", "SEM RESERVAS") : T("QUALIFIED OPINION", "OPINIÃO COM RESERVAS"), W/2, 69, s.won ? C.lcd : C.hot, g.BIG, "center");
      }
    },
    overlay:function(g, s){
      var ctx = g.ctx, C = g.COL, W = g.W, sp = sprites(g), bx = 22, bw = 98, miss = s.rows.some(function(r){return r.missed && r.flash > 0});
      ctx.fillStyle = C.dark; ctx.fillRect(0, 0, W, Spot.TOP);
      ctx.fillStyle = miss ? C.hot : C.mid; ctx.fillRect(0, Spot.TOP - 1, W, 1);
      g.text(Math.max(0, Math.ceil(Spot.ROUND - s.t)) + "s", 4, 9, C.lcd);
      ctx.fillStyle = C.faint; ctx.fillRect(bx, 4, bw, 3);
      ctx.fillStyle = C.dim; ctx.fillRect(bx, 4, Math.round(bw*Math.min(1, s.t/Spot.ROUND)), 3);
      ctx.drawImage(sp.tick, 128, 2); g.text(String(s.found), 138, 9, C.lcd);
      for(var k=0;k<Spot.CRED;k++){ctx.fillStyle = k < s.cred ? (s.cred === 1 ? C.hot : C.lcd) : C.faint; ctx.fillRect(W - 28 + k*8, 3, 6, 5)}
    },
    result:function(s){
      var seen = s.found + s.misses, left = Math.max(0, Math.round(Spot.ROUND - s.t));
      var rows = [[T("Lines checked", "Linhas verificadas"), Spot.checked(s)], [T("Findings", "Erros encontrados"), s.found + "/" + seen], [T("False flags", "Falsos alertas"), s.falses], [T("Missed", "Escaparam"), s.misses], [T("Fieldwork", "Trabalho de campo"), Math.round(s.t) + "s"]];
      var real = T("I started my career doing exactly this, at PwC.", "Comecei a carreira a fazer exatamente isto, na PwC.");
      if(s.won){
        var verdict = s.falses + s.misses === 0 ? T("Every error found, nothing flagged by mistake.", "Todos os erros encontrados, nenhum alerta falso.") : s.cred === 1 ? T("Signed, but it was close.", "Assinado, mas por pouco.") : T("A few slips, but the opinion holds.", "Houve falhas, mas a opinião mantém-se.");
        return {win:true, title:T("CLEAN OPINION.", "OPINIÃO SEM RESERVAS."), lines:[T("Findings " + s.found + "/" + seen + " · false flags " + s.falses + " · missed " + s.misses, "Erros encontrados " + s.found + "/" + seen + " · falsos alertas " + s.falses + " · escaparam " + s.misses), verdict], rows:rows, realLine:real};
      }
      var tip = s.misses > s.falses ? T("A missed error costs as much as a false flag. Check each total as it comes in.", "Um erro que escapa custa tanto como um falso alerta. Confira cada total à medida que aparece.") :
        T("Only flag what you can prove. A false flag costs credibility too.", "Assinale só o que consegue provar. Um falso alerta também custa credibilidade.");
      return {win:false, title:T("QUALIFIED OPINION.\n" + left + " SECONDS OF FIELDWORK LEFT.", "OPINIÃO COM RESERVAS.\nFALTAVAM " + left + " SEGUNDOS DE TRABALHO DE CAMPO."), lines:[T("Findings " + s.found + " · false flags " + s.falses + " · missed " + s.misses, "Erros encontrados " + s.found + " · falsos alertas " + s.falses + " · escaparam " + s.misses)], tip:tip, rows:rows, realLine:real};
    }
  });
})();
