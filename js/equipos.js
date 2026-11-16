/*
 * equipos.js — Diagonal real de pantalla (pulgadas) por modelo.
 * Valores de las notas de especificaciones de Apple ("medida en diagonal como
 * un rectángulo"), más precisos que el tamaño comercial redondeado.
 * Para añadir un equipo: agregar [nombre, pulgadas] al grupo que corresponda.
 */
(function (root) {
  'use strict';
  root.Equipos = [
    { grupo: 'iPhone', modelos: [
      ['iPhone 17 Pro Max', 6.86], ['iPhone 17 Pro', 6.27], ['iPhone 17', 6.27], ['iPhone Air', 6.55], ['iPhone 17e', 6.06],
      ['iPhone 16 Pro Max', 6.86], ['iPhone 16 Pro', 6.27], ['iPhone 16 Plus', 6.69], ['iPhone 16', 6.12], ['iPhone 16e', 6.06],
      ['iPhone 15 Pro Max', 6.69], ['iPhone 15 Pro', 6.12], ['iPhone 15 Plus', 6.69], ['iPhone 15', 6.12],
      ['iPhone 14 Pro Max', 6.69], ['iPhone 14 Pro', 6.12], ['iPhone 14 Plus', 6.68], ['iPhone 14', 6.06],
      ['iPhone 13 Pro Max', 6.68], ['iPhone 13 Pro', 6.06], ['iPhone 13', 6.06], ['iPhone 13 mini', 5.42],
      ['iPhone 12 Pro Max', 6.68], ['iPhone 12 Pro', 6.06], ['iPhone 12', 6.06], ['iPhone 12 mini', 5.42],
      ['iPhone 11 Pro Max', 6.46], ['iPhone 11 Pro', 5.85], ['iPhone 11', 6.06],
      ['iPhone XS Max', 6.46], ['iPhone XS', 5.85], ['iPhone XR', 6.06], ['iPhone X', 5.85]
    ] },
    { grupo: 'iPad', modelos: [
      ['iPad Pro 13" (M4)', 13], ['iPad Pro 12.9"', 12.9], ['iPad Pro 11" (M4)', 11.1], ['iPad Pro 11" (1.ª a 4.ª gen.)', 11],
      ['iPad Air 13"', 12.9], ['iPad Air 11"', 10.86], ['iPad Air 10.9" (4.ª y 5.ª gen.)', 10.86],
      ['iPad (10.ª gen.)', 10.86], ['iPad mini 8.3"', 8.3]
    ] }
  ];
})(typeof self !== 'undefined' ? self : this);
