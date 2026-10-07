"""Builds short.html, the shorter version of the page, from index.html.

index.html stays the full version. After any change to index.html:
    python tools/make_short.py          # writes short.html
    python tools/make_short.py --check  # fails if short.html is out of date (writes nothing)

What the short version changes:
  - the two PwC chapters become one (2013-2022), with the working paper and
    the EUR 500M card side by side
  - no interlude
  - less empty space between sections (a small screen-only style block; the
    rest of the styles come from the shared styles.css)
Every replacement must match exactly once; if index.html changed in a way this
script doesn't expect, it stops and says which piece it couldn't find.

The merged PwC chapter is written by hand below. If the two PwC chapters (c1, c2)
in index.html change, the script stops, so the short text can be updated too.
"""
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# fingerprint of c1 + c2 in index.html when the merged chapter below was last written
SOURCE_HASH = "3f96a924b52d9c84"

s = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read().replace("\r\n", "\n")


def stop(msg):
    raise SystemExit("make_short: " + msg)


def sub(a, b):
    global s
    n = s.count(a)
    if n != 1:
        stop("expected one match, found %d for:\n%s" % (n, a[:120]))
    s = s.replace(a, b)


def section(sid):
    m = re.search(r'<section class="chap wrap" id="%s">.*?\n</section>\n' % sid, s, re.S)
    if not m:
        stop("section #%s not found" % sid)
    return m.group(0)


def block(text, start):
    """The <div ...> starting with `start`, up to its matching </div>."""
    i = text.find(start)
    if i < 0:
        stop("block not found: " + start)
    depth = 0
    for m in re.finditer(r"<div\b|</div>", text[i:]):
        depth += 1 if m.group(0) == "<div" else -1
        if depth == 0:
            return text[i:i + m.end()]
    stop("block not closed: " + start)


URL = "https://rvcgomes.github.io/the-audit-trail/"
sub('<meta property="og:url" content="%s">' % URL, '<meta property="og:url" content="%sshort.html">' % URL)
sub('<link rel="canonical" href="%s">' % URL, '<link rel="canonical" href="%sshort.html">' % URL)

# --- less empty space (screen only, so print keeps its own spacing) ---
sub('<link rel="stylesheet" href="styles.css">\n', '''<link rel="stylesheet" href="styles.css">
<style>
/* short version: less empty space between sections */
@media screen{
  .hero{min-height:86svh}
  h2{max-width:22ch}
  .chap{padding-block:clamp(48px,8vh,88px)}
  .chap-head{margin-bottom:1.75rem}
  .award{padding-block:clamp(44px,7vh,80px)}
  .quest{padding-block:clamp(48px,8vh,88px)}
  .why{padding:clamp(48px,8vh,88px) 0}
  .close{padding-block:clamp(56px,9vh,100px) 48px}
}
.col-stack{display:grid;gap:22px;align-content:start}
.copy .role.next{margin-top:1.75rem}
</style>
''')

# --- one PwC chapter ---
c1, c2 = section("c1"), section("c2")
h = hashlib.sha256((c1 + c2).encode("utf-8")).hexdigest()[:16]
if h != SOURCE_HASH:
    stop("the PwC chapters (c1, c2) in index.html changed. Update the merged chapter in this script to match, "
         "then set SOURCE_HASH = \"%s\"." % h)
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

# --- no interlude ---
m = re.search(r'<section class="inter" aria-label="Interlude">.*?</section>\n\n', s, re.S)
if not m:
    stop("interlude not found")
s = s.replace(m.group(0), "")
sub('''  var bar=$("bar"), inter=$("inter");
  inter.innerHTML=inter.textContent.split(" ").map(function(w){return '<span class="w">'+w+'</span>'}).join(" ");
  var words=inter.querySelectorAll(".w");''', '''  var bar=$("bar");''')
sub('''    var r=inter.getBoundingClientRect(), vh=innerHeight;
    var k=Math.max(0,Math.min(1,(vh*0.85-r.top)/(r.height+vh*0.35))), n=Math.round(k*words.length);
    words.forEach(function(w,j){w.classList.toggle("lit",j<n)});
''', "")

out = os.path.join(ROOT, "short.html")
if "--check" in sys.argv:
    current = open(out, encoding="utf-8").read().replace("\r\n", "\n") if os.path.exists(out) else ""
    if current != s:
        stop("short.html is out of date: run python tools/make_short.py")
    print("short.html is up to date")
else:
    open(out, "w", encoding="utf-8", newline="\n").write(s)
    print("short.html written,", len(s.splitlines()), "lines")
