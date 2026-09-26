/* ================= RUNWAY music: original chiptune, synthesised =================
   Square lead, triangle bass, noise drums. No audio files.
   setTension(0..1) speeds the loop up; above 0.6 a major theme drops its
   third and sixth into minor, and above 0.75 a heartbeat kick joins in. */
var Music = (function(){
  var ac = null, out = null, noise = null, timer = 0, cur = null, curId = "", step = 0, nextT = 0, tension = 0;

  /* 16th-note steps; "." is a rest */
  var THEMES = {
    menu:{bpm:112, key:0,
      lead:"E5 . G5 . C6 . G5 . A5 . G5 . E5 . D5 . C5 . D5 . E5 . G5 . E5 . D5 . C5 . . . G4 .",
      bass:"C3 . . . C3 . . . A2 . . . A2 . . . F2 . . . F2 . . . G2 . . . G2 . . .",
      drum:"k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h ."},
    runner:{bpm:140, key:2,
      lead:"D5 . F#5 A5 . F#5 D5 . E5 . G5 B5 . G5 E5 . F#5 . A5 D6 . A5 F#5 . E5 . C#5 E5 A4 . . .",
      bass:"D3 . D3 . D3 . D3 . E3 . E3 . E3 . E3 . F#3 . F#3 . F#3 . F#3 . A2 . A2 . A2 . A2 .",
      drum:"k . h k s . h . k . h k s . h h k . h k s . h . k . h k s s s s"},
    fight:{bpm:150, key:4, minor:true,
      lead:"E5 . E5 G5 . E5 B5 . A5 . G5 . F#5 . D5 . E5 . E5 G5 . E5 B5 . D6 . B5 . A5 . F#5 .",
      bass:"E2 E3 E2 E3 E2 E3 E2 E3 C3 C4 C3 C4 D3 D4 D3 D4 E2 E3 E2 E3 E2 E3 E2 E3 C3 C4 C3 C4 B2 B3 B2 B3",
      drum:"k . h . s . h k k . h . s . h . k . h . s . h k k . h . s s h s"},
    maze:{bpm:128, key:7,
      lead:"G5 . B5 . D6 . B5 . C6 . A5 . F#5 . A5 . G5 . D5 . G5 . B5 . A5 . F#5 . D5 . . .",
      bass:"G2 . D3 . G2 . D3 . C3 . G3 . D3 . A3 . G2 . D3 . G2 . D3 . D3 . A2 . D3 . . .",
      drum:"k . h . s . h . k . h . s . h . k . h . s . h . k k h . s . h ."},
    blocks:{bpm:132, key:5,
      lead:"A5 . F5 . C5 . F5 . G5 . E5 . C5 . E5 . F5 . A5 . C6 . A5 . G5 . E5 . G5 . . .",
      bass:"F2 . C3 . F2 . C3 . C3 . G3 . C3 . G3 . D3 . A3 . D3 . A3 . C3 . G2 . C3 . . .",
      drum:"k . h . s . h . k . h . s . h . k . h . s . h . k . h . s h s h"},
    spot:{bpm:120, key:2, minor:true,
      lead:"D5 . . F5 . . A5 . G5 . . F5 . . E5 . D5 . . F5 . . A5 . C6 . . A5 . . G5 .",
      bass:"D3 . D3 . D3 . D3 . A2 . A2 . A2 . A2 . Bb2 . Bb2 . Bb2 . Bb2 . A2 . A2 . A2 . A2 .",
      drum:"k . . h s . . h k . . h s . h h k . . h s . . h k . . h s . h ."},
    lanes:{bpm:144, key:0,
      lead:"C5 E5 G5 . E5 . G5 . A5 G5 E5 . D5 . . . C5 E5 G5 . E5 . G5 . C6 . B5 . G5 . . .",
      bass:"C3 . G2 . C3 . G2 . F2 . C3 . G2 . D3 . C3 . G2 . C3 . G2 . F2 . G2 . C3 . . .",
      drum:"k . h . s . h . k . h . s . h . k . h . s . h . k . h . s . s s"},
    decisions:{bpm:96, key:9, minor:true,
      lead:"A4 . . . C5 . . . E5 . . . D5 . C5 . B4 . . . D5 . . . C5 . . . B4 . A4 .",
      bass:"A2 . . . . . . . F2 . . . . . . . G2 . . . . . . . E2 . . . . . . .",
      drum:"k . . . h . . . s . . . h . . . k . . . h . . . s . . . h . h ."}
  };
  var JINGLES = {
    win:{bpm:180, lead:"C5 E5 G5 C6 . G5 C6 . . .", bass:"C3 . . . . G2 C3 . . ."},
    lose:{bpm:100, lead:"G4 . F#4 . F4 . E4 . . . .", bass:"C3 . B2 . Bb2 . A2 . . . ."}
  };

  var NAMES = {C:0, "C#":1, Db:1, D:2, "D#":3, Eb:3, E:4, F:5, "F#":6, Gb:6, G:7, "G#":8, Ab:8, A:9, "A#":10, Bb:10, B:11};
  function midi(n){var m = /^([A-G][#b]?)(\d)$/.exec(n); return m ? NAMES[m[1]] + 12*(+m[2] + 1) : null}
  function hz(m){return 440*Math.pow(2, (m - 69)/12)}
  function parse(t){
    var o = {bpm:t.bpm, key:t.key || 0, minor:!!t.minor, lead:t.lead.split(" ").map(midi), bass:(t.bass || "").split(" ").map(midi), drum:(t.drum || "").split(" ")};
    o.len = o.lead.length; return o;
  }
  var cache = {};
  function theme(id){return cache[id] || (cache[id] = parse(THEMES[id] || THEMES.menu))}

  function voice(type, f, t, dur, vol){
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  function hit(kind, t, vol){
    if(kind === "k"){
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(vol || 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.16); return;
    }
    var src = ac.createBufferSource(), f = ac.createBiquadFilter(), g2 = ac.createGain(), d = kind === "s" ? 0.12 : 0.035;
    src.buffer = noise; f.type = "highpass"; f.frequency.value = kind === "s" ? 1200 : 6500;
    g2.gain.setValueAtTime(kind === "s" ? 0.45 : 0.22, t); g2.gain.exponentialRampToValueAtTime(0.001, t + d);
    src.connect(f); f.connect(g2); g2.connect(out); src.start(t); src.stop(t + d + 0.01);
  }
  function darken(m, th){
    if(m == null || th.minor || tension < 0.6) return m;
    var rel = ((m - th.key) % 12 + 12) % 12;
    return rel === 4 || rel === 9 ? m - 1 : m;
  }
  function stepDur(th){return 60/th.bpm/4/(1 + 0.3*tension)}
  function sched(){
    if(!ac || !cur) return;
    while(nextT < ac.currentTime + 0.12){
      var i = step % cur.len, d = stepDur(cur), l = darken(cur.lead[i], cur), b = cur.bass[i], k = cur.drum[i];
      if(l != null) voice("square", hz(l), nextT, d*1.6, 0.16);
      if(b != null) voice("triangle", hz(b), nextT, d*1.9, 0.4);
      if(k === "k" || k === "s" || k === "h") hit(k, nextT);
      if(tension > 0.75 && i % 4 === 0 && k !== "k") hit("k", nextT, 0.5);
      nextT += d; step++;
    }
  }

  return {
    init:function(ctx){
      if(ac || !ctx) return; ac = ctx;
      out = ac.createGain(); out.gain.value = 0.09; out.connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate*0.2, ac.sampleRate);
      var data = noise.getChannelData(0); for(var i=0;i<data.length;i++) data[i] = Math.random()*2 - 1;
    },
    play:function(id){
      if(!ac) return;
      if(timer && curId === id) return;
      cur = theme(id); curId = id; step = 0; tension = 0; nextT = ac.currentTime + 0.05;
      if(!timer) timer = setInterval(sched, 25);
    },
    stop:function(){clearInterval(timer); timer = 0; curId = ""},
    setTension:function(t){tension = Math.max(0, Math.min(1, +t || 0))},
    jingle:function(name){
      if(!ac || !JINGLES[name]) return;
      this.stop();
      var j = parse(JINGLES[name]), t = ac.currentTime + 0.05, d = 60/j.bpm/4;
      for(var i=0;i<j.len;i++){
        if(j.lead[i] != null) voice("square", hz(j.lead[i]), t + i*d, d*1.8, 0.2);
        if(j.bass[i] != null) voice("triangle", hz(j.bass[i]), t + i*d, d*2, 0.4);
      }
    },
    themes:Object.keys(THEMES)
  };
})();
