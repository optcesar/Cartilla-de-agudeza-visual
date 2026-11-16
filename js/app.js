/*
 * app.js — Interfaz paso a paso. No contiene fórmulas: todo cálculo se delega
 * en Geometria (tamaños), Optotipos (dibujo) y Cartillas (filas).
 */
(function () {
  'use strict';
  var G = window.Geometria, O = window.Optotipos, C = window.Cartillas;
  var $ = function (id) { return document.getElementById(id); };
  var CLAVE = 'cartilla-snellen-v2';
  var METODOS = { pantalla: 'el tamaño de pantalla', tarjeta: 'tarjeta', manual: 'referencia manual' };
  var PRESETS = [3000, 4000, 5000, 6000];
  var CERCA_MM = 300; // la visión cercana se evalúa siempre a 30 cm

  var S = {
    paso: 0, cal: null, calPpm: null, calW: 0, calH: 0, refV: null, metodo: 'pantalla', recalibrando: false,
    vision: 'lejos', distLejos: 6000, otra: false,
    conjunto: 'letras', notacion: '20', modo: 'completa',
    linea: 0, opt: 0, ocultar: false, juego: null, enEval: false, guardado: false,
    prueba: 'agudeza', lineaBicro: 0, lineaReloj: 0, bicro: null
  };
  var CAMPOS = ['cal', 'vision', 'distLejos', 'conjunto', 'notacion', 'modo'];

  /* ---------- Datos guardados en este dispositivo ---------- */
  function guardar() {
    var d = {}; CAMPOS.forEach(function (k) { d[k] = S[k]; });
    try { localStorage.setItem(CLAVE, JSON.stringify(d)); S.guardado = true; } catch (e) { S.guardado = false; }
    renderGuardado();
  }
  function cargar() {
    try {
      var d = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (d) CAMPOS.forEach(function (k) { if (d[k] != null) S[k] = d[k]; });
      localStorage.setItem(CLAVE + '-prueba', '1'); localStorage.removeItem(CLAVE + '-prueba'); S.guardado = true;
    } catch (e) { /* sin almacenamiento disponible */ }
    if (!O.CONJUNTOS[S.conjunto]) S.conjunto = 'letras';
    S.otra = PRESETS.indexOf(S.distLejos) < 0;
  }
  function renderGuardado() {
    $('guardado').textContent = S.guardado ? 'La calibración y sus preferencias se guardan en este dispositivo.' : 'Este navegador no permite guardar; los datos duran mientras la página esté abierta.';
  }

  /* ---------- Dispositivo ---------- */
  function orientacion() {
    var o = screen.orientation && screen.orientation.type;
    if (o) return o.indexOf('portrait') === 0 ? 'vertical' : 'horizontal';
    return window.matchMedia('(orientation: portrait)').matches ? 'vertical' : 'horizontal';
  }
  function tipoDispositivo() {
    var tactil = window.matchMedia('(pointer: coarse)').matches, lado = Math.min(screen.width, screen.height);
    return tactil && lado < 600 ? 'Teléfono' : tactil ? 'Tableta' : 'Computadora';
  }
  function dpr() { return window.devicePixelRatio || 1; }
  function zoomVisual() { return window.visualViewport ? Math.round(window.visualViewport.scale * 100) / 100 : 1; }
  function firma() {
    return { dpr: Math.round(dpr() * 1000) / 1000, a: Math.min(screen.width, screen.height), b: Math.max(screen.width, screen.height), orient: orientacion(), zoom: zoomVisual() };
  }
  /** Devuelve '' si la calibración sigue vigente o el motivo por el que ya no lo está. */
  function motivoInvalida() {
    if (!S.cal) return 'no se ha calibrado';
    var f = firma(), c = S.cal.firma;
    if (f.dpr !== c.dpr || f.zoom !== c.zoom) return 'cambió el nivel de zoom';
    if (f.a !== c.a || f.b !== c.b) return 'cambió la pantalla o el dispositivo';
    if (f.orient !== c.orient) return 'cambió la orientación';
    return '';
  }
  function calValida() { return !!S.cal && !motivoInvalida(); }
  function renderDispositivo() {
    var d = [
      ['Tipo', tipoDispositivo()],
      ['Resolución', Math.round(screen.width * dpr()) + ' × ' + Math.round(screen.height * dpr()) + ' px'],
      ['Área visible', window.innerWidth + ' × ' + window.innerHeight + ' px CSS'],
      ['Orientación', orientacion()],
      ['Densidad informada', '×' + (Math.round(dpr() * 100) / 100)],
      ['Zoom', window.visualViewport ? Math.round(zoomVisual() * 100) + ' % (táctil)' : 'no detectable']
    ];
    $('dispositivo').innerHTML = d.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('');
  }

  /* ---------- Paso 1: calibración ---------- */
  /** Medidas reales (mm) del objeto de referencia, en la orientación en que se dibuja. */
  function refDims() {
    if (S.metodo === 'tarjeta') { var v = window.innerWidth < 700; return v ? { w: 53.98, h: 85.6, v: true } : { w: 85.6, h: 53.98, v: false }; }
    return { w: parseFloat($('in-ref-w').value) || 50, h: parseFloat($('in-ref-h').value) || 50, v: null };
  }
  /** Coloca el rectángulo en el tamaño que predice el factor actual. */
  function reiniciarRect() { var r = refDims(); S.calW = r.w * S.calPpm; S.calH = r.h * S.calPpm; S.refV = r.v; }
  /** Factor medido en cada eje, su promedio y cuánto difieren (%). */
  function factorMedido() {
    if (S.metodo === 'pantalla') {
      var sel = $('sel-equipo').value, d = sel === 'otro' ? parseFloat($('in-diag').value) : parseFloat(sel), ok = d >= 3 && d <= 120;
      var f = ok ? G.pxPorMmDesdeDiagonal(screen.width, screen.height, d) : S.calPpm;
      return { x: f, y: f, media: f, dif: 0, falta: !ok };
    }
    var r = refDims(), x = G.pxPorMmDesdeReferencia(S.calW, r.w), y = G.pxPorMmDesdeReferencia(S.calH, r.h), m = (x + y) / 2;
    return { x: x, y: y, media: m, dif: Math.abs(x - y) / m * 100 };
  }
  function renderCal() {
    var fig = $('cal-figura'), m = S.metodo, ok = calValida();
    var p = $('pildora'), e = $('cal-estado');
    if (ok) {
      var mm = (window.innerWidth - 90) / S.cal.pxPorMm >= 50 ? 50 : 30;
      p.className = 'pildora bien'; p.textContent = 'Calibrada';
      e.innerHTML = '<span><strong>Pantalla calibrada</strong> con ' + METODOS[S.cal.metodo] + ' (' + S.cal.pxPorMm.toFixed(3) + ' px/mm).</span>' +
        '<div class="verif"><i style="width:' + (mm * S.cal.pxPorMm).toFixed(2) + 'px"></i><span>Si quiere comprobarla: esta línea debe medir ' + mm + ' mm</span></div>';
    } else if (S.cal) {
      p.className = 'pildora alerta'; p.textContent = 'Recalibrar';
      e.innerHTML = '<span><strong>Hay que calibrar de nuevo:</strong> ' + motivoInvalida() + ' desde la última vez.</span>';
    } else { p.className = 'pildora mal'; p.textContent = 'Sin calibrar'; e.innerHTML = ''; }

    var listo = ok && !S.recalibrando;
    $('cal-titulo').textContent = listo ? 'Esta pantalla ya está calibrada' : 'Calibre la pantalla';
    $('cal-listo').hidden = !listo; $('cal-panel').hidden = listo;
    $('cal-intro').hidden = listo; $('cal-estado').hidden = listo; $('cal-detalles').hidden = listo;
    if (listo) $('cal-listo-tx').textContent = 'La calibración guardada sigue vigente (con ' + METODOS[S.cal.metodo] + '). Puede continuar, o calibrar de nuevo si cambió de equipo o de pantalla.';
    $('campo-manual').hidden = m !== 'manual';
    Array.prototype.forEach.call($('cal-metodos').children, function (b) { b.classList.toggle('on', b.dataset.m === m); });
    var r = refDims(), a = factorMedido(), rect = $('cal-rect'), asa = $('cal-asa');
    $('campo-pantalla').hidden = m !== 'pantalla'; $('cal-arrastre').hidden = m === 'pantalla';
    $('cal-guardar').disabled = !!a.falta;
    if (m === 'pantalla') {
      var otro = $('sel-equipo').value === 'otro';
      $('campo-diag').hidden = !otro;
      $('cal-instr').textContent = 'Elija el modelo de este equipo y la página pone la medida de su pantalla. No necesita ningún objeto.' +
        (otro ? ' Para un equipo que no está en la lista, escriba las pulgadas de la pantalla: vienen en la caja, en los ajustes del equipo o buscando el modelo en internet.' : '') +
        (tipoDispositivo() === 'Computadora' ? ' En computadora, deje el zoom del navegador en 100 %.' : '');
      $('diag-info').textContent = a.falta ? '' : 'Pantalla de ' + (otro ? parseFloat($('in-diag').value) : parseFloat($('sel-equipo').value)) + ' pulgadas: mide ' + (Math.min(screen.width, screen.height) / a.media).toFixed(1) + ' × ' + (Math.max(screen.width, screen.height) / a.media).toFixed(1) + ' mm.';
      $('cal-valor').textContent = a.falta ? 'Elija su equipo' : a.media.toFixed(3) + ' px/mm';
      return;
    }
    rect.style.width = S.calW.toFixed(2) + 'px'; rect.style.height = S.calH.toFixed(2) + 'px';
    rect.style.borderRadius = m === 'tarjeta' ? (3.18 * a.media).toFixed(2) + 'px' : '0';
    fig.style.width = (S.calW + 26).toFixed(2) + 'px'; fig.style.height = (S.calH + 26).toFixed(2) + 'px';
    asa.style.left = (S.calW - 22).toFixed(2) + 'px'; asa.style.top = (S.calH - 22).toFixed(2) + 'px';
    $('cal-instr').textContent = m === 'tarjeta'
      ? 'Apoye una credencial o tarjeta bancaria sobre la pantalla' + (r.v ? ', en vertical,' : '') + ' con su esquina superior izquierda en la del rectángulo. Arrastre el círculo hasta que el ancho y el alto coincidan con la tarjeta; afine con los botones.'
      : 'Escriba el ancho y el alto de un objeto rectangular que tenga a la mano, apóyelo con su esquina superior izquierda en la del rectángulo y arrastre el círculo hasta que coincidan.';
    $('cal-valor').textContent = a.media.toFixed(3) + ' px/mm · ' + (a.dif > 1.5 ? 'ancho y alto difieren ' + a.dif.toFixed(1) + ' %: revise ambos bordes' : 'ancho y alto concuerdan');
  }

  /* ---------- Paso 2: distancia ---------- */
  function distMm() { return S.vision === 'lejos' ? S.distLejos : CERCA_MM; }
  function distTexto(mm) { mm = mm || distMm(); return mm >= 1000 ? (mm / 1000).toFixed(2).replace(/\.?0+$/, '') + ' m' : (mm / 10).toFixed(1).replace(/\.0$/, '') + ' cm'; }
  function renderDistancia() {
    var lejos = S.vision === 'lejos';
    Array.prototype.forEach.call($('vision-seg').children, function (b) { b.classList.toggle('on', b.dataset.v === S.vision); });
    $('bloque-lejos').hidden = !lejos; $('bloque-cerca').hidden = lejos;
    $('dist-chips').innerHTML = PRESETS.map(function (d) { return '<button type="button" data-d="' + d + '"' + (!S.otra && d === S.distLejos ? ' class="on"' : '') + '>' + distTexto(d) + '</button>'; }).join('');
    $('chk-otra').checked = S.otra; $('campos-otra').hidden = !S.otra;
    var h = G.alturaMm(distMm(), G.anguloSnellen(20, 20));
    $('dist-resumen').innerHTML = (lejos ? 'Paciente a <strong>' + distTexto() + '</strong> de la pantalla. ' : '') + 'La letra 20/20 medirá ' + h.toFixed(2) + ' mm de alto.';
  }

  /* ---------- Paso 3: optotipos ---------- */
  function renderOptotipos() {
    $('mu-letras').innerHTML = ['C', 'D', 'K', 'S'].map(function (s) { return O.svg(s, 30); }).join('');
    $('mu-e').innerHTML = O.CONJUNTOS.e.simbolos.map(function (s) { return O.svg(s, 30); }).join('');
    Array.prototype.forEach.call($('conj-op').children, function (b) { b.classList.toggle('on', b.dataset.c === S.conjunto); });
    $('sel-notacion').value = S.notacion; $('sel-modo').value = S.modo;
  }

  /* ---------- Etiquetas y tamaños ---------- */
  function n(v) { return String(Math.round(v * 100) / 100); }
  function etiqueta(f) {
    var t = S.notacion === '20' ? '20/' + n(f.den20) : S.notacion === '6' ? '6/' + n(f.den6) : G.logMARADecimal(f.logMAR).toFixed(2);
    return S.vision === 'cerca' ? t + ' · ' + n(G.notacionM(distMm(), 20, f.den20)) + ' M' : t;
  }
  function mmFila(f) { return G.alturaMm(distMm(), C.anguloFila(f)); }
  function pxFila(f) { return G.mmAPx(mmFila(f), S.cal.pxPorMm); }
  /** Trazo en píxeles físicos de la pantalla: por debajo de 2 la letra pierde fidelidad. */
  function trazoFisico(f) { return G.trazoMm(mmFila(f)) * S.cal.pxPorMm * dpr(); }

  /** ¿Cabe completo en pantalla un optotipo de este lado? */
  function cabe(px) { return px <= Math.min(window.innerWidth - 32, window.innerHeight - 150); }
  /** Filas de la cartilla: si 20/200 no cabe en esta pantalla, se empieza en 20/100. */
  function filasCartilla() {
    var f = C.REGISTRO.snellen.filas();
    if (calValida() && !cabe(pxFila(f[0]))) f.shift();
    return f;
  }

  /* ---------- Paso 4: resumen ---------- */
  function renderResumen() {
    var ok = calValida();
    var filas = filasCartilla();
    $('resumen').innerHTML = [
      ['Pantalla', ok ? 'Calibrada' : 'Sin calibrar'],
      ['Prueba', S.vision === 'lejos' ? 'Visión lejana' : 'Visión cercana'],
      ['Distancia', distTexto()],
      ['Optotipos', O.CONJUNTOS[S.conjunto].nombre],
      ['Notación', S.notacion === 'dec' ? 'Decimal' : S.notacion + '/x']
    ].map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('');
    $('iniciar').disabled = !ok;

    var html = '<tr><th>Línea</th><th>Altura mm</th><th>Altura px</th><th>Estado</th></tr>', finas = [], grandes = [];
    filas.forEach(function (f) {
      var mm = mmFila(f), px = ok ? pxFila(f) : null, est = '—';
      if (ok) {
        var t = trazoFisico(f);
        if (t < 2) { est = '<span class="et ' + (t < 1 ? 'mal' : 'alerta') + '">Trazo menor a ' + (t < 1 ? '1 px' : '2 px') + '</span>'; finas.push(etiqueta(f).split(' · ')[0]); }
        else if (!cabe(px)) { est = '<span class="et alerta">Mayor que la pantalla</span>'; grandes.push(etiqueta(f).split(' · ')[0]); }
        else est = '<span class="et bien">Correcto</span>';
      }
      html += '<tr><td>' + etiqueta(f) + '</td><td>' + mm.toFixed(2) + '</td><td>' + (px === null ? '—' : px.toFixed(1)) + '</td><td>' + est + '</td></tr>';
    });
    $('tabla').innerHTML = html;
    var av = [];
    if (filas.length < 10) av.push('20/200 no cabe en esta pantalla a ' + distTexto() + ': la cartilla empieza en 20/100.');
    if (finas.length) av.push('Esta pantalla no tiene resolución suficiente para dibujar con fidelidad ' + finas.join(', ') + ' a ' + distTexto() + '.');
    if (grandes.length) av.push('No caben completas: ' + grandes.join(', ') + '. Podrá desplazarse para verlas.');
    $('aviso-lineas').hidden = !av.length; $('aviso-lineas').textContent = av.join(' ');
  }

  /* ---------- Navegación entre pasos ---------- */
  function maxPaso() { return calValida() ? 4 : 1; }
  function irA(p) {
    S.paso = Math.max(0, Math.min(p, maxPaso()));
    render(); window.scrollTo(0, 0);
  }
  function render() {
    renderDispositivo(); renderCal(); renderDistancia(); renderOptotipos(); renderResumen();
    Array.prototype.forEach.call(document.querySelectorAll('[data-paso]'), function (s) { s.hidden = Number(s.dataset.paso) !== S.paso; });
    Array.prototype.forEach.call($('ruta').querySelectorAll('button'), function (b) {
      var p = Number(b.dataset.ir);
      b.className = p === S.paso ? 'aqui' : p < S.paso ? 'hecho' : '';
      b.disabled = p > maxPaso();
      if (p === S.paso) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    var listo = S.paso === 1 && calValida() && !S.recalibrando;
    $('ruta').hidden = S.paso === 0; $('cabecera').hidden = S.paso === 0;
    $('pie').hidden = S.paso === 0; document.body.classList.toggle('portada', S.paso === 0);
    $('pie-nav').hidden = S.paso === 0 || listo;
    $('atras').style.visibility = S.paso === 1 ? 'hidden' : 'visible';
    $('siguiente').style.visibility = S.paso === 4 ? 'hidden' : 'visible';
    $('siguiente').disabled = S.paso === 1 && !calValida();
    $('nav-nota').textContent = S.paso === 1 && !calValida() ? 'Guarde la calibración para continuar' : 'Paso ' + S.paso + ' de 4';
  }

  /* ---------- Cartilla ---------- */
  function nuevoJuego() {
    var filas = filasCartilla(), ancho = window.innerWidth - 32;
    return {
      filas: filas,
      sim: filas.map(function (f) {
        var px = pxFila(f);
        return O.aleatorios(S.conjunto, Math.max(1, Math.min(f.n, G.optotiposQueCaben(ancho, px, px))));
      })
    };
  }
  function renderEval() {
    if (!S.enEval) return;
    var hoja = $('hoja'), motivo = motivoInvalida();
    var ag = S.prueba === 'agudeza';
    Array.prototype.forEach.call($('ev-prueba').children, function (b) { b.classList.toggle('on', b.dataset.p === S.prueba); });
    Array.prototype.forEach.call($('ev-modo').children, function (b) { b.classList.toggle('on', b.dataset.m === S.modo); });
    $('ev-modo').hidden = !ag; $('ev-azar').hidden = S.prueba === 'reloj';
    $('ev-inferiores').classList.toggle('on', S.ocultar);
    $('ev-inferiores').hidden = !ag || S.modo !== 'completa';
    hoja.className = ag ? '' : S.prueba; $('lienzo').classList.toggle('pleno', S.prueba === 'bicro');
    $('ev-alerta').hidden = !motivo;
    if (motivo) {
      $('ev-alerta').textContent = 'La calibración dejó de ser válida: ' + motivo + '. Restablezca la pantalla, o salga y calibre de nuevo.';
      hoja.innerHTML = ''; $('ev-etq').textContent = ''; return;
    }
    if (S.prueba === 'bicro') { renderBicro(hoja); return; }
    if (S.prueba === 'reloj') { renderReloj(hoja); return; }
    var j = S.juego, html = '', minSep = (S.vision === 'lejos' ? 4 : 2.5) * S.cal.pxPorMm;
    S.linea = Math.max(0, Math.min(S.linea, j.filas.length - 1));
    S.opt = Math.max(0, Math.min(S.opt, j.sim[S.linea].length - 1));
    j.filas.forEach(function (f, i) {
      if (S.modo !== 'completa' && i !== S.linea) return;
      var px = pxFila(f), sep = S.modo === 'completa' && i > 0 ? Math.max(px, minSep) : 0;
      var cls = 'fila' + (i === S.linea ? ' actual' : '') + (S.modo === 'completa' && S.ocultar && i > S.linea ? ' oculta' : '');
      html += '<div class="' + cls + '" data-i="' + i + '" style="gap:' + px.toFixed(3) + 'px;margin-top:' + sep.toFixed(3) + 'px">';
      j.sim[i].forEach(function (s, k) {
        if (S.modo === 'optotipo' && k !== S.opt) return;
        html += '<span class="opt" style="width:' + px.toFixed(3) + 'px;height:' + px.toFixed(3) + 'px">' + O.svg(s, px) + '</span>';
      });
      html += (S.modo === 'completa' ? '<span class="etq">' + etiqueta(f) + '</span>' : '') + '</div>';
    });
    hoja.innerHTML = html;
    var fila = j.filas[S.linea];
    $('ev-etq').textContent = etiqueta(fila) + (S.modo === 'optotipo' ? ' · ' + (S.opt + 1) + '/' + j.sim[S.linea].length : '');
    $('ev-fino').hidden = trazoFisico(fila) >= 2;
  }
  /* ---------- Prueba bicromática: mismos optotipos sobre rojo y verde ---------- */
  function nuevaBicro() {
    var f = S.juego.filas, medio = window.innerWidth / 2 - 24, filas = [];
    for (var i = S.lineaBicro; i < Math.min(f.length, S.lineaBicro + 3); i++) {
      var px = pxFila(f[i]), n = Math.max(1, Math.min(3, G.optotiposQueCaben(medio, px, px)));
      filas.push({ px: px, izq: O.aleatorios(S.conjunto, n), der: O.aleatorios(S.conjunto, n) });
    }
    S.bicro = filas;
  }
  function renderBicro(hoja) {
    if (!S.bicro) nuevaBicro();
    var mitad = function (lado, clase) {
      return '<div class="mitad ' + clase + '">' + S.bicro.map(function (r) {
        return '<div class="fila" style="gap:' + r.px.toFixed(3) + 'px">' + r[lado].map(function (x) {
          return '<span class="opt" style="width:' + r.px.toFixed(3) + 'px;height:' + r.px.toFixed(3) + 'px">' + O.svg(x, r.px) + '</span>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    };
    hoja.innerHTML = mitad('izq', 'rojo') + mitad('der', 'verde');
    var fila = S.juego.filas[S.lineaBicro];
    $('ev-etq').textContent = etiqueta(fila); $('ev-fino').hidden = trazoFisico(fila) >= 2;
  }

  /* ---------- Reloj astigmático: doce líneas radiales con trazo de tamaño real ---------- */
  /** Línea inicial del reloj: 20/40 o, si su trazo es muy fino en esta pantalla, la primera más gruesa con al menos 3 px físicos. */
  function lineaRelojInicial() {
    var f = S.juego.filas, i = 0;
    f.forEach(function (x, k) { if (x.den20 >= 40) i = k; });
    while (i > 0 && trazoFisico(f[i]) < 3) i--;
    return i;
  }
  function renderReloj(hoja) {
    var l = $('lienzo'), fila = S.juego.filas[S.lineaReloj], w = pxFila(fila) / 5;
    var rIn = 3.63 * w, rOut = Math.max(Math.min(l.clientWidth - 32, l.clientHeight - 40) / 2 - 30, rIn + 6 * w), R = rOut + 30, s = '';
    for (var h = 1; h <= 12; h++) {
      var a = h * Math.PI / 6;
      s += '<line x1="0" y1="' + (-rIn).toFixed(2) + '" x2="0" y2="' + (-rOut).toFixed(2) + '" stroke="#000" stroke-width="' + w.toFixed(3) + '" transform="rotate(' + h * 30 + ')"/>' +
        '<text x="' + ((rOut + 17) * Math.sin(a)).toFixed(2) + '" y="' + (-(rOut + 17) * Math.cos(a)).toFixed(2) + '" text-anchor="middle" dominant-baseline="central" font-size="16" font-family="IBM Plex Sans,system-ui,sans-serif" fill="#111">' + h + '</text>';
    }
    hoja.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (2 * R).toFixed(1) + '" height="' + (2 * R).toFixed(1) + '" viewBox="' + [-R, -R, 2 * R, 2 * R].map(function (v) { return v.toFixed(1); }).join(' ') + '" role="img" aria-label="Reloj astigmático">' + s + '</svg>';
    $('ev-etq').textContent = 'Trazo ' + etiqueta(fila).split(' · ')[0]; $('ev-fino').hidden = trazoFisico(fila) >= 2;
  }

  function enfocarLinea() {
    var l = $('lienzo'), el = $('hoja').querySelector('.fila.actual');
    l.scrollLeft = Math.max(0, (l.scrollWidth - l.clientWidth) / 2);
    if (S.prueba !== 'agudeza' || S.modo !== 'completa' || !el) { l.scrollTop = 0; return; }
    var r = el.getBoundingClientRect(), c = l.getBoundingClientRect();
    l.scrollTop += r.top - c.top - (l.clientHeight - r.height) / 2;
  }
  function mover(paso) {
    var j = S.juego;
    if (S.prueba !== 'agudeza') {
      var k = S.prueba === 'bicro' ? 'lineaBicro' : 'lineaReloj';
      S[k] = Math.max(0, Math.min(j.filas.length - 1, S[k] + paso));
      S.bicro = null; renderEval(); enfocarLinea(); return;
    }
    if (S.modo === 'optotipo') {
      var o = S.opt + paso;
      if (o < 0) { if (S.linea > 0) { S.linea--; S.opt = j.sim[S.linea].length - 1; } }
      else if (o >= j.sim[S.linea].length) { if (S.linea < j.filas.length - 1) { S.linea++; S.opt = 0; } }
      else S.opt = o;
    } else { S.linea = Math.max(0, Math.min(j.filas.length - 1, S.linea + paso)); S.opt = 0; }
    renderEval(); enfocarLinea();
  }
  function abrirEval() {
    if (!calValida()) return;
    S.juego = nuevoJuego(); S.linea = 0; S.opt = 0; S.ocultar = false; S.enEval = true;
    S.prueba = 'agudeza'; S.bicro = null; S.lineaReloj = lineaRelojInicial(); S.lineaBicro = 0;
    S.juego.filas.forEach(function (x, k) { if (x.den20 >= 40) S.lineaBicro = k; });
    $('eval').hidden = false; $('eval').classList.remove('limpio'); $('ev-mostrar').hidden = true;
    $('principal').hidden = true;
    renderEval(); enfocarLinea();
  }
  function cerrarEval() {
    S.enEval = false;
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () { });
    $('eval').hidden = true; $('principal').hidden = false;
    guardar(); render();
  }

  /* ---------- Pruebas ---------- */
  function ejecutarPruebas() {
    var r = window.Pruebas.ejecutar(), ok = r.filter(function (p) { return p.ok; }).length;
    $('pr-resumen').textContent = ok + ' de ' + r.length + ' pruebas correctas';
    $('pr-lista').innerHTML = r.map(function (p) {
      return '<li><span class="r ' + (p.ok ? 'ok' : 'no') + '">' + (p.ok ? 'OK' : 'FALLA') + '</span><span>' + p.nombre + '<small>' + p.detalle + '</small></span></li>';
    }).join('');
  }

  /* ---------- Eventos ---------- */
  function iniciar() {
    cargar();
    S.calPpm = S.cal ? S.cal.pxPorMm : (window.matchMedia('(pointer: coarse)').matches ? 6.3 : 96 / 25.4);

    $('ruta').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b && !b.disabled) irA(Number(b.dataset.ir)); });
    $('atras').addEventListener('click', function () { irA(S.paso - 1); });
    $('siguiente').addEventListener('click', function () { irA(S.paso + 1); });

    $('cal-metodos').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      S.calPpm = factorMedido().media; S.metodo = b.dataset.m; reiniciarRect(); renderCal();
    });
    $('sel-equipo').innerHTML = '<option value="">Elija el modelo…</option>' + window.Equipos.map(function (g) {
      return '<optgroup label="' + g.grupo + '">' + g.modelos.map(function (m) { return '<option value="' + m[1] + '">' + m[0].replace(/"/g, '&quot;') + '</option>'; }).join('') + '</optgroup>';
    }).join('') + '<option value="otro">Otro celular, tableta o monitor</option>';
    $('sel-equipo').addEventListener('change', renderCal);
    $('in-diag').addEventListener('input', renderCal);
    $('in-ref-w').addEventListener('input', function () { reiniciarRect(); renderCal(); });
    $('in-ref-h').addEventListener('input', function () { reiniciarRect(); renderCal(); });
    $('ajustes').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var d = Number(b.dataset.d) * 0.5;
      if (b.dataset.aj === 'w') S.calW = Math.max(40, S.calW + d); else S.calH = Math.max(40, S.calH + d);
      renderCal();
    });
    var asa = $('cal-asa'), arrastre = null;
    asa.addEventListener('pointerdown', function (e) {
      arrastre = { x: e.clientX, y: e.clientY, w: S.calW, h: S.calH };
      try { asa.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
      e.preventDefault();
    });
    asa.addEventListener('pointermove', function (e) {
      if (!arrastre) return;
      S.calW = Math.max(40, arrastre.w + e.clientX - arrastre.x); S.calH = Math.max(40, arrastre.h + e.clientY - arrastre.y);
      renderCal();
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) { asa.addEventListener(ev, function () { arrastre = null; }); });
    $('comenzar').addEventListener('click', function () { irA(1); });
    $('cal-continuar').addEventListener('click', function () { irA(2); });
    $('cal-rehacer').addEventListener('click', function () { S.recalibrando = true; reiniciarRect(); render(); });
    $('cal-guardar').addEventListener('click', function () {
      var fm = factorMedido(); if (fm.falta) return;
      S.calPpm = fm.media;
      S.cal = { pxPorMm: S.calPpm, metodo: S.metodo, firma: firma(), hora: Date.now() };
      S.recalibrando = false; guardar(); render(); window.scrollTo(0, 0);
    });

    $('vision-seg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { S.vision = b.dataset.v; guardar(); render(); } });
    $('dist-chips').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { S.distLejos = Number(b.dataset.d); S.otra = false; guardar(); render(); } });
    $('chk-otra').addEventListener('change', function () {
      S.otra = this.checked;
      if (!S.otra && PRESETS.indexOf(S.distLejos) < 0) { S.distLejos = 6000; guardar(); }
      render();
    });
    $('dist-aplicar').addEventListener('click', function () {
      var mm = Math.round(parseFloat($('in-dist').value) * ($('sel-unidad').value === 'm' ? 1000 : 10));
      if (!(mm >= 1000 && mm <= 20000)) { $('dist-resumen').textContent = 'Escriba una distancia entre 1 m y 20 m.'; return; }
      S.distLejos = mm; guardar(); render();
    });

    $('conj-op').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { S.conjunto = b.dataset.c; guardar(); render(); } });
    $('sel-notacion').addEventListener('change', function () { S.notacion = this.value; guardar(); render(); });
    $('sel-modo').addEventListener('change', function () { S.modo = this.value; guardar(); });
    $('iniciar').addEventListener('click', abrirEval);

    $('ev-prueba').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { S.prueba = b.dataset.p; S.bicro = null; renderEval(); enfocarLinea(); } });
    $('ev-modo').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { S.modo = b.dataset.m; S.opt = 0; renderEval(); enfocarLinea(); } });
    $('ev-ant').addEventListener('click', function () { mover(-1); });
    $('ev-sig').addEventListener('click', function () { mover(1); });
    $('hoja').addEventListener('click', function (e) {
      var f = e.target.closest('.fila');
      if (f && S.prueba === 'agudeza' && S.modo === 'completa') { S.linea = Number(f.dataset.i); renderEval(); }
    });
    $('ev-azar').addEventListener('click', function () { if (S.prueba === 'bicro') S.bicro = null; else { S.juego = nuevoJuego(); S.opt = 0; } renderEval(); });
    $('ev-inferiores').addEventListener('click', function () { S.ocultar = !S.ocultar; renderEval(); });
    $('ev-pc').addEventListener('click', function () {
      var el = document.documentElement, b = this;
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (el.requestFullscreen) el.requestFullscreen().catch(function () { b.textContent = 'Pantalla completa no disponible'; });
        else b.textContent = 'Pantalla completa no disponible';
      } catch (e) { b.textContent = 'Pantalla completa no disponible'; }
    });
    $('ev-ocultar-ctrl').addEventListener('click', function () { $('eval').classList.add('limpio'); $('ev-mostrar').hidden = false; });
    $('ev-mostrar').addEventListener('click', function () { $('eval').classList.remove('limpio'); this.hidden = true; });
    $('ev-fin').addEventListener('click', cerrarEval);
    document.addEventListener('keydown', function (e) {
      if (!S.enEval) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); mover(1); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
      else if (e.key === 'Escape') { $('eval').classList.remove('limpio'); $('ev-mostrar').hidden = true; }
    });

    $('pr-ejecutar').addEventListener('click', ejecutarPruebas);
    $('borrar').addEventListener('click', function () {
      try { localStorage.removeItem(CLAVE); } catch (e) { /* nada que borrar */ }
      S.cal = null; S.recalibrando = false; S.paso = 0; S.guardado = false;
      render(); $('guardado').textContent = 'Datos borrados de este dispositivo.';
    });

    var alCambiar = function () { S.bicro = null; if (refDims().v !== S.refV) reiniciarRect(); if (S.paso > maxPaso()) S.paso = 1; if (!S.enEval) render(); renderEval(); };
    window.addEventListener('resize', alCambiar);
    window.addEventListener('orientationchange', alCambiar);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', alCambiar);

    reiniciarRect(); renderGuardado(); render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
