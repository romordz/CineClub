/**
 * Inventario de rutas y huecos conocidos.
 *
 * Dos cosas distintas:
 *
 *  1) El inventario: obliga a que cada endpoint registrado tenga un caso en la
 *     tabla de `contrato-sp.test.js`. Si anades una ruta y olvidas su test, la
 *     suite falla aqui.
 *
 *  2) Los huecos: documenta comportamiento que hoy es una inconsistencia, para
 *     que quede escrito y no se pierda de vista. No son tests que "deben pasar
 *     porque esta bien", son tests que fallan cuando alguien corrija el
 *     problema, para entonces actualizar la expectativa.
 */

const request = require("supertest");
const { obtener } = require("./helpers/mock-db");
const { app } = require("../server");

const db = obtener();

beforeEach(() => db.limpiar());

/** Lee las rutas registradas en la app de Express. */
function inventarioDeRutas() {
  return app._router.stack
    .filter((capa) => capa.route)
    .map((capa) => {
      const metodos = Object.keys(capa.route.methods).filter((m) => m !== "_all");
      return metodos.map((m) => `${m.toUpperCase()} ${capa.route.path}`);
    })
    .flat();
}

describe("Inventario de la API", () => {
  const rutas = inventarioDeRutas();

  it("expone 20 endpoints", () => {
    expect(rutas).toHaveLength(20);
  });

  it("no expone handlers sin ruta (filtros, montajes de middleware)", () => {
    expect(rutas.every((r) => /^(GET|POST|PUT|PATCH|DELETE) \//.test(r))).toBe(true);
  });

  // Las rutas cubiertas por la tabla de contrato, mas las que no delegan en un
  // procedimiento y por eso se documentan aparte.
  const SIN_PROCEDIMIENTO = ["PUT /api/resenias/:id", "GET /api/health"];

  const EN_TABLA_DE_CONTRATO = [
    "POST /api/register",
    "POST /api/login",
    "POST /api/updateUser",
    "POST /api/deleteUser",
    "POST /api/agregarPelicula",
    "POST /api/modificarPelicula",
    "GET /api/generos",
    "GET /api/peliculas",
    "GET /api/peliculas/:id",
    "GET /api/resenias/:peliculaId",
    "GET /api/resenias/usuario/:usuarioId",
    "DELETE /api/peliculas/:id",
    "DELETE /api/resenias/:id",
    "POST /api/resenias",
    "POST /api/favoritos",
    "POST /api/favoritos/check",
    "DELETE /api/favoritos",
    "GET /api/favoritos/usuario/:usuarioId",
  ];

  it("toda ruta registrada aparece en la tabla de contrato o en la lista de excepciones", () => {
    const documentadas = [...EN_TABLA_DE_CONTRATO, ...SIN_PROCEDIMIENTO].sort();
    expect([...rutas].sort()).toEqual(documentadas);
  });

  it("la tabla de contrato cubre 18 de 20 endpoints", () => {
    expect(EN_TABLA_DE_CONTRATO).toHaveLength(18);
  });
});

describe("Hueco 1: PUT /api/resenias/:id no usa la capa de procedimientos", () => {
  // El unico endpoint que escribe DML en el handler. El procedimiento
  // sp_ActualizarResena esta definido en Stored Procedures.sql y no se invoca
  // desde ninguna parte, asi que la logica existe en dos sitios y solo uno se
  // usa. El fix es usar el procedimiento; cuando se haga, este test falla.
  it("emite un UPDATE directo en lugar de llamar a sp_ActualizarResena", async () => {
    await request(app).put("/api/resenias/7").send({ comentario: "Buena", puntuacion: 4 });

    const sql = db.sql();
    expect(sql.some((s) => /^UPDATE\s+Reseñas/i.test(s.trim()))).toBe(true);
    expect(sql.some((s) => /sp_ActualizarResena/i.test(s))).toBe(false);
  });
});

describe("Hueco 2: la validacion de ids no es uniforme", () => {
  it("GET /api/peliculas/:id rechaza un id no numerico", async () => {
    const res = await request(app).get("/api/peliculas/abc");

    expect(res.status).toBe(400);
  });

  it("DELETE /api/peliculas/:id NO rechaza un id no numerico y lo manda a MySQL", async () => {
    db.cuando(/sp_EliminarPelicula/i, [[]]);
    db.cuando(/^SELECT\s+@resultado/i, [{ resultado: 1, mensaje: "Eliminada" }]);

    const res = await request(app).delete("/api/peliculas/abc");

    expect(res.status).toBe(200);
    expect(db.sqlDe(/sp_EliminarPelicula/i).params).toEqual(["abc"]);
  });

  it("GET /api/resenias/usuario/:id rechaza un id no numerico", async () => {
    const res = await request(app).get("/api/resenias/usuario/abc");

    expect(res.status).toBe(400);
  });

  it("GET /api/favoritos/usuario/:id NO rechaza un id no numerico y lo manda a MySQL", async () => {
    db.cuando(/sp_ObtenerFavoritosPorUsuario/i, [[]]);
    db.cuando(/^SELECT\s+@resultado/i, [{ resultado: 1, mensaje: "OK" }]);

    const res = await request(app).get("/api/favoritos/usuario/abc");

    expect(res.status).toBe(200);
    expect(db.sqlDe(/sp_ObtenerFavoritosPorUsuario/i).params).toEqual(["abc"]);
  });
});

describe("Hueco 3: siete endpoints no validan la entrada", () => {
  // register, login y updateUser van directos al procedimiento. Con un cuerpo
  // vacio no hay ninguna respuesta 400: el procedimiento decide, y si el
  // dato es NULL el error sale como 500 o como un 200 con cuerpo raro.
  // GET /api/health queda fuera: no recibe entrada que validar.
  const SIN_VALIDAR = [
    ["post", "/api/register", {}],
    ["post", "/api/login", {}],
    ["post", "/api/updateUser", {}],
    ["get", "/api/generos", null],
    ["get", "/api/peliculas", null],
    ["get", "/api/favoritos/usuario/abc", null],
    ["delete", "/api/peliculas/abc", null],
  ];

  it.each(SIN_VALIDAR)("%s %s consulta MySQL sin validar la entrada", async (metodo, ruta) => {
    await request(app)[metodo](ruta).send().catch(() => {});

    // La prueba del hueco es precisamente esta: la peticion llego a la base.
    expect(db.llamadas.length).toBeGreaterThan(0);
  });

  it("un registro con cuerpo vacio no produce 400 de validacion sino un error del procedimiento", async () => {
    db.cuando(/^CALL\b/i, [[]]);
    db.cuando(/^SELECT\s+@resultado/i, [{ resultado: 0, mensaje: "Usuario no encontrado" }]);

    const res = await request(app).post("/api/register").send({});

    // Llega a la base: eso es lo que prueba el hueco.
    expect(db.sqlDe(/sp_RegistrarUsuario/i)).not.toBeNull();
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Usuario no encontrado");
  });
});
