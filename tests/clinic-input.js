// Plays the clinic pages' console with real keys and taps in headless Chrome, in real time:
// four cartridges in the menu, FULLY BOOKED's setup (price, agreements), booking and turning
// patients away, a tap on the screen, and the wording in each language.
// Needs a local server at the repo root: python -m http.server 8765
// Run: node tests/clinic-input.js
const { spawn } = require("child_process"), os = require("os"), path = require("path");
const BASE = process.argv[2] || "http://localhost:8765/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu",
  "--remote-debugging-port=9336", "--window-size=900,1000", "--user-data-dir=" + path.join(os.tmpdir(), "clinic-input-test"), "about:blank"], { stdio: "ignore" });

(async () => {
  let tabs;
  for (let i = 0; i < 40 && !tabs; i++) { try { tabs = await (await fetch("http://127.0.0.1:9336/json")).json() } catch (e) { await sleep(250) } }
  const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl);
  let id = 0; const pend = {}, errors = [];
  const send = (m, p) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method: m, params: p })) });
  ws.onmessage = e => { const d = JSON.parse(e.data);
    if (d.id && pend[d.id]) { pend[d.id](d.result); delete pend[d.id] }
    if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception ? d.params.exceptionDetails.exception.description : d.params.exceptionDetails.text) };
  await new Promise(r => ws.onopen = r);
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable"); await send("Network.setCacheDisabled", { cacheDisabled: true });
  const js = async expr => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
  const KEYS = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 13 };
  const key = async k => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code: k, windowsVirtualKeyCode: KEYS[k] });
    await sleep(40);
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code: k, windowsVirtualKeyCode: KEYS[k] });
    await sleep(120);
  };
  let fails = 0;
  const ok = (cond, name, info) => { console.log((cond ? "PASS " : "FAIL ") + name + (info != null ? "  " + info : "")); if (!cond) fails++ };

  for (const [page, word] of [["saude.html", "AGENDA CHEIA"], ["health.html", "FULLY BOOKED"]]) {
    errors.length = 0;
    await send("Page.navigate", { url: BASE + page + "?debug" }); await sleep(1500);
    const menu = await js(`(function(){document.getElementById("device").scrollIntoView(); RUNWAY_DEBUG.menu(true);
      return [].map.call(document.querySelectorAll("#gOpts button"), function(b){return b.textContent})})()`);
    ok(menu.length === 4 && menu.some(t => t.indexOf(word) >= 0), page + ": menu has four cartridges, with " + word, JSON.stringify(menu));
    await js(`RUNWAY_DEBUG.start("agenda"); document.getElementById("device").focus(); 1`);
    await sleep(1300);                                     // READY / GO
    for (let i = 0; i < 3; i++) await key("ArrowUp");        // START -> price row
    await key("ArrowRight");
    let s = await js(`(function(){var s = RUNWAY_DEBUG.state(); return {sel:s.sel, price:Agenda.price(s), phase:s.phase}})()`);
    ok(s.sel === 0 && s.price === 55, page + ": ▲ to the price, ▶ raises it", JSON.stringify(s));
    await key("ArrowDown"); await key("ArrowRight");          // drop the insurer
    s = await js(`(function(){var s = RUNWAY_DEBUG.state(); return s.signed.care})()`);
    ok(s === false, page + ": ▶ on an agreement drops it");
    await key("ArrowDown"); await key("ArrowDown"); await key("Enter");
    await sleep(900);
    s = await js(`(function(){var s = RUNWAY_DEBUG.state(); return {phase:s.phase, cur:!!s.cur, week:s.week}})()`);
    ok(s.phase === "week" && s.week === 1 && s.cur, page + ": A opens the schedule, a patient arrives", JSON.stringify(s));
    await key("Enter");
    s = await js(`RUNWAY_DEBUG.state().slots.length`);
    ok(s === 1, page + ": A books the patient", s);
    await sleep(500);
    const before = await js(`(function(){var s = RUNWAY_DEBUG.state(); return s.slots.length + s.stat.private.turned + s.stat.mutual.turned})()`);
    await key("ArrowDown");
    const after = await js(`(function(){var s = RUNWAY_DEBUG.state(); return s.slots.length + s.stat.private.turned + s.stat.mutual.turned + s.stat.private.lost})()`);
    ok(after === before + 1, page + ": ▼ turns the patient away", before + " → " + after);
    await sleep(500);
    const box = await js(`(function(){var r = document.getElementById("gCanvas").getBoundingClientRect(); return {x:r.left + r.width*0.75, y:r.top + r.height*0.5}})()`);
    const n0 = await js(`RUNWAY_DEBUG.state().slots.length`);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
    await sleep(150);
    const n1 = await js(`RUNWAY_DEBUG.state().slots.length`);
    ok(n1 === n0 + 1, page + ": a tap on the patient books them", n0 + " → " + n1);
    const help = await js(`document.getElementById("gHud").textContent`);
    ok(page === "saude.html" ? /SEMANA/.test(help) : /WEEK/.test(help), page + ": the HUD is in the page's language", help.replace(/\s+/g, " ").trim());
    ok(errors.length === 0, page + ": no script errors", errors.join(" | "));
  }
  console.log(fails ? "\n" + fails + " FAILED" : "\nOK: the clinic console works.");
  ws.close(); chrome.kill(); process.exit(fails ? 1 : 0);
})();
