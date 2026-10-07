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
| Página, textos, `CONFIG` (email, LinkedIn, CV); fontes das letras A–F em popovers no fim do `<main>` | `index.html` (versão completa) |
| Estilos (página e consola) | `styles.css`, partilhado pelas duas versões |
| Versão curta | `short.html`, gerada por `python tools/make_short.py`; nunca editar à mão. Depois de mexer no `index.html`: regenerar e confirmar com `python tools/make_short.py --check`. Se o script parar por causa dos capítulos PwC, atualizar o capítulo junto no script e o `SOURCE_HASH` |
| Gerador de links por empresa | `link.html` |
| Regras de cada jogo (sem DOM, com seed) | `games/decisions.js`, `runner.js`, `fight.js`, `maze.js`, `blocks.js`, `spot.js`, `lanes.js` |
| Desenho e texto de cada cartucho | `games/carts/*.js` (`classic.js` tem RUNWAY RUN, BOARD FIGHT e DECISIONS) |
| Consola: controlos, menu, arranque, modo demo, recibo | `games/console.js` (o contrato dos cartuchos está no topo) |
| Música chiptune | `games/music.js` |
| Imagem de partilha 1200×630 | `og.png` |

Um cartucho novo fica num ficheiro de regras mais um `games/carts/<id>.js` que chama `RUNWAY.register({...})`. Depois junta-se o `<script>` no fim do `index.html` e cria-se um teste de bots em `tests/`.

## Comandos

- Pré-visualizar: `python -m http.server 8765` e abrir http://localhost:8765/
- Testes, depois de mexer nas regras de um jogo (todos têm de terminar em `OK`):
  `node tests/decisions-balance.js`, `arcade-bots.js` (runner e fight), `maze-bots.js`, `blocks-bots.js`, `spot-bots.js`, `lanes-bots.js`
- Teste de input em tempo real (teclado, toque, swipe, demo), com o servidor local ligado: `node tests/input.js`
- Capturas: o browser embutido do Claude costuma estar escondido e corre a menos de 10 fps. Usar o Chrome headless com `?debug&shot=<id>:<segundos>` (acrescentar `&end` para o ecrã final e o recibo), que mostra só a consola, ou com `?debug&from=<secção>`, que mostra a página a partir dessa secção. A janela tem de ter pelo menos 500 px de largura.
- `?debug` expõe `window.RUNWAY_DEBUG` (`start`, `step(segundos, bot)`, `state`, `menu`).

## Público vs. privado

- Este ficheiro, o README e os testes estão no repositório público, mas o `_config.yml` tira-os do site.
- Notas pessoais, pendentes e fontes estão em `CLAUDE.local.md`, que não é versionado. Ler esse ficheiro no início de cada sessão; nunca copiar o conteúdo dele para ficheiros versionados.
- Casos de clientes: anonimizados (sem nomes nem locais, rácios em vez de valores). Não acrescentar pormenores que identifiquem o cliente.
- Nunca pôr nomes de empresas a que o Rui se candidata em ficheiros do repositório, nem como exemplo.
