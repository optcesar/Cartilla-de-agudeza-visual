# Cartilla de agudeza visual

Cartilla de agudeza visual digital con optotipos a tamaño real, para celular, tableta y computadora.

Desarrollada por **Lic. Opt. César Fernández Lima** · Instagram [@meibolab](https://www.instagram.com/meibolab/)

## Qué hace

- **Cartilla de Snellen** para visión lejana (3, 4, 5, 6 m u otra distancia) y cercana (30 cm).
- **Optotipos vectoriales** en cuadrícula 5 × 5: letras Sloan y E direccional.
- **Tamaño físico real**, calculado por ángulo visual: `θ = 5 × (denominador / numerador)` minutos de arco y `H = 2 × D × tan(θ/2)`.
- **Calibración de pantalla** por modelo de equipo (iPhone, iPad), por tamaño en pulgadas, con una tarjeta o con otra referencia. Se guarda en el dispositivo.
- **Pruebas adicionales:** bicromática rojo-verde y reloj astigmático.
- Notación 20/x, 6/x o decimal; cartilla completa, una línea o un optotipo; aleatorizar, ocultar líneas inferiores y pantalla completa.

## Cómo usarla

Abra `index.html` en un navegador. No requiere instalación ni servidor.

Para publicarla con GitHub Pages: **Settings → Pages → Deploy from a branch → main / (root)**.

## Estructura

| Archivo | Contenido |
| --- | --- |
| `index.html` | Portada y asistente de cuatro pasos |
| `css/estilos.css` | Estilos |
| `js/geometria.js` | Motor de cálculo (ángulo visual, mm ↔ px, equivalencias) |
| `js/optotipos.js` | Optotipos SVG |
| `js/cartillas.js` | Definición de las líneas de la cartilla |
| `js/equipos.js` | Tamaño de pantalla por modelo de equipo |
| `js/pruebas.js` | Pruebas automatizadas del motor |
| `js/app.js` | Interfaz |

## Pruebas

```
node js/pruebas.js
```

También pueden ejecutarse desde la página, en "Pruebas de verificación".

## Aviso

Una pantalla digital no equivale automáticamente a una cartilla clínica certificada. Se requiere validación metrológica y clínica antes de usarla en decisiones diagnósticas. Los optotipos, los colores de la prueba bicromática y el reloj astigmático son construcciones propias de este proyecto y no han sido contrastados con instrumentos certificados.
