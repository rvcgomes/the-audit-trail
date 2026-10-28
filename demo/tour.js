/* Guided demo (test pages only: saude-demo.html, health-demo.html).
   Without JavaScript every step is listed with its caption. With it, one step shows at a time:
   the screenshot starts whole, then zooms to the highlighted box. Autoplay starts only on a click,
   and never zooms when the reader asks for reduced motion.
   Rui's face plays in the corner, one clip per step (data-video, data-ext); a step ends when its clip
   ends, and skipping a step skips the clip. Without the clips, a placeholder shows instead, the script
   (data-say) shows as subtitles and each step lasts about as long as it takes to say it. */
(function () {
  "use strict";
  var tour = document.getElementById("tour");
  if (!tour || !tour.querySelector) return;
  var $ = function (id) { return document.getElementById(id) };
  var steps = [].slice.call(tour.querySelectorAll(".tour-step"));
  var chaps = [].slice.call(tour.querySelectorAll("[data-chap]"));
  var play = $("tourPlay"), count = $("tourCount"), bar = $("tourBar");
  var face = $("tourFace"), vid = $("tourVid"), sub = $("tourSub"), subsBtn = $("tourSubs"), soundBtn = $("tourSound");
  var L = JSON.parse(tour.getAttribute("data-labels"));
  var vbase = tour.getAttribute("data-video") || "", vext = tour.getAttribute("data-ext") || "";
  var hasVid = !!(vbase && vid && vid.canPlayType && vid.canPlayType(vext === "mp4" ? "video/mp4" : "video/webm"));
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ZOOM_AFTER = 700;
  var cur = 0, playing = false, subsOn = !hasVid, timer = 0, zoomT = 0, t0 = 0, dur = 7000, raf = 0;

  tour.className += " on";
  face.hidden = false;
  if (hasVid) soundBtn.hidden = false; else face.className += " ph";

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
    if (still) { s = 1; tx = ty = 0 }
    // the face sits bottom right, unless the highlighted part is there: then the first free corner
    var view = li.querySelector(".tour-view"), fw = (face.offsetWidth + 24) / view.clientWidth, fh = (face.offsetHeight + 24) / view.clientHeight;
    var hits = function (left, top) {
      return b.some(function (r) {
        var bx0 = tx + s * r[0], bx1 = tx + s * (r[0] + r[2]), by0 = ty + s * r[1], by1 = ty + s * (r[1] + r[3]);
        return (top ? by0 < fh : by1 > 1 - fh) && (left ? bx0 < fw : bx1 > 1 - fw);
      });
    };
    var spot = [[0, 0], [1, 0], [0, 1], [1, 1]].filter(function (c) { return !hits(c[0], c[1]) })[0] || [0, 0];
    face.classList.toggle("left", !!spot[0]);
    face.classList.toggle("top", !!spot[1]);
    // the caption sits above the screenshot, inside the same stage: the top corner starts at the screenshot
    face.style.top = spot[1] ? (li.querySelector(".tour-win").offsetTop + 14) + "px" : "";
    return "translate(" + (tx * 100).toFixed(2) + "%," + (ty * 100).toFixed(2) + "%) scale(" + s.toFixed(3) + ")";
  }

  // without a clip, a step lasts about as long as saying its script
  function sayTime(li) {
    var words = li.getAttribute("data-say").split(/\s+/).length;
    return Math.max(6000, Math.round(words / 2.6 * 1000) + 1200);
  }

  function advance() {
    if (cur === steps.length - 1) { stop(); tick() } else show(cur + 1, true);
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
      var f = frame(li);
      if (!still) li.querySelector(".tour-layer").style.transform = f;
    }, still ? 0 : ZOOM_AFTER);
    // preload the next screenshot
    var nimg = steps[(cur + 1) % steps.length].querySelector("img");
    if (nimg && nimg.loading === "lazy") nimg.loading = "eager";
    count.textContent = (cur + 1) + " / " + steps.length;
    var ch = 0;
    chaps.forEach(function (b, k) { if (cur >= +b.getAttribute("data-chap")) ch = k });
    chaps.forEach(function (b, k) { b.setAttribute("aria-pressed", k === ch ? "true" : "false") });
    sub.textContent = li.getAttribute("data-say");
    sub.hidden = !subsOn;
    clearTimeout(timer);
    if (hasVid) {
      vid.preload = "auto";
      vid.src = vbase + "s" + (cur < 9 ? "0" : "") + (cur + 1) + "." + vext;
    }
    if (!fromPlay) { stop(); tick(); return }
    t0 = Date.now(); dur = sayTime(li);
    if (hasVid) { var p = vid.play(); if (p && p.catch) p.catch(function () {}) }
    else timer = setTimeout(advance, dur);
    tick();
  }

  function tick() {
    cancelAnimationFrame(raf);
    var p = 0;
    if (playing) p = hasVid ? (vid.duration ? vid.currentTime / vid.duration : 0) : Math.min(1, (Date.now() - t0) / dur);
    bar.style.transform = "scaleX(" + ((cur + p) / steps.length).toFixed(4) + ")";
    if (playing) raf = requestAnimationFrame(tick);
  }

  function stop() {
    playing = false; clearTimeout(timer);
    if (hasVid) vid.pause();
    play.textContent = L.play; play.setAttribute("aria-label", L.playAria);
    tour.classList.remove("playing");
  }

  function start() {
    playing = true;
    play.textContent = L.pause; play.setAttribute("aria-label", L.pause);
    tour.classList.add("playing");
    show(cur === steps.length - 1 ? 0 : cur, true);
  }

  if (hasVid) {
    vid.addEventListener("ended", function () { if (playing) advance() });
    // a clip that will not load: the step falls back to the script's time
    vid.addEventListener("error", function () { if (playing) { clearTimeout(timer); timer = setTimeout(advance, dur) } });
  }
  play.addEventListener("click", function () { if (playing) stop(); else start() });
  // previous and next keep playing if the demo was playing: skipping is part of watching
  $("tourPrev").addEventListener("click", function () { show(cur - 1, playing) });
  $("tourNext").addEventListener("click", function () { show(cur + 1, playing) });
  chaps.forEach(function (b) { b.addEventListener("click", function () { show(+b.getAttribute("data-chap"), playing) }) });
  subsBtn.setAttribute("aria-pressed", subsOn ? "true" : "false");
  subsBtn.addEventListener("click", function () {
    subsOn = !subsOn; subsBtn.setAttribute("aria-pressed", subsOn ? "true" : "false"); sub.hidden = !subsOn;
  });
  soundBtn.addEventListener("click", function () {
    vid.muted = !vid.muted; soundBtn.setAttribute("aria-pressed", vid.muted ? "false" : "true");
  });
  tour.addEventListener("keydown", function (e) {
    if (e.target.tagName === "BUTTON" && (e.key === " " || e.key === "Enter")) return;
    if (e.key === "ArrowRight") { show(cur + 1, playing); e.preventDefault() }
    if (e.key === "ArrowLeft") { show(cur - 1, playing); e.preventDefault() }
  });
  // a hidden tab stops the tour, so nobody comes back to step 9 of 12
  document.addEventListener("visibilitychange", function () { if (document.hidden && playing) stop() });

  show(0);
})();
