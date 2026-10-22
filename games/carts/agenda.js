/* ================= Cartridge: FULL DIARY / AGENDA CHEIA =================
   Drawing and wording only; the rules are in agenda.js.
   Set the private price, sign agreements or not, then book patients into an
   eight-hour week. At the end each agreement gets a verdict.
   Wording follows the page's language (<html lang="pt"> gives Portuguese). */
(function(){
  if(!window.RUNWAY || !window.Agenda) return;
  var PT = document.documentElement.lang === "pt";
  function T(en, pt){return PT ? pt : en}
  var A = Agenda, NAME = {care:T("INSURER", "SEGURADORA"), mutual:T("HEALTH PLAN", "SUBSISTEMA")}, CODE = {care:T("INS", "SEG"), mutual:T("PLN", "SUB")};
  function eur(n){n = Math.round(n); return (n < 0 ? "−€" : "€") + Math.abs(n)}
  function signedEur(n){n = Math.round(n); return (n < 0 ? "−€" : "+€") + Math.abs(n)}
  function kindName(k){return k === "private" ? T("PRIVATE", "PARTICULAR") : NAME[k]}
  function perWeek(d){var lo = Math.floor(d.perWeek), hi = Math.ceil(d.perWeek); return (lo === hi ? lo : lo + "–" + hi) + T("/wk", "/sem")}
  function demandText(s){return "≈" + Math.round(A.demand(A.price(s))) + T(" private/wk", " particulares/sem")}

  /* screen layout */
  var ROW_Y = [32, 48, 64, 86], CARD = {x:28, y:44, w:136, h:40}, BTN_Y = 90;

  /* taps become the same presses as the keys */
  function fromTaps(s, inp){
    var p = {}, k; for(k in inp.press) p[k] = inp.press[k];
    (inp.taps || []).forEach(function(t){
      if(s.phase === "setup"){
        for(var i=0;i<ROW_Y.length;i++) if(t.y >= ROW_Y[i] - 10 && t.y < ROW_Y[i] + 5){
          if(s.sel !== i){s.sel = i; s.events.push({type:"move"})}
          if(i === 0) p[t.x < 96 ? "left" : "right"] = true; else p.a = true;
        }
      }else if(s.phase === "week" && s.cur){
        if(t.y >= BTN_Y && t.x < 96) p.down = true; else p.a = true;
      }
    });
    return {press:p, dir:inp.dir};
  }
  /* the demo books agreement patients only into hours private patients won't fill */
  function demoBot(s, mem){
    var inp = {press:{}, taps:[]};
    if(s.phase === "setup"){ if(s.t > 1.2) inp.press.a = true; return inp }
    if(!s.cur || s.phase !== "week" || A.DECIDE - s.timer < 0.7) return inp;
    var c = s.cur, free = A.free(s), ok = true;
    if(c.kind !== "private"){
      var priv = A.demand(A.price(s)), deals = 0;
      A.DEALS.forEach(function(d){if(s.signed[d.id]) deals += d.perWeek});
      var expected = s.queue.length*priv/(priv + deals);
      ok = free > (A.deal(c.kind).tariff >= A.HOUR ? 0.5 : 0.9)*expected;
    }
    inp.press[ok && free > 0 ? "a" : "down"] = true;
    return inp;
  }
  function occupancy(s){
    var w = s.stat.weeks; if(!w.length) return s.slots.length/A.SLOTS;
    return w.reduce(function(n, x){return n + x.booked}, 0)/(w.length*A.SLOTS);
  }

  RUNWAY.register({
    id:"agenda", order:1, name:T("FULL DIARY", "AGENDA CHEIA"), sub:T("pricing", "preços"), countdown:1, canvas:"tap",
    help:T("Set the price and the agreements, then A books, ▼ turns away.", "Defina o preço e as convenções; depois A marca, ▼ recusa."),
    say:T("Full Diary. You run a practice for four weeks. First set the private price with left and right, and sign or drop each agreement. Then patients arrive one at a time: A or a tap books them, down turns them away. The diary has eight hours a week and each hour costs " + A.HOUR + " euros, booked or not. When the diary is full, a private patient who arrives is lost.",
      "Agenda Cheia. Gere uma clínica durante quatro semanas. Primeiro defina o preço particular com esquerda e direita, e assine ou recuse cada convenção. Depois os pacientes chegam um a um: A ou um toque marca, baixo recusa. A agenda tem oito horas por semana e cada hora custa " + A.HOUR + " euros, ocupada ou não. Com a agenda cheia, um particular que chega perde-se."),
    create:function(){return A.create()},
    step:function(s, dt, inp){A.step(s, dt, fromTaps(s, inp))},
    demo:function(s, mem){return demoBot(s, mem)},
    mood:function(s){return s.phase === "setup" ? 0.1 : Math.max(0, Math.min(1, 0.3 + 0.15*s.week + (s.cash < 0 ? 0.3 : 0)))},
    hud:function(s){
      var used = s.phase === "setup" ? 0 : s.slots.length;
      return {cells:[[T("WEEK", "SEMANA"), Math.max(1, s.week) + "/" + A.WEEKS], [T("PROFIT", "LUCRO"), eur(s.cash)], [T("FREE", "LIVRES"), (A.SLOTS - used) + "h"]],
        row2:[T("PRICE", "PREÇO"), eur(A.price(s)), T("DIARY", "AGENDA"), 100*used/A.SLOTS, used >= A.SLOTS]};
    },
    onEvent:function(e, g, s){
      var C = g.COL;
      if(e.type === "move") g.sfx("blip");
      else if(e.type === "price"){g.sfx("blip"); g.line(T("Private price ", "Preço particular ") + eur(e.price) + ": " + demandText(s) + ".")}
      else if(e.type === "sign"){
        var d = A.deal(e.id); g.sfx(e.on ? "select" : "fizzle");
        g.line(NAME[e.id] + " " + eur(d.tariff) + (e.on ? T(" signed: ", " assinada: ") + perWeek(d) + T(", some come back as private.", ", alguns voltam como particulares.") : T(" not signed.", " recusada.")));
      }
      else if(e.type === "week"){g.sfx("gate"); g.banner(T("WEEK ", "SEMANA ") + e.week, 1)}
      else if(e.type === "arrive"){g.sfx("tick"); g.line(kindName(e.kind) + " · " + eur(e.price) + (e.full ? T(" · diary full", " · agenda cheia") : ""))}
      else if(e.type === "book"){g.sfx("coin"); g.float("+" + eur(e.price), 10 + e.slot*22, 40, e.kind === "private" ? C.lcd : C.dim)}
      else if(e.type === "full"){
        g.sfx("bad"); g.fx.shake = 0.15; g.float(T("FULL", "CHEIA"), 84, 40, C.hot);
        if(e.kind === "private") g.line(T("Diary full: a private patient lost.", "Agenda cheia: perdeu um particular."));
      }
      else if(e.type === "left"){g.sfx("fizzle"); g.line(T("They didn't wait.", "Não esperou."))}
      else if(e.type === "turn") g.sfx("drop");
      else if(e.type === "weekEnd"){
        g.sfx(e.profit >= 0 ? "good" : "bad"); g.flash("gV2", e.profit >= 0);
        g.line(T("Week ", "Semana ") + e.week + ": " + eur(e.revenue) + T(" in, ", " de receita, ") + eur(e.cost) + T(" for the hours = ", " das horas = ") + signedEur(e.profit) +
          (e.noShows ? T(" · no-shows ", " · faltas ") + e.noShows : "") + ".");
      }
      else if(e.type === "won") g.say(T("Four weeks. The diary pays.", "Quatro semanas. A agenda dá lucro."));
      else if(e.type === "over") g.say(T("Four weeks. The diary doesn't pay.", "Quatro semanas. A agenda não dá lucro."));
    },
    draw:function(g, s){
      var ctx = g.ctx, C = g.COL, W = g.W, i;
      if(s.phase === "setup"){
        g.text(T("SET UP THE PRACTICE", "PREPARE A CLÍNICA"), W/2, 21, C.lcd, g.BIG, "center");
        for(i=0;i<A.ROWS;i++){
          var y = ROW_Y[i], on = s.sel === i;
          if(on){ctx.strokeStyle = C.lcd; ctx.strokeRect(4.5, y - 9.5, W - 9, 13)}
          if(i === 0){
            g.text(T("PRIVATE", "PARTICULAR"), 9, y, C.lcd);
            g.text((s.pi > 0 ? "◀ " : "  ") + eur(A.price(s)) + (s.pi < A.PRICES.length - 1 ? " ▶" : "  "), W - 9, y, C.lcd, null, "right");
          }else if(i <= A.DEALS.length){
            var d = A.DEALS[i - 1], signed = s.signed[d.id];
            g.text(NAME[d.id] + " " + eur(d.tariff) + " · " + perWeek(d), 9, y, signed ? C.lcd : C.dim);
            g.text(signed ? T("SIGNED", "ASSINADA") : T("NO", "NÃO"), W - 9, y, signed ? C.lcd : C.mid, null, "right");
          }else g.text(T("▸ OPEN THE DIARY", "▸ ABRIR A AGENDA"), W/2, y, on ? C.lcd : C.dim, null, "center");
        }
        g.text(demandText(s) + T(" · an hour €", " · hora €") + A.HOUR, W/2, 108, C.dim, null, "center");
        g.text(T("▲▼ choose · ◀▶ change · A", "▲▼ escolher · ◀▶ mudar · A"), W/2, 117, C.mid, null, "center");
        return;
      }
      /* the week's diary */
      for(i=0;i<A.SLOTS;i++){
        var x = 8 + i*22, c = s.slots[i];
        if(c){
          ctx.fillStyle = c.kind === "private" ? C.lcd : C.dim; ctx.fillRect(x, 15, 20, 18);
          g.text(c.kind === "private" ? "P" : CODE[c.kind], x + 10, 23, C.dark, null, "center");
          g.text(String(c.price), x + 10, 31, C.dark, null, "center");
        }else{ctx.strokeStyle = C.faint; ctx.strokeRect(x + 0.5, 15.5, 19, 17)}
      }
      g.text(T("DIARY ", "AGENDA ") + s.slots.length + "/" + A.SLOTS, 8, 42, C.dim);
      if(s.phase === "week") g.text(T("WAITING ", "EM ESPERA ") + (s.queue.length + (s.cur ? 1 : 0)), W - 8, 42, C.dim, null, "right");

      if(s.phase === "break" || s.phase === "done"){
        var wk = s.stat.weeks[s.stat.weeks.length - 1];
        if(wk){
          ctx.fillStyle = C.dark; ctx.fillRect(CARD.x, CARD.y, CARD.w, CARD.h + 20); ctx.strokeStyle = wk.profit >= 0 ? C.lcd : C.hot; ctx.strokeRect(CARD.x + 0.5, CARD.y + 0.5, CARD.w - 1, CARD.h + 19);
          g.text(T("WEEK ", "SEMANA ") + wk.week, W/2, CARD.y + 13, C.lcd, null, "center");
          g.text(eur(wk.revenue) + T(" in · hours ", " receita · horas ") + "−" + eur(wk.cost), W/2, CARD.y + 26, C.dim, null, "center");
          g.text(signedEur(wk.profit), W/2, CARD.y + 43, wk.profit >= 0 ? C.lcd : C.hot, g.BIG, "center");
          if(wk.lost) g.text(T("private lost ", "particulares perdidos ") + wk.lost, W/2, CARD.y + 55, C.hot, null, "center");
        }
        if(s.phase === "done"){
          ctx.fillStyle = C.dark; ctx.fillRect(0, 50, W, 22);
          g.text(s.won ? T("THE DIARY PAYS", "A AGENDA DÁ LUCRO") : T("IT DOESN'T PAY", "NÃO DÁ LUCRO"), W/2, 66, s.won ? C.lcd : C.hot, g.BIG, "center");
        }
        return;
      }
      /* the patient at the desk */
      var cur = s.cur;
      if(cur){
        var full = A.free(s) <= 0;
        ctx.fillStyle = C.dark; ctx.fillRect(CARD.x, CARD.y, CARD.w, CARD.h); ctx.strokeStyle = cur.kind === "private" ? C.lcd : C.dim; ctx.strokeRect(CARD.x + 0.5, CARD.y + 0.5, CARD.w - 1, CARD.h - 1);
        g.text(kindName(cur.kind), W/2, CARD.y + 16, cur.kind === "private" ? C.lcd : C.dim, g.BIG, "center");
        g.text(eur(cur.price) + T(" a session", " por sessão") + (cur.kind !== "private" && cur.price < A.HOUR ? T(" · below the hour", " · abaixo da hora") : ""), W/2, CARD.y + 28, C.dim, null, "center");
        var left = Math.max(0, s.timer/A.DECIDE);
        ctx.fillStyle = C.faint; ctx.fillRect(CARD.x + 8, CARD.y + 33, CARD.w - 16, 3);
        ctx.fillStyle = left < 0.3 ? C.hot : C.lcd; ctx.fillRect(CARD.x + 8, CARD.y + 33, Math.round((CARD.w - 16)*left), 3);
        if(full) g.text(T("DIARY FULL", "AGENDA CHEIA"), W/2, CARD.y - 2, C.hot, null, "center");
      }
      ctx.strokeStyle = C.mid; ctx.strokeRect(8.5, BTN_Y + 0.5, 84, 16); ctx.strokeRect(100.5, BTN_Y + 0.5, 84, 16);
      g.text(T("▼ TURN AWAY", "▼ RECUSAR"), 50, BTN_Y + 11, C.dim, null, "center");
      g.text(T("A BOOK", "A MARCAR"), 142, BTN_Y + 11, C.lcd, null, "center");
    },
    overlay:function(g, s){
      if(s.phase === "setup") return;
      var ctx = g.ctx, C = g.COL, W = g.W;
      ctx.fillStyle = C.dark; ctx.fillRect(0, 0, W, 11); ctx.fillStyle = C.mid; ctx.fillRect(0, 11, W, 1);
      g.text(T("WEEK ", "SEMANA ") + Math.max(1, s.week) + "/" + A.WEEKS + " · " + eur(A.price(s)), 4, 9, C.lcd);
      g.text(signedEur(s.cash), W - 4, 9, s.cash < 0 ? C.hot : C.lcd, null, "right");
    },
    result:function(s){
      var v = A.verdicts(s), lost = s.stat.private.lost, occ = occupancy(s);
      var lines = v.map(function(x){
        return NAME[x.id] + " " + eur(x.tariff) + ": " + x.came + T(" sessions, brought ", " sessões, trouxe ") + x.referred + T(" private", " particulares") +
          (Math.round(x.pushed) ? T(", pushed out ", ", tirou o lugar a ") + Math.round(x.pushed) : "") + " → " + (x.pays ? T("pays", "compensa") : T("doesn't pay", "não compensa"));
      });
      if(!v.length) lines.push(T("No agreements signed.", "Sem convenções."));
      var rows = [[T("Private price", "Preço particular"), eur(A.price(s))], [T("Profit", "Lucro"), signedEur(s.cash)], [T("Diary booked", "Agenda ocupada"), Math.round(100*occ) + "%"],
        [T("Private lost", "Particulares perdidos"), lost]];
      v.forEach(function(x){rows.push([NAME[x.id] + " " + eur(x.tariff), x.pays ? T("pays", "compensa") : T("doesn't pay", "não compensa")])});
      var cheapPays = v.some(function(x){return x.belowHour && x.pays}), cheapLoses = v.some(function(x){return x.belowHour && !x.pays});
      var tip = cheapLoses && lost ? T("A full diary isn't a profitable one: every cheap hour can cost a private patient.", "Agenda cheia não é agenda rentável: cada hora barata pode custar um particular.") :
        occ < 0.75 ? T("Empty hours cost the same as booked ones. A lower price or an agreement can fill them.", "As horas vazias custam o mesmo que as ocupadas. Um preço mais baixo ou uma convenção podem enchê-las.") :
        cheapPays ? T("Below the cost of an hour, an agreement pays only by filling hours the private patients wouldn't.", "Abaixo do custo de uma hora, uma convenção só compensa se encher horas que os particulares não iam ocupar.") :
        T("Check what each agreement pays against what an hour costs.", "Compare o que cada convenção paga com o que custa uma hora.");
      var real = T("The dental case on this page: prices that assumed seven times as many agreement patients as the clinic had.",
        "O caso da clínica dentária desta página: preços que contavam com sete vezes mais pacientes de convenções do que a clínica tinha.");
      if(s.won) return {win:true, title:T("THE DIARY PAYS.\nPROFIT ", "A AGENDA DÁ LUCRO.\nLUCRO DE ") + eur(s.cash) + T(" IN FOUR WEEKS.", " EM QUATRO SEMANAS."), lines:lines, tip:tip, rows:rows, realLine:real};
      var title = occ >= 0.85 ? T("FULL DIARY, EMPTY MARGIN.", "AGENDA CHEIA, MARGEM VAZIA.") : T("EMPTY HOURS STILL COST.", "AS HORAS VAZIAS TAMBÉM CUSTAM.");
      return {win:false, title:title + T("\nLOSS OF ", "\nPREJUÍZO DE ") + eur(-s.cash) + ".", lines:lines, tip:tip, rows:rows, real:false};
    }
  });
})();
