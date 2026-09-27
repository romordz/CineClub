/**
 * Contrato entre la API y los procedimientos almacenados.
 *
 * La decision de diseño de este proyecto es que los handlers no escriben SQL de
 * negocio: llaman a un `sp_*` y solo traducen el `@resultado` a un codigo HTTP.
 * Estos tests fijan esa frontera. Si alguien mueve logica de un procedimiento al
 * handler, o cambia el orden de los parametros de un `CALL`, la suite falla.
 *
 * No se comprueba que los procedimientos hagan lo correcto (eso exigiria MySQL),
 * sino que la API los invoque con los argumentos que esperan.
 */

const request = require("supertest");
const { obtener } = require("./helpers/mock-db");
const { app } = require("../server");

const db = obtener();

/**
 * Cada caso declara la peticion, el procedimiento que debe invocar y los
 * parametros que debe recibir. `resultadoSP` simula el result set que devuelve
 * el procedimiento; `resultadoSalida` las variables @resultado/@mensaje.
 */
const CASOS = [
  {
    titulo: "POST /api/register",
    metodo: "post",
    ruta: "/api/register",
    cuerpo: {
      nombre: "Ada",
      email: "ada@example.com",
      password: "hunter2",
      fechaNacimiento: "1990-01-01",
    },
    sp: "sp_RegistrarUsuario",
    // El 5.er argumento es la foto (null sin archivo) y el 6.o la fecha de alta.
    argumentos: ["Ada", "ada@example.com", "hunter2", "1990-01-01", null],
    argumentosCount: 6,
    estado: 200,
  },
  {
    titulo: "POST /api/login",
    metodo: "post",
    ruta: "/api/login",
    cuerpo: { email: "ada@example.com", password: "hunter2" },
    sp: "sp_LoginUsuario",
    argumentos: ["ada@example.com", "hunter2"],
    resultadoSalida: {
      resultado: 1,
      mensaje: "Bienvenido",
      id: 1,
      nombre: "Ada",
      email: "ada@example.com",
      rol_id: 2,
    },
    estado: 200,
  },
  {
    titulo: "POST /api/updateUser",
    metodo: "post",
    ruta: "/api/updateUser",
    cuerpo: { id: 1, nombre: "Ada L.", email: "ada@example.com", fecha_nacimiento: "1990-01-01" },
    sp: "sp_ActualizarUsuario",
    // Sin `contrasena` en el cuerpo, el handler conserva la que ya estaba.
    argumentos: [1, "Ada L.", "ada@example.com", "1990-01-01", "secreto", null],
    antes: { sql: /SELECT contraseña FROM usuarios/i, salida: [{ contraseña: "secreto" }] },
    estado: 200,
  },
  {
    titulo: "POST /api/deleteUser",
    metodo: "post",
    ruta: "/api/deleteUser",
    cuerpo: { id: 1 },
    sp: "sp_DesactivarUsuario",
    argumentos: [1],
    estado: 200,
  },
  {
    titulo: "POST /api/agregarPelicula",
    metodo: "post",
    ruta: "/api/agregarPelicula",
    cuerpo: { titulo: "Arrival", sinopsis: "x", director: "Villeneuve", genero: "Sci-Fi", anio: 2016 },
    sp: "sp_AgregarPelicula",
    argumentos: ["Arrival", "x", "Villeneuve", "Sci-Fi", 2016, null],
    estado: 200,
  },
  {
    titulo: "POST /api/modificarPelicula",
    metodo: "post",
    ruta: "/api/modificarPelicula",
    cuerpo: { id: 1, titulo: "Arrival", sinopsis: "x", director: "Villeneuve", genero: "Sci-Fi", anio: 2016 },
    sp: "sp_ModificarPelicula",
    argumentos: [1, "Arrival", "x", "Villeneuve", "Sci-Fi", 2016, null],
    estado: 200,
  },
  {
    titulo: "GET /api/generos",
    metodo: "get",
    ruta: "/api/generos",
    sp: "sp_ObtenerGeneros",
    resultadoSP: [[{ id: 1, nombre: "Drama" }]],
    estado: 200,
  },
  {
    titulo: "GET /api/peliculas",
    metodo: "get",
    ruta: "/api/peliculas",
    sp: "sp_BuscarPeliculas",
    // Sin `?search=` el handler envia NULL, no undefined.
    argumentos: [null],
    resultadoSP: [[{ id: 1, titulo: "Arrival" }]],
    estado: 200,
  },
  {
    titulo: "GET /api/peliculas?search=arrival",
    metodo: "get",
    ruta: "/api/peliculas?search=arrival",
    sp: "sp_BuscarPeliculas",
    argumentos: ["arrival"],
    resultadoSP: [[{ id: 1, titulo: "Arrival" }]],
    estado: 200,
  },
  {
    titulo: "GET /api/peliculas/:id",
    metodo: "get",
    ruta: "/api/peliculas/1",
    sp: "sp_ObtenerDetallePelicula",
    argumentos: ["1"],
    resultadoSP: [[{ id: 1, titulo: "Arrival" }]],
    estado: 200,
  },
  {
    titulo: "GET /api/resenias/:peliculaId",
    metodo: "get",
    ruta: "/api/resenias/1",
    sp: "sp_ObtenerReseniasPorPelicula",
    argumentos: ["1"],
    resultadoSP: [[{ id: 1, comentario: "Buena", autor_avatar: null }]],
    estado: 200,
  },
  {
    titulo: "DELETE /api/peliculas/:id",
    metodo: "delete",
    ruta: "/api/peliculas/1",
    sp: "sp_EliminarPelicula",
    argumentos: ["1"],
    estado: 200,
  },
  {
    titulo: "POST /api/resenias",
    metodo: "post",
    ruta: "/api/resenias",
    cuerpo: { usuario_id: 1, pelicula_id: 1, comentario: "Buena", puntuacion: 4 },
    sp: "sp_CrearResena",
    argumentos: [1, 1, "Buena", 4],
    estado: 201,
  },
  {
    titulo: "DELETE /api/resenias/:id",
    metodo: "delete",
    ruta: "/api/resenias/7",
    sp: "sp_EliminarResena",
    argumentos: ["7"],
    estado: 200,
  },
  {
    titulo: "GET /api/resenias/usuario/:usuarioId",
    metodo: "get",
    ruta: "/api/resenias/usuario/1",
    sp: "sp_ObtenerResenasPorUsuario",
    argumentos: ["1"],
    resultadoSP: [[{ id: 1, comentario: "Buena" }]],
    estado: 200,
  },
  {
    titulo: "POST /api/favoritos",
    metodo: "post",
    ruta: "/api/favoritos",
    cuerpo: { usuario_id: 1, pelicula_id: 1 },
    sp: "sp_AgregarFavorito",
    argumentos: [1, 1],
    estado: 200,
  },
  {
    titulo: "POST /api/favoritos/check",
    metodo: "post",
    ruta: "/api/favoritos/check",
    cuerpo: { usuario_id: 1, pelicula_id: 1 },
    sp: "sp_VerificarFavorito",
    argumentos: [1, 1],
    resultadoSalida: { resultado: 1, mensaje: "OK", es_favorito: 1 },
    estado: 200,
  },
  {
    titulo: "DELETE /api/favoritos",
    metodo: "delete",
    ruta: "/api/favoritos",
    cuerpo: { usuario_id: 1, pelicula_id: 1 },
    sp: "sp_EliminarFavorito",
    argumentos: [1, 1],
    resultadoSalida: { resultado: 1, mensaje: "OK", filas_afectadas: 1 },
    estado: 200,
  },
  {
    titulo: "GET /api/favoritos/usuario/:usuarioId",
    metodo: "get",
    ruta: "/api/favoritos/usuario/1",
    sp: "sp_ObtenerFavoritosPorUsuario",
    argumentos: ["1"],
    resultadoSP: [[{ pelicula_id: 1 }]],
    estado: 200,
  },
];

