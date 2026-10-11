# notsoxpress.com.br

Site publicado: https://xpress-smoky.vercel.app/
Repositório: https://github.com/e-rickmatheus/xpress

O domínio atualmente usa `a.auto.dns.br` e `b.auto.dns.br`, portanto os registros são administrados no Registro.br.

1. Na Vercel, abrir o projeto Xpress → Settings → Domains. Adicionar `notsoxpress.com.br` e `www.notsoxpress.com.br`; Os dois já foram adicionados: www é o principal e a raiz redireciona para ele com HTTP 308.
2. No Registro.br, entrar no domínio → DNS → Configurar zona DNS (Modo avançado, se necessário).
3. Criar/ajustar estes registros, copiando os valores **do cartão desse domínio na Vercel**:

| Tipo | Nome no Registro.br | Destino |
|---|---|---|
| A | Em branco (raiz) | 216.198.79.1 |
| CNAME | www | a4f74019c4b4ef94.vercel-dns-017.com |

4. Se a Vercel solicitar verificação de propriedade, adicionar também o TXT exatamente como exibido. Salvar e aguardar a Vercel indicar **Valid Configuration** e emitir HTTPS.

Manter os servidores DNS atuais do Registro.br. Preservar registros de e-mail (MX/TXT); ajustar somente registros A/AAAA/CNAME conflitantes dos dois nomes acima.

Não copiar IPs/CNAMEs de outro projeto: a Vercel fornece valores específicos. Referências: [Vercel — domínio personalizado](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Vercel — registros A/CNAME](https://vercel.com/kb/guide/a-record-and-caa-with-vercel), [NIC.br — configurar zona DNS](https://semanacap.bcp.nic.br/files/apresentacao/arquivo/2153/DNS%20Autoritativo%20%281%29.pdf).
