# The audit trail — notas para o Claude

Página pessoal de candidatura do Rui Gomes (CFO & Head of HR na Weezie, trabalho fracionado com a VCLevel), publicada em https://rvcgomes.github.io/the-audit-trail/ pelo GitHub Pages a partir de `main`. Página estática, sem build: HTML, CSS e JS simples (ES5).

O objetivo é **branding com estrutura interativa**, não uma ferramenta de CFO. Falar com o Rui em português de Portugal; o texto da página é em inglês.

## Regras

- **Sem push sem um "sim" explícito do Rui.** O repositório é público e cada push muda a página no ar. Commits locais são livres.
- **Um link por empresa.** A personalização vem só do URL (`?co=…&why=…`, gerado em `link.html`). Nunca editar o `CONFIG` do `index.html` para uma candidatura: o repositório é público e um URL único faria uma empresa ver o nome de outra.
- **Nada inventado sobre o Rui.** Números, cargos, clientes e datas só com fonte dada por ele. Se faltar informação, perguntar em vez de escrever algo plausível.
- **Sem AI slop no texto:** nada de tríades de adjetivos, "not X but Y", aforismos de LinkedIn nem frases de marketing. Frases concretas e curtas.
- **Arte e música originais.** Nada de personagens, nomes, sprites ou músicas de terceiros (Nintendo, Namco, Toei…). Clássicos em domínio público são permitidos.
- **Contraste AA** nos dois temas (claro e escuro) e a página tem de funcionar sem JavaScript e ao imprimir.

## Estrutura

| O quê | Onde |
|---|---|
| Página, textos, `CONFIG` (email, LinkedIn, CV, links de evidência) | `index.html` |
| Gerador de links por empresa | `link.html` |
| Regras de cada jogo (sem DOM, com seed) | `games/decisions.js`, `runner.js`, `fight.js`, `maze.js`, `blocks.js`, `spot.js`, `lanes.js` |
| Desenho e texto de cada cartucho | `games/carts/*.js` (`classic.js` tem RUNWAY RUN, BOARD FIGHT e DECISIONS) |
| Consola: controlos, menu, arranque, modo demo, recibo | `games/console.js` (o contrato dos cartuchos está no topo) |
| Música chiptune | `games/music.js` |
| Imagem de partilha 1200×630 | `og.png` |

Um cartucho novo fica num ficheiro de regras mais um `games/carts/<id>.js` que chama `RUNWAY.register({...})`. Depois junta-se o `<script>` no fim do `index.html` e cria-se um teste de bots em `tests/`.

## Comandos (Windows)

O Node não está no PATH: está em `C:\Users\Rui\tools\node\node.exe` (em Git Bash, `/c/Users/Rui/tools/node/node`).

- Pré-visualizar: `python -m http.server 8765` e abrir http://localhost:8765/
- Testes, depois de mexer nas regras de um jogo (todos têm de terminar em `OK`):
  `node tests/decisions-balance.js`, `arcade-bots.js` (runner e fight), `maze-bots.js`, `blocks-bots.js`, `spot-bots.js`, `lanes-bots.js`
- Capturas: o browser embutido do Claude costuma estar escondido e corre a menos de 10 fps, por isso os screenshots falham ou saem em branco. Usar o Chrome headless com `?debug&shot=<id>:<segundos>` (acrescentar `&end` para o ecrã final e o recibo), que esconde o resto da página e mostra só a consola. A janela tem de ter pelo menos 500 px de largura:
  `chrome.exe --headless=new --hide-scrollbars --window-size=520,760 --virtual-time-budget=5000 --screenshot=<ficheiro>.png "http://localhost:8765/?debug&shot=maze:20"`
- `?debug` expõe `window.RUNWAY_DEBUG` (`start`, `step(segundos, bot)`, `state`, `menu`).

## Por fazer (conteúdo que só o Rui pode dar)

- Autorização dos clientes para os seis casos VCLevel publicados (terapia, fisioterapia, dentária, nova clínica, agência de PR, vinho) e um caso real de Food & drink, se houver.
- O papel do Rui na VCLevel (fundador, sócio, consultor…).
- O CV em PDF (`CONFIG.cv`).
- Confirmar que os −34% e −28% da Weezie podem ser públicos.
- A dificuldade dos jogos para pessoas reais, sobretudo o labirinto e o CASH FLOW no telemóvel.

## Evidências já confirmadas (26.09.2026)

- Casos VCLevel: vêm do Rui, anonimizados com as regras dele (sem nomes nem locais, rácios em vez de valores, o foco é a lição). Não acrescentar pormenores que identifiquem o cliente.
- A ronda de €3M é tratada como "seed" (confirmado pelo Rui).

- €3M: ECO, 6.2.2024, ronda liderada pela GED Ventures Portugal; na altura a Weezie tinha 23 pessoas. Link em `CONFIG.evidence.seed`.
- Prémio: Prémios da Compensação 2025 (Coverflex), categoria Pequenas empresas, "Líder em transparência na compensação"; o Rui recebeu-o em nome da equipa. As fotos estão em `award-trophy.jpg` (troféu) e `award.jpg` (palco); o nome oficial em inglês é "Transparency in Compensation".
- 20 meses com 0% de saídas voluntárias numa equipa de 23 (Eng + GTM em Portugal), segundo um post do Rui no LinkedIn (ago. 2025). Os posts estão ligados em `CONFIG.evidence` (people, award).
