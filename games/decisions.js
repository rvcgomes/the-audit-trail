/* ================= DECISIONS: game rules (no DOM) =================
   Money in €k. A quarter burns 3 × (cost − revenue).
   The raise in Q3 depends on preparation and traction.
   Losing: cash runs out, or team trust drops below WALKOUT. */
var Decisions = (function(){
  var START = {cash:1200, cost:190, rev:40, trust:55, ready:0};
  var WALKOUT = 20, SEED = 3000, SMALL = 1500;
  var EARLY = [
    {q:"Month-end close takes three weeks. The board wants numbers by day five.", o:[
      {t:"Automate the close", fx:{cash:-30, ready:1}, r:"Two rough months. Then the close takes eight days."},
      {t:"Leave it, keep selling", fx:{rev:6}, r:"More deals. Board packs still late."}]},
    {q:"Marketing wants to double spend next quarter.", o:[
      {t:"Only where payback is under a year", fx:{cost:10, rev:8}, r:"Slower growth, but every euro comes back."},
      {t:"Approve all of it", fx:{cost:35, rev:18, trust:5}, r:"Growth jumps. So does burn."}]},
    {q:"Fundraising in six months. There's no data room.", o:[
      {t:"Build it now", fx:{ready:1, trust:-5}, r:"Every contract and KPI in one place. The team hated the document chase."},
      {t:"Ship the release first", fx:{rev:5}, r:"The release lands. The data room doesn't exist."}]},
    {q:"Your biggest client will renew, bigger, on 90-day payment terms.", o:[
      {t:"Accept the terms", fx:{rev:8, cash:-200}, r:"Bigger contract. The cash arrives a quarter late."},
      {t:"Hold at 30 days", fx:{rev:-4}, r:"They renew, smaller. The cash is on time."}]},
    {q:"An investor wants a 36-month model before a first call.", o:[
      {t:"Build it properly", fx:{ready:1, cash:-5}, r:"Model done. You know your burn to the euro."},
      {t:"Send the budget, close a deal instead", fx:{rev:4}, r:"Polite reply from the investor. The deal signs."}]}
  ];
  var LATE = [
    {q:"Your best engineer has an offer 30% higher.", o:[
      {t:"Salary bands for everyone", fx:{cost:8, trust:20}, r:"Pay is visible and fair. Nobody leaves."},
      {t:"Counter-offer her quietly", fx:{cost:3, trust:-25}, r:"She stays. Three others find out."}]},
    {q:"A third of revenue is in USD and the euro is moving.", o:[
      {t:"Hedge and set an FX policy", fx:{cash:-15}, r:"The swing barely touches you."},
      {t:"Let it ride", luck:{p:.5,
        win:{fx:{cash:40}, r:"Lucky this time: +€40k."},
        lose:{fx:{cash:-150}, r:"The dollar drops. €150k gone."}}}]},
    {q:"A supplier offers 60-day terms for a 3% price rise.", o:[
      {t:"Take the 60 days", fx:{cash:70, cost:3}, r:"Cash freed up now. Costs a little more every month."},
      {t:"Pay on time, ask for a discount", fx:{cost:-4}, r:"Cheaper, and the cash leaves on schedule."}]},
    {q:"The hiring plan says five people this quarter.", o:[
      {t:"Hire two, three on milestones", fx:{cost:16, rev:4, trust:-5}, r:"The runway is safe. The team is stretched thin."},
      {t:"Hire all five now", fx:{cost:42, rev:26, cash:-40, trust:10}, r:"Energy is high. So is payroll."}]},
    {q:"Two launches in a row. The team is running on fumes.", o:[
      {t:"Four-day weeks for the summer", fx:{rev:-3, trust:15}, r:"Output dips. People come back rested."},
      {t:"Push through the quarter", fx:{rev:4, trust:-30}, r:"Targets hit. Two resignations on your desk."}]}
  ];
  function clone(o){var c={};for(var k in o)c[k]=o[k];return c}
  function shuffle(a,rnd){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
  function apply(s,fx){for(var k in fx)s[k]+=fx[k];s.trust=Math.max(0,Math.min(100,s.trust))}
  function net(s){return s.cost-s.rev}
  function newGame(rnd){
    var s=clone(START);s.m=0;s.q=0;s.over=null;s.raised=0;
    s.deck=shuffle(EARLY,rnd).slice(0,2).concat(["raise"]).concat(shuffle(LATE,rnd).slice(0,3));
    return s;
  }
  function choose(s,opt,rnd){
    if(opt.luck){var out=rnd()<opt.luck.p?opt.luck.win:opt.luck.lose;apply(s,out.fx);return out.r}
    apply(s,opt.fx);return opt.r;
  }
  function raise(s){
    var traction=Math.max(0,Math.floor((s.rev-START.rev)/12)), score=s.ready+traction;
    if(score>=2){s.cash+=SEED;s.raised=SEED;return "Seed closed: €3M.\nThe numbers did the talking."}
    if(score===1){s.cash+=SMALL;s.raised=SMALL;return "Investors want more proof.\nA smaller round: €1.5M."}
    return "No term sheet.\nThere wasn't enough to believe in yet.";
  }
  function quarter(s){
    var n=net(s);
    if(n>0&&s.cash<3*n){s.m+=Math.floor(Math.max(0,s.cash)/n);s.cash=0;s.over="cash";return false}
    s.cash-=3*n;s.m+=3;s.q++;
    if(s.trust<WALKOUT){s.over="trust";return false}
    return true;
  }
  function runway(s){var n=net(s);return n<=0?Infinity:s.cash/n}
  return {START:START,EARLY:EARLY,LATE:LATE,WALKOUT:WALKOUT,newGame:newGame,choose:choose,raise:raise,quarter:quarter,runway:runway,net:net,shuffle:shuffle};
})();
