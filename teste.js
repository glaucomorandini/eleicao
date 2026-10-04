// node teste.js — confere o cálculo das vagas num caso feito à mão.
const assert = require('assert');
const { quocienteEleitoral, distribuir, votosParaProximaCadeira } = require('./calculo.js');

assert.strictEqual(quocienteEleitoral(10500, 10), 1050);
assert.strictEqual(quocienteEleitoral(10005, 10), 1000); // 1000,5 -> despreza
assert.strictEqual(quocienteEleitoral(10006, 10), 1001); // 1000,6 -> arredonda

const cands = (p, votos) => votos.map((v, i) => ({ id: `${p}${i + 1}`, votos: v, apto: true }));
const entrada = {
  vagas: 10,
  validos: 10000,
  unidades: [
    { id: 'A', votos: 4500, candidatos: cands('A', [2000, 1500, 500, 300, 200]) },
    { id: 'B', votos: 2600, candidatos: cands('B', [2400, 150, 50]) },
    { id: 'C', votos: 1900, candidatos: cands('C', [1900]) },
    { id: 'D', votos: 900, candidatos: cands('D', [900]) },
    { id: 'E', votos: 100, candidatos: cands('E', [100]) },
  ],
};
const r = distribuir(entrada);
assert.strictEqual(r.qe, 1000);
assert.deepStrictEqual(Object.fromEntries(r.vagasPorUnidade), { A: 5, B: 3, C: 1, D: 1, E: 0 });
assert.strictEqual(r.eleitos.get('A4'), 'QP');
assert.strictEqual(r.eleitos.get('A5'), 'média'); // empate de média com D: A tem mais votos
assert.strictEqual(r.eleitos.get('D1'), 'média');
assert.strictEqual(r.eleitos.get('B3'), '3ª fase'); // B3 tem menos de 20% do QE
assert.ok(!r.eleitos.has('E1'));

// Ninguém atinge o QE -> mais votados.
const r2 = distribuir({ vagas: 2, validos: 300, unidades: [
  { id: 'X', votos: 100, candidatos: cands('X', [60, 40]) },
  { id: 'Y', votos: 100, candidatos: cands('Y', [70, 30]) },
  { id: 'Z', votos: 100, candidatos: cands('Z', [50, 50]) },
] });
assert.deepStrictEqual([...r2.eleitos.keys()].sort(), ['X1', 'Y1']);

// E precisa de votos para tirar a cadeira de alguém; o resultado tem que ser o mínimo exato.
const x = votosParaProximaCadeira(entrada, 'E', 'E1');
const com = (n) => distribuir({ ...entrada, validos: entrada.validos + n, unidades: entrada.unidades.map((u) =>
  u.id === 'E' ? { ...u, votos: u.votos + n, candidatos: [{ id: 'E1', votos: 100 + n, apto: true }] } : u) });
assert.ok(com(x).vagasPorUnidade.get('E') === 1 && com(x - 1).vagasPorUnidade.get('E') === 0);

console.log('ok — votos que E precisaria para a 1ª cadeira:', x);
