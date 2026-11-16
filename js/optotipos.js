/*
 * optotipos.js — Optotipos vectoriales en cuadrícula 5 × 5 (trazo = 1 unidad).
 * Ningún optotipo usa fuentes tipográficas: cada uno es geometría SVG.
 * Para añadir un conjunto nuevo basta registrar sus símbolos en GLIFOS y CONJUNTOS.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Optotipos = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function trazo(d) { return '<path d="' + d + '" fill="none" stroke="#000" stroke-width="1" stroke-linejoin="miter" stroke-linecap="butt"/>'; }
  function relleno(d) { return '<path d="' + d + '" fill="#000" fill-rule="evenodd"/>'; }
  function rect(x, y, w, h) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#000"/>'; }
  function poli(p) { return '<polygon points="' + p + '" fill="#000"/>'; }

  var E = rect(0, 0, 1, 5) + rect(0, 0, 5, 1) + rect(0, 2, 5, 1) + rect(0, 4, 5, 1);

  var GLIFOS = {
    /* Letras Sloan */
    C: relleno('M4.9495 2A2.5 2.5 0 1 0 4.9495 3L3.9142 3A1.5 1.5 0 1 1 3.9142 2Z'),
    D: relleno('M0 0H2.5A2.5 2.5 0 0 1 2.5 5H0ZM1 1V4H2.5A1.5 1.5 0 0 0 2.5 1Z'),
    H: rect(0, 0, 1, 5) + rect(4, 0, 1, 5) + rect(0, 2, 5, 1),
    K: rect(0, 0, 1, 5) + poli('3.399,0 5,0 1,3.2 1,1.919') + poli('2.222,2.222 5,5 3.586,5 1.437,2.851'),
    N: rect(0, 0, 1, 5) + rect(4, 0, 1, 5) + poli('0,0 1.25,0 5,5 3.75,5'),
    O: relleno('M0 2.5A2.5 2.5 0 1 0 5 2.5A2.5 2.5 0 1 0 0 2.5ZM1 2.5A1.5 1.5 0 1 0 4 2.5A1.5 1.5 0 1 0 1 2.5Z'),
    R: relleno('M0 0H3.5A1.5 1.5 0 0 1 3.5 3H1V5H0ZM1 1V2H3.5A.5 .5 0 0 0 3.5 1Z') + poli('1.875,2.5 3.125,2.5 5,5 3.75,5'),
    S: trazo('M4.5 1.5A1 1 0 0 0 3.5 .5H1.5A1 1 0 0 0 1.5 2.5H3.5A1 1 0 0 1 3.5 4.5H1.5A1 1 0 0 1 .5 3.5'),
    V: poli('0,0 1.077,0 2.5,3.558 3.923,0 5,0 3,5 2,5'),
    Z: rect(0, 0, 5, 1) + rect(0, 4, 5, 1) + poli('5,0 5,1.25 0,5 0,3.75'),
    /* E direccional: el nombre indica hacia dónde apuntan las barras */
    'E-der': E,
    'E-aba': '<g transform="rotate(90 2.5 2.5)">' + E + '</g>',
    'E-izq': '<g transform="rotate(180 2.5 2.5)">' + E + '</g>',
    'E-arr': '<g transform="rotate(270 2.5 2.5)">' + E + '</g>'
  };

  var CONJUNTOS = {
    letras: { nombre: 'Letras Sloan', simbolos: ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'] },
    e: { nombre: 'E direccional', simbolos: ['E-der', 'E-aba', 'E-izq', 'E-arr'] }
  };

  var NOMBRES = { 'E-der': 'E hacia la derecha', 'E-aba': 'E hacia abajo', 'E-izq': 'E hacia la izquierda', 'E-arr': 'E hacia arriba' };

  /**
   * SVG de un optotipo con lado exacto en píxeles CSS.
   * El viewBox cuadrado y el ancho = alto impiden cualquier deformación.
   */
  function svg(simbolo, ladoPx) {
    var l = Number(ladoPx).toFixed(3);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 5" width="' + l + '" height="' + l +
      '" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision" role="img" aria-label="' +
      (NOMBRES[simbolo] || simbolo) + '">' + GLIFOS[simbolo] + '</svg>';
  }

  /**
   * Elige n símbolos al azar de un conjunto, sin repetir mientras alcance y
   * sin dos iguales seguidos cuando hay que repetir.
   */
  function aleatorios(conjunto, n, azar) {
    var rnd = azar || Math.random, base = CONJUNTOS[conjunto].simbolos, out = [], bolsa = [];
    while (out.length < n) {
      if (!bolsa.length) {
        bolsa = base.slice();
        for (var i = bolsa.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = bolsa[i]; bolsa[i] = bolsa[j]; bolsa[j] = t; }
        if (out.length && bolsa[bolsa.length - 1] === out[out.length - 1] && bolsa.length > 1) bolsa.reverse();
      }
      out.push(bolsa.pop());
    }
    return out;
  }

  return { GLIFOS: GLIFOS, CONJUNTOS: CONJUNTOS, NOMBRES: NOMBRES, svg: svg, aleatorios: aleatorios };
});
