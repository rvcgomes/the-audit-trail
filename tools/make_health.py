"""Builds the two health-practice pages from one template:
    health.html  (English)
    saude.html   (Portuguese, PT-PT)

    python tools/make_health.py          # writes both
    python tools/make_health.py --check  # fails if either is out of date (writes nothing)

The page is for clinic and practice owners (VCLevel work), not for recruiters:
no games, no CV, and the main button books a call.
The English case texts are copied from the health cases in index.html, so the two
never disagree; the Portuguese ones are written below. If a health case in
index.html changes, the script stops, so the Portuguese text can be updated too.
Run it after changing index.html, this script or the page structure.
"""
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://rvcgomes.github.io/the-audit-trail/"
CASES = ["therapy", "physio", "dental", "clinic"]
# fingerprint of the four health cases in index.html when the Portuguese texts were last written
CASES_HASH = "7311329ed1897881"

index = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read().replace("\r\n", "\n")


def stop(msg):
    raise SystemExit("make_health: " + msg)


def panel(cid):
    m = re.search(r'      <div class="wp" role="tabpanel" id="p-%s".*?\n      </div>\n' % cid, index, re.S)
    if not m:
        stop("case p-%s not found in index.html" % cid)
    return m.group(0)


def tab(cid):
    m = re.search(r'        <button role="tab" id="t-%s".*?</button>\n' % cid, index)
    if not m:
        stop("tab t-%s not found in index.html" % cid)
    return m.group(0)


en_panels = [panel(c) for c in CASES]
h = hashlib.sha256("".join(en_panels).encode("utf-8")).hexdigest()[:16]
if h != CASES_HASH:
    stop("the health cases in index.html changed. Update the Portuguese cases in this script to match, "
         "then set CASES_HASH = \"%s\"." % h)

EN_TABS = "".join(tab(c) for c in CASES)
EN_PANELS = "".join(p.replace(" of 7</span>", " of 4</span>") for p in en_panels)


def pt_case(i, cid, sector, q, b, note):
    return '''      <div class="wp" role="tabpanel" id="p-%s" aria-labelledby="t-%s">
        <h3><span>%s</span><span>Caso %d de 4</span></h3>
        <p class="k">A pergunta em cima da mesa</p>
        <p class="q">%s</p>
        <p class="k">O que os números mostraram</p>
        <p class="b">%s</p>
        <p class="note">%s</p>
      </div>
''' % (cid, cid, sector, i, q, b, note)


PT_TABS = '''        <button role="tab" id="t-therapy" aria-controls="p-therapy" aria-selected="true">Psicologia</button>
        <button role="tab" id="t-physio" aria-controls="p-physio" aria-selected="false" tabindex="-1">Fisioterapia</button>
        <button role="tab" id="t-dental" aria-controls="p-dental" aria-selected="false" tabindex="-1">Dentária</button>
        <button role="tab" id="t-clinic" aria-controls="p-clinic" aria-selected="false" tabindex="-1">Clínica médica</button>
'''
PT_PANELS = "".join([
    pt_case(1, "therapy", "Psicologia", "“Precisamos de faturar mais.”",
            "O problema não era a faturação. Eram a ocupação da agenda e o preço por sessão. Começámos por um diagnóstico de desempenho, não por um esforço comercial.",
            "Primeiro, saber quanto vale uma hora."),
    pt_case(2, "physio", "Fisioterapia", "ENI ou sociedade, antes do primeiro utente?",
            "A resposta certa veio do plano a três anos, não do imposto poupado no primeiro ano.",
            "Escolha a estrutura a pensar no terceiro ano."),
    pt_case(3, "dental", "Medicina dentária", "Os nossos preços estão certos para os pacientes de acordos?",
            "Os preços partiam do princípio de que havia cerca de sete vezes mais pacientes de acordos do que a clínica tinha na realidade. As faltas eram uma segunda fuga na margem.",
            "Primeiro os dados, depois o preço."),
    pt_case(4, "clinic", "Clínica médica", "O que precisamos de saber antes de assinar o arrendamento?",
            "Dois números: onde está o ponto de equilíbrio e quantos meses aguenta até lá chegar. Fora das grandes cidades, juntam-se os incentivos ao interior e uma sociedade que possa receber sócios mais tarde.",
            "O arrendamento é a primeira grande decisão."),
])

