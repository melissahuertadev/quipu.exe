# Componentes visuales de QUIPU.EXE

Los dibujos del escenario viven en `src/components/`. Son funciones de Phaser: reciben la escena y los datos de dibujo, crean objetos `Graphics` y los agregan al contenedor o escena indicado. No contienen reglas del puzle ni cambian los datos de los cinco niveles.

## Cómo se arma el nivel

```text
QuipuScene.renderLevel()
├── drawMountainBackdrop(scene, tamaño)
│   ├── fondo índigo
│   ├── resplandor cálido
│   ├── cordillera lejana + cordillera cercana
│   ├── neblina
│   └── polvo ambiental
├── drawMainCord(scene, posición y ancho)
└── por cada cuerda del nivel
    └── drawFiberRope(scene, container, color + medidas)
        ├── sombra y cuerpo de fibra
        ├── diagonales de torsión
        ├── drawFiberKnot(...) repetido
        └── flecos
```

El orden importa: el fondo se dibuja primero; después, la cuerda principal; al final, las cuerdas colgantes. Así el jugador puede arrastrar cada cuerda sin que el escenario interfiera con su hit area.

## Cuerda y nudos

Archivo: `src/components/quipu-cord.js`.

```js
const rope = scene.add.container(x, y);
drawFiberRope(scene, rope, {
  color: 0xd67d62, // color original del nivel
  width: 11,       // grosor base de la fibra
  length: 210,     // largo dibujado en píxeles
  knots: 5,        // valor del nivel de nudos
  isLength: false, // true en niveles que ordenan por longitud
  gap: 150,        // espacio entre cuerdas; limita el ancho del lazo
});
```

`drawFiberRope` apila varios trazos: primero una sombra desplazada, luego una base oscura, el color del hilo y una luz fina. Las diagonales alternas simulan hebras retorcidas. Los flecos se dibujan como cinco fibras sueltas en la punta.

`drawFiberKnot(graphics, datos)` dibuja un lazo elíptico con borde de sombra, núcleo de color y dos cruces claros que sugieren el enrollado. `drawFiberRope` lo repite según `knots`. En los niveles de longitud se usan dos nudos ornamentales constantes: el largo visible es el atributo que cambia.

La cuerda se agrega a un `Container`, que es el mismo objeto que Phaser hace interactivo y arrastrable. Por eso el dibujo puede tener varias capas, pero se mueve como una sola pieza.

## Cuerda principal

`drawMainCord(scene, { x, y, width, color })` genera un contenedor horizontal con tres trazos superpuestos: sombra, fibra oscura y núcleo claro. Las diagonales cortas a lo largo del núcleo sugieren torsión. El punto `(x, y)` es el centro de la cuerda y `width` determina el tramo que ocupa.

## Montañas y ambiente

Archivo: `src/components/mountain-backdrop.js`.

```js
drawMountainBackdrop(scene, {
  width: scene.scale.width,
  height: scene.scale.height,
  particleTexture: 'quipu-dust', // textura pequeña generada por código
});
```

Las cumbres se especifican como proporciones del canvas: por ejemplo, `width * .47` ubica un pico al 47 % del ancho y `height * .26` lo ubica al 26 % de la altura. La primera cordillera usa índigo algo más claro; la segunda usa un tono más oscuro y queda delante. Una serie de círculos transparentes crea el resplandor, una elipse da la neblina y un emisor de partículas mueve polvo con poca opacidad.

Para cambiar la silueta, edita los puntos que siguen a `mountains.moveTo` y `mountains.lineTo`. Para cambiar el ambiente, ajusta los colores/opacidades de `glow`, las dos cordilleras o `haze`. Las partículas no usan archivos de imagen: `createDustTexture()` las genera con un círculo pequeño de Phaser.

## Ajustes rápidos

| Quiero cambiar… | Editar… |
| --- | --- |
| Color de una cuerda | `colors` del nivel en `src/main.js` |
| Cantidad de nudos del puzle | `values` del nivel; la función de cuerda ya lo refleja |
| Grosor de las cuerdas | `cordWidth` en `renderLevel()` |
| Separación y forma de la torsión | `twistStep` y `offset` en `quipu-cord.js` |
| Forma de los nudos | `drawFiberKnot()` en `quipu-cord.js` |
| Altura o picos de las montañas | proporciones de `moveTo`/`lineTo` en `mountain-backdrop.js` |
| Calidez o visibilidad de la luz/neblina | alpha y color de `glow`/`haze` |
| Densidad y velocidad del polvo | `frequency`, `lifespan`, `speedX` y `speedY` del emisor |

Las animaciones y las reglas de intercambio/validación siguen en `QuipuScene`. Los componentes solo dibujan, así que se pueden ajustar sin modificar el orden, el arrastre ni la progresión.
