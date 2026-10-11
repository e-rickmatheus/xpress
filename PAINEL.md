# Painel do proprietário

Endereço: https://painel.notsoxpress.com.br/

## Ativação

Na Vercel, adicione a variável **Secret** `XPRESS_ADMIN_PASSWORD` ao ambiente Production e faça redeploy. O valor não deve ser colocado em arquivos do projeto. Sem essa variável, o painel bloqueia o acesso.

DNS no Registro.br: CNAME `painel` → `a4f74019c4b4ef94.vercel-dns-017.com`.

## Ferramentas

- **Página:** Coming Soon mantém a página atual; Launch direciona os visitantes para o endereço HTTPS cadastrado. A página de lançamento precisa existir antes de ativar essa opção. O painel mantém seu próprio subdomínio.
- **Clientes:** cadastro e edição de empresa, responsável, contato e link da pasta do Drive. Os dados ficam no Redis conectado à Vercel, separados do ranking e acessíveis apenas com sessão autenticada.
- **Cores:** identificação aproximada por família de cor, HEX/RGB/HSL, contraste WCAG e leitura de pixels de imagem. A imagem carregada permanece no navegador. Em navegadores compatíveis, há também captura de cor da tela.

O login permite até cinco tentativas por IP a cada 15 minutos. A sessão expira em oito horas, usa cookie HttpOnly/Secure/SameSite=Strict e pode ser encerrada com Sair. Alterações exigem a mesma origem. O painel não carrega Google Analytics.

Contraste: [referência WCAG do W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## Verificação

`node checks/panel.test.cjs` verifica autenticação, isolamento dos clientes, bloqueio de origem externa, configuração pública, prevenção de loop de redirecionamento, limite de tentativas e logout.
