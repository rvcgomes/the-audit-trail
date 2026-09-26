/* ================= BOARD FIGHT: game rules (no DOM) =================
   Hold to charge, release to strike. Releasing inside the marked zone
   is a clean hit (3 damage); anything above 35% is a normal hit (1);
   past 115% the charge backfires. When the boss winds up (the "!"),
   let go: an attack that lands while you are charging costs two months
   of runway, one that lands while you are not charging is blocked.
   Sometimes a second attack follows straight after the first.
   After a strike you need a moment before charging again.
   Each round has 16 seconds; running out of time costs two months. */
var Fight = (function(){
  var BOSSES = [
    {name:"THE BURN", line:"€150k a month. Hit it before it hits you.", hp:9, zone:[58,84], rate:70, every:[1.0,2.0], windup:0.7},
    {name:"THE DOLLAR", line:"A third of revenue moves with the euro.", hp:10, zone:[64,84], rate:80, every:[0.9,1.8], windup:0.6},
    {name:"THE POACHER", line:"Your best engineer just got an offer.", hp:12, zone:[70,86], rate:90, every:[0.85,1.7], windup:0.55},
    {name:"THE BOARD", line:"They want the model, the data room and a reason.", hp:15, zone:[76,88], rate:100, every:[0.8,1.6], windup:0.5}
  ];
  var RUNWAY = 8, ROUND_TIME = 16, MIN_HIT = 35, BACKFIRE = 115, INTRO = 1.8, CLEAR = 1.4, CLEAN = 3, COOL = 0.7;

  function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function between(r, a){return a[0] + r()*(a[1]-a[0])}

  function create(seed){
    var s = {round:0, runway:RUNWAY, power:0, charging:false, prevDown:false, cool:0,
      phase:"intro", wait:INTRO, winding:false, wind:0, next:0, roundT:0,
      clean:0, hits:0, taken:0, over:null, won:false, events:[],
      rnd:rng(seed == null ? (Math.random()*1e9)|0 : seed)};
    load(s); return s;
  }
  function load(s){
    var b = BOSSES[s.round];
    s.boss = {name:b.name, line:b.line, hp:b.hp, max:b.hp, zone:b.zone, rate:b.rate, every:b.every, windup:b.windup};
    s.next = between(s.rnd, b.every); s.winding = false; s.roundT = 0; s.power = 0; s.charging = false;
    s.events.push({type:"round", text:b.name});
  }
  function ev(s, type, text){s.events.push({type:type, text:text||""})}
  function hurt(s, n, type, text){
    s.runway = Math.max(0, s.runway - n); s.taken += n; s.charging = false; s.power = 0; ev(s, type, text);
  }

  function step(s, dt, down){
    if(s.over || s.won) return s;
    var pressed = down && !s.prevDown, released = !down && s.prevDown;
    s.prevDown = down;

    if(s.phase === "intro"){ s.wait -= dt; if(s.wait <= 0) s.phase = "fight"; return s; }
    if(s.phase === "clear"){
      s.wait -= dt;
      if(s.wait <= 0){
        if(s.round >= BOSSES.length - 1){s.won = true; ev(s, "win"); return s}
        s.round++; load(s); s.phase = "intro"; s.wait = INTRO;
      }
      return s;
    }

    var b = s.boss;
    if(s.cool > 0) s.cool -= dt;
    if(pressed && s.cool <= 0){s.charging = true; s.power = 0}
    if(s.charging && down){
      s.power += b.rate*dt;
      if(s.power >= BACKFIRE) hurt(s, 1, "backfire", "OVERCHARGED −1 MONTH");
    }
    if(released && s.charging){
      var p = s.power, dmg = p >= b.zone[0] && p <= b.zone[1] ? CLEAN : p >= MIN_HIT ? 1 : 0;
      s.charging = false; s.power = 0; s.cool = COOL;
      if(dmg){b.hp = Math.max(0, b.hp - dmg); s.hits++; if(dmg === CLEAN) s.clean++; ev(s, dmg === CLEAN ? "clean" : "strike", dmg === CLEAN ? "CLEAN HIT" : "HIT")}
      else ev(s, "fizzle", "TOO EARLY");
    }

    /* the boss */
    if(!s.winding){
      s.next -= dt;
      if(s.next <= 0){s.winding = true; s.wind = b.windup; ev(s, "windup")}
    }else{
      s.wind -= dt;
      if(s.wind <= 0){
        s.winding = false; s.next = s.rnd() < 0.4 ? 0.15 + s.rnd()*0.25 : between(s.rnd, b.every);
        if(s.charging) hurt(s, 2, "hurt", "CAUGHT CHARGING −2 MONTHS");
        else ev(s, "guard", "BLOCKED");
      }
    }

    s.roundT += dt;
    if(s.roundT >= ROUND_TIME){s.roundT = 0; hurt(s, 2, "timeout", "QUARTER OVER −2 MONTHS")}

    if(b.hp <= 0){s.phase = "clear"; s.wait = CLEAR; ev(s, "ko", b.name + " DOWN")}
    else if(s.runway <= 0){s.over = "runway"}
    return s;
  }

  return {BOSSES:BOSSES, RUNWAY:RUNWAY, ROUND_TIME:ROUND_TIME, MIN_HIT:MIN_HIT, BACKFIRE:BACKFIRE, COOL:COOL, create:create, step:step};
})();
