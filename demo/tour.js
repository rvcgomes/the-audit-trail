/* Guided demo (test pages only: saude-demo.html, health-demo.html).
   Without JavaScript every step is listed with its caption. With it, one step shows at a time:
   the screenshot starts whole, then zooms to the highlighted box. Autoplay starts only on a click,
   and never zooms when the reader asks for reduced motion. */
(function () {
  "use strict";
  var tour = document.getElementById("tour");
  if (!tour || !tour.querySelector) return;
  var steps = [].slice.call(tour.querySelectorAll(".tour-step"));
  var chaps = [].slice.call(tour.querySelectorAll("[data-chap]"));
  var play = document.getElementById("tourPlay"), prev = document.getElementById("tourPrev"), next = document.getElementById("tourNext");
  var count = document.getElementById("tourCount"), bar = document.getElementById("tourBar");
  var L = JSON.parse(tour.getAttribute("data-labels"));
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STEP = 7000, ZOOM_AFTER = 700;
  var cur = 0, playing = false, timer = 0, zoomT = 0, t0 = 0, raf = 0;

  tour.className += " on";

  function boxes(li) {
    return li.getAttribute("data-box").split(";").map(function (s) { return s.trim().split(/\s+/).map(Number) });
  }

  // scale and offset that put the union of the boxes in the middle of the view, without empty edges
  function frame(li) {
    var b = boxes(li), x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    b.forEach(function (r) { x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[0] + r[2]); y1 = Math.max(y1, r[1] + r[3]) });
    var s = Math.max(1, Math.min(2.4, 0.9 / Math.max(x1 - x0, y1 - y0)));
    // on a phone a wide box would barely zoom: zoom on its height and start at its left edge, where the labels are
    var narrow = li.querySelector(".tour-view").clientWidth < 560;
    if (narrow) s = Math.max(s, Math.min(2.2, 0.9 / (y1 - y0)));
    var tx = Math.min(0, Math.max(1 - s, narrow && s * (x1 - x0) > 1 ? 0.03 - s * x0 : 0.5 - s * (x0 + x1) / 2));
    var ty = Math.min(0, Math.max(1 - s, 0.5 - s * (y0 + y1) / 2));
    return "translate(" + (tx * 100).toFixed(2) + "%," + (ty * 100).toFixed(2) + "%) scale(" + s.toFixed(3) + ")";
  }

  function show(i, fromPlay) {
    cur = (i + steps.length) % steps.length;
    steps.forEach(function (li, k) {
      var on = k === cur, layer = li.querySelector(".tour-layer");
      li.hidden = !on;
      li.classList.toggle("lit", false);
      if (layer) layer.style.transform = "none";
      var img = li.querySelector("img");
      if (on && img && img.loading === "lazy") img.loading = "eager";
    });
    var li = steps[cur];
    clearTimeout(zoomT);
    zoomT = setTimeout(function () {
      li.classList.add("lit");
      if (!still) li.querySelector(".tour-layer").style.transform = frame(li);
    }, still ? 0 : ZOOM_AFTER);
    // preload the next screenshot
    var nimg = steps[(cur + 1) % steps.length].querySelector("img");
    if (nimg && nimg.loading === "lazy") nimg.loading = "eager";
    count.textContent = (cur + 1) + " / " + steps.length;
    var ch = 0;
    chaps.forEach(function (b, k) { if (cur >= +b.getAttribute("data-chap")) ch = k });
    chaps.forEach(function (b, k) { b.setAttribute("aria-pressed", k === ch ? "true" : "false") });
    if (!fromPlay) stop();
    else {
      t0 = Date.now(); clearTimeout(timer);
      timer = setTimeout(function () { if (cur === steps.length - 1) { stop(); tick() } else show(cur + 1, true) }, STEP);
    }
    tick();
  }

  function tick() {
    cancelAnimationFrame(raf);
    var p = playing ? Math.min(1, (Date.now() - t0) / STEP) : 0;
    bar.style.transform = "scaleX(" + ((cur + p) / steps.length).toFixed(4) + ")";
    if (playing) raf = requestAnimationFrame(tick);
  }

  function stop() {
    playing = false; clearTimeout(timer);
    play.textContent = L.play; play.setAttribute("aria-label", L.playAria);
    tour.classList.remove("playing");
  }

  function start() {
    playing = true;
    play.textContent = L.pause; play.setAttribute("aria-label", L.pause);
    tour.classList.add("playing");
    show(cur === steps.length - 1 ? 0 : cur, true);
  }

  play.addEventListener("click", function () { if (playing) stop(); else start() });
  prev.addEventListener("click", function () { show(cur - 1) });
  next.addEventListener("click", function () { show(cur + 1) });
  chaps.forEach(function (b) { b.addEventListener("click", function () { show(+b.getAttribute("data-chap")) }) });
  tour.addEventListener("keydown", function (e) {
    if (e.target.tagName === "BUTTON" && (e.key === " " || e.key === "Enter")) return;
    if (e.key === "ArrowRight") { show(cur + 1); e.preventDefault() }
    if (e.key === "ArrowLeft") { show(cur - 1); e.preventDefault() }
  });
  // a hidden tab stops the tour, so nobody comes back to step 9 of 12
  document.addEventListener("visibilitychange", function () { if (document.hidden && playing) stop() });

  show(0);
})();
