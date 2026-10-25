# Missão · Deputados 2026

Página única (HTML + JS, sem build, sem servidor) que acompanha os candidatos do partido **Missão** a
deputado federal e estadual/distrital nas 27 UFs, direto dos arquivos públicos do TSE, e calcula quem
**estaria eleito se a apuração acabasse agora**.

- Atualiza a cada 25 s (só baixa de novo o que mudou; UF com totalização final para de ser consultada).
- Por UF: % apurado, vagas, quociente eleitoral (QE), votos do partido (nominais + legenda) e % do QE,
  cadeiras projetadas, **votos que faltam para a próxima cadeira** e quem está eleito agora.
- Clique numa UF: todos os candidatos do partido (votos, % do QE, situação calculada e a do TSE),
  nota de corte do estado e a distribuição de cadeiras de todos os partidos/federações.
- Lista de mudanças ("fulano entrou / saiu") e notificação no navegador (botão 🔔).

## Presidente · 2º turno (`presidente.html`)

O `index.html` abre direto nesta página. A página de deputados continua em `deputados.html`.

Página separada para o 2º turno de presidente: Brasil no topo (percentual, votos, vantagem, seções apuradas) e um
cartão por estado (mais o exterior) com o percentual de cada candidato no 1º turno ao lado do 2º turno, a diferença
em pontos e quem lidera. Ordena por eleitorado, UF, vantagem de cada candidato ou menos apurado.
Usa os arquivos do TSE das eleições 6257 (1º turno) e 6258 (2º turno), descobertos no `ele-c.json`
(`?ele1=` / `?ele2=` forçam outros códigos; `?demo=1` mostra dados fictícios).

## Como usar

Abra o `index.html` (presidente) ou o `deputados.html` no navegador (o TSE libera CORS, então funciona até direto do arquivo). Ou sirva a pasta:

```bash
python3 -m http.server 8000   # http://localhost:8000
```

Para ter um link no celular sem custo: GitHub Pages (Settings → Pages → branch, pasta `/`), Netlify ou Cloudflare Pages.

| Parâmetro na URL | Efeito |
|---|---|
| `?demo=1` | dados fictícios, para ver a tela funcionando |
| `?partido=NOVO` | acompanha outro partido (sigla, nome ou número) |
| `?s=20` | intervalo de atualização em segundos (mínimo 10) |
| `?ele=6259` | força o código da eleição (o padrão é descoberto no `ele-c.json` do TSE) |
| `?base=https://…` | troca a URL base do TSE (ex.: um proxy) |

## Cálculo (`calculo.js`)

1. QE = válidos ÷ vagas (fração ≤ 0,5 despreza, > 0,5 arredonda para cima).
2. QP = votos do partido/federação ÷ QE (sem fração); elege até QP candidatos com ≥ 10% do QE.
3. Sobras pela maior média entre partidos com ≥ 80% do QE e candidato com ≥ 20% do QE.
4. Sem mais ninguém nessas condições, maior média entre todos (decisão do STF de 2024).
5. Se ninguém atinge o QE, elegem-se os mais votados.

"Faltam p/ +1 cadeira" é o mínimo de votos a mais (no candidato não eleito mais votado do partido, com os
demais parados — o QE também sobe) para o partido ganhar mais uma vaga, achado por busca binária.

`node teste.js` confere o cálculo num caso feito à mão.

Fonte: `https://resultados.tse.jus.br/oficial/ele2026/{eleição}/dados/{uf}/{uf}-c{cargo}-e{eleição}-u.json`
(eleição estadual 2026 = 6259; cargo 6 federal, 7 estadual, 8 distrital).
Projeto independente, sem vínculo com a Justiça Eleitoral.