ECO = "https://eco.sapo.pt/2024/02/06/weezie-fecha-ronda-de-3-milhoes-e-a-recrutar-para-dar-forca-a-entrada-na-america-do-sul/"
AWARD = "https://www.linkedin.com/feed/update/urn:li:activity:7328690408580972544/"
ISEG = "https://www.iseg.ulisboa.pt/en/?p=70573"

T = {
"en": dict(
    file="health.html", other="saude.html", lang="en", other_lang="pt", other_name="Versão em português",
    title="Rui Gomes — fractional CFO for clinics",
    desc="Rui Gomes, fractional CFO for clinics and health practices: a diagnosis of where the practice stands, then the tools to decide.",
    og_alt="Rui Gomes, fractional CFO for clinics and health practices.",
    from_="From", to="To",
    hi2='your practice&#8217;s numbers, <span class="ul">seen from the inside@@UL@@</span>',
    lede="I'm Rui, a fractional CFO: I do a finance director's job, part-time, for businesses that don't need a full-time one yet. I work with clinics and health practices. I start with a diagnosis of where the practice stands today, then build the tools you use to decide.",
    avail='<a data-link="mail" href="#contact">Book a call</a>, <a href="#cases">see the cases</a> or <a href="index.html">read my full trail</a>.',
    go="See the cases",
    card_label="Summary", card_h="Diagnosis · what I check first",
    card_roles="<span>Fractional CFO, VCLevel</span><span>CFO &amp; Head of HR, Weezie</span>",
    card_rows=["What an hour of the diary is worth", "Occupancy and no-shows", "Agreement patients against private ones",
               "Break-even, and the months to reach it", "Sole trader or a company"],
    card_foot="Psychology · Physio · Dental · Medical", card_btn="Book a call",
    cases_when="<b>Real cases</b>, with VCLevel", cases_h="The first question is rarely the one that matters",
    cases_p="Four practices I've worked with through VCLevel. Most of them had never had a finance person look at their numbers from the inside.",
    cases_stack="<li>Diagnosis</li><li>Pricing</li><li>Company structure</li><li>Break-even</li>",
    cases_also='Also wine producers, food and drink, and PR agencies: <a href="index.html#c4">on the full trail</a>.',
    tabs_label="Client cases", tabs=EN_TABS, panels=EN_PANELS,
    anon="Real cases, shared with the clients&#8217; permission: sector only, no names or places, and ratios rather than amounts.",
    how_when="<b>How I work</b>", how_h="An insider, working from the outside",
    steps=[("Diagnosis", "Where the practice stands today: what an hour of the diary is worth, occupancy and no-shows, agreement patients against private ones, and what each service costs."),
           ("Tools to decide", "Built for your practice: the pricing model, the break-even, the cash forecast, the monthly dashboard."),
           ("The decisions", "The price list, the lease, the company structure, the conversation with the bank. For these, I take the finance seat.")],
    md_aria="Example of a monthly dashboard for a practice: revenue, occupancy, no-shows and cash at the top; revenue by service; agreement and private patients. No client figures.",
    md_head="Monthly dashboard", md_view="Month view", md_kpis=["Revenue", "Occupancy", "No-shows", "Cash &amp; runway"],
    md_t1="Revenue by service", md_bars=["Consults", "Treatments", "Assessments", "Other"],
    md_t2="Agreement and private", md_legend=["Private", "Agreements", "Insurers"],
    md_cap="An example of the monthly view, without any client&#8217;s figures.",
    path_when="<b>Where the method comes from</b>", path_h="Audit first, then the CFO seat",
    edu="Master's in Finance, ISEG Lisbon",
    path_roles=[("2013 – 2022", "PwC: financial audit, then capital markets and accounting advisory, with Claranet and ITEN in between", "A"),
                ("2022 – now", "CFO &amp; Head of HR, Weezie, venture-backed software for fibre-network operators", ""),
                ("Alongside", "Founding partner, VCLevel", "D")],
    path_p="At PwC I learnt to ask where a number comes from before trusting it. At Weezie the numbers are mine: the budget, the cash, the funding round, the pay bands. With clinics I do the same job, from the outside.",
    facts_h="Track record", facts=[("€3M", "seed round, 2024", "B"), ("2025", "Transparency in Compensation Award", "C")],
    fit_when="<b>Where I can help</b>", fit_h="Before the next big decision",
    fit_lead="The work is most useful before a decision that is hard to undo: a price list, a lease, a company.",
    fit_h3="You'll probably want to talk to me if",
    fit=["You've never worked out what an hour of the diary is worth", "You're not sure your prices for agreement patients still pay",
         "No-shows worry you, but nobody has put a number on them", "You're about to sign the lease for a new practice",
         "You're choosing between sole trader and a company"],
    close_h="Tell me the question on your table", close_sub="Portuguese, English and Italian. Based in the north of Portugal, open to remote.",
    cta="Book a call", full="My full trail",
    ai="I built this page with AI, the same way I now build most client models: the tool writes the first draft, and I check every number. Each circled letter shows where a number comes from.",
    src_h="Sources", src="Source", close_x="Close",
    srcs=[("A", "Roles and dates, 2013 to now", '<a data-link="linkedin" href="https://www.linkedin.com/in/ruimcgomes/" rel="noopener" target="_blank">LinkedIn profile</a>'),
          ("B", "€3M seed round in 2024", '€3M round led by GED Ventures Portugal, February 2024: <a href="%s" rel="noopener" target="_blank">ECO, 6 Feb 2024</a>.' % ECO),
          ("C", "Transparency in Compensation Award, 2025", 'Coverflex Compensation Awards 2025 (Prémios da Compensação), small-company category: <a href="%s" rel="noopener" target="_blank">Weezie on LinkedIn, May 2025</a>.' % AWARD),
          ("D", "Founding partner, VCLevel", '<a data-link="vclevel" href="https://vclevel.pt" rel="noopener" target="_blank">vclevel.pt</a>'),
          ("E", "Master's in Finance, ISEG Lisbon, 2013", 'ISEG&#8217;s Master&#8217;s in Finance is 33rd worldwide and top 3 in Portugal in the Financial Times Masters in Finance ranking 2026 (pre-experience), where it has been ranked since 2020: <a href="%s" rel="noopener" target="_blank">ISEG</a>.' % ISEG)],
    disclaim="A personal introduction, not affiliated with",
),
"pt": dict(
    file="saude.html", other="health.html", lang="pt", other_lang="en", other_name="English version",
    title="Rui Gomes — CFO para clínicas",
    desc="Rui Gomes, CFO a tempo parcial para clínicas e consultórios: um diagnóstico de onde a clínica está hoje e, depois, as ferramentas para decidir.",
    og_alt="Rui Gomes, CFO a tempo parcial para clínicas e consultórios.",
    from_="De", to="Para",
    hi2='os números da sua clínica, <span class="ul">vistos por dentro@@UL@@</span>',
    lede="Sou o Rui e sou CFO fracionado: faço o trabalho de diretor financeiro, a tempo parcial, em empresas que ainda não precisam de um a tempo inteiro. Trabalho com clínicas e consultórios. Começo por um diagnóstico de onde a clínica está hoje e depois construo as ferramentas com que decide.",
    avail='<a data-link="mail" href="#contact">Marcar uma conversa</a>, <a href="#cases">ver os casos</a> ou <a href="index.html" hreflang="en">ler o percurso completo</a> (em inglês).',
    go="Ver os casos",
    card_label="Resumo", card_h="Diagnóstico · o que vejo primeiro",
    card_roles="<span>CFO fracionado, VCLevel</span><span>CFO e Head of HR, Weezie</span>",
    card_rows=["Quanto vale uma hora da agenda", "Ocupação e faltas", "Pacientes de acordos e particulares",
               "Ponto de equilíbrio e meses até lá chegar", "ENI ou sociedade"],
    card_foot="Psicologia · Fisioterapia · Dentária · Medicina", card_btn="Marcar conversa",
    cases_when="<b>Casos reais</b>, com a VCLevel", cases_h="A primeira pergunta raramente é a que importa",
    cases_p="Quatro clínicas com que trabalhei através da VCLevel. A maioria nunca tinha tido alguém de finanças a olhar para os números por dentro.",
    cases_stack="<li>Diagnóstico</li><li>Preços</li><li>Estrutura da empresa</li><li>Ponto de equilíbrio</li>",
    cases_also='Também produtores de vinho, restauração e agências de comunicação: <a href="index.html#c4" hreflang="en">no percurso completo</a>.',
    tabs_label="Casos de clientes", tabs=PT_TABS, panels=PT_PANELS,
    anon="Casos reais, partilhados com autorização dos clientes: só o setor, sem nomes nem locais, e rácios em vez de valores.",
    how_when="<b>Como trabalho</b>", how_h="Alguém de dentro, a trabalhar de fora",
    steps=[("Diagnóstico", "Onde a clínica está hoje: quanto vale uma hora da agenda, a ocupação e as faltas, os pacientes de acordos face aos particulares, e quanto custa cada serviço."),
           ("Ferramentas para decidir", "Feitas para a sua clínica: o modelo de preços, o ponto de equilíbrio, a previsão de tesouraria, o painel mensal."),
           ("As decisões", "A tabela de preços, o arrendamento, a estrutura da empresa, a conversa com o banco. Nestas decisões, ocupo o lugar do diretor financeiro.")],
    md_aria="Exemplo de um painel mensal para uma clínica: faturação, ocupação, faltas e tesouraria no topo; faturação por serviço; pacientes de acordos e particulares. Sem números de clientes.",
    md_head="Painel mensal", md_view="Vista do mês", md_kpis=["Faturação", "Ocupação", "Faltas", "Tesouraria"],
    md_t1="Faturação por serviço", md_bars=["Consultas", "Tratamentos", "Avaliações", "Outros"],
    md_t2="Acordos e particulares", md_legend=["Particulares", "Acordos", "Seguradoras"],
    md_cap="Um exemplo da vista mensal, sem números de nenhum cliente.",
    path_when="<b>De onde vem o método</b>", path_h="Primeiro a auditoria, depois a cadeira de CFO",
    edu="Mestrado em Finanças, ISEG",
    path_roles=[("2013 – 2022", "PwC: auditoria financeira e, depois, assessoria em mercados de capitais e contabilidade, com a Claranet e a ITEN pelo meio", "A"),
                ("2022 – hoje", "CFO e Head of HR na Weezie, software para operadores de redes de fibra, com capital de risco", ""),
                ("Em paralelo", "Sócio fundador da VCLevel", "D")],
    path_p="Na PwC aprendi a perguntar de onde vem um número antes de confiar nele. Na Weezie os números são meus: o orçamento, a tesouraria, a ronda de investimento, as tabelas salariais. Nas clínicas faço o mesmo trabalho, de fora.",
    facts_h="Resultados", facts=[("€3M", "ronda seed, 2024", "B"), ("2025", "Prémio de transparência na compensação", "C")],
    fit_when="<b>Onde posso ajudar</b>", fit_h="Antes da próxima grande decisão",
    fit_lead="O trabalho é mais útil antes de uma decisão difícil de desfazer: uma tabela de preços, um arrendamento, uma empresa.",
    fit_h3="Provavelmente vai querer falar comigo se",
    fit=["Nunca fez as contas a quanto vale uma hora da agenda", "Não tem a certeza de que os preços dos acordos ainda compensam",
         "As faltas preocupam, mas ninguém as pôs em números", "Está prestes a assinar o arrendamento de um novo espaço",
         "Está a decidir entre ENI e sociedade"],
    close_h="Diga-me qual é a pergunta em cima da mesa", close_sub="Português, inglês e italiano. No norte de Portugal, também à distância.",
    cta="Marcar uma conversa", full="O percurso completo (EN)",
    ai="Fiz esta página com IA, da mesma forma que hoje faço a maior parte dos modelos para clientes: a ferramenta escreve o primeiro rascunho e eu confirmo cada número. Cada letra num círculo mostra de onde vem um número.",
    src_h="Fontes", src="Fonte", close_x="Fechar",
    srcs=[("A", "Cargos e datas, de 2013 até hoje", '<a data-link="linkedin" href="https://www.linkedin.com/in/ruimcgomes/" rel="noopener" target="_blank">Perfil no LinkedIn</a>'),
          ("B", "Ronda seed de €3M em 2024", 'Ronda de €3M liderada pela GED Ventures Portugal, fevereiro de 2024: <a href="%s" rel="noopener" target="_blank">ECO, 6.2.2024</a>.' % ECO),
          ("C", "Prémio «Líder em transparência na compensação», 2025", 'Prémios da Compensação 2025 (Coverflex), categoria Pequenas empresas: <a href="%s" rel="noopener" target="_blank">Weezie no LinkedIn, maio de 2025</a>.' % AWARD),
          ("D", "Sócio fundador da VCLevel", '<a data-link="vclevel" href="https://vclevel.pt" rel="noopener" target="_blank">vclevel.pt</a>'),
          ("E", "Mestrado em Finanças, ISEG, 2013", 'O mestrado em Finanças do ISEG está em 33.º lugar no mundo e no top 3 nacional no ranking Masters in Finance 2026 do Financial Times (programas sem experiência profissional), onde aparece desde 2020: <a href="%s" rel="noopener" target="_blank">ISEG</a>.' % ISEG)],
    disclaim="Uma apresentação pessoal, sem ligação a",
),
}

