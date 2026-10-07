"""Builds short.html, the shorter version of the page, from index.html.

index.html stays the full version. Run this after any change to index.html:
    python tools/make_short.py
Every replacement must match exactly once; if index.html changed in a way this
script doesn't expect, it stops and says which piece it couldn't find.

What the short version changes:
  - the two PwC chapters become one (2013-2022), with the working paper and
    the EUR 500M card side by side
  - no interlude
  - less empty space between sections
(The sources behind the circled letters are popovers in index.html, so the
short version gets them as they are.)
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()


def sub(a, b):
    global s
    n = s.count(a)
    if n != 1:
        raise SystemExit("make_short: expected one match, found %d for:\n%s" % (n, a[:120]))
    s = s.replace(a, b)


def section(sid):
    m = re.search(r'<section class="chap wrap" id="%s">.*?\n</section>\n' % sid, s, re.S)
    if not m:
        raise SystemExit("make_short: section #%s not found" % sid)
    return m.group(0)


def block(text, start):
    """The <div ...> starting with `start`, up to its matching </div>."""
    i = text.index(start)
    depth, j = 0, i
    for m in re.finditer(r"<div\b|</div>", text[i:]):
        depth += 1 if m.group(0) == "<div" else -1
        if depth == 0:
            j = i + m.end()
            break
    return text[i:j]


URL = "https://rvcgomes.github.io/the-audit-trail/"
sub('<meta property="og:url" content="%s">' % URL, '<meta property="og:url" content="%sshort.html">' % URL)
sub('<link rel="canonical" href="%s">' % URL, '<link rel="canonical" href="%sshort.html">' % URL)

# --- less empty space ---
sub(".hero{min-height:100svh;", ".hero{min-height:86svh;")
sub("margin:0;max-width:16ch}", "margin:0;max-width:22ch}")
sub(".chap{padding-block:clamp(80px,14vh,140px);", ".chap{padding-block:clamp(48px,8vh,88px);")
sub(".chap-head{display:grid;gap:.4rem;margin-bottom:2.5rem}", ".chap-head{display:grid;gap:.4rem;margin-bottom:1.75rem}")
sub(".award{padding-block:clamp(70px,12vh,120px);", ".award{padding-block:clamp(44px,7vh,80px);")
sub(".quest{padding-block:clamp(80px,14vh,140px);", ".quest{padding-block:clamp(48px,8vh,88px);")
sub(".why{padding:clamp(80px,14vh,140px) 0;", ".why{padding:clamp(48px,8vh,88px) 0;")
sub(".close{padding-block:clamp(90px,16vh,160px) 60px;", ".close{padding-block:clamp(56px,9vh,100px) 48px;")

# --- one PwC chapter ---
c1, c2 = section("c1"), section("c2")
ledger = block(c1, '<div class="ledger rev" id="ledger"')
bign = block(c2, '<div class="bign rev" id="bign"')
merged = '''<section class="chap wrap" id="c1">
  <div class="chap-head rev">
    <span class="when"><b>2013 – 2022</b>, Lisbon and Porto</span>
    <h2>Audit first, then the cases without a template</h2>
  </div>
  <div class="split">
    <div class="copy rev">
      <p class="role">Financial audit at PwC, then Claranet and ITEN<button type="button" class="ref" popovertarget="src-A" aria-label="Source A">A</button></p>
      <p class="where">2013–2017 · banks, insurers and venture capital funds</p>
      <p>At PwC I audited some of the most regulated balance sheets there are, under IFRS. It gave me the habit I still work by: before you trust a number, find out where it came from. At Claranet and ITEN I moved into operational finance, reporting and change management.</p>
      <p class="role next">Associate Manager, Capital Markets &amp; Accounting Advisory, PwC</p>
      <p class="where">2018–2022 · a task force serving the whole of PwC Portugal</p>
      <p>The analyses nobody in the firm had a precedent for yet: IFRS accounting for transactions, cost of capital studies, prospectus and deal documentation, valuation and impairment models, and due diligence on hedge fund investments.</p>
      <ul class="stack"><li>IFRS audit</li><li>IFRS 3 / 9 / 15 / 16</li><li>Valuation</li><li>Due diligence</li></ul>
    </div>
    <div class="col-stack">
      %s
      %s
    </div>
  </div>
</section>
''' % (ledger.replace("\n", "\n  "), bign.replace("\n", "\n  "))
sub(c1 + "\n" + c2, merged)
sub("/* evidence refs: ", ".col-stack{display:grid;gap:22px;align-content:start}\n.copy .role.next{margin-top:1.75rem}\n\n/* evidence refs: ")

# --- no interlude ---
m = re.search(r'<section class="inter" aria-label="Interlude">.*?</section>\n\n', s, re.S)
if not m:
    raise SystemExit("make_short: interlude not found")
s = s.replace(m.group(0), "")
sub('''  var bar=$("bar"), inter=$("inter");
  inter.innerHTML=inter.textContent.split(" ").map(function(w){return '<span class="w">'+w+'</span>'}).join(" ");
  var words=inter.querySelectorAll(".w");''', '''  var bar=$("bar");''')
sub('''    var r=inter.getBoundingClientRect(), vh=innerHeight;
    var k=Math.max(0,Math.min(1,(vh*0.85-r.top)/(r.height+vh*0.35))), n=Math.round(k*words.length);
    words.forEach(function(w,j){w.classList.toggle("lit",j<n)});
''', "")

out = os.path.join(ROOT, "short.html")
open(out, "w", encoding="utf-8", newline="\n").write(s)
print("short.html written,", len(s.splitlines()), "lines")
