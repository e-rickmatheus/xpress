# Xpress — em breve

## Vercel (destino atual)

O repositório `e-rickmatheus/xpress` dispara a publicação conectada à Vercel. `vercel.json` usa `npm run build:vercel`, gerando o frontend em `public/` e Functions em `api/`. Não é necessário o Worker do Sites na Vercel.

Para ativar o Top 10 na Vercel, conectar **Upstash Redis** ao projeto pelo Marketplace/Storage e disponibilizar em Production `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` (os nomes legados `KV_REST_API_URL` e `KV_REST_API_TOKEN` também são aceitos). Depois fazer Redeploy. Segredos ficam exclusivamente no servidor; jamais colocar tokens no GitHub ou no JavaScript do navegador. `/api/health` informa somente se o ranking está configurado.

A abertura dura cerca de 3 segundos: avião atravessa a tela, revela a marca e libera a página. A logo do topo repete a abertura recarregando a página. Escape pula a abertura; a preferência por menos movimento é respeitada.

Jogo Canvas + JavaScript puro, sem dependências de execução.

Execute `npm install` e `node preview-server.cjs` com Node 24 ou superior; acesse http://127.0.0.1:4173. O servidor aplica as migrações e usa SQLite persistente em `.sites-runtime/local.sqlite`. Abrir o HTML sem servidor não oferece ranking online.

- Espaço, ↑ ou W: salto; segure para maior altura.
- ↓ ou S: abaixar; durante o salto, acelerar a descida.
- Toque no jogo ou nos botões em telas de toque.
- Caixas de correio utilizam o PNG enviado e colisão por pixels visíveis; águias possuem duas posições de asas e duas alturas.
- O jogo inicia de dia; aos 700 pontos, o cenário escurece suavemente até #202124. Reiniciar volta ao dia.
- O formulário exige exatamente 3 letras, normaliza acentos e maiúsculas. O Top 10 é compartilhado via API e Cloudflare D1 na versão hospedada. HI e preferências de idioma/nome permanecem locais.
- PT/ES/EN traduzem a página, os controles, o tutorial e as mensagens do jogo. O CTA abre o WhatsApp `+55 31 9308-3060` com uma mensagem, no idioma escolhido, indicando que a pessoa veio pelo site da Xpress.
- A primeira caixa ensina a pular, depois o primeiro avião ensina a abaixar; o jogo espera o comando nesses dois momentos. Aviões têm uma pose fixa, 30 × 18 px, e rastro discreto. Aviões/caixas e águias alternam a cada 250 pontos.
- `game.js`: configuração CFG, recortes spriteDefinition, física, obstáculos e ranking.
- `assets/teodoro.png`: folha de sprites em 1024 × 682; todas as oito poses são recortadas e convertidas para versões clara/escura ao carregar.
- `assets/reference-obstacle.png`: caixa de correio enviada, recorte 84,13,343,485.

Validação: `npm test`. Build: `npm run build`, gerando Worker ESM com assets embutidos e migrações em `dist/.openai/drizzle`. `.openai/hosting.json` conserva o projeto Sites existente e declara `DB`. Alterações de schema: `npm run db:generate`; nunca editar migrações já aplicadas.

API: `POST /api/runs` inicia uma partida; `GET /api/leaderboard` retorna o Top 10; `POST /api/leaderboard` registra a sigla/pontuação da partida. Há validação de origem, limites de pontuação e tempo, e idempotência para tentativas repetidas. Não é um sistema de antitrapaça completo: a simulação do jogo ocorre no cliente.

Atualização visual: águias com duas poses de voo, emblema frontal exclusivo da colisão com águia; caixas com bandeirinha e caixas de coleta; seis passos na corrida e ao abaixar. A morte tem giro e queda atrás do obstáculo na pose original de barriga para cima, preservando a flor do Teodoro. O campo de nome acomoda três letras e não seleciona texto automaticamente após a colisão. Marca Xpress extraída do PDF fornecido, tipografia Courier New.

Para a galeria de animações e verificação das duas causas de morte, execute `node checks/make-visual.cjs` e abra `/checks/visual.html` no servidor local. Essa página não integra o pacote publicado.
