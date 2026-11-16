/*
 * geometria.js — Motor de cálculo geométrico (sin dependencias de interfaz).
 * Todas las funciones son puras: mismas entradas, mismas salidas.
 * Unidades: distancias y alturas en milímetros, ángulos en minutos de arco
 * salvo que se indique lo contrario.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Geometria = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Radianes que hay en un minuto de arco. */
  var RAD_POR_ARCMIN = Math.PI / (180 * 60);

  /** Convierte minutos de arco a radianes. */
  function arcminARad(arcmin) { return arcmin * RAD_POR_ARCMIN; }

  /**
   * Ángulo visual de la altura completa de un optotipo ETDRS.
   * θ = 5 × 10^(logMAR) minutos de arco.
   */
  function anguloLogMAR(logMAR) { return 5 * Math.pow(10, logMAR); }

  /**
   * Ángulo visual de la altura completa de un optotipo Snellen.
   * θ = 5 × (denominador / numerador) minutos de arco.
   */
  function anguloSnellen(numerador, denominador) { return 5 * (denominador / numerador); }

  /**
   * Altura física del optotipo: H = 2 × D × tan(θ/2).
   * @param {number} distanciaMm distancia paciente–pantalla en mm
   * @param {number} anguloArcmin ángulo visual de la altura completa
   * @returns {number} altura en mm
   */
  function alturaMm(distanciaMm, anguloArcmin) {
    return 2 * distanciaMm * Math.tan(arcminARad(anguloArcmin) / 2);
  }

  /** Grosor del trazo: una quinta parte de la altura del optotipo. */
  function trazoMm(alturaOptotipoMm) { return alturaOptotipoMm / 5; }

  /** Factor de calibración a partir de una referencia: píxeles que ocupa / mm reales. */
  function pxPorMmDesdeReferencia(px, mm) { return px / mm; }

  /**
   * Factor de calibración a partir del tamaño de pantalla que declara el fabricante.
   * @param {number} anchoPx ancho de la pantalla completa en píxeles CSS
   * @param {number} altoPx alto de la pantalla completa en píxeles CSS
   * @param {number} pulgadas diagonal de la pantalla en pulgadas
   */
  function pxPorMmDesdeDiagonal(anchoPx, altoPx, pulgadas) {
    return Math.sqrt(anchoPx * anchoPx + altoPx * altoPx) / (pulgadas * 25.4);
  }

  /** Milímetros físicos a píxeles CSS con el factor de calibración. */
  function mmAPx(mm, pxPorMm) { return mm * pxPorMm; }

  /** Píxeles CSS a milímetros físicos con el factor de calibración. */
  function pxAMm(px, pxPorMm) { return px / pxPorMm; }

  /** Altura en píxeles de un optotipo para un logMAR, distancia y calibración dados. */
  function alturaPxLogMAR(logMAR, distanciaMm, pxPorMm) {
    return mmAPx(alturaMm(distanciaMm, anguloLogMAR(logMAR)), pxPorMm);
  }

  /** Altura en píxeles de un optotipo para una fracción Snellen, distancia y calibración. */
  function alturaPxSnellen(numerador, denominador, distanciaMm, pxPorMm) {
    return mmAPx(alturaMm(distanciaMm, anguloSnellen(numerador, denominador)), pxPorMm);
  }

  /* ---------- Equivalencias entre notaciones ---------- */

  function snellenALogMAR(numerador, denominador) { return Math.log10(denominador / numerador); }
  function logMARADecimal(logMAR) { return Math.pow(10, -logMAR); }
  function decimalALogMAR(decimal) { return -Math.log10(decimal); }
  /** Denominador Snellen exacto para un logMAR y un numerador (20 o 6). */
  function logMARADenominador(logMAR, numerador) { return numerador * Math.pow(10, logMAR); }

  var CONV20 = { '-3': 10, '-2': 12.5, '-1': 16, '0': 20, '1': 25, '2': 32, '3': 40, '4': 50, '5': 63, '6': 80, '7': 100, '8': 125, '9': 160, '10': 200 };
  var CONV6 = { '-3': 3, '-2': 3.8, '-1': 4.8, '0': 6, '1': 7.5, '2': 9.5, '3': 12, '4': 15, '5': 19, '6': 24, '7': 30, '8': 38, '9': 48, '10': 60 };

  /**
   * Denominador Snellen de uso clínico. En pasos exactos de 0.1 logMAR usa la
   * serie convencional (20/25, 20/32, 20/63…); en valores intermedios redondea.
   */
  function denominadorClinico(logMAR, numerador) {
    var decimas = Math.round(logMAR * 10);
    if (Math.abs(logMAR * 10 - decimas) < 1e-6 && decimas >= -3 && decimas <= 10) {
      return (numerador === 6 ? CONV6 : CONV20)[String(decimas)];
    }
    var d = logMARADenominador(logMAR, numerador);
    return d >= 20 ? Math.round(d) : Math.round(d * 10) / 10;
  }

  /* ---------- Distribución ---------- */

  /** Ancho total de una fila de n optotipos con separación uniforme. */
  function anchoFila(n, anchoOptotipoPx, separacionPx) {
    return n * anchoOptotipoPx + Math.max(0, n - 1) * separacionPx;
  }

  /** Cuántos optotipos caben en un ancho sin modificar su tamaño. */
  function optotiposQueCaben(anchoDisponiblePx, anchoOptotipoPx, separacionPx) {
    return Math.max(0, Math.floor((anchoDisponiblePx + separacionPx) / (anchoOptotipoPx + separacionPx)));
  }

  /* ---------- Visión cercana ---------- */

  /**
   * Notación M: 1 M subtiende 5 minutos de arco a 1 metro.
   * M = distancia (m) × denominador / numerador.
   */
  function notacionM(distanciaMm, numerador, denominador) {
    return (distanciaMm / 1000) * denominador / numerador;
  }

  return {
    RAD_POR_ARCMIN: RAD_POR_ARCMIN,
    arcminARad: arcminARad,
    anguloLogMAR: anguloLogMAR,
    anguloSnellen: anguloSnellen,
    alturaMm: alturaMm,
    trazoMm: trazoMm,
    pxPorMmDesdeReferencia: pxPorMmDesdeReferencia,
    pxPorMmDesdeDiagonal: pxPorMmDesdeDiagonal,
    mmAPx: mmAPx,
    pxAMm: pxAMm,
    alturaPxLogMAR: alturaPxLogMAR,
    alturaPxSnellen: alturaPxSnellen,
    snellenALogMAR: snellenALogMAR,
    logMARADecimal: logMARADecimal,
    decimalALogMAR: decimalALogMAR,
    logMARADenominador: logMARADenominador,
    denominadorClinico: denominadorClinico,
    anchoFila: anchoFila,
    optotiposQueCaben: optotiposQueCaben,
    notacionM: notacionM
  };
});
