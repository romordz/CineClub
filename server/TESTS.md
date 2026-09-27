# Tests de integración

130 tests sobre los 20 endpoints de la API, sin necesidad de MySQL: la conexión
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
