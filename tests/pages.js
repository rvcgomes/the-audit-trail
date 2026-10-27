// Checks the pages (and the two demo test pages) in a real Chrome, with the local server on:
//   python -m http.server 8765      then      node tests/pages.js
// For each page, at desktop and phone width: no script errors, the ?co= greeting,
// the case tabs, every circled letter has its source (in reading order), and no sideways scroll.
// Then: no request to another site, local fonts, games loaded only near the console,
// the page without JavaScript, print, and the links link.html builds.
const { spawn } = require("child_process"), os = require("os"), path = require("path");
const BASE = process.argv[2] || "http://localhost:8765/";
const PORT = 9000 + Math.floor(Math.random()*300);   // a fresh port and profile each run
const PAGES = ["index.html", "short.html", "health.html", "saude.html", "health-demo.html", "saude-demo.html"];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu",
  "--remote-debugging-port=" + PORT, "--window-size=1280,800", "--user-data-dir=" + path.join(os.tmpdir(), "pages-" + PORT), "about:blank"], { stdio: "ignore" });

const CHECK = `(async function(){
  await new Promise(function(r){setTimeout(r,1800)});
  var out={};
  out.title=document.title;
  out.toLine=!!document.getElementById("toLine") && !document.getElementById("toLine").hidden;
  var tabs=document.querySelectorAll('#sectors [role="tab"]');
  if(tabs.length>1){tabs[1].click(); var p=document.getElementById(tabs[1].getAttribute("aria-controls"));
    out.tab=!p.hidden && document.querySelectorAll('#sectors [role="tabpanel"]:not([hidden])').length===1}
  out.missing=[].filter.call(document.querySelectorAll("[popovertarget]"),function(b){return !document.getElementById(b.getAttribute("popovertarget"))}).length;
  out.wide=document.documentElement.scrollWidth>innerWidth;
  out.lang=document.documentElement.lang;
  var seen={}; out.order=[].map.call(document.querySelectorAll(".ref"),function(b){return b.textContent}).filter(function(l){return seen[l]?false:(seen[l]=true)}).join("");
  return out})()`;

