# CineClub

API REST de una plataforma de reseñas de películas, sobre **Node.js + Express +
MySQL**, con la lógica de negocio en **procedimientos almacenados** en vez de en
los handlers. El front es **React** en `front/`.

## La decisión de diseño

Los handlers no escriben SQL de negocio. Cada endpoint llama a un procedimiento
almacenado y solo traduce el resultado a un código HTTP:

```js
db.query("CALL sp_AgregarPelicula(?, ?, ?, ?, ?, ?, @resultado, @mensaje, @pelicula_id)",
  [titulo, sinopsis, director, genero, anio, imagen],
  (err) => {
    db.query("SELECT @resultado AS resultado, @mensaje AS mensaje", (err, output) => {
      const { resultado, mensaje } = output[0];
      if (resultado === 1) return res.status(200).json({ message: mensaje, pelicula_id });
      // el mensaje decide el status
    });
  });
```

De los 20 endpoints, **18 delegan en un procedimiento**. Los otros 2 están aquí a
propósito: `GET /api/health` solo ejecuta `SELECT 1` (no hay lógica de negocio
que encapsular) y `PUT /api/resenias/:id` es la excepción que documenta
[Huecos conocidos](#huecos-conocidos).

## Correrlo

Requisitos: **Node.js 20+** y **MySQL** corriendo localmente.

### Base de datos

```bash
mysql -u root -p < "Prograweb 2.sql"     # esquema: 8 tablas
mysql -u root -p < "Stored Procedures.sql"  # procedimientos
```

El esquema **no siembra ninguna cuenta**: no hay usuario con el que entrar la
primera vez. `Prograweb 2.sql` incluye el `INSERT` del administrador como
ejemplo comentado; descoméntalo y cambia el correo y la contraseña antes de
correrlo, o crea el usuario desde el registro de la app (que asigna `rol_id = 1`).
Para administrar necesitas `rol_id = 2`, así que el `INSERT` manual es el camino
corto la primera vez.

> **Lo que había que arreglar para que esto cargara, y ya está arreglado.** Los
> comandos de arriba se ejecutaron completos contra un MySQL 8.0 limpio y
> cargan 8 tablas y 19 procedimientos sin un solo error. Para llegar ahí hizo
> falta corregir cuatro cosas, todas en el `.sql`:
>
> 1. **Los `select * from` de depuración.** Cuatro sentencias de las que dejaste
>    al iterar; la primera (`select * from usuarios;`, antes de que la tabla
>    existiera) abortaba el script entero con error 1146. El cliente `mysql`
>    se detiene en el primer error, así que un clon limpio se quedaba con cero
>    tablas.
> 2. **El orden de las claves foráneas.** `peliculas` declara
>    `FOREIGN KEY (genero_id) REFERENCES generos(id)` y `generos` se crea
>    después. Ahora la carga va envuelta en `SET FOREIGN_KEY_CHECKS = 0`.
> 3. **Una columna duplicada.** `reseñas` declaraba `fecha_actualizacion` en el
>    `CREATE TABLE` y luego un `ALTER TABLE` intentaba añadirla otra vez
>    (error 1060).
> 4. **Las mayúsculas de los nombres de tabla.** El esquema creaba
>    `Usuarios`, `Generos` y `Peliculas`, pero los procedimientos las pedían en
>    minúscula. En Windows MySQL da igual porque `lower_case_table_names = 1`;
>    en Linux y macOS es error 1146, y **15 de los 17 procedimientos no
>    funcionaban fuera de Windows**. Todos los nombres están ahora en minúscula.
>
> Más `SET NAMES utf8mb4` al principio de cada `.sql`: los acentos de
> `contraseña`, `reseñas` y `Acción` son UTF-8 de dos bytes y sin esa línea el
> cliente los manda como latin1 y MySQL no reconoce los identificadores.
>
> **Lo que faltaba y ya no:** de los 18 procedimientos que la API invoca, el
> `.sql` solo definía 16. `sp_ModificarPelicula` y `sp_EliminarPelicula` no
> existían, así que `POST /api/modificarPelicula` y
> `DELETE /api/peliculas/:id` devolvían 500 con `ER_SP_DOES_NOT_EXIST`
> (error 1305). Ahora los 18 están definidos y los dos endpoints responden.
> `sql-consistencia.test.js` comprueba que todo `CALL` de `server.js` tenga su
> procedimiento y que la firma declare los parámetros que la llamada pasa, así
> que esto no se puede volver a romper en silencio.

### API

```bash
cd server
npm install
npm start        # http://localhost:3000
npm test         # 143 tests, sin MySQL
```

La conexión a MySQL se configura con variables de entorno: copia
`server/.env.example` a `server/.env` y ajusta los valores. El `.env` real no
se sube al repositorio (está en `.gitignore`).

### Frontend

```bash
cd front
npm install
npm start        # http://localhost:3001
```

Es una app de **Create React App**. La URL de la API se configura en `front/.env`
con la variable `REACT_APP_API_URL` (por defecto `http://localhost:3000`; en
desarrollo con dev tunnels, la URL pública del backend). Como el backend ocupa
el 3000, el dev server del front toma el **3001** — es el origen que espera el
CORS configurado en `server/server.js`.

## Los 20 endpoints

Tabla generada desde `server/server.js`; no escrita a mano.

| Endpoint | Procedimiento / SQL | Rechaza con 400 | Entrada |
| --- | --- | --- | --- |
| `GET /api/health` | `SELECT 1` (sin procedimiento, a propósito) | — | — |
| `POST /api/register` | `sp_RegistrarUsuario` | — | `nombre`, `email`, `password`, `fechaNacimiento` |
| `POST /api/login` | `sp_LoginUsuario` | — | `email`, `password` |
| `POST /api/updateUser` | `sp_ActualizarUsuario` | — | `id`, `nombre`, `email`, `fecha_nacimiento`, `contraseña` |
| `POST /api/deleteUser` | `sp_DesactivarUsuario` | `Se requiere el ID del usuario` | `id` |
| `POST /api/agregarPelicula` | `sp_AgregarPelicula` | `Faltan campos obligatorios` | `titulo`, `sinopsis`, `director`, `genero`, `anio` |
| `GET /api/generos` | `sp_ObtenerGeneros` | — | — |
| `GET /api/peliculas` | `sp_BuscarPeliculas` | — | — |
| `GET /api/peliculas/:id` | `sp_ObtenerDetallePelicula` | `ID inválido` | `id` |
| `GET /api/resenias/:peliculaId` | `sp_ObtenerReseniasPorPelicula` | `ID de película inválido` | `peliculaId` |
| `DELETE /api/peliculas/:id` | `sp_EliminarPelicula` | — | `id` |
| `POST /api/modificarPelicula` | `sp_ModificarPelicula` | `Faltan campos obligatorios` | `id`, `titulo`, `sinopsis`, `director`, `genero`, `anio` |
| `POST /api/resenias` | `sp_CrearResena` | `Faltan campos obligatorios` | `usuario_id`, `pelicula_id`, `comentario`, `puntuacion` |
| `PUT /api/resenias/:id` | `UPDATE Reseñas` (sin procedimiento) | `El comentario es requerido y debe ser texto`<br>`La puntuación debe ser un número entre 1 y 5` | `comentario`, `puntuacion`, `id` |
| `DELETE /api/resenias/:id` | `sp_EliminarResena` | `ID de reseña inválido` | `id` |
| `GET /api/resenias/usuario/:usuarioId` | `sp_ObtenerResenasPorUsuario` | `ID de usuario inválido` | `usuarioId` |
| `POST /api/favoritos` | `sp_AgregarFavorito` | `Faltan campos obligatorios` | `usuario_id`, `pelicula_id` |
| `POST /api/favoritos/check` | `sp_VerificarFavorito` | `Faltan campos obligatorios` | `usuario_id`, `pelicula_id` |
| `DELETE /api/favoritos` | `sp_EliminarFavorito` | `Faltan campos obligatorios` | `usuario_id`, `pelicula_id` |
| `GET /api/favoritos/usuario/:usuarioId` | `sp_ObtenerFavoritosPorUsuario` | — | `usuarioId` |

### Los procedimientos

| Procedimiento | Qué hace |
| --- | --- |
| `sp_RegistrarUsuario` | Alta de usuario, valida correo duplicado |
| `sp_LoginUsuario` | Verifica credenciales y devuelve el usuario con su rol |
| `sp_ActualizarUsuario` | Actualiza perfil, conserva la contraseña si no se envía otra |
| `sp_DesactivarUsuario` | Baja lógica (`activo = 0`), no borra |
| `sp_AgregarPelicula` | Alta de película, valida que el género exista y evita duplicados por título + director |
| `sp_BuscarPeliculas` | Listado con filtro por texto |
| `sp_ObtenerDetallePelicula` | Detalle de una película |
| `sp_ModificarPelicula` | Actualización de película; valida que exista y que el género sea válido, y con `COALESCE` conserva la imagen si el formulario no manda archivo |
| `sp_EliminarPelicula` | Baja de película; borra primero sus reseñas y favoritos, porque las dos tablas tienen `DELETE_RULE NO ACTION` sobre `peliculas` y sin eso un `DELETE` directo falla con error 1451 |
| `sp_ObtenerGeneros` | Catálogo de géneros |
| `sp_CrearResena` | Alta de reseña: valida usuario, película, duplicado y rango de puntuación |
| `sp_ActualizarResena` | Actualización de reseña — **definido pero nunca invocado** |
| `sp_EliminarResena` | Baja de reseña |
| `sp_ObtenerReseniasPorPelicula` | Reseñas de una película, con el autor |
| `sp_ObtenerResenasPorUsuario` | Reseñas de un usuario |
| `sp_AgregarFavorito` | Marca una película como favorita |
| `sp_VerificarFavorito` | Consulta si es favorita, devolviendo `@es_favorito` |
| `sp_EliminarFavorito` | Quita el favorito, devolviendo `@filas_afectadas` |
| `sp_ObtenerFavoritosPorUsuario` | Favoritos de un usuario |

(19 filas: 18 que la API invoca más `sp_ActualizarResena`, que está definido y
no se usa. Los 18 que la API invoca existen, que es lo que comprueba
`sql-consistencia.test.js`.)

## Esquema

8 tablas: 6 de dominio y 2 de bitácora. Los nombres van todos en minúscula a
propósito — MySQL en Linux y macOS distingue mayúsculas en los identificadores
(`lower_case_table_names = 0`), y en Windows no. Ver la nota de instalación.

| Tabla | Columnas |
| --- | --- |
| `rol` | `id`, `nombre` |
| `usuarios` | `id`, `nombre`, `email` (único), `contraseña`, `fecha_nacimiento`, `avatar`, `fecha_registro`, `rol_id` → `rol`, `activo` |
| `generos` | `id`, `nombre` |
| `peliculas` | `id`, `titulo`, `descripcion`, `fecha_lanzamiento`, `genero_id` → `generos`, `imagen`, `director` |
| `reseñas` | `id`, `usuario_id` → `usuarios`, `pelicula_id` → `peliculas`, `comentario`, `puntuacion` (CHECK 1–5), `fecha_creacion`, `fecha_actualizacion` |
| `favoritos` | `id`, `usuario_id` → `usuarios`, `pelicula_id` → `peliculas`, `fecha_agregado` |
| `error_logs` | `id`, `procedimiento`, `mensaje`, `fecha` — **creada, nunca escrita** |
| `debug_logs` | `id`, `mensaje`, `fecha` — **creada, nunca escrita** |

`rol` se siembra con dos filas (`1 = Usuario`, `2 = Administrador`). No es
cosmético: `usuarios.rol_id` tiene `FOREIGN KEY REFERENCES rol(id)`, así que sin
esas filas cualquier registro falla con error 1452, y el front decide qué
pantallas admin mostrar comparando `user.rol_id === 2`.

Los parámetros que manda la API no siempre se llaman como la columna:
`sinopsis` → `Peliculas.descripcion` y `anio` → `Peliculas.fecha_lanzamiento`.
El mapeo está dentro de cada procedimiento.

## Tests

143 tests, sin MySQL. Ver [`server/TESTS.md`](server/TESTS.md).

```bash
cd server && npm test
```

La suite también corre en CI: [.github/workflows/test.yml](.github/workflows/test.yml).

### Lo que la suite con mocks no puede cubrir

Los 130 tests de los otros cuatro archivos usan un doble de MySQL, así que pasan aunque el `.sql` esté roto.
Por eso el proyecto se verificó además contra un **MySQL 8.0 real** en
contenedor, y esa verificación encontró cosas que los mocks no ven:

- El `.sql` no cargaba. El primer `select * from usuarios;` —una sentencia de
  depuración que quedó antes de que existiera la tabla— abortaba el script con
  error 1146 y el clon limpio se quedaba sin ninguna tabla. Los tests con doble
  nunca lo detectan, porque no leen el archivo.
- Los 15 procedimientos que fallaban fuera de Windows por las mayúsculas de los
  nombres de tabla. Otra vez invisible para los mocks: el doble responde lo que
  le pidan.
- Los dos procedimientos que no existían, `sp_ModificarPelicula` y
  `sp_EliminarPelicula`. `server.js` los llamaba igual: error 1305 y dos
  endpoints en 500. Invisible para los mocks por la misma razón.

Ejercitados contra la base real, en este estado: las 21 llamadas responden como
deben, incluidas las que devuelven errores a propósito (400 por correo
duplicado, 401 por contraseña incorrecta, 409 por reseña duplicada, 400 por id
no numérico). La única que sale del guion es
`DELETE /api/peliculas/abc`, que devuelve 500 en vez de 400: es el hueco 2 de
abajo, y sigue abierto a propósito.

## Health check

```bash
curl http://localhost:3000/api/health
# {"status":"ok","database":"up"}
```

Devuelve **200** si MySQL responde y **503** si no, con `{"status":"error","database":"unreachable"}`.
El 503 es deliberado: es lo que un balanceador lee como "no me envíes tráfico",
mientras que un 500 sugeriría un fallo de la aplicación. El mensaje del driver no
se filtra al cliente, porque puede incluir el usuario y el host de la base.

## Huecos conocidos

Están escritos en `server/__tests__/inventario.test.js` para que no se pierdan de
vista. No son defects pendientes de hacer: son el estado real, medido.

1. **`PUT /api/resenias/:id` se salta la capa de procedimientos.** Es el único
   endpoint que escribe DML en el handler, con un `UPDATE reseñas` directo. Y
   `sp_ActualizarResena` está definido en el `.sql` y no se invoca desde ningún
   sitio, así que la misma lógica existe en dos lugares y solo uno se usa.
   (`GET /api/health` también queda fuera de la capa, pero a propósito: no tiene
   lógica de negocio que encapsular.)

2. **La validación de ids no es uniforme.** `GET /api/peliculas/:id` y
   `GET /api/resenias/usuario/:usuarioId` rechazan un id no numérico con 400;
   `DELETE /api/peliculas/:id` y `GET /api/favoritos/usuario/:usuarioId` no lo
   hacen y se lo pasan a MySQL.

3. **8 de los 20 endpoints no validan la entrada**: `health`, `register`,
   `login`, `updateUser`, `generos`, `peliculas`, `DELETE peliculas/:id` y
   `GET favoritos/usuario/:id`. Van directo a la base, así que un cuerpo vacío
   produce un error de base de datos (500) en lugar de un 400. (`health` no
   necesita validación de entrada; los otros 7 sí.)

4. **La conexión del server se sale del código, pero el password se queda en
   claro en la base.** La conexión ya no está en `server.js`: se lee de
   `server/.env`, `.env.example` documenta las variables y el `.env` real está
   en `.gitignore`. `Prograweb 2.sql` tampoco siembra ninguna cuenta — el
   `INSERT` del administrador es ahora un ejemplo comentado, porque publicar una
   contraseña conocida da acceso a cualquier base que alguien cree desde este
   repositorio. Ese archivo **no** se puede mover a `.env`: es SQL que se
   ejecuta para crear el esquema.

5. **Contraseñas sin cifrar.** La columna es `Usuarios.contraseña VARCHAR(255)`
   y `sp_LoginUsuario` compara directamente contra lo que llega en el `POST
   /api/login`. El ancho de la columna ya daría para un hash (`bcrypt` produce
   60 caracteres) y `dotenv` ya está en `dependencies`, así que el trabajo
   pendiente es: hashear en el registro y en el update, comparar con
   `bcrypt.compare` en el login, y migrar las filas existentes. No se hizo
   porque rompe las cuentas que ya existieran en una base desplegada.