beforeEach(() => db.limpiar());

describe("Cada endpoint delega en un procedimiento almacenado", () => {
  it.each(CASOS)("$titulo invoca $sp", async (caso) => {
    db.cuando(new RegExp(caso.sp, "i"), caso.resultadoSP !== undefined ? caso.resultadoSP : [[]]);
    if (caso.antes) db.cuando(caso.antes.sql, caso.antes.salida);
    if (caso.resultadoSalida) {
      db.cuando(/^SELECT\s+@resultado/i, [caso.resultadoSalida]);
    }

    let peticion = request(app)[caso.metodo](caso.ruta);
    if (caso.cuerpo) peticion = peticion.send(caso.cuerpo);

    const res = await peticion;

    const llamada = db.sqlDe(new RegExp(caso.sp, "i"));
    expect(llamada).not.toBeNull();
    expect(res.status).toBe(caso.estado);

    if (caso.argumentos) {
      // El ultimo argumento (fecha de alta) es una fecha generada: se compara
      // el prefijo para no atar el test al reloj.
      const esperados = caso.argumentos;
      expect(llamada.params.slice(0, esperados.length)).toEqual(esperados);
    }
    if (caso.argumentosCount !== undefined) {
      expect(llamada.params).toHaveLength(caso.argumentosCount);
    }
  });
});

describe("Ningun handler escribe SQL de negocio fuera de un procedimiento", () => {
  const CON_SQL_EN_LINEA = [/^\s*(UPDATE|DELETE|INSERT)\b/i];

  it.each(CASOS.filter((c) => c.sp))("$titulo no emite DML directo", async (caso) => {
    db.cuando(new RegExp(caso.sp, "i"), caso.resultadoSP !== undefined ? caso.resultadoSP : [[]]);
    if (caso.antes) db.cuando(caso.antes.sql, caso.antes.salida);
    if (caso.resultadoSalida) db.cuando(/^SELECT\s+@resultado/i, [caso.resultadoSalida]);

    let peticion = request(app)[caso.metodo](caso.ruta);
    if (caso.cuerpo) peticion = peticion.send(caso.cuerpo);
    await peticion;

    const dml = db.sql().filter((sql) => CON_SQL_EN_LINEA.some((re) => re.test(sql)));
    expect(dml).toEqual([]);
  });
});
