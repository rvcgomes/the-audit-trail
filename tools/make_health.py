"""Builds the two health-practice pages from one template:
    health.html  (English)
    saude.html   (Portuguese, PT-PT)

    python tools/make_health.py          # writes both
    python tools/make_health.py --check  # fails if either is out of date (writes nothing)

The page is for clinic and practice owners (VCLevel work), not for recruiters:
no CV, four cartridges (FULLY BOOKED on pricing and agreements, CASH FLOW, SPOT THE ERROR,
CLOSE THE MONTH), and the
main button books a call.
The English case texts are copied from the health cases in index.html, so the two
never disagree; the Portuguese ones are written below. If a health case in
index.html changes, the script stops, so the Portuguese text can be updated too.
Run it after changing index.html, this script or the page structure.
"""
import hashlib, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refs import relabel

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://rvcgomes.github.io/the-audit-trail/"
CASES = ["therapy", "physio", "dental", "clinic"]
# fingerprint of the four health cases in index.html when the Portuguese texts were last written
CASES_HASH = "37acff9daa54c6a2"

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
        <button role="tab" id="t-dental" aria-controls="p-dental" aria-selected="false" tabindex="-1">Medicina dentária</button>
        <button role="tab" id="t-clinic" aria-controls="p-clinic" aria-selected="false" tabindex="-1">Clínica médica</button>