(async () => {
  let tabs;
  for (let i = 0; i < 40 && !tabs; i++) { try { tabs = await (await fetch("http://127.0.0.1:" + PORT + "/json")).json() } catch (e) { await sleep(250) } }
  const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl);
  let id = 0; const pend = {}, errors = [];
  const send = (m, p) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method: m, params: p })) });
  ws.onmessage = e => { const d = JSON.parse(e.data);
    if (d.id && pend[d.id]) { pend[d.id](d.result); delete pend[d.id] }
    if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception ? d.params.exceptionDetails.exception.description : d.params.exceptionDetails.text) };
  await new Promise(r => ws.onopen = r);
  await send("Page.enable"); await send("Runtime.enable");
  let fails = 0;
  const ok = (cond, name, info) => { console.log((cond ? "PASS " : "FAIL ") + name + (info ? "  " + info : "")); if (!cond) fails++ };
  for (const w of [1280, 390]) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: 800, deviceScaleFactor: 1, mobile: w < 600 });
    for (const p of PAGES) {
      errors.length = 0;
      await send("Page.navigate", { url: BASE + p + "?co=Acme" }); await sleep(600);
      const r = (await send("Runtime.evaluate", { expression: CHECK, awaitPromise: true, returnByValue: true })).result.value;
      const n = p + " @" + w;
      ok(errors.length === 0, n + ": no script errors", errors.join(" | "));
      ok(/Acme/.test(r.title) && r.toLine, n + ": greets the company", r.title);
      ok(r.tab !== false, n + ": case tabs switch");
      ok(r.missing === 0, n + ": every letter has a source", r.missing ? r.missing + " missing" : "");
      ok(r.order === "ABCDEFG".slice(0, r.order.length), n + ": letters appear in reading order", r.order);
      ok(!r.wide, n + ": no sideways scroll");
    }
  }
  const js = async e => (await send("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true })).result.value;
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await send("Network.enable");
  for (const p of PAGES) {
    // no request leaves the site (fonts are local), and the games wait until the console is near
    const hosts = new Set();
    const watch = e => { const d = JSON.parse(e.data); if (d.method === "Network.requestWillBeSent") hosts.add(new URL(d.params.request.url).host) };
    ws.addEventListener("message", watch);
    await send("Page.navigate", { url: BASE + p }); await sleep(1200);
    const early = await js(`[!!window.RUNWAY, document.fonts.check("16px 'Schibsted Grotesk'")]`);
    await js(`document.getElementById("device").scrollIntoView(); 1`);
    let menu = 0;
    for (let k = 0; k < 30 && !menu; k++) { await sleep(200); menu = await js(`document.querySelectorAll("#gOpts button").length`); }
    ws.removeEventListener("message", watch);
    const foreign = [...hosts].filter(h => h && !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h) && h !== new URL(BASE).host);
    ok(foreign.length === 0, p + ": no request to another site", foreign.join(", "));
    ok(early[1], p + ": the page font is served locally");
    ok(!early[0] && menu > 0, p + ": the games load only when the console is near", "before " + early[0] + ", menu " + menu);
    // without JavaScript the content is all there
    await send("Emulation.setScriptExecutionDisabled", { value: true });
    await send("Page.navigate", { url: BASE + p }); await sleep(900);
    await send("Emulation.setScriptExecutionDisabled", { value: false });
    const nojs = await js(`[document.body.innerText.length, document.querySelectorAll(".wp").length, [].filter.call(document.querySelectorAll(".wp"), function(w){return w.offsetHeight > 0}).length]`);
    ok(nojs[0] > 3000 && nojs[1] > 0 && nojs[1] === nojs[2], p + ": readable without JavaScript, every case shown", nojs.join(" / "));
    // in print the console goes, the text stays
    await send("Emulation.setEmulatedMedia", { media: "print" });
    const pr = await js(`[getComputedStyle(document.querySelector(".quest")).display, getComputedStyle(document.querySelector("h2")).color]`);
    await send("Emulation.setEmulatedMedia", { media: "" });
    ok(pr[0] === "none" && pr[1] === "rgb(0, 0, 0)", p + ": print hides the games and prints black text", pr.join(" / "));
  }
  // link.html builds the right link for each version, and leaves "why" out for the clinics
  await send("Page.navigate", { url: BASE + "link.html" }); await sleep(600);
  const links = await js(`(function(){
    var co = document.getElementById("co"), why = document.getElementById("why"), out = [];
    co.value = "Acme & Co"; why.value = "Because"; co.dispatchEvent(new Event("input"));
    document.querySelectorAll('input[name="v"]').forEach(function(r){ r.checked = true; r.dispatchEvent(new Event("change"));
      out.push([r.value, document.getElementById("out").textContent, why.disabled]) });
    return out })()`);
  const want = { "": /the-audit-trail\/\?co=Acme\+%26\+Co&why=Because$/, "short.html": /short\.html\?co=Acme\+%26\+Co&why=Because$/,
    "saude.html": /saude\.html\?co=Acme\+%26\+Co$/, "health.html": /health\.html\?co=Acme\+%26\+Co$/ };
  for (const [v, url, off] of links) ok(want[v] && want[v].test(url) && off === /health|saude/.test(v), "link.html: " + (v || "full") + " link", url);
  // the demo test pages: noindex, one step at a time, the buttons move it, play advances, every screenshot loads
  for (const p of ["saude-demo.html", "health-demo.html"]) {
    await send("Page.navigate", { url: BASE + p }); await sleep(900);
    const d = await js(`(async function(){
      var wait = function(ms){ return new Promise(function(r){ setTimeout(r, ms) }) };
      var shown = function(){ return [].map.call(document.querySelectorAll(".tour-step"), function(li, i){ return li.hidden ? -1 : i }).filter(function(i){ return i >= 0 }) };
      var o = { noindex: !!document.querySelector('meta[name="robots"][content*="noindex"]'), canonical: !!document.querySelector('link[rel="canonical"]'),
                steps: document.querySelectorAll(".tour-step").length, first: shown().join() };
      document.getElementById("tourNext").click(); o.next = shown().join();
      document.getElementById("tourPrev").click(); document.getElementById("tourPrev").click(); o.prev = shown().join();
      document.querySelector('[data-chap="6"]').click(); o.chap = shown().join() + ":" + document.querySelector('[data-chap="6"]').getAttribute("aria-pressed");
      document.querySelector('[data-chap="0"]').click();
      document.getElementById("tourPlay").click(); await wait(7600); o.played = shown().join();
      document.getElementById("tourPlay").click(); await wait(300);
      o.zoom = document.querySelector(".tour-step:not([hidden]) .tour-layer").style.transform;
      var imgs = [].slice.call(document.querySelectorAll(".tour-step img"));
      imgs.forEach(function(i){ i.loading = "eager" });
      await Promise.all(imgs.map(function(i){ return i.complete ? 0 : new Promise(function(r){ i.onload = i.onerror = r }) }));
      o.loaded = imgs.filter(function(i){ return i.naturalWidth === 1800 }).length;
      return o })()`);
    ok(d.noindex && !d.canonical, p + ": noindex and no canonical");
    ok(d.steps === 12 && d.first === "0" && d.next === "1" && d.prev === "11" && d.chap === "6:true", p + ": one step at a time; previous, next and parts work", JSON.stringify(d));
    ok(d.played === "1" && /scale/.test(d.zoom), p + ": play moves on and zooms", d.played + " " + d.zoom);
    ok(d.loaded === 12, p + ": all 12 screenshots load", d.loaded + "/12");
    await send("Emulation.setScriptExecutionDisabled", { value: true });
    await send("Page.navigate", { url: BASE + p }); await sleep(900);
    await send("Emulation.setScriptExecutionDisabled", { value: false });
    const nj = await js(`[].filter.call(document.querySelectorAll(".tour-step"), function(li){ return li.offsetHeight > 0 }).length`);
    ok(nj === 12, p + ": without JavaScript every step is listed", nj + "/12");
  }
  console.log(fails ? "\n" + fails + " FAILED" : "\nOK: all pages work.");
  ws.close(); chrome.kill(); process.exit(fails ? 1 : 0);
})();
