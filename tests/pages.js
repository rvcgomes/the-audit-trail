// Checks the four pages in a real Chrome, with the local server on:
//   python -m http.server 8765      then      node tests/pages.js
// For each page, at desktop and phone width: no script errors, the ?co= greeting,
// the case tabs, every circled letter has its source, and no sideways scroll.
const { spawn } = require("child_process"), os = require("os"), path = require("path");
const BASE = process.argv[2] || "http://localhost:8765/";
const PAGES = ["index.html", "short.html", "health.html", "saude.html"];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu",
  "--remote-debugging-port=9335", "--window-size=1280,800", "--user-data-dir=" + path.join(os.tmpdir(), "pages-test"), "about:blank"], { stdio: "ignore" });

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
  return out})()`;

(async () => {
  let tabs;
  for (let i = 0; i < 40 && !tabs; i++) { try { tabs = await (await fetch("http://127.0.0.1:9335/json")).json() } catch (e) { await sleep(250) } }
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
      ok(!r.wide, n + ": no sideways scroll");
    }
  }
  console.log(fails ? "\n" + fails + " FAILED" : "\nOK: all pages work.");
  ws.close(); chrome.kill(); process.exit(fails ? 1 : 0);
})();
