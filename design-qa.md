# Verificação visual — Xpress

Referência: poster do Dino enviado pelo usuário. Comparação feita com a captura da página junto à referência, no mesmo contexto visual. A composição mantém fundo claro, jogo na parte superior, texto central de três linhas com OFFLINE/ONLINE em destaque e assinatura no rodapé. A marca e Courier New seguem o PDF fornecido; as diferenças de mascote, escala, CTA e idioma atendem aos pedidos do usuário.

## Conferido

- Desktop: marca no topo, seletor PT/ES/EN, CTA abaixo da frase, Top 10 centralizado sem rótulo ONLINE e crédito MATHRICK LAB.
- Mobile a 390 px: sem rolagem horizontal; uma única dupla de botões, com altura de 48 px, transforma as instruções em controles; dica de teclado fica oculta. Botão PULAR iniciou a partida.
- Tutorial real: primeiro caixa/PULAR, depois avião/ABAIXAR; pausa para receber o comando. A primeira abaixada permanece durante a passagem do avião para demonstrar o movimento.
- Avião de 30 × 18 px, uma pose fixa e rastro; águia de 76 × 53 px; colisões usam pixels das mesmas dimensões.
- PT, ES e EN verificados no navegador, inclusive título, copy, CTA, controles e mensagens do ranking. Link WhatsApp preserva o número informado e traduz a mensagem preparada.
- Registro real de 83 pontos gravado no servidor local e recuperado pelo ranking. Testes da mesma API com SQLite verificam Top 10, validação de 3 letras, repetição sem duplicação, origem e limites de pontuação.

## Limites

O banco do preview é separado do D1 hospedado. O jogo roda no cliente; a validação básica não substitui um sistema completo de antitrapaça. A implantação mantém o público privado já configurado no Sites.
