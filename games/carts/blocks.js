/* ================= Cartridge: CASH FLOW =================
   Drawing and wording only; the rules are in blocks.js.
   The well is 10×13 cells of 8px at the left, with the quarter's 13 weeks
   ticked off under it; the panel on the right shows the next piece, cash,
   the payroll clock and the legend. A tick right of each row says where
   that week is heading: amber in the black, orange in the red. The well
   ends at y 107 so the demo band never covers it. */
(function(){
  if(!window.RUNWAY || !window.Blocks) return;

  var X0 = 8, Y0 = 3, CELL = 8, PX = 96, SP = null;
  function sprites(g){
    if(SP) return SP;
    SP = {
      inn:g.sprite(["#######", "#######", "###x###", "##xxx##", "###x###", "#######", "#######"]),
      out:g.sprite(["ddddddd", "ddddddd", "ddddddd", "dxxxxxd", "ddddddd", "ddddddd", "ddddddd"]),
      inMini:g.sprite(["#####", "##x##", "#xxx#", "##x##", "#####"]),
      outMini:g.sprite(["ddddd", "ddddd", "dxxxd", "ddddd", "ddddd"])
    };
    return SP;
  }
  /* wording in the page's language (the Portuguese pages set <html lang="pt">) */
  var PT = typeof document !== "undefined" && document.documentElement.lang === "pt";
  function T(en, pt){return PT ? pt : en}
  function money(n){return (n < 0 ? "−€" : "€") + Math.abs(Math.round(n)) + "k"}
  function signed(n){return (n < 0 ? "−€" : "+€") + Math.abs(Math.round(n)) + "k"}
  function weekNow(s){return Math.min(Blocks.WEEKS, s.weeks + (s.won ? 0 : 1))}
  function stackPct(s){return Math.round(100*Blocks.height(s.grid)/Blocks.ROWS)}

  /* ---------- demo bot: the stacking heuristic plus the ledger ---------- */
  function score(s, g){
    var C = Blocks.COLS, R = Blocks.ROWS, lines = 0, net = 0, red = 0, risk = 0, keep = [], y, x;
    for(y=0;y<R;y++){
      var n = 0, o = 0, full = true;
      for(x=0;x<C;x++){var v = g[y*C + x]; if(!v) full = false; else if(v === Blocks.IN) n++; else{n--; o++}}
      if(full){lines++; net += n; if(n < 0) red++}
      else{keep.push(y); if(o > 4) risk += (o - 4)*(o - 4)}
    }
    var m = net*Blocks.PER_CELL; if(lines >= 2 && m > 0) m *= Blocks.BATCH; m -= red*Blocks.FEE;
    var agg = 0, holes = 0, bump = 0, prev = -1;
    for(x=0;x<C;x++){
      var h = 0;
      for(var i=0;i<keep.length;i++){
        if(g[keep[i]*C + x]){if(!h) h = keep.length - i}
        else if(h) holes++;
      }
      agg += h; if(prev >= 0) bump += Math.abs(h - prev); prev = h;
    }
    var calm = Blocks.height(s.grid) >= 8 ? 0.3 : 1;
    return -0.51*agg + 0.76*lines - 0.36*holes - 0.18*bump + calm*(0.09*m - 0.5*risk);
  }
  function plan(s){
    var p = s.piece, C = Blocks.COLS, best = null, bv = -1e9;
    for(var r=0;r<4;r++) for(var x=-3;x<=C;x++){
      if(!Blocks.fits(s.grid, p.k, r, x, p.y)) continue;
      var y = Blocks.dropY(s.grid, p.k, r, x, p.y), g = s.grid.slice(), top = false;
      Blocks.SHAPES[p.k][r].forEach(function(c){var cy = y + c[1]; if(cy < 0) top = true; else g[cy*C + x + c[0]] = p.sign});
      if(top) continue;
      var v = score(s, g); if(v > bv){bv = v; best = {r:r, x:x}}
    }
    return best || {r:p.r, x:p.x};
  }
  function demoBot(s, mem){
    var inp = {down:false, dir:null, press:{}, taps:[]}, p = s.piece;
    if(!p || s.phase !== "fall") return inp;
    if(mem.p !== p){mem.p = p; mem.plan = plan(s); mem.at = s.t + 0.3; mem.n = 0}
    if(s.t < mem.at) return inp;
    mem.at = s.t + 0.07;
    var q = mem.plan;
    if(++mem.n > 14){inp.press.a = true; inp.down = true}
    else if(p.r !== q.r) inp.press.up = true;
    else if(p.x < q.x) inp.press.right = true;
    else if(p.x > q.x) inp.press.left = true;
    else{inp.press.a = true; inp.down = true}
    return inp;
  }

  /* ---------- drawing ---------- */
  function cell(ctx, sp, v, x, y){ctx.drawImage(v === Blocks.IN ? sp.inn : sp.out, x, y)}

  RUNWAY.register({
    id:"blocks", order:3, name:T("CASH FLOW", "TESOURARIA"), sub:T("stack", "empilhar"), countdown:1.2, canvas:"swipe", real:false,
    help:T("◀ ▶ move · ▲ rotate · ▼ faster · A drop. Close rows with more + than −.", "◀ ▶ mover · ▲ rodar · ▼ mais rápido · A largar. Feche linhas com mais + do que −."),
    say:T("Cash Flow. Falling blocks: left and right move, up or a tap rotates, down drops faster, A drops. Plus blocks are money in, minus blocks are money out. Each full row closes a week, and a week with more minus than plus pays an overdraft fee. Payroll is due every 13 seconds. Close 13 weeks.",
      "Tesouraria. Blocos a cair: esquerda e direita movem, cima ou um toque roda, baixo acelera, A larga. Os blocos mais são dinheiro a entrar, os menos são dinheiro a sair. Cada linha completa fecha uma semana, e uma semana com mais menos do que mais paga uma comissão de descoberto. Os salários vencem a cada 13 segundos. Feche 13 semanas."),
    create:function(){return Blocks.create()},
    step:function(s, dt, inp){
      var p = inp.press || {}, sw = inp.swiped;
      if(sw) inp.swiped = null;
      Blocks.step(s, dt, {dir:inp.dir, left:p.left, right:p.right,
        rotate:p.up || p.tap,
        drop:(p.a && !p.tap) || (p.down && sw === "down" && inp.dir !== "down")});
    },
    demo:function(s, mem){return demoBot(s, mem)},
    mood:function(s){
      var h = Blocks.height(s.grid)/Blocks.ROWS, low = Math.max(0, Math.min(1, 1 - (s.cash - Blocks.PAYROLL)/(Blocks.PAYROLL*3)));
      if(s.pay < 3 && s.cash <= Blocks.PAYROLL*1.5) low = Math.min(1, low + 0.25);
      return Math.max(0, Math.min(1, 0.6*h + 0.5*low));
    },
    hud:function(s){
      var pct = stackPct(s);
      return {cells:[[T("WEEK", "SEMANA"), Math.min(Blocks.WEEKS, s.weeks) + "/" + Blocks.WEEKS], [T("CASH", "CAIXA"), money(Math.max(0, s.cash))], [T("PAYROLL", "SALÁRIOS"), Math.max(0, Math.ceil(s.pay)) + "s"]],
        row2:[T("LAST WEEK", "ÚLT. SEMANA"), s.last === null ? "—" : signed(s.last), T("STACK", "PILHA"), pct, pct > 70]};
    },
    onEvent:function(e, g, s){
      var C = g.COL, ry = e.y == null ? 60 : Y0 + e.y*CELL + 6;
      if(e.type === "drop") g.sfx("drop");
      else if(e.type === "line"){
        g.sfx("line");
        var n = e.rows.length, first = Math.min(e.week, s.weeks - n + 1), span = first < e.week ? T("Weeks ", "Semanas ") + first + "–" + e.week : T("Week ", "Semana ") + e.week;
        var head = e.bonus ? T("BATCH RUN", "LOTE") : span.toUpperCase();
        g.banner(head + " " + signed(e.net), 1.1);
        var detail = "+" + e.ins + T(" in, −", " entra, −") + e.outs + T(" out", " sai");
        if(e.fee) g.line(span + T(" in the red: ", " no vermelho: ") + detail + ", €" + e.fee + T("k overdraft fee", "k de descoberto") + (e.bonus ? T(", batch bonus on the rest", ", bónus de lote no resto") : "") + ".");
        else if(e.bonus) g.line(T("Batch run: ", "Lote: ") + detail + ", ×" + Blocks.BATCH + T(" on the net. ", " no saldo. ") + signed(e.net) + ".");
        else g.line(span + ": " + detail + " = " + signed(e.net) + ".");
      }
      else if(e.type === "good"){g.flash("gV2", true); g.float(signed(e.net), X0 + 30, ry, C.lcd)}
      else if(e.type === "bad"){
        g.sfx("bad"); g.fx.shake = 0.2;
        if(e.text) g.say(T(e.text, "BLOQUEADO"));
        else{g.flash("gV2", false); g.float(signed(e.net), X0 + 30, ry, C.hot)}
      }
      else if(e.type === "power") g.sfx("power");
      else if(e.type === "hurt"){
        g.sfx("hurt"); g.fx.shake = 0.2; g.flash("gV3", false); g.float("−€" + Blocks.PAYROLL + "k", PX + 40, 58, C.hot);
        g.line(T("Payroll: −€", "Salários: −€") + Blocks.PAYROLL + T("k. Next one in ", "k. Os próximos daqui a ") + Blocks.PAY_EVERY + T(" seconds.", " segundos."));
      }
    },
    draw:function(g, s){
      var ctx = g.ctx, C = g.COL, W = g.W, sp = sprites(g), COLS = Blocks.COLS, ROWS = Blocks.ROWS, x, y, v;
      var WW = COLS*CELL, WH = ROWS*CELL, now = g.now();

      /* well: border, dots, settled cells */
      ctx.fillStyle = C.dim; ctx.fillRect(X0 - 1, Y0, 1, WH + 1); ctx.fillRect(X0 + WW, Y0, 1, WH + 1); ctx.fillRect(X0 - 1, Y0 + WH, WW + 2, 1);
      ctx.fillStyle = C.faint;
      for(y=0;y<ROWS;y++) for(x=0;x<COLS;x++) if(!s.grid[y*COLS + x]) ctx.fillRect(X0 + x*CELL + 3, Y0 + y*CELL + 3, 1, 1);
      var blink = s.clearing && (g.reduce || Math.floor(now/70) % 2);
      for(y=0;y<ROWS;y++){
        var clearing = s.clearing && s.clearing.indexOf(y) >= 0, ins = 0, outs = 0;
        for(x=0;x<COLS;x++){
          v = s.grid[y*COLS + x]; if(!v) continue;
          if(v === Blocks.IN) ins++; else outs++;
          if(clearing && blink){ctx.fillStyle = C.lcd; ctx.fillRect(X0 + x*CELL, Y0 + y*CELL, 7, 7)}
          else cell(ctx, sp, v, X0 + x*CELL, Y0 + y*CELL);
        }
        /* where this week is heading */
        if(ins + outs){ctx.fillStyle = outs > ins ? C.hot : outs === ins ? C.mid : C.lcd; ctx.fillRect(X0 + WW + 2, Y0 + y*CELL, 2, 7)}
      }
      /* the quarter: one tick per week under the well */
      for(var w=0;w<Blocks.WEEKS;w++){ctx.fillStyle = w < s.weeks ? C.lcd : C.faint; ctx.fillRect(X0 + 1 + w*6, Y0 + WH + 5, 5, 3)}

      /* ghost and piece */
      var p = s.piece;
      if(p){
        var cs = Blocks.SHAPES[p.k][p.r], gy = Blocks.dropY(s.grid, p.k, p.r, p.x, p.y), i;
        if(!s.over){
          ctx.strokeStyle = C.mid;
          for(i=0;i<4;i++) if(gy + cs[i][1] >= 0) ctx.strokeRect(X0 + (p.x + cs[i][0])*CELL + 0.5, Y0 + (gy + cs[i][1])*CELL + 0.5, 6, 6);
        }
        for(i=0;i<4;i++) if(p.y + cs[i][1] >= 0) cell(ctx, sp, p.sign, X0 + (p.x + cs[i][0])*CELL, Y0 + (p.y + cs[i][1])*CELL);
      }

      /* panel: next, cash, payroll, legend */
      g.text(T("NEXT", "SEGUE"), PX, 9, C.dim);
      if(s.next){
        var ns = Blocks.SHAPES[s.next.k][0], mini = s.next.sign === Blocks.IN ? sp.inMini : sp.outMini, minY = 9;
        ns.forEach(function(c){minY = Math.min(minY, c[1])});
        ns.forEach(function(c){ctx.drawImage(mini, PX + c[0]*6, 12 + (c[1] - minY)*6)});
        g.text(s.next.sign === Blocks.IN ? T("+ IN", "+ ENTRA") : T("− OUT", "− SAI"), PX + 30, 20, s.next.sign === Blocks.IN ? C.lcd : C.dim);
      }
      var poor = s.cash <= Blocks.PAYROLL;
      g.text(T("CASH", "CAIXA"), PX, 35, C.dim);
      g.text(money(Math.max(0, s.cash)), PX, 49, poor ? C.hot : C.lcd, g.BIG);
      g.text(T("PAYROLL", "SALÁRIOS"), PX, 61, C.dim);
      var left = Math.max(0, s.pay), due = left < 2 && !s.over && !s.won, bw = W - PX - 8;
      ctx.fillStyle = C.faint; ctx.fillRect(PX, 64, bw, 4);
      ctx.fillStyle = due && Math.floor(now/150) % 2 ? C.hot : C.lcd; ctx.fillRect(PX, 64, Math.round(bw*left/Blocks.PAY_EVERY), 4);
      g.text(Math.ceil(left) + "s · −€" + Blocks.PAYROLL + "k", PX, 77, due ? C.hot : C.dim);
      ctx.drawImage(sp.inMini, PX, 83); g.text(T("money in", "entra"), PX + 9, 88, C.lcd);
      ctx.drawImage(sp.outMini, PX, 92); g.text(T("money out", "sai"), PX + 9, 97, C.dim);
      ctx.fillStyle = C.hot; ctx.fillRect(PX + 1, 101, 2, 5); g.text(T("week in red", "no vermelho"), PX + 9, 106, C.dim);

      if(s.over || s.won){
        ctx.fillStyle = C.dark; ctx.fillRect(0, 50, W, 22);
        g.text(s.won ? T("QUARTER CLOSED", "TRIMESTRE FECHADO") : s.over === "cash" ? T("OUT OF CASH", "SEM CAIXA") : T("WORKING CAPITAL JAMMED", "MANEIO BLOQUEADO"), W/2, 66, s.won ? C.lcd : C.hot, g.BIG, "center");
      }
    },
    result:function(s){
      var wk = Math.min(Blocks.WEEKS, s.weeks), net = s.collected - s.paidOut + s.bonus - s.fees;
      var rows = [[T("Weeks closed", "Semanas fechadas"), wk + "/" + Blocks.WEEKS], [T("Cash left", "Caixa final"), money(Math.max(0, s.cash))], [T("Net from weeks", "Saldo das semanas"), signed(net)],
        [T("Weeks in the red", "Semanas no vermelho"), s.red], [T("Payroll paid", "Salários pagos"), money(s.payroll)]];
      if(s.won){
        var verdict = s.red === 0 ? T("Not one week in the red.", "Nem uma semana no vermelho.") : s.cash >= 150 ? T("Room to breathe next quarter.", "Folga para o próximo trimestre.") : T("Closed, with not much to spare.", "Fechado, mas à justa.");
        return {win:true, title:T("QUARTER CLOSED.\n13 WEEKS, ", "TRIMESTRE FECHADO.\n13 SEMANAS, ") + money(s.cash) + T(" IN THE BANK.", " NO BANCO."),
          lines:[T("In ", "Entrou ") + money(s.collected) + T(" · out ", " · saiu ") + money(s.paidOut) + T(" · payroll ", " · salários ") + money(s.payroll), verdict],
          tip:T("Same money, different weeks: that is cash flow.", "O mesmo dinheiro, em semanas diferentes: isso é tesouraria."), rows:rows, real:false};
      }
      if(s.over === "jam") return {win:false, title:T("WORKING CAPITAL JAMMED\nIN WEEK ", "FUNDO DE MANEIO BLOQUEADO\nNA SEMANA ") + weekNow(s) + ".", lines:[],
        tip:T("Keep the stack low. A small week closed beats a big one stuck.", "Mantenha a pilha baixa. Uma semana pequena fechada vale mais do que uma grande encravada."), rows:rows, real:false};
      var tip = s.red >= 2 ? T("Weeks with more − than + pay a fee. Spread the − blocks across rows.", "As semanas com mais − do que + pagam comissão. Espalhe os blocos − pelas linhas.") : T("Payroll never waits. Close rows full of + before payday.", "Os salários não esperam. Feche linhas cheias de + antes do dia de pagamento.");
      return {win:false, title:T("OUT OF CASH IN WEEK ", "SEM CAIXA NA SEMANA ") + weekNow(s) + ".", lines:[s.red ? (PT ? s.red + (s.red > 1 ? " semanas" : " semana") + " no vermelho custaram " + money(s.fees) + " em comissões." : s.red + " week" + (s.red > 1 ? "s" : "") + " in the red cost " + money(s.fees) + " in fees.") : T("Payroll took ", "Os salários levaram ") + money(s.payroll) + "."],
        tip:tip, rows:rows, real:false};
    }
  });
})();
