# Leaderboard de Talo

El cliente Phaser se comunica con dos funciones serverless de Vercel (`/api/leaderboard` y `/api/runs`). Estas funciones guardan `TALO_GAME_API_KEY` en el servidor y llaman a Talo; la clave nunca se incorpora al bundle público. Si falta una variable de servidor, las funciones responden con un error claro y el cliente no muestra datos locales como si fueran globales.

## Contrato que consume el juego

El proxy debe permitir solicitudes CORS desde el origen público del juego y exponer estas rutas bajo la URL configurada:

- `GET /api/leaderboard?limit=50` responde `{ "entries": [...] }`. Cada entrada usa `{ "runId": "…", "name": "…", "elapsedMs": 123000, "totalMoves": 12, "score": 183, "position": 1 }`. `position` es opcional y de base 1. Devuelve entradas no ocultas ordenadas por Talo.
- `POST /api/runs` recibe `{ "runId": "…", "playerId": "…", "name": "…", "elapsedMs": 123000, "totalMoves": 12, "score": 183 }`. El servidor calcula la puntuación y devuelve `{ "entry": { "id": 1 } }` al aceptar la partida, o un error HTTP con `{ "message": "…" }`.

La función calcula `round(elapsedMs / 1000) + 5 * totalMoves`, valida rangos básicos, identifica al jugador con el servicio `anonymous` y el `playerId` recibido como identificador estable, y crea la entrada con los props `runId`, `name`, `elapsedMs` y `totalMoves`. El identificador anónimo se conserva en localStorage y se reutiliza; no se crea una identidad diferente en cada sesión salvo que el jugador borre los datos del sitio. El nombre visible viaja como prop de cada partida, separado de la identidad persistente. Talo documenta [identificación de jugadores](https://docs.trytalo.com/1.x/http/player-api) y [lectura/escritura de leaderboards](https://docs.trytalo.com/1.x/http/leaderboard-api).

Para que un reintento tras una respuesta de red perdida no cree otra fila, configura el leaderboard en Talo con `Unique` y `Unique by props` activados. El cliente conserva exactamente el mismo `runId` y payload de una partida una vez que intenta enviarla. El proxy debe reutilizar la misma identidad del jugador y los mismos props al reintentar. Configura `Sort mode: ascending` y `Refresh interval: never`.

Talo solo configura orden ascendente o descendente por puntuación. El cliente ordena por puntuación y, entre las primeras 50 entradas recibidas, desempata por menor tiempo. Talo no ofrece un desempate secundario global en la configuración documentada, así que los puestos de empates que cruzaran páginas podrían no coincidir con el orden local de esas páginas.

## Dashboard y credenciales

1. Crea el juego en el dashboard de Talo y un leaderboard para partidas completas. Elige un nombre visible y un `Internal name`; no hay un identificador predefinido en este proyecto.
2. Configura `Sort mode` ascendente, `Unique` activado, `Unique by props` activado y `Refresh interval` en nunca.
3. Crea una game API key con `read:leaderboards`, `read:players`, `write:players` y `write:leaderboards`. En Vercel, añade `TALO_GAME_API_KEY` como variable de entorno para Functions (Production y Preview según necesites); no la declares como `VITE_*`.
4. En Vercel configura `TALO_LEADERBOARD_INTERNAL_NAME` con el valor exacto que elegiste en Talo y `TALO_ALLOWED_ORIGINS` con el origen del juego (por ejemplo `https://tu-dominio.vercel.app`, sin ruta; puedes separar varios orígenes con comas). La comprobación de origen habilita CORS, pero no autentica solicitudes ni evita por sí sola puntuaciones falsificadas.
5. En Vercel configura `VITE_TALO_PROXY_URL` como `https://tu-dominio.vercel.app/api`. En desarrollo con Vite, configura esa misma variable en `.env.local`; para probar las funciones serverless localmente se necesita Vercel CLI (`vercel dev`) y las variables locales de servidor. Reinicia el servidor después de cambiar variables.
6. Tras cambiar variables del proyecto Vercel, vuelve a desplegar para que el build de Vite capture la URL pública y las funciones reciban sus secretos. Prueba lectura, envío de una partida, reintento del mismo `runId`, solicitud sin conexión y lectura de las diez mejores.

## Integridad y datos

La identidad anónima persistente no autentica que una partida sea legítima. El proxy protege la clave y valida formato/rangos, pero los tiempos, movimientos, nombre e identidad se originan en el navegador y pueden manipularse. El endpoint público puede recibir envíos automatizados; sin autenticación ni estado de rate limiting no hay protección contra abuso y los resultados no están verificados contra trampas. La validación de reglas requeriría verificar la partida en una autoridad de servidor, algo que el juego actual no hace.

Las partidas completadas que no se envían quedan en localStorage para mostrar el resultado personal y reintentar. Las filas globales solo proceden de la respuesta del proxy/Talo.
