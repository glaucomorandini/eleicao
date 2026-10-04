/* Cálculo das vagas proporcionais (deputado federal / estadual / distrital).
 *
 * Regras (Código Eleitoral arts. 106-111, Lei 14.211/2021, Res. TSE 23.611/2019 e
 * decisão do STF nas ADIs 7228, 7263 e 7325, válida desde 2024):
 *  1. QE = votos válidos / vagas, desprezando fração <= 0,5 e arredondando para cima se > 0,5.
 *  2. QP de cada partido/federação = floor(votos do partido / QE).
 *  3. Cada partido elege até QP candidatos que tenham pelo menos 10% do QE.
 *  4. Sobras (2ª fase): maior média (votos / (vagas obtidas + 1)) entre partidos com >= 80% do QE
 *     e que tenham candidato com >= 20% do QE.
 *  5. Sobras (3ª fase): sem mais ninguém nas condições do item 4, a maior média entre todos os
 *     partidos, elegendo o candidato mais votado de cada um (STF, 2024).
 *  Se nenhum partido atingir o QE, elegem-se os mais votados (art. 111).
 *  Empate de média: mais votos no partido. Empate de votos entre candidatos: o mais idoso.
 *
 * Funciona no navegador (window.Calculo) e no Node (module.exports).
 */
(function (raiz) {
  'use strict';

  function quocienteEleitoral(validos, vagas) {
    if (!vagas || validos <= 0) return 0;
    const q = validos / vagas;
    const base = Math.floor(q);
    return q - base > 0.5 ? base + 1 : base;
  }

  // "dd/mm/aaaa" -> aaaammdd (menor = mais velho); sem data vai para o fim.
  function chaveNascimento(dt) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dt || '');
    return m ? Number(m[3] + m[2] + m[1]) : 99999999;
  }

  function ordenarCandidatos(a, b) {
    return b.votos - a.votos || chaveNascimento(a.nascimento) - chaveNascimento(b.nascimento);
  }

  /* entrada: { vagas, validos, unidades: [{ id, votos, candidatos: [{ id, votos, nascimento, apto }] }] }
   * saída:   { qe, vagasPorUnidade: Map(id -> n), eleitos: Map(idCandidato -> 'QP'|'média'|'3ª fase'|'mais votados'),
   *            ultimaMedia: { unidade, media } | null }
   */
  function distribuir({ vagas, validos, unidades }) {
    const qe = quocienteEleitoral(validos, vagas);
    const eleitos = new Map();
    const us = unidades.map((u) => ({
      id: u.id,
      votos: u.votos,
      fila: u.candidatos.filter((c) => c.apto !== false).slice().sort(ordenarCandidatos),
      prox: 0,
      vagas: 0,
    }));
    const resultado = { qe, vagasPorUnidade: new Map(), eleitos, ultimaMedia: null };
    if (!qe) {
      us.forEach((u) => resultado.vagasPorUnidade.set(u.id, 0));
      return resultado;
    }

    const eleger = (u, como) => {
      eleitos.set(u.fila[u.prox].id, como);
      u.prox += 1;
      u.vagas += 1;
    };
    let restantes = vagas;

    if (!us.some((u) => u.votos >= qe)) {
      // Art. 111: ninguém atingiu o QE -> mais votados.
      const todos = us.flatMap((u) => u.fila.map((c) => ({ c, u }))).sort((a, b) => ordenarCandidatos(a.c, b.c));
      for (const { c, u } of todos.slice(0, vagas)) {
        eleitos.set(c.id, 'mais votados');
        u.vagas += 1;
      }
    } else {
      // 1ª fase: quociente partidário, candidatos com >= 10% do QE.
      const min10 = 0.1 * qe;
      for (const u of us) {
        const qp = Math.floor(u.votos / qe);
        while (u.vagas < qp && restantes > 0 && u.prox < u.fila.length && u.fila[u.prox].votos >= min10) {
          eleger(u, 'QP');
          restantes -= 1;
        }
      }
      const maiorMedia = (lista) => {
        let melhor = null;
        let melhorMedia = -1;
        for (const u of lista) {
          const media = u.votos / (u.vagas + 1);
          if (media > melhorMedia || (media === melhorMedia && u.votos > melhor.votos)) {
            melhor = u;
            melhorMedia = media;
          }
        }
        return melhor && { u: melhor, media: melhorMedia };
      };
      // 2ª fase: partidos com 80% do QE e candidato com 20% do QE.
      const min80 = 0.8 * qe;
      const min20 = 0.2 * qe;
      while (restantes > 0) {
        const m = maiorMedia(us.filter((u) => u.votos >= min80 && u.prox < u.fila.length && u.fila[u.prox].votos >= min20));
        if (!m) break;
        eleger(m.u, 'média');
        resultado.ultimaMedia = { unidade: m.u.id, media: m.media };
        restantes -= 1;
      }
      // 3ª fase: todos os partidos pela maior média.
      while (restantes > 0) {
        const m = maiorMedia(us.filter((u) => u.prox < u.fila.length && u.votos > 0));
        if (!m) break;
        eleger(m.u, '3ª fase');
        resultado.ultimaMedia = { unidade: m.u.id, media: m.media };
        restantes -= 1;
      }
    }
    us.forEach((u) => resultado.vagasPorUnidade.set(u.id, u.vagas));
    return resultado;
  }

  /* Quantos votos a mais a unidade `idUnidade` precisa (dados ao seu candidato não eleito mais
   * votado, `idCandidato`) para ganhar mais uma cadeira, com todo o resto parado.
   * Os votos extras também aumentam os válidos (e portanto o QE). Retorna null se não há como. */
  function votosParaProximaCadeira(entrada, idUnidade, idCandidato) {
    const base = distribuir(entrada).vagasPorUnidade.get(idUnidade) || 0;
    const simular = (x) => {
      const unidades = entrada.unidades.map((u) =>
        u.id !== idUnidade
          ? u
          : {
              ...u,
              votos: u.votos + x,
              candidatos: u.candidatos.map((c) => (c.id === idCandidato ? { ...c, votos: c.votos + x } : c)),
            },
      );
      return distribuir({ ...entrada, validos: entrada.validos + x, unidades }).vagasPorUnidade.get(idUnidade) || 0;
    };
    let hi = 1000;
    const teto = Math.max(entrada.validos * 2, 1e6);
    while (simular(hi) <= base) {
      hi *= 2;
      if (hi > teto) return null;
    }
    let lo = 0; // simular(lo) <= base
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (simular(mid) > base) hi = mid;
      else lo = mid;
    }
    return hi;
  }

  const api = { quocienteEleitoral, distribuir, votosParaProximaCadeira };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Calculo = api;
})(typeof window !== 'undefined' ? window : globalThis);