'''
PT_PANELS = "".join([
    pt_case(1, "therapy", "Psicologia", "“Precisamos de faturar mais.”",
            "Os números apontaram para a ocupação da agenda e o preço por sessão. O trabalho começou por um diagnóstico de desempenho.",
            "Primeiro, saber quanto vale uma hora."),
    pt_case(2, "physio", "Fisioterapia", "ENI ou sociedade, antes do primeiro paciente?",
            "A resposta veio do plano a três anos, onde o imposto poupado no primeiro ano pesava pouco.",
            "Escolha a estrutura a pensar no terceiro ano."),
    pt_case(3, "dental", "Medicina dentária", "Os nossos preços estão certos para os pacientes de convenções?",
            "Os preços partiam do princípio de que havia cerca de sete vezes mais pacientes de convenções do que a clínica tinha na realidade. As faltas eram uma segunda fuga na margem.",
            "Primeiro os dados, depois o preço."),
    pt_case(4, "clinic", "Clínica médica", "O que precisamos de saber antes de assinar o arrendamento?",
            "Dois números: onde está o ponto de equilíbrio e quantos meses aguenta até lá chegar. Fora das grandes cidades, juntam-se os incentivos ao interior e uma sociedade que possa receber sócios mais tarde.",
            "O arrendamento é a primeira grande decisão."),
])

ECO = "https://eco.sapo.pt/2024/02/06/weezie-fecha-ronda-de-3-milhoes-e-a-recrutar-para-dar-forca-a-entrada-na-america-do-sul/"
AWARD = "https://www.linkedin.com/feed/update/urn:li:activity:7328690408580972544/"
ISEG = "https://www.iseg.ulisboa.pt/en/?p=70573"
D_POST = "https://www.linkedin.com/feed/update/urn:li:activity:7359489817874677761/"

T = {
"en": dict(
    file="health.html", other="saude.html", lang="en", other_lang="pt", other_name="Versão em português", other_short="Português", hero_label="Introduction", locale="en_GB",
    title="Rui Gomes, fractional CFO for clinics",
    desc="Rui Gomes, fractional CFO for clinics and health practices: a diagnosis of where the practice stands, then the tools to decide.",
    og_alt="Rui Gomes, fractional CFO for clinics and health practices.",
    from_="From", to="To",
    hi2='your practice&#8217;s numbers, <span class="ul">seen from the inside@@UL@@</span>',
    lede="I'm Rui, the founder of VCLevel. There I work as a fractional CFO: a part-time finance director for businesses that don't need a full-time one yet. I work with clinics and practices across health care: medical, dental, physiotherapy, psychology, aesthetics and others. I start with a diagnosis of where the practice stands today, then build the tools you use to decide.",
    actions='<a class="btn primary" data-link="mail" href="#contact">Book a call</a><a class="btn ghost" href="#cases">See the cases</a>',
    avail='Or <a href="index.html">read my full trail</a>.',
    card_label="Summary", card_h="Diagnosis · what I check first",
    card_roles="<span>Founder, VCLevel</span><span>CFO &amp; Head of HR, Weezie</span>",
    card_rows=["What an hour in the schedule is worth", "Occupancy and no-shows", "Insurers and health plans against private patients",
               "Break-even, and the months to reach it", "Sole trader or a company"],
    card_foot="Medical, dental, physio, psychology, aesthetics", card_btn="Book a call",
    cases_when="<b>Real cases</b>, with VCLevel", cases_h="The first question is rarely the one that matters",
    cases_p="Four practices I've worked with through VCLevel. Most of them had never had a finance person look at their numbers from the inside.",
    refs_hint="Each circled letter on this page opens the source of that fact.",
    cases_stack="<li>Diagnosis</li><li>Pricing</li><li>Company structure</li><li>Break-even</li>",
    tabs_label="Client cases", tabs=EN_TABS, panels=EN_PANELS,
    anon="Real cases, shared with the clients&#8217; permission: sector only, no names or places, and ratios rather than amounts.",
    how_when="<b>How I work</b>", how_h="An insider, working from the outside",
    how_lead="I work with every part of the practice, from the front desk to the clinical team, so that each number turns into something someone does.",
    steps=[("Diagnosis", "Where the practice stands today: what an hour in the schedule is worth, occupancy and no-shows, patients through insurers and health plans against private ones, and what each service costs."),
           ("Thinking the business through", "I look at the practice as a whole with the owners: the services, the prices, the team, and where growth could come from."),
           ("Tools to decide", "Built for your practice: the pricing model, the break-even, the cash forecast, the monthly dashboard. With them I take the finance seat in the big decisions: the price list, the lease, the conversation with the bank."),
           ("Pay and structure", "I design how each role is paid and the structure behind it: salary bands, roles, and the company structure."),
           ("The next level", "I get the practice ready for the next step, organic or not: a second site, a partner or an investor coming in, a merger or a sale.")],
    md_aria="Example of a monthly dashboard for a practice: revenue, occupancy, no-shows and cash at the top; revenue by service; who pays: private patients, insurers and health plans. No client figures.",
    md_head="Monthly dashboard", md_view="Month view", md_kpis=["Revenue", "Occupancy", "No-shows", "Cash &amp; runway"],
    md_t1="Revenue by service", md_bars=["Consults", "Treatments", "Assessments", "Other"],
    md_t2="Who pays", md_legend=["Private", "Insurers &amp; health plans"],
    md_cap="An example of the monthly view, without any client&#8217;s figures.",
    path_when="<b>Where the method comes from</b>", path_h="Audit first, then the CFO seat",
    edu="Master's in Finance, ISEG Lisbon",
    path_roles=[("2013 – 2022", "PwC: financial audit, then capital markets and accounting advisory, with Claranet in between, working directly with Microsoft", "A"),
                ("2022 – now", "CFO &amp; Head of HR, Weezie, venture-backed software for fibre-network operators", ""),
                ("Alongside", "Founder, VCLevel", "D")],
    path_p="At PwC I learnt to ask where a number comes from before trusting it. At Weezie the numbers are mine: the budget, the cash, the funding round, the pay bands. With clinics I do the same job, from the outside.",
    facts_h="Track record", facts=[("€500M", "in transactions advised on under IFRS", "F"), ("€3M", "seed round, 2024: 18 more months of runway", "B"),
        ("−34%", "time to close the month", "G"), ("−28%", "FX exposure, after a new liquidity policy", "G"),
        ("0%", "voluntary attrition in 20 months, team of 23", "G"), ("2025", "Transparency in Compensation Award", "C")],
    fit_when="<b>Where I can help</b>", fit_h="Before the next big decision",
    fit_lead="The work is most useful before a decision that is hard to undo: a price list, a lease, a company.",
    fit_h3="You'll probably want to talk to me if",
    fit=["You've never worked out what an hour in the schedule is worth", "You're not sure your prices for insurers and health plans still pay",
         "No-shows worry you, but nobody has put a number on them", "You're about to sign the lease for a new practice",
         "You're choosing between sole trader and a company",
         "You want to apply for public funding, or the incentives for the interior", "You're bringing in a partner, or about to talk to the bank", "Your team is growing and nobody has decided what each role is paid"],
    quest_when="<b>A small side quest</b>", quest_h="Insert a cartridge",
    quest_list=["<b>Fully Booked</b>: set the private price, choose the insurers and health plans, fill the schedule. Each agreement gets a verdict.",
                "<b>Cash Flow</b>: the weeks when money comes in and goes out, with payroll due every 13 seconds.",
                "<b>Spot the Error</b>: invoices and totals that don't add up.",
                "<b>Close the Month</b>: get the five closing tasks done before the deadlines."],
    quest_p=["Four small games. In Fully Booked you set a practice's private price, decide which insurers and health plans to sign with, and book the patients as they arrive. At the end each agreement gets a verdict: what it paid, the private patients it brought, and the ones it pushed out of a fully booked schedule. Cash Flow is about the weeks when money comes in and goes out, Spot the Error about the invoices that don't add up, and Close the Month about getting it done on time.",
             "They're toys, and the numbers in them are game numbers, but the rules come from the job. Turn the sound on for the music."],
    dev_aria="RUNWAY, a handheld console with four games. A or Space to play, B or Escape for the menu.",
    nogame="RUNWAY needs JavaScript.<br><br>The rest of the page doesn't.", up="Up", left="Left", right="Right", down="Down",
    b_aria="B: back to the menu", a_aria="A: book or select", b_small="MENU", a_small="PLAY", send="Send to Rui", copy="Copy",
    ghint="A or Space to play · arrows or swipe to move · B or Esc for the menu",
    award_label="Award", award_h="Transparency in Compensation Award, 2025",
    award_p="Coverflex Compensation Awards, small-company category. Given to Weezie for the company-wide compensation framework and salary bands I designed there.",
    award_alt1="The trophy: Prémios da Compensação 2025, powered by Coverflex, Líder em transparência na compensação, Pequenas Empresas, Weezie.",
    award_cap1="Small companies, 2025.",
    award_alt2="Rui Gomes on stage with the award, next to a screen that reads: Prémios da Compensação 2025, small companies, leader in compensation transparency, winner Weezie.",
    award_cap2="Accepting it for the Weezie team.",
    close_h="Tell me the question on your table", close_sub="Portuguese, English and Italian. Based in the north of Portugal, open to remote.",
    cta="Book a call", full="My full trail",
    ai="Old audit habit: every number on this page comes with its source. Click a circled letter to check it.",
    src_h="Sources", src="Source", close_x="Close",
    srcs=[("A", "Roles and dates, 2013 to now", '<a data-link="linkedin" href="https://www.linkedin.com/in/ruimcgomes/" rel="noopener" target="_blank">LinkedIn profile</a>'),
          ("B", "€3M seed round in 2024", '€3M round led by GED Ventures Portugal, February 2024: <a href="%s" rel="noopener" target="_blank">ECO, 6 Feb 2024</a>.' % ECO),
          ("C", "Transparency in Compensation Award, 2025", 'Coverflex Compensation Awards 2025 (Prémios da Compensação), small-company category: <a href="%s" rel="noopener" target="_blank">Weezie on LinkedIn, May 2025</a>.' % AWARD),
          ("D", "Founder, VCLevel", '<a data-link="vclevel" href="https://vclevel.pt" rel="noopener" target="_blank">vclevel.pt</a>'),
          ("E", "Master's in Finance, ISEG Lisbon, 2013", 'ISEG&#8217;s Master&#8217;s in Finance is 33rd worldwide and top 3 in Portugal in the Financial Times Masters in Finance ranking 2026 (pre-experience), where it has been ranked since 2020: <a href="%s" rel="noopener" target="_blank">ISEG</a>.' % ISEG),
          ("F", "€500M in transactions advised on under IFRS", "PwC Capital Markets &amp; Accounting Advisory, 2018–2022. The clients are confidential; I'm happy to walk through the types of deal."),
          ("G", "−34% close time, −28% FX exposure, 20 months with zero voluntary attrition across 23 people", 'Weezie management reporting; before-and-after figures on request. The attrition figure is public: <a href="%s" rel="noopener" target="_blank">my LinkedIn post, Aug 2025</a>.' % D_POST)],
    disclaim="A personal introduction, not affiliated with",
),
"pt": dict(
    file="saude.html", other="health.html", lang="pt", other_lang="en", other_name="English version", other_short="English", hero_label="Introdução", locale="pt_PT",
    title="Rui Gomes, CFO para clínicas",
    desc="Rui Gomes, CFO fracionado para clínicas e consultórios: um diagnóstico de onde a clínica está hoje e, depois, as ferramentas para decidir.",
    og_alt="Rui Gomes, CFO fracionado para clínicas e consultórios.",
    from_="De", to="Para",
    hi2='os números da sua clínica, <span class="ul">vistos por dentro@@UL@@</span>',
    lede="Sou o Rui, fundador da VCLevel. Lá trabalho como CFO fracionado: diretor financeiro a tempo parcial, em empresas que ainda não precisam de um a tempo inteiro. Trabalho com clínicas e consultórios de várias áreas da saúde: medicina, medicina dentária, fisioterapia, psicologia, estética e outras. Começo por um diagnóstico de onde a clínica está hoje e depois construo as ferramentas com que decide.",
    actions='<a class="btn primary" data-link="mail" href="#contact">Marcar uma conversa</a><a class="btn ghost" href="#cases">Ver os casos</a>',
    avail='Ou <a href="index.html" hreflang="en">ler o percurso completo</a> (em inglês).',
    card_label="Resumo", card_h="Diagnóstico · o que vejo primeiro",
    card_roles="<span>Fundador, VCLevel</span><span>CFO e Head of HR, Weezie</span>",
    card_rows=["Quanto vale uma hora da agenda", "Ocupação e faltas", "Convenções e particulares",
               "Ponto de equilíbrio e meses até lá chegar", "ENI ou sociedade"],
    card_foot="Medicina, dentária, fisioterapia, psicologia, estética", card_btn="Marcar uma conversa",
    cases_when="<b>Casos reais</b>, com a VCLevel", cases_h="A primeira pergunta raramente é a que importa",
    cases_p="Quatro clínicas com que trabalhei através da VCLevel. A maioria nunca tinha tido alguém de finanças a olhar para os números por dentro.",
    refs_hint="Cada letra num círculo, nesta página, abre a fonte desse dado.",
    cases_stack="<li>Diagnóstico</li><li>Preços</li><li>Estrutura da empresa</li><li>Ponto de equilíbrio</li>",
    tabs_label="Casos de clientes", tabs=PT_TABS, panels=PT_PANELS,
    anon="Casos reais, partilhados com autorização dos clientes: só o setor, sem nomes nem locais, e rácios em vez de valores.",
    how_when="<b>Como trabalho</b>", how_h="Alguém de dentro, a trabalhar de fora",
    how_lead="Trabalho com todas as áreas da clínica, da receção à equipa clínica, para que cada número se transforme numa ação.",
    steps=[("Diagnóstico", "Onde a clínica está hoje: quanto vale uma hora da agenda, a ocupação e as faltas, os pacientes de convenções face aos particulares, e quanto custa cada serviço."),
           ("Pensar o negócio", "Olho para a clínica como um todo, com os sócios: os serviços, os preços, a equipa e de onde pode vir o crescimento."),
           ("Ferramentas para decidir", "Feitas para a sua clínica: o modelo de preços, o ponto de equilíbrio, a previsão de tesouraria, o painel mensal. Com elas, ocupo o lugar do diretor financeiro nas grandes decisões: a tabela de preços, o arrendamento, a conversa com o banco."),
           ("Compensação e estrutura", "Desenho como se paga cada função e a estrutura por trás: tabelas salariais, funções e a estrutura da empresa."),
           ("O próximo nível", "Preparo a clínica para o passo seguinte, orgânico ou não: uma segunda unidade, a entrada de um sócio ou de um investidor, uma fusão ou uma venda.")],
    md_aria="Exemplo de um painel mensal para uma clínica: faturação, ocupação, faltas e tesouraria no topo; faturação por serviço; pacientes de convenções e particulares. Sem números de clientes.",
    md_head="Painel mensal", md_view="Vista do mês", md_kpis=["Faturação", "Ocupação", "Faltas", "Tesouraria"],
    md_t1="Faturação por serviço", md_bars=["Consultas", "Tratamentos", "Avaliações", "Outros"],
    md_t2="Quem paga", md_legend=["Particulares", "Convenções"],
    md_cap="Um exemplo da vista mensal, sem números de nenhum cliente.",
    path_when="<b>De onde vem o método</b>", path_h="Primeiro a auditoria, depois a cadeira de CFO",
    edu="Mestrado em Finanças, ISEG",
    path_roles=[("2013 – 2022", "PwC: auditoria financeira e, depois, assessoria em mercados de capitais e contabilidade, com a Claranet pelo meio, a trabalhar diretamente com a Microsoft", "A"),
                ("2022 – hoje", "CFO e Head of HR na Weezie, software para operadores de redes de fibra, com capital de risco", ""),
                ("Em paralelo", "Fundador da VCLevel", "D")],
    path_p="Na PwC aprendi a perguntar de onde vem um número antes de confiar nele. Na Weezie os números são meus: o orçamento, a tesouraria, a ronda de investimento, as tabelas salariais. Nas clínicas faço o mesmo trabalho, de fora.",
    facts_h="Resultados", facts=[("€500M", "em transações assessoradas em IFRS", "F"), ("€3M", "ronda seed, 2024: mais 18 meses de tesouraria", "B"),
        ("−34%", "no tempo de fecho do mês", "G"), ("−28%", "na exposição cambial, com uma nova política de liquidez", "G"),
        ("0%", "saídas voluntárias em 20 meses, equipa de 23", "G"), ("2025", "Prémio «Líder em transparência na compensação»", "C")],
    fit_when="<b>Onde posso ajudar</b>", fit_h="Antes da próxima grande decisão",
    fit_lead="O trabalho é mais útil antes de uma decisão difícil de desfazer: uma tabela de preços, um arrendamento, uma empresa.",
    fit_h3="Provavelmente vai querer falar comigo se",
    fit=["Nunca fez as contas a quanto vale uma hora da agenda", "Não tem a certeza de que os preços das convenções ainda compensam",
         "As faltas preocupam, mas ninguém as pôs em números", "Está prestes a assinar o arrendamento de um novo espaço",
         "Está a decidir entre ENI e sociedade",
         "Quer candidatar-se a fundos ou aos incentivos ao interior", "Vai receber um sócio ou falar com o banco", "A equipa está a crescer e ainda não há regras para quanto ganha cada função"],
    quest_when="<b>Uma pausa para jogar</b>", quest_h="Insira um cartucho",
    quest_list=["<b>Agenda Cheia</b>: defina o preço particular, escolha as convenções e encha a agenda. Cada convenção tem um veredicto.",
                "<b>Tesouraria</b>: as semanas em que o dinheiro entra e sai, com salários a cada 13 segundos.",
                "<b>Encontre o Erro</b>: faturas e totais que não batem certo.",
                "<b>Fechar o Mês</b>: as cinco tarefas do fecho antes dos prazos."],
    quest_p=["Quatro jogos pequenos. Em Agenda Cheia define o preço particular de uma clínica, escolhe que convenções assinar e marca os pacientes à medida que chegam. No fim, cada convenção tem um veredicto: o que pagou, os particulares que trouxe e os que deixou de fora com a agenda cheia. Em Tesouraria, o tema são as semanas em que o dinheiro entra e sai; em Encontre o Erro, as faturas que não batem certo; em Fechar o Mês, chegar ao fecho a tempo.",
             "São brinquedos, e os números são do jogo, mas as regras vêm do trabalho. Ligue o som para ouvir a música."],
    dev_aria="RUNWAY, uma consola portátil com quatro jogos. A ou Espaço para jogar, B ou Escape para o menu.",
    nogame="O RUNWAY precisa de JavaScript.<br><br>O resto da página não.", up="Cima", left="Esquerda", right="Direita", down="Baixo",
    b_aria="B: voltar ao menu", a_aria="A: marcar ou escolher", b_small="MENU", a_small="JOGAR", send="Enviar ao Rui", copy="Copiar",
    ghint="A ou Espaço para jogar · setas ou deslizar para mover · B ou Esc para o menu",
    award_label="Prémio", award_h="Prémio «Líder em transparência na compensação», 2025",
    award_p="Prémios da Compensação da Coverflex, categoria Pequenas empresas. Atribuído à Weezie pelo modelo de compensação e pelas tabelas salariais que desenhei para a empresa.",
    award_alt1="O troféu: Prémios da Compensação 2025, powered by Coverflex, Líder em transparência na compensação, Pequenas Empresas, Weezie.",
    award_cap1="Pequenas empresas, 2025.",
    award_alt2="Rui Gomes em palco com o prémio, ao lado de um ecrã onde se lê: Prémios da Compensação 2025, pequenas empresas, líder em transparência na compensação, vencedor Weezie.",
    award_cap2="A receber o prémio em nome da equipa da Weezie.",
    close_h="Diga-me qual é a pergunta em cima da mesa", close_sub="Português, inglês e italiano. No norte de Portugal, também à distância.",
    cta="Marcar uma conversa", full="O percurso completo (EN)",
    ai="Hábito de auditor: cada número desta página tem a sua fonte. Clique numa letra para a confirmar.",
    src_h="Fontes", src="Fonte", close_x="Fechar",
    srcs=[("A", "Cargos e datas, de 2013 até hoje", '<a data-link="linkedin" href="https://www.linkedin.com/in/ruimcgomes/" rel="noopener" target="_blank">Perfil no LinkedIn</a>'),
          ("B", "Ronda seed de €3M em 2024", 'Ronda de €3M liderada pela GED Ventures Portugal, fevereiro de 2024: <a href="%s" rel="noopener" target="_blank">ECO, 6.2.2024</a>.' % ECO),
          ("C", "Prémio «Líder em transparência na compensação», 2025", 'Prémios da Compensação 2025 (Coverflex), categoria Pequenas empresas: <a href="%s" rel="noopener" target="_blank">Weezie no LinkedIn, maio de 2025</a>.' % AWARD),
          ("D", "Fundador da VCLevel", '<a data-link="vclevel" href="https://vclevel.pt" rel="noopener" target="_blank">vclevel.pt</a>'),
          ("E", "Mestrado em Finanças, ISEG, 2013", 'O mestrado em Finanças do ISEG está em 33.º lugar no mundo e no top 3 nacional no ranking Masters in Finance 2026 do Financial Times (programas sem experiência profissional), onde aparece desde 2020: <a href="%s" rel="noopener" target="_blank">ISEG</a>.' % ISEG),
          ("F", "€500M em transações assessoradas em IFRS", "PwC Capital Markets &amp; Accounting Advisory, 2018–2022. Os clientes são confidenciais; posso explicar os tipos de operação."),
          ("G", "−34% no tempo de fecho do mês, −28% na exposição cambial, 20 meses sem saídas voluntárias numa equipa de 23", 'Reporte de gestão da Weezie; números de antes e depois a pedido. O número das saídas é público: <a href="%s" rel="noopener" target="_blank">o meu post no LinkedIn, ago. 2025</a>.' % D_POST)],
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
<meta property="og:site_name" content="Rui Gomes">
<meta property="og:locale" content="%(locale)s">
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
<link rel="alternate" hreflang="x-default" href="%(url)ssaude.html">
<link rel="icon" href="%(favicon)s">
<link rel="preload" href="fonts/schibsted-grotesk-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="fonts/fonts.css">
<script>
document.documentElement.className = "js";
/* Generated by tools/make_health.py: edit the script, not this file.
   For a specific clinic, build a link with link.html (?co=…). */
window.CONFIG = {
  company: "",
  email: "rui.gomes@vclevel.pt",
  linkedin: "https://www.linkedin.com/in/ruimcgomes/",
  vclevel: "https://vclevel.pt",
  booking: "",                 // the calendar link (Calendly) once it exists; empty = the button opens an email
  cv: ""
};
</script>
<link rel="stylesheet" href="styles.css">
</head>
<body class="health">
<div class="progress" aria-hidden="true"><i id="bar"></i></div>

<main>
<p class="wrap lang-switch"><a href="%(other)s" hreflang="%(other_lang)s" lang="%(other_lang)s">%(other_short)s</a></p>
<section class="wrap hero" id="hero" aria-label="%(hero_label)s">
  <div class="hero-grid">
  <div class="hero-copy">
  <p class="meta">%(from_)s <strong>Rui Gomes</strong> (V.N. Famalicão, PT)<span id="toLine" hidden><br>%(to)s <strong data-co></strong></span></p>
  <h1 class="hi"><span class="sr" id="greetSr">%(hi)s</span><span class="typed" id="typed" aria-hidden="true">%(hi)s</span></h1>
  <p class="hi2">%(hi2)s</p>
  <p class="lede">%(lede)s</p>
  <p class="actions">%(actions)s</p>
  <p class="avail">%(avail)s</p>
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
      <p class="refs-hint">%(refs_hint)s</p>
      <ul class="stack">%(cases_stack)s</ul>
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
  <p class="how-lead rev">%(how_lead)s</p>
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
          <div class="md-stack"><i style="--w:62%%"></i><i style="--w:38%%"></i></div>
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

<section class="award wrap rev" aria-label="%(award_label)s">
  <div class="award-photos">
    <figure class="award-photo">
      <img src="award-trophy.jpg" srcset="award-trophy-360.jpg 360w, award-trophy.jpg 720w" sizes="(max-width: 760px) 45vw, 320px" width="720" height="720" loading="lazy" alt="%(award_alt1)s">
      <figcaption>%(award_cap1)s</figcaption>
    </figure>
    <figure class="award-photo">
      <img src="award.jpg" srcset="award-360.jpg 360w, award.jpg 720w" sizes="(max-width: 760px) 45vw, 320px" width="720" height="720" loading="lazy" alt="%(award_alt2)s">
      <figcaption>%(award_cap2)s</figcaption>
    </figure>
  </div>
  <h2>%(award_h)s%(refC)s</h2>
  <p>%(award_p)s</p>
</section>

<section class="quest wrap" id="quest">
  <div class="split">
    <div class="copy rev">
      <span class="when">%(quest_when)s</span>
      <h2 style="margin:.4rem 0 1.5rem">%(quest_h)s</h2>
      <ul class="games">%(quest_list)s</ul>
      <p>%(quest_p1)s</p>
    </div>
    <div class="rev">
      <div class="device" id="device" data-games="games/agenda.js games/blocks.js games/spot.js games/lanes.js games/music.js games/console.js games/carts/agenda.js games/carts/blocks.js games/carts/spot.js games/carts/lanes.js" tabindex="0" role="group" aria-label="%(dev_aria)s">
        <div class="brand"><span><i></i>RUNWAY</span><span id="gCart">CFO EDITION</span><button type="button" class="snd" id="gSnd" aria-pressed="false">♪ OFF</button></div>
        <div class="screen">
          <p class="nogame">%(nogame)s</p>
          <div class="hud" id="gHud" aria-hidden="true" hidden>
            <div><span id="gL1"></span><b id="gV1"></b></div>
            <div><span id="gL2"></span><b id="gV2"></b></div>
            <div><span id="gL3"></span><b id="gV3"></b></div>
          </div>
          <div class="hud2" id="gHud2" aria-hidden="true" hidden>
            <div><span id="gL4"></span><b id="gV4"></b></div>
            <div><span id="gL5"></span><div class="bar" id="gBar"><i id="gBarI" style="width:0%%"></i></div></div>
          </div>
          <canvas id="gCanvas" width="192" height="120" hidden aria-hidden="true"></canvas>
          <div class="msg" id="gMsg" aria-hidden="true"></div>
          <p class="sr" id="gLive" aria-live="polite"></p>
          <div class="opts" id="gOpts"></div>
        </div>
        <div class="controls">
          <div class="dpad"><button type="button" data-dir="up" class="u" aria-label="%(up)s">▲</button><button type="button" data-dir="left" class="l" aria-label="%(left)s">◀</button><span class="c"></span><button type="button" data-dir="right" class="r" aria-label="%(right)s">▶</button><button type="button" data-dir="down" class="d" aria-label="%(down)s">▼</button></div>
          <div class="ab"><div><button type="button" id="gB" aria-label="%(b_aria)s">B</button><small>%(b_small)s</small></div><div><button type="button" id="gA" aria-label="%(a_aria)s">A</button><small>%(a_small)s</small></div></div>
        </div>
      </div>
      <div class="receipt" id="gReceipt" hidden>
        <pre id="gReceiptText"></pre>
        <div class="rbtns"><a class="rbtn" id="gSend" href="#">%(send)s</a><button type="button" class="rbtn" id="gCopy">%(copy)s</button></div>
      </div>
      <p class="ghint">%(ghint)s</p>
    </div>
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
  <a class="cta rev" id="cta" href="mailto:rui.gomes@vclevel.pt">%(cta)s <span aria-hidden="true">↗</span></a>
  <p class="links"><a data-link="email" href="mailto:rui.gomes@vclevel.pt">rui.gomes@vclevel.pt</a><a data-link="linkedin" href="https://www.linkedin.com/in/ruimcgomes/" rel="noopener" target="_blank">LinkedIn</a><a data-link="vclevel" href="https://vclevel.pt" rel="noopener" target="_blank">VCLevel</a><a href="index.html" hreflang="en">%(full)s</a></p>
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
           hi2=t["hi2"].replace("@@UL@@", UL), quest_list="".join("<li>%s</li>" % x for x in t["quest_list"]), quest_p1=t["quest_p"][1], rows=rows, steps=steps, k0=kpis[0], k1=kpis[1], k2=kpis[2], k3=kpis[3],
           bars=bars, legend=legend, roles=roles, facts=facts, fit=fit, srcs=srcs, refC=ref("C", t), refD=ref("D", t), refE=ref("E", t))
    why = re.search(r'<section class="why" id="why">.*?</section>\n\n', page, re.S).group(0)
    page = page.replace(why, "").replace('<section class="chap wrap" id="how">', why + '<section class="chap wrap" id="how">')
    return relabel(page)


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
