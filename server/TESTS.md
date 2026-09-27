# Tests de integración

143 tests sobre los 20 endpoints de la API, sin necesidad de MySQL: la conexión
se sustituye por un doble que responde el patrón de dos pasos que usan los
handlers.

```bash
cd server
npm install
npm test
```

## Qué cubren

| Archivo | Qué fija |
| --- | --- |
| `__tests__/validacion.test.js` | Qué entradas se rechazan con 400, y que el rechazo ocurra **antes** de consultar MySQL |
| `__tests__/contrato-sp.test.js` | Que cada endpoint invoque su procedimiento con los argumentos en el orden esperado, y que ningún handler emita DML directo |
| `__tests__/comportamiento.test.js` | La traducción de `@resultado`/`@mensaje` a códigos HTTP, y la respuesta ante fallo de base de datos |
| `__tests__/inventario.test.js` | Que las 20 rutas registradas estén cubiertas, y documenta tres huecos conocidos |
| `__tests__/sql-consistencia.test.js` | Que los `.sql` estén de acuerdo con el código que los invoca: nombres de tabla, orden de carga y credenciales |

## Por qué hay un archivo que no usa el doble de MySQL

Los otros cuatro archivos usan `helpers/mock-db.js`, que responde lo que le
pidan. Pasan aunque los `.sql` estén rotos, porque nunca los leen. Eso es
justo lo que pasó: los 130 tests estaban en verde mientras el esquema no cargaba
y 15 de los 17 procedimientos fallaban fuera de Windows.

`sql-consistencia.test.js` lee `Prograweb 2.sql`, `Stored Procedures.sql` y
`server.js` del disco y los contrasta entre sí. No hace falta una base de datos
para eso, y es el único archivo que puede fallar por esa causa.

Lo que fija, y por qué:

| Test | Bug que ya encontró |
| --- | --- |
| 8 tablas en minúscula | El esquema creaba `Usuarios`/`Generos`/`Peliculas` y los procedimientos las pedían en minúscula: 15 de 17 rotos en Linux y macOS |
| Sin `select * from` de depuración | El primero iba antes de que existiera su tabla y abortaba la carga con error 1146 |
| `rol` sembrada | `usuarios.rol_id` tiene FK a `rol(id)`; con la tabla vacía, todo registro fallaba con 1452 |
| Sin `INSERT` en `usuarios` | Era una contraseña de administrador en claro, en un repositorio público |
| Sin columna duplicada | `reseñas` declaraba `fecha_actualizacion` dos veces: error 1060 |
| `USE` y `SET NAMES utf8mb4` en los `.sql` | Sin el primero, error 1046; sin el segundo, los acentos de `contraseña` y `reseñas` no se reconocen |
| Todo `CALL` de `server.js` existe en el `.sql` | `sp_ModificarPelicula` y `sp_EliminarPelicula` no estaban definidos: error 1305 y dos endpoints en 500 |
| Los parámetros del `CALL` son los que declara la firma | La firma no es libre; si uno de los dos lados cambia y el otro no, falla al ejecutar |
| `.env.example` documenta cada variable `DB_*` que `server.js` lee | `DB_PORT` no existía en ningún lado: mover MySQL a otro puerto exigía tocar código, no configuración |

Para comprobar que el guardián sirve, se rompieron las cosas a mano y se
volvieron a arreglar:

| Mutación | Resultado |
| --- | --- |
| Se volvió a poner `CREATE TABLE Usuarios` | 3 de los 10 tests de entonces fallan |
| Se borró `sp_EliminarPelicula` del `.sql` | 1 de los 12 falla: el que comprueba que todo `CALL` existe |
| Se añadió `IN p_extra` a la firma de `sp_ModificarPelicula` | 1 de los 12 falla: el que compara el conteo de parámetros |

La segunda de esas tres es la que importa: era un bug real, y los 130 tests con
mocks no lo veían porque el doble responde a cualquier `CALL`.

## El patrón de dos pasos

Los procedimientos devuelven un par `@resultado` / `@mensaje`. Cada handler hace
dos consultas:

```js
db.query("CALL sp_AgregarPelicula(?, ..., @resultado, @mensaje)", params, (err) => {
  db.query("SELECT @resultado AS resultado, @mensaje AS mensaje", (err, output) => {
    const { resultado, mensaje } = output[0];
    // resultado === 1 -> exito, si no -> el mensaje decide el status
  });
});
```

`helpers/mock-db.js` imita ese doble paso: una regla por SQL, y un
comportamiento por defecto (`CALL` devuelve un result set vacío, `SELECT @`
devuelve `resultado = 1`). `cuando()` sobrescribe lo que haga falta en cada caso.

## Por qué `server.js` exporta `app`

`server.js` tiene el servidor y la aplicación en el mismo archivo, así que
importarlo abría un puerto y una conexión a MySQL. La parte de arriba exporta
`{ app, db }` y solo llama a `app.listen` cuando el archivo se ejecuta
directamente:

```js
if (require.main === module) {
  app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
}

module.exports = { app, db };
```

Sin ese cambio no hay forma de probar los handlers sin levantar el servidor.

## El health check y por qué no usa procedimiento

`GET /api/health` ejecuta `SELECT 1` y devuelve 200 con la base arriba, 503 con
la base caída. Es la única ruta fuera de la capa de procedimientos, y el test de
inventario lo lista como excepción a propósito:

```js
const SIN_PROCEDIMIENTO = ["PUT /api/resenias/:id", "GET /api/health"];
```

Un health check no tiene lógica de negocio que encapsular, así que un
`sp_HealthCheck` que solo devuelva 1 no aportaría nada.

El 503 es intencional: es lo que un balanceador lee como "no me envíes tráfico".
Un 500 sugeriría un fallo de la propia aplicación, que no es el caso. Y el
mensaje del driver no se filtra al cliente, porque puede traer el usuario y el
host de la base.

## Bugs que encontró esta suite

- **Reseña duplicada devolvía 500 en vez de 409.** El handler comparaba
  `mensaje.includes("ya has reseñado")` en minúsculas, pero `sp_CrearResena`
  emite `'Ya has reseñado esta película'` con mayúscula inicial. La rama del 409
  era inalcanzable. Corregido con `toLowerCase()` en
  `comportamiento.test.js`.

## Desactivar el silencio de logs

Los handlers hacen `console.log` en casi todos los casos, así que la
configuración los silencia. Para ver la salida real:

```bash
CINE_LOG=1 npm test
```

En Windows PowerShell:

```powershell
$env:CINE_LOG=1; npm test
```
