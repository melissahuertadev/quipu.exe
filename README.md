# QUIPU.EXE

QUIPU.EXE es un juego de puzzles 2D inspirado artísticamente en los quipus andinos. Ordena cuerdas y nudos para restaurar cinco memorias sobre la calma, las diferencias, la escucha, el pasado y la convivencia.

El juego propone una interpretación artística contemporánea; no pretende explicar ni atribuir significados históricos a los quipus.

Creado para **Hack the Andes Challenge**.

## Requisitos

- Node.js y npm
- Un navegador moderno con soporte para Canvas y Web Audio API

## Ejecutar localmente

```bash
npm install
npm run dev
```

Vite mostrará la dirección local donde puedes abrir el juego.

Para generar y revisar la versión de producción:

```bash
npm run build
npm run preview
```

## Cómo jugar

- Arrastra las cuerdas con el ratón o tócalas y muévelas en una pantalla táctil.
- Ordena cada grupo según la instrucción del nivel.
- Completa los cinco niveles para llegar al epílogo.
- Los controles de viento y efectos de sonido están disponibles en el juego; sus preferencias se guardan en el navegador.

## Ranking

La versión actual guarda las diez mejores partidas **localmente en el navegador**. No es un ranking global ni sincroniza resultados entre dispositivos. La puntuación es `segundos + (5 × movimientos)`; gana la puntuación menor y los empates se ordenan por menor tiempo.

Los resultados se guardan en `localStorage` y pueden borrarse desde la pantalla del ranking. Borrar los datos del sitio en el navegador también puede eliminarlos.

## Estructura del proyecto

```text
index.html                 Página de entrada
src/main.js                Escena Phaser, niveles, interacción y progresión
src/style.css              Estilos de la interfaz
src/ranking.js             Ranking y puntuación local
src/audio/audio-manager.js Audio opcional generado mediante Web Audio API
src/components/             Dibujo del quipu y del paisaje
src/assets/fonts/           Fuentes locales y licencias
docs/                       Notas de implementación de componentes visuales
```

El proyecto usa Phaser 3 y Vite. La entrada activa es `src/main.js`; `main.jsx` y `styles.css` son archivos heredados y no forman parte de la entrada configurada en `index.html`.

## Tipografías y licencias

DM Sans y Lora se incluyen como archivos locales con sus avisos de licencia SIL Open Font License (OFL) en `src/assets/fonts/` y `public/licenses/`.

## Créditos

**Made with ♥ by mhdev** — [melissahuerta.dev](https://melissahuerta.dev/)