UL = '<svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"><path d="M2 14 C 50 6, 120 18, 198 8"/></svg>'
FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' "
           "fill='%230C271F'/%3E%3Cpath d='M8 17l5 5 11-12' fill='none' stroke='%238CB979' stroke-width='3.5' stroke-linecap='round' "
           "stroke-linejoin='round'/%3E%3C/svg%3E")


def ref(letter, t):
    if not letter:
        return ""
    return '<button type="button" class="ref" popovertarget="src-%s" aria-label="%s %s">%s</button>' % (letter, t["src"], letter, letter)


def build(t):
    rows = "\n".join('      <div><dt>%d</dt><dd>%s</dd></div>' % (i + 1, r) for i, r in enumerate(t["card_rows"]))
    steps = "\n".join('      <li><b>%s</b><span>%s</span></li>' % s for s in t["steps"])
    kpis = t["md_kpis"]
    bars = "".join('\n              <div class="md-bar"><em>%s</em><b style="--w:%s"></b></div>' % (b, w)
                   for b, w in zip(t["md_bars"], ["80%", "55%", "30%", "15%"]))
    legend = "".join("<li>%s</li>" % x for x in t["md_legend"])
    roles = "\n".join('      <p class="role">%s%s</p>\n      <p class="where">%s</p>' % (r, ref(l, t), w) for w, r, l in t["path_roles"])
    facts = "\n".join('      <div><dt>%s</dt><dd>%s%s</dd></div>' % (a, b, ref(l, t)) for a, b, l in t["facts"])
    fit = "\n".join("      <li>%s</li>" % x for x in t["fit"])
    srcs = "\n".join('''  <div class="src" id="src-%s" popover role="dialog" aria-labelledby="src-%s-k" tabindex="-1">
    <p class="src-k" id="src-%s-k">%s %s</p>
    <p class="src-claim">%s</p>
    <p class="src-where">%s</p>
    <button type="button" class="src-x" popovertarget="src-%s" popovertargetaction="hide" aria-label="%s">×</button>
  </div>''' % (l, l, l, t["src"], l, c, w, l, t["close_x"]) for l, c, w in t["srcs"])
    page = '''<!doctype html>
<html lang="%(lang)s" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>%(title)s</title>
<meta name="description" content="%(desc)s">
<meta property="og:type" content="profile">
<meta property="og:title" content="%(title)s">
<meta property="og:description" content="%(desc)s">
<meta property="og:url" content="%(url)s%(file)s">
<meta property="og:image" content="%(url)sog-%(lang)s-health.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="%(og_alt)s">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="%(url)s%(file)s">
<link rel="alternate" hreflang="%(lang)s" href="%(url)s%(file)s">
<link rel="alternate" hreflang="%(other_lang)s" href="%(url)s%(other)s">
<link rel="icon" href="%(favicon)s">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;700;800&family=Kalam:wght@400;700&display=swap" rel="stylesheet">
<script>
document.documentElement.className = "js";
/* Generated by tools/make_health.py: edit the script, not this file.
   For a specific clinic, build a link with link.html (?co=…). */
window.CONFIG = {
  company: "",
  email: "ruimcamposgomes@gmail.com",
  linkedin: "https://www.linkedin.com/in/ruimcgomes/",
  vclevel: "https://vclevel.pt",
  cv: ""
};
</script>
<link rel="stylesheet" href="styles.css">
</head>
<body class="health">
<div class="progress" aria-hidden="true"><i id="bar"></i></div>

<main>
<section class="wrap hero" id="hero" aria-label="%(card_label)s">
  <div class="hero-grid">
  <div class="hero-copy">
  <p class="meta">%(from_)s <strong>Rui Gomes</strong> (V.N. Famalicão, PT)<span id="toLine" hidden><br>%(to)s <strong data-co></strong></span></p>
  <h1 class="hi"><span class="sr" id="greetSr">%(hi)s</span><span class="typed" id="typed" aria-hidden="true">%(hi)s</span></h1>
  <p class="hi2">%(hi2)s</p>
  <p class="lede">%(lede)s</p>
  <p class="avail">%(avail)s</p>
  <a class="go" href="#cases"><span class="c" aria-hidden="true">↓</span>%(go)s</a>
  </div>
  <aside class="file" aria-label="%(card_label)s">
    <p class="file-h"><span>%(card_h)s</span><b aria-hidden="true">✓</b></p>
    <p class="file-roles">%(card_roles)s</p>
    <dl class="list">
%(rows)s
    </dl>
    <p class="file-foot"><span>%(card_foot)s</span><a class="file-cv" data-link="mail" href="#contact">%(card_btn)s</a></p>
  </aside>
  </div>
</section>

<section class="chap wrap" id="cases">
  <div class="chap-head rev">
    <span class="when">%(cases_when)s%(refD)s</span>
    <h2>%(cases_h)s</h2>
  </div>
  <div class="split">
    <div class="copy rev">
      <p>%(cases_p)s</p>
      <ul class="stack">%(cases_stack)s</ul>
      <p class="also">%(cases_also)s</p>
    </div>
    <div class="sectors rev" id="sectors">
      <div class="tabs" role="tablist" aria-label="%(tabs_label)s">
%(tabs)s      </div>
%(panels)s      <p class="anon">%(anon)s</p>
    </div>
  </div>
</section>

<section class="chap wrap" id="how">
  <div class="chap-head rev">
    <span class="when">%(how_when)s</span>
    <h2>%(how_h)s</h2>
  </div>
  <div class="split">
    <ol class="steps rev">
%(steps)s
    </ol>
    <figure class="mdash rev" role="img" aria-label="%(md_aria)s">
      <div class="md-head"><span>%(md_head)s</span><span>%(md_view)s</span></div>
      <div class="md-kpis">
        <div class="md-kpi"><span>%(k0)s</span><svg viewBox="0 0 60 18" preserveAspectRatio="none"><polyline points="0,15 10,13 20,14 30,11 40,10 50,8 60,6"/></svg></div>
        <div class="md-kpi"><span>%(k1)s</span><svg viewBox="0 0 60 18" preserveAspectRatio="none"><polyline points="0,10 10,9 20,11 30,8 40,7 50,8 60,6"/></svg></div>
        <div class="md-kpi"><span>%(k2)s</span><svg viewBox="0 0 60 18" preserveAspectRatio="none"><polyline points="0,6 10,8 20,7 30,10 40,11 50,12 60,13"/></svg></div>
        <div class="md-kpi"><span>%(k3)s</span><div class="md-gauge"><i></i></div></div>
      </div>
      <div class="md-row">
        <div class="md-box"><span class="md-t">%(md_t1)s</span>%(bars)s
        </div>
        <div class="md-box"><span class="md-t">%(md_t2)s</span>
          <div class="md-stack"><i style="--w:58%%"></i><i style="--w:30%%"></i><i style="--w:12%%"></i></div>
          <ul class="md-legend">%(legend)s</ul>
        </div>
      </div>
      <figcaption>%(md_cap)s</figcaption>
    </figure>
  </div>
</section>

<section class="chap wrap" id="path">
  <div class="chap-head rev">
    <span class="when">%(path_when)s</span>
    <h2>%(path_h)s</h2>
  </div>
  <div class="split">
    <div class="copy rev">
      <p class="edu">%(edu)s%(refE)s</p>
%(roles)s
      <p>%(path_p)s</p>
    </div>
    <aside class="file flat rev" aria-label="%(facts_h)s">
      <p class="file-h"><span>%(facts_h)s</span><b aria-hidden="true">✓</b></p>
      <dl>
%(facts)s
      </dl>
    </aside>
  </div>
</section>

<section class="why" id="why">
  <div class="wrap">
    <span class="when rev">%(fit_when)s</span>
    <h2 class="rev">%(fit_h)s</h2>
    <p class="lead rev">%(fit_lead)s</p>
    <h3 class="rev">%(fit_h3)s</h3>
    <ul class="fit rev">
%(fit)s
    </ul>
  </div>
</section>

<section class="close wrap" id="contact">
  <h2 class="rev">%(close_h)s</h2>
  <p class="sub rev">%(close_sub)s</p>
  <a class="cta rev" id="cta" href="mailto:ruimcamposgomes@gmail.com">%(cta)s <span aria-hidden="true">↗</span></a>
  <p class="links"><a data-link="email" href="mailto:ruimcamposgomes@gmail.com">ruimcamposgomes@gmail.com</a><a data-link="linkedin" href="https://www.linkedin.com/in/ruimcgomes/" rel="noopener" target="_blank">LinkedIn</a><a data-link="vclevel" href="https://vclevel.pt" rel="noopener" target="_blank">VCLevel</a><a href="index.html" hreflang="en">%(full)s</a></p>
  <p class="ai">%(ai)s</p>
</section>
<div class="srcs">
  <h2 class="print-only">%(src_h)s</h2>
%(srcs)s
</div>
</main>

<footer class="wrap">
  <span>Rui Gomes © 2026 · <a href="%(other)s" hreflang="%(other_lang)s" lang="%(other_lang)s">%(other_name)s</a></span>
  <span id="disclaim" hidden>%(disclaim)s <span data-co></span>.</span>
</footer>

<script src="page.js"></script>
</body>
</html>
''' % dict(t, url=URL, favicon=FAVICON,hi=("Olá," if t["lang"] == "pt" else "Hi there,"),
           hi2=t["hi2"].replace("@@UL@@", UL), rows=rows, steps=steps, k0=kpis[0], k1=kpis[1], k2=kpis[2], k3=kpis[3],
           bars=bars, legend=legend, roles=roles, facts=facts, fit=fit, srcs=srcs, refD=ref("D", t), refE=ref("E", t))
    return page


bad = []
for key in ("en", "pt"):
    t = T[key]
    out = os.path.join(ROOT, t["file"])
    s = build(t)
    if "--check" in sys.argv:
        cur = open(out, encoding="utf-8").read().replace("\r\n", "\n") if os.path.exists(out) else ""
        if cur != s:
            bad.append(t["file"])
    else:
        open(out, "w", encoding="utf-8", newline="\n").write(s)
        print(t["file"], "written,", len(s.splitlines()), "lines")
if "--check" in sys.argv:
    if bad:
        stop(", ".join(bad) + " out of date: run python tools/make_health.py")
    print("health.html and saude.html are up to date")
