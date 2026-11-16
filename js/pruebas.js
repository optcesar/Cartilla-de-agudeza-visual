/*
 * pruebas.js — Pruebas automatizadas del motor. Se ejecutan en el navegador
 * (botón "Ejecutar pruebas") y en Node:  node js/pruebas.js
 */
(function (root, factory) {
  var enNode = typeof module === 'object' && module.exports;
  var G = enNode ? require('./geometria.js') : root.Geometria;
  var C = enNode ? require('./cartillas.js') : root.Cartillas;
  var api = factory(G, C);
  if (enNode) {
    module.exports = api;
    if (require.main === module) {
      var r = api.ejecutar(), mal = r.filter(function (p) { return !p.ok; });
      r.forEach(function (p) { console.log((p.ok ? 'OK    ' : 'FALLA ') + p.nombre + ' — ' + p.detalle); });
      console.log(r.length - mal.length + '/' + r.length + ' pruebas correctas');
      process.exit(mal.length ? 1 : 0);
    }
  } else root.Pruebas = api;
})(typeof self !== 'undefined' ? self : this, function (G, C) {
  'use strict';

  function cerca(a, b, tol) { return Math.abs(a - b) <= tol; }

  /* Dispositivos simulados: densidad física real y relación de píxeles del navegador. */
  var DISPOSITIVOS = [
    { nombre: 'Teléfono 460 ppp (×3)', ppp: 460, dpr: 3 },
    { nombre: 'Teléfono 401 ppp (×2.625)', ppp: 401, dpr: 2.625 },
    { nombre: 'Tableta 264 ppp (×2)', ppp: 264, dpr: 2 },
    { nombre: 'Portátil 227 ppp (×2)', ppp: 227, dpr: 2 },
    { nombre: 'Monitor 92 ppp (×1)', ppp: 92, dpr: 1 },
    { nombre: 'Monitor 4K 163 ppp (×1.5)', ppp: 163, dpr: 1.5 }
  ];

  function ejecutar() {
    var res = [];
    function prueba(nombre, ok, detalle) { res.push({ nombre: nombre, ok: !!ok, detalle: detalle }); }

    /* 1. Tamaño físico de los optotipos */
    var h66 = G.alturaMm(6000, G.anguloSnellen(20, 20));
    prueba('Lejana: 20/20 a 6 m', cerca(h66, 8.7266, 0.001), h66.toFixed(4) + ' mm (esperado 8.7266)');
    var h200 = G.alturaMm(6000, G.anguloSnellen(20, 200));
    prueba('Lejana: 20/200 a 6 m', cerca(h200, 87.27, 0.01), h200.toFixed(3) + ' mm (esperado 87.27)');
    var hc = G.alturaMm(300, G.anguloSnellen(20, 20));
    prueba('Cercana: 20/20 a 30 cm', cerca(hc, 0.4363, 0.0005), hc.toFixed(4) + ' mm (esperado 0.4363)');
    prueba('Cercana: 20/50 a 30 cm equivale a 0.75 M', cerca(G.notacionM(300, 20, 50), 0.75, 1e-12), G.notacionM(300, 20, 50).toFixed(2) + ' M');
    prueba('Trazo = 1/5 de la altura', cerca(G.trazoMm(h66) * 5, h66, 1e-12), G.trazoMm(h66).toFixed(4) + ' mm');
    var f = C.REGISTRO.snellen.filas(), dec = true;
    for (var i = 1; i < f.length; i++) if (!(C.anguloFila(f[i]) < C.anguloFila(f[i - 1]))) dec = false;
    prueba('Diez líneas de tamaño decreciente', dec && f.length === 10, '20/' + f[0].den20 + ' a 20/' + f[f.length - 1].den20);

    /* 2. Conversión mm ↔ px */
    var px = G.mmAPx(8.7266, 6.3), mm = G.pxAMm(px, 6.3);
    prueba('Conversión mm → px → mm', cerca(mm, 8.7266, 1e-9), '8.7266 mm → ' + px.toFixed(3) + ' px → ' + mm.toFixed(4) + ' mm');
    prueba('Factor desde tarjeta 85.60 mm', cerca(G.pxPorMmDesdeReferencia(539.28, 85.6), 6.3, 1e-9), '539.28 px / 85.60 mm = 6.3 px/mm');

    var fd = G.pxPorMmDesdeDiagonal(390, 844, 6.06);
    prueba('Factor desde diagonal: 390 × 844 px en 6.06 pulgadas', cerca(fd, 6.04, 0.01) && cerca(390 / fd, 64.6, 0.1), fd.toFixed(3) + ' px/mm; ancho ' + (390 / fd).toFixed(1) + ' mm');

    /* 3. Equivalencia Snellen ↔ logMAR ↔ decimal */
    prueba('20/200 = logMAR 1.0', cerca(G.snellenALogMAR(20, 200), 1, 1e-12), 'logMAR ' + G.snellenALogMAR(20, 200).toFixed(3));
    prueba('6/6 = logMAR 0.0 = decimal 1.0', cerca(G.snellenALogMAR(6, 6), 0, 1e-12) && cerca(G.logMARADecimal(0), 1, 1e-12), 'correcto');
    prueba('20/40 = logMAR 0.301 = decimal 0.5', cerca(G.snellenALogMAR(20, 40), 0.30103, 1e-5) && cerca(G.logMARADecimal(0.30103), 0.5, 1e-5), 'logMAR ' + G.snellenALogMAR(20, 40).toFixed(4));
    prueba('Ida y vuelta decimal ↔ logMAR', cerca(G.decimalALogMAR(G.logMARADecimal(0.7)), 0.7, 1e-12), 'logMAR 0.7 conservado');
    var a = G.anguloSnellen(20, 40), b = G.anguloLogMAR(G.snellenALogMAR(20, 40));
    prueba('Ángulo por Snellen = ángulo por logMAR', cerca(a, b, 1e-9), a.toFixed(4) + "' = " + b.toFixed(4) + "'");
    prueba('20/x y 6/x describen la misma línea', f.every(function (x) { return cerca(G.anguloSnellen(6, x.den6), G.anguloSnellen(20, x.den20), 1e-9); }), '20/20 = 6/6, 20/40 = 6/12…');

    /* 4. Cambio de tamaño con la distancia */
    var r = G.alturaMm(6000, 5) / G.alturaMm(3000, 5);
    prueba('Duplicar la distancia duplica el tamaño', cerca(r, 2, 1e-6), 'razón 6 m / 3 m = ' + r.toFixed(6));
    var orden = [300, 3000, 4000, 5000, 6000].map(function (d) { return G.alturaMm(d, 5); });
    prueba('El tamaño crece con la distancia', orden.every(function (v, k) { return k === 0 || v > orden[k - 1]; }), orden.map(function (v) { return v.toFixed(2); }).join(' < ') + ' mm');
    var ang = 2 * Math.atan(G.alturaMm(5000, 12.5) / 2 / 5000) / G.RAD_POR_ARCMIN;
    prueba('El ángulo subtendido se conserva', cerca(ang, 12.5, 1e-9), ang.toFixed(6) + "' (esperado 12.5')");

    /* 5. Conservación al cambiar la orientación */
    var pV = G.alturaPxSnellen(20, 40, 4000, 6.3), pH = G.alturaPxSnellen(20, 40, 4000, 6.3);
    var cabenV = G.optotiposQueCaben(390, pV, pV), cabenH = G.optotiposQueCaben(844, pH, pH);
    prueba('Orientación: mismo tamaño, cambia solo cuántos caben', pV === pH && cabenH >= cabenV, pV.toFixed(2) + ' px en ambas; caben ' + cabenV + ' en vertical y ' + cabenH + ' en horizontal');

    /* 6. Calibración en distintos dispositivos */
    DISPOSITIVOS.forEach(function (d) {
      var cssPorMm = d.ppp / d.dpr / 25.4;             // píxeles CSS reales por mm
      var factor = G.pxPorMmDesdeReferencia(85.6 * cssPorMm, 85.6); // tarjeta ajustada en pantalla
      var objetivo = G.alturaMm(4000, G.anguloSnellen(20, 30));
      var real = G.mmAPx(objetivo, factor) / cssPorMm;
      var errSinCal = Math.abs(G.mmAPx(objetivo, 96 / 25.4) / cssPorMm - objetivo) / objetivo * 100;
      prueba('Calibración: ' + d.nombre, cerca(real, objetivo, 1e-9), 'calibrado ' + real.toFixed(3) + ' mm = objetivo; sin calibrar el error sería ' + errSinCal.toFixed(0) + ' %');
    });

    return res;
  }

  return { ejecutar: ejecutar, DISPOSITIVOS: DISPOSITIVOS };
});
