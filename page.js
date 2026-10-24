/* Page behaviour shared by every version (index, short, health, saude).
   Each page sets window.CONFIG in its <head> and its language in <html lang>.
   Everything here checks that the element exists, so a page can leave parts out. */
(function(){
  var C = window.CONFIG||{}, qs = new URLSearchParams(location.search);
  var co = (qs.get("co")||C.company||"").trim().slice(0,60);
  var why = (qs.get("why")||C.why||"").trim().slice(0,600);
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pt = document.documentElement.lang==="pt";
  var T = pt ? {hi:"Olá,", hey:function(c){return "Olá, "+c+","}, title:"Rui Gomes, para ", why:"Porquê a ", subject:"Contacto de "}
             : {hi:"Hi there,", hey:function(c){return "Hey "+c+","}, title:"Rui Gomes, for ", why:"Why ", subject:"Hello from "};
  function $(id){return document.getElementById(id)}

  /* personalisation (textContent only) */
  var coT = co.replace(/[\s.,;:!?]+$/,"");
  document.querySelectorAll("[data-co]").forEach(function(e){e.textContent=co});
  if(co){
    if($("toLine")) $("toLine").hidden=false;
    if($("disclaim")) $("disclaim").hidden=false;
    document.title=T.title+coT;
    if($("whyLabel")) $("whyLabel").textContent=T.why+coT;
    if($("whyTitle")) $("whyTitle").textContent=T.why+coT;
  }
  if(why && $("whyText")) $("whyText").textContent=why;

  /* links */
  var cta=$("cta");
  document.querySelectorAll('[data-link="email"]').forEach(function(a){if(C.email){a.href="mailto:"+C.email;a.textContent=C.email}else a.hidden=true});
  /* "book a call": the calendar link when there is one, otherwise an email */
  document.querySelectorAll('[data-link="mail"]').forEach(function(a){
    if(C.booking){a.href=C.booking; a.target="_blank"; a.rel="noopener"}
    else if(C.email) a.href="mailto:"+C.email+(co?"?subject="+encodeURIComponent(T.subject+coT):"");
    else a.hidden=true;
  });
  if(cta && C.booking){cta.href=C.booking; cta.target="_blank"; cta.rel="noopener"}
  else if(cta){ if(C.email) cta.href="mailto:"+C.email+(co?"?subject="+encodeURIComponent(T.subject+coT):""); else cta.hidden=true }
  document.querySelectorAll('[data-link="linkedin"]').forEach(function(a){if(C.linkedin)a.href=C.linkedin});
  document.querySelectorAll('[data-link="vclevel"]').forEach(function(a){if(C.vclevel)a.href=C.vclevel});
  document.querySelectorAll('[data-link="cv"]').forEach(function(a){if(C.cv){a.href=C.cv}else a.hidden=true});

  /* typed greeting */
  var hero=$("hero"), typed=$("typed"), greet=co?T.hey(coT):T.hi;
  if(hero && typed){
    if(greet.length>18) document.querySelector(".hi").classList.add("long");
    $("greetSr").textContent=greet;
    var finishType=function(){typed.classList.add("done");hero.classList.add("shown")};
    if(reduce){typed.textContent=greet;finishType()}
    else{
      /* typing never takes more than about a second, and the rest of the hero doesn't wait for it */
      var step=Math.min(110,1000/greet.length);
      typed.textContent="";var i=0;setTimeout(function t(){typed.textContent=greet.slice(0,++i);if(i<greet.length)setTimeout(t,step*(0.7+Math.random()*0.6));else setTimeout(finishType,200)},300);
      setTimeout(function(){hero.classList.add("shown")},700);
    }
  }

  /* progress + word highlight (the interlude is only in the full version) */
  var bar=$("bar"), inter=$("inter"), words=[];
  if(inter){
    inter.innerHTML=inter.textContent.split(" ").map(function(w){return '<span class="w">'+w+'</span>'}).join(" ");
    words=inter.querySelectorAll(".w");
  }
  function onScroll(){
    var h=document.documentElement, p=h.scrollTop/(h.scrollHeight-h.clientHeight||1);
    if(bar) bar.style.transform="scaleX("+p+")";
    if(!inter) return;
    var r=inter.getBoundingClientRect(), vh=innerHeight;
    var k=Math.max(0,Math.min(1,(vh*0.85-r.top)/(r.height+vh*0.35))), n=Math.round(k*words.length);
    words.forEach(function(w,j){w.classList.toggle("lit",j<n)});
  }
  addEventListener("scroll",onScroll,{passive:true});

  /* sources: native popovers; older browsers get the same by hand */
  if(!HTMLElement.prototype.hasOwnProperty("popover")){
    var opener=null;
    var closeAll=function(){
      var was=document.querySelector(".src.open");
      document.querySelectorAll(".src.open").forEach(function(x){x.classList.remove("open")});
      if(was&&opener){opener.focus();opener=null}
    };
    document.querySelectorAll("[popovertarget]").forEach(function(b){
      b.addEventListener("click",function(e){
        e.stopPropagation(); var t=$(b.getAttribute("popovertarget")), on=!t.classList.contains("open");
        closeAll();
        if(on && b.getAttribute("popovertargetaction")!=="hide"){t.classList.add("open"); opener=b; t.focus()}
      });
    });
    document.addEventListener("click",function(e){if(!e.target.closest(".src")) closeAll()});
    document.addEventListener("keydown",function(e){if(e.key==="Escape") closeAll()});
  }

  document.querySelectorAll("#ledger td.t span").forEach(function(s,k){s.style.transitionDelay=(0.3+k*0.25)+"s"});
  document.querySelectorAll("#chart .cash.draw").forEach(function(p){p.style.setProperty("--len",Math.ceil(p.getTotalLength()))});

  /* reveal on scroll; a browser without IntersectionObserver shows everything at once */
  if(window.IntersectionObserver){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){
      if(!e.isIntersecting)return; var el=e.target; el.classList.add("in"); io.unobserve(el);
    })},{threshold:.2,rootMargin:"0px 0px -8% 0px"});
    document.querySelectorAll(".rev,#ledger,#chart").forEach(function(el){io.observe(el)});
  }else document.querySelectorAll(".rev,#ledger,#chart").forEach(function(el){el.classList.add("in")});
  addEventListener("beforeprint",function(){document.querySelectorAll(".rev,#ledger,#chart").forEach(function(el){el.classList.add("in")})});
  onScroll();

  /* sector tabs */
  var tabs=[].slice.call(document.querySelectorAll('#sectors [role="tab"]'));
  function select(tab,focus){
    tabs.forEach(function(t){var on=t===tab;t.setAttribute("aria-selected",on);t.tabIndex=on?0:-1;$(t.getAttribute("aria-controls")).hidden=!on});
    if(focus)tab.focus();
  }
  tabs.forEach(function(t,i){
    t.addEventListener("click",function(){select(t)});
    t.addEventListener("keydown",function(e){
      var j=e.key==="ArrowRight"?i+1:e.key==="ArrowLeft"?i-1:e.key==="Home"?0:e.key==="End"?tabs.length-1:null;
      if(j===null)return; e.preventDefault(); select(tabs[(j+tabs.length)%tabs.length],true);
    });
  });
  if(tabs.length) select(tabs[0]);
})();
