/*
 * cartillas.js — Definición de las cartillas disponibles.
 * Para añadir una cartilla nueva: registrar aquí sus filas.
 * Cada fila: { logMAR, den20, den6, n } (n = optotipos previstos en la fila).
 */
(function (root, factory) {
  var G = (typeof module === 'object' && module.exports) ? require('./geometria.js') : root.Geometria;
  var api = factory(G);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Cartillas = api;
})(typeof self !== 'undefined' ? self : this, function (G) {
  'use strict';

  /* Denominador (base 20) y optotipos por línea */
  var SNELLEN = [[200, 1], [100, 2], [70, 3], [50, 4], [40, 5], [30, 6], [25, 7], [20, 8], [15, 8], [10, 8]];

  function filasSnellen() {
    return SNELLEN.map(function (f) {
      return { logMAR: G.snellenALogMAR(20, f[0]), den20: f[0], den6: Math.round(f[0] * 0.3 * 10) / 10, n: f[1] };
    });
  }

  /** Ángulo visual de la altura completa de una fila Snellen. */
  function anguloFila(fila) { return G.anguloSnellen(20, fila.den20); }

  var REGISTRO = { snellen: { nombre: 'Snellen', filas: filasSnellen } };

  return { REGISTRO: REGISTRO, anguloFila: anguloFila };
});
