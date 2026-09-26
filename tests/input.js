// Plays the page with real keyboard, pointer and swipe events in headless Chrome,
// in real time (requestAnimationFrame doesn't advance under --virtual-time-budget).
// Needs a local server at the repo root: python -m http.server 8765
// Run: node tests/input.js [url-of-tests/input.html]
const { spawn } = require("child_process");
const os = require("os"), path = require("path");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_ = process.argv[2] || "http://localhost:8765/tests/input.html";
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--remote-debugging-port=9333", "--window-size=900,1000",
  "--autoplay-policy=user-gesture-required", "--user-data-dir=" + path.join(os.tmpdir(), "runway-input-test"), "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tabs;
  for (let i = 0; i < 40 && !tabs; i++) { try { tabs = await (await fetch("http://127.0.0.1:9333/json")).json() } catch (e) { await sleep(250) } }
  if (!tabs) { console.error("Chrome did not start"); process.exit(2) }
  const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl);
  let id = 0; const pending = {};
  const send = (method, params) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })) });
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id] } };
  await new Promise(r => ws.onopen = r);
  await send("Page.enable");
  await send("Page.navigate", { url: URL_ });
  let out = "";
  for (const until = Date.now() + 150000; Date.now() < until;) {
    await sleep(2000);
    const r = await send("Runtime.evaluate", { expression: "document.getElementById('out') && document.getElementById('out').textContent", returnByValue: true });
    out = (r && r.result && r.result.value) || "";
    if (out && out !== "pending") break;
  }
  console.log(out || "no result (is the local server running?)");
  ws.close(); chrome.kill();
  const fails = (out.match(/^FAIL/mg) || []).length;
  console.log(fails ? "\nFAIL: " + fails + " check(s)" : "\nOK: every input path works.");
  process.exit(fails || !out ? 1 : 0);
})();
