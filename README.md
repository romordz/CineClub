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

> **El esquema no es reproducible tal como está.** En `Prograweb 2.sql`, la tabla
> `Peliculas` declara `FOREIGN KEY (genero_id) REFERENCES Generos(id)` en la
> línea 40, pero `Generos` no se crea hasta la línea 45. MySQL rechaza la
> sentencia. Hay que crear `Generos` antes que `Peliculas`, o envolver la carga
> en `SET FOREIGN_KEY_CHECKS = 0; ... SET FOREIGN_KEY_CHECKS = 1;`.
>
> Además `Stored Procedures.sql` define 17 de los 18 procedimientos que la API
> invoca: faltan `sp_EliminarPelicula` y `sp_ModificarPelicula`, así que un
> clon limpio no corre la API completa.

### API

```bash
cd server
npm install
npm start        # http://localhost:3000
npm test         # 130 tests, sin MySQL
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

### Los 18 procedimientos

| Procedimiento | Qué hace |
| --- | --- |
| `sp_RegistrarUsuario` | Alta de usuario, valida correo duplicado |
| `sp_LoginUsuario` | Verifica credenciales y devuelve el usuario con su rol |
| `sp_ActualizarUsuario` | Actualiza perfil, conserva la contraseña si no se envía otra |
| `sp_DesactivarUsuario` | Baja lógica (`activo = 0`), no borra |
| `sp_AgregarPelicula` | Alta de película, valida que el género exista y evita duplicados por título + director |
| `sp_BuscarPeliculas` | Listado con filtro por texto |
| `sp_ObtenerDetallePelicula` | Detalle de una película |
| `sp_ModificarPelicula` | Actualización de película |
| `sp_EliminarPelicula` | Baja de película |
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
no se usa.)

## Esquema

8 tablas: 6 de dominio y 2 de bitácora.

| Tabla | Columnas |
| --- | --- |
| `Rol` | `id`, `nombre` |
| `Usuarios` | `id`, `nombre`, `email` (único), `contraseña`, `fecha_nacimiento`, `avatar`, `fecha_registro`, `rol_id` → `Rol`, `activo` |
| `Generos` | `id`, `nombre` |
| `Peliculas` | `id`, `titulo`, `descripcion`, `fecha_lanzamiento`, `genero_id` → `Generos`, `imagen`, `director` |
| `Reseñas` | `id`, `usuario_id` → `Usuarios`, `pelicula_id` → `Peliculas`, `comentario`, `puntuacion` (CHECK 1–5), `fecha_creacion`, `fecha_actualizacion` |
| `Favoritos` | `id`, `usuario_id` → `Usuarios`, `pelicula_id` → `Peliculas`, `fecha_agregado` |
| `error_logs` | `id`, `procedimiento`, `mensaje`, `fecha` — **creada, nunca escrita** |
| `debug_logs` | `id`, `mensaje`, `fecha` — **creada, nunca escrita** |

Los parámetros que manda la API no siempre se llaman como la columna:
`sinopsis` → `Peliculas.descripcion` y `anio` → `Peliculas.fecha_lanzamiento`.
El mapeo está dentro de cada procedimiento.

## Tests

130 tests, sin MySQL. Ver [`server/TESTS.md`](server/TESTS.md).

```bash
cd server && npm test
```

La suite también corre en CI: [.github/workflows/test.yml](.github/workflows/test.yml).

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
   endpoint que escribe DML en el handler, con un `UPDATE Reseñas` directo. Y
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

4. **Credenciales sembradas en el SQL.** La conexión del server ya no vive en el
   código: se lee de `server/.env` (`.env.example` documenta las variables, y el
   `.env` real está en `.gitignore`). Queda pendiente el dato sembrado:
   `Prograweb 2.sql` crea una cuenta `admin@example.com` con contraseña en
   claro. No es de producción, pero el repositorio es público.

5. **Contraseñas sin cifrar.** La columna es `Usuarios.contraseña VARCHAR(255)`
   y `sp_LoginUsuario` la compara directamente. `bcrypt` figura en
   `dependencies` pero no se usa en ningún lado.
