/**
 * Traduccion de `@resultado` a codigos HTTP, y comportamiento ante errores.
 *
 * Los procedimientos devuelven un par `@resultado` / `@mensaje`. Cada handler lo
 * traduce a un estado y decide el cuerpo. Como esa traduccion se hace comparando
 * el mensaje en espanol, es la parte mas fragil de la API: un cambio de texto
 * en un procedimiento cambia el status code. Estos tests la fijan.
 */

const request = require("supertest");
const { obtener } = require("./helpers/mock-db");
const { app } = require("../server");

const db = obtener();

beforeEach(() => db.limpiar());

/** Simula un procedimiento que responde con `resultado = 0` y `mensaje`. */
function procedimientoFalla(mensaje) {
  db.cuando(/^CALL\b/i, [[]]);
  db.cuando(/^SELECT\s+@resultado/i, [{ resultado: 0, mensaje }]);
}

describe("POST /api/login traduce el mensaje del procedimiento a un status", () => {
  const CASOS = [
    ["Credenciales inválidas", 401],
    ["Usuario no encontrado", 400],
    ["El usuario fue eliminado", 403],
    ["Fallo inesperado en el servidor", 500],
  ];

  it.each(CASOS)('"%s" responde %i', async (mensaje, estado) => {
    procedimientoFalla(mensaje);
    const res = await request(app).post("/api/login").send({ email: "a@b.c", password: "x" });

    expect(res.status).toBe(estado);
    expect(res.body.error).toBe(mensaje);
  });

  it("no expone la contraseña del usuario en la respuesta", async () => {
    db.cuando(/^CALL\b/i, [[]]);
    db.cuando(/^SELECT\s+@resultado/i, [
      {
        resultado: 1,
        mensaje: "Bienvenido",
        id: 1,
        nombre: "Ada",
        email: "ada@example.com",
        fecha_nacimiento: "1990-01-01",
        rol_id: 2,
        avatar: null,
      },
    ]);

    const res = await request(app).post("/api/login").send({ email: "ada@example.com", password: "hunter2" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("ada@example.com");
    expect(JSON.stringify(res.body)).not.toMatch(/hunter2|password|contrase/i);
  });
});

describe("POST /api/deleteUser", () => {
  it.each([
    ["Usuario no encontrado", 404],
    ["El usuario ya estaba desactivado", 400],
  ])('"%s" responde %i', async (mensaje, estado) => {
    procedimientoFalla(mensaje);
    const res = await request(app).post("/api/deleteUser").send({ id: 1 });

    expect(res.status).toBe(estado);
  });
});

describe("POST /api/agregarPelicula", () => {
  it.each([
    ["El género especificado no existe", 400],
    ["Ya existe una película con este título y director", 409],
  ])('"%s" responde %i', async (mensaje, estado) => {
    procedimientoFalla(mensaje);
    const res = await request(app)
      .post("/api/agregarPelicula")
      .send({ titulo: "Arrival", sinopsis: "x", director: "V", genero: "Sci-Fi", anio: 2016 });

    expect(res.status).toBe(estado);
    expect(res.body.error).toBe(mensaje);
  });
});

describe("POST /api/resenias", () => {
  it.each([
    ["La película no encontrada", 404],
    ["Ya has reseñado esta película", 409],
    ["La puntuación debe estar entre 1 y 5", 400],
  ])('"%s" responde %i', async (mensaje, estado) => {
    procedimientoFalla(mensaje);
    const res = await request(app)
      .post("/api/resenias")
      .send({ usuario_id: 1, pelicula_id: 1, comentario: "Buena", puntuacion: 4 });

    expect(res.status).toBe(estado);
  });

  it("responde 404 cuando el mensaje dice que no se encontro la pelicula", async () => {
    // El handler busca el substring "no encontrad", no la frase completa.
    procedimientoFalla("Película no encontrada");
    const res = await request(app)
      .post("/api/resenias")
      .send({ usuario_id: 1, pelicula_id: 9, comentario: "x", puntuacion: 4 });

    expect(res.status).toBe(404);
  });
});

describe("GET /api/peliculas/:id", () => {
  it("responde 404 cuando el procedimiento no devuelve filas", async () => {
    db.cuando(/sp_ObtenerDetallePelicula/i, [[]]);
    const res = await request(app).get("/api/peliculas/1");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Película no encontrada");
  });

  it("responde 200 con la primera fila cuando si hay resultados", async () => {
    db.cuando(/sp_ObtenerDetallePelicula/i, [
      [
        { id: 1, titulo: "Arrival" },
        { id: 2, titulo: "Dune" },
      ],
    ]);
    const res = await request(app).get("/api/peliculas/1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 1, titulo: "Arrival" });
  });
});

describe("GET /api/resenias/:peliculaId decodifica el avatar", () => {
  it("antepone el data URI cuando el procedimiento devuelve bytes", async () => {
    db.cuando(/sp_ObtenerReseniasPorPelicula/i, [
      [{ id: 1, comentario: "Buena", autor_avatar: "QUJD" }],
    ]);
    const res = await request(app).get("/api/resenias/1");

    expect(res.status).toBe(200);
    expect(res.body[0].autor_avatar).toBe("data:image/jpeg;base64,QUJD");
  });

  it("deja en null cuando el usuario no tiene avatar", async () => {
    db.cuando(/sp_ObtenerReseniasPorPelicula/i, [
      [{ id: 1, comentario: "Buena", autor_avatar: null }],
    ]);
    const res = await request(app).get("/api/resenias/1");

    expect(res.body[0].autor_avatar).toBeNull();
  });
});

describe("GET /api/resenias/usuario/:usuarioId", () => {
  it("devuelve count coherente con data", async () => {
    db.cuando(/sp_ObtenerResenasPorUsuario/i, [[{ id: 1 }, { id: 2 }]]);
    db.cuando(/^SELECT\s+@resultado/i, [{ resultado: 1, mensaje: "OK" }]);
    const res = await request(app).get("/api/resenias/usuario/1");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.data).toHaveLength(2);
  });

  it("responde 404 cuando el procedimiento informa que no hay resenas", async () => {
    db.cuando(/sp_ObtenerResenasPorUsuario/i, [[]]);
    db.cuando(/^SELECT\s+@resultado/i, [{ resultado: 0, mensaje: "Usuario no encontrado" }]);
    const res = await request(app).get("/api/resenias/usuario/1");

    expect(res.status).toBe(404);
    expect(res.body.usuario_id).toBe("1");
  });
});

describe("GET /api/favoritos/usuario/:usuarioId", () => {
  it("responde 404 con estructura vacia cuando no hay favoritos", async () => {
    db.cuando(/sp_ObtenerFavoritosPorUsuario/i, [[]]);
    db.cuando(/^SELECT\s+@resultado/i, [{ resultado: 0, mensaje: "No hay favoritos" }]);
    const res = await request(app).get("/api/favoritos/usuario/1");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "No hay favoritos", data: [], count: 0 });
  });
});

describe("POST /api/favoritos/check", () => {
  it("propaga esFavorito tal cual lo devuelve el procedimiento", async () => {
    db.cuando(/^CALL\b/i, [[]]);
    db.cuando(/^SELECT\s+@resultado/i, [{ resultado: 1, mensaje: "OK", es_favorito: 1 }]);
    const res = await request(app).post("/api/favoritos/check").send({ usuario_id: 1, pelicula_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body.esFavorito).toBe(1);
  });
});

describe("PUT /api/resenias/:id", () => {
  it("responde 404 cuando el UPDATE no afecta ninguna fila", async () => {
    db.cuando(/^UPDATE\s+Reseñas/i, { affectedRows: 0 });
    const res = await request(app).put("/api/resenias/7").send({ comentario: "Buena", puntuacion: 4 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Reseña no encontrada");
  });
});

describe("GET /api/health", () => {
  it("responde 200 cuando la base responde", async () => {
    db.cuando(/SELECT 1 AS ok/i, [[{ ok: 1 }]]);
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", database: "up" });
  });

  it("responde 503 cuando la base no responde, no 500", async () => {
    // 503 es lo que un balanceador lee como "no me envies trafico". Un 500
    // sugeriria un fallo de la propia aplicacion, que no es el caso.
    db.cuando(/SELECT 1 AS ok/i, new Error("MySQL server has gone away"));
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "error", database: "unreachable" });
  });

  it("no filtra el mensaje del driver al cliente", async () => {
    db.cuando(/SELECT 1 AS ok/i, new Error("Access denied for user 'root'@'localhost'"));
    const res = await request(app).get("/api/health");

    expect(JSON.stringify(res.body)).not.toMatch(/Access denied|root/);
  });

  it("no invoca ningun procedimiento almacenado", async () => {
    db.cuando(/SELECT 1 AS ok/i, [[{ ok: 1 }]]);
    await request(app).get("/api/health");

    expect(db.sqlDe(/\bCALL\b/)).toBeNull();
  });

  it("es la unica ruta que consulta la base sin pasar por un sp_*", async () => {
    // La razon de que GET /api/health este en la lista de excepciones del
    // inventario: SELECT 1 no es logica de negocio que encapsular.
    db.cuando(/SELECT 1 AS ok/i, [[{ ok: 1 }]]);
    await request(app).get("/api/health");

    expect(db.llamadas).toHaveLength(1);
    expect(db.llamadas[0].params).toBeUndefined();
  });
});

describe("Errores de base de datos", () => {
  const FALLA_DB = new Error("Connection lost: MySQL server has gone away");

  it.each([
    ["get", "/api/generos"],
    ["get", "/api/peliculas"],
    ["get", "/api/peliculas/1"],
    ["get", "/api/resenias/1"],
    ["get", "/api/resenias/usuario/1"],
    ["get", "/api/favoritos/usuario/1"],
    ["post", "/api/favoritos"],
    ["post", "/api/favoritos/check"],
    ["delete", "/api/favoritos"],
  ])("%s %s responde 500 sin filtrar la excepcion", async (metodo, ruta) => {
    db.cuando(/./i, FALLA_DB);
    const res = await request(app)[metodo](ruta).send({ usuario_id: 1, pelicula_id: 1 });

    expect(res.status).toBe(500);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it("POST /api/register responde 500 si falla el CALL", async () => {
    db.cuando(/^CALL\b/i, FALLA_DB);
    const res = await request(app)
      .post("/api/register")
      .send({ nombre: "Ada", email: "a@b.c", password: "x", fechaNacimiento: "1990-01-01" });

    expect(res.status).toBe(500);
  });

  it("POST /api/register responde 500 si falla la lectura de @resultado", async () => {
    db.cuando(/^CALL\b/i, [[]]);
    db.cuando(/^SELECT\s+@resultado/i, FALLA_DB);
    const res = await request(app)
      .post("/api/register")
      .send({ nombre: "Ada", email: "a@b.c", password: "x", fechaNacimiento: "1990-01-01" });

    expect(res.status).toBe(500);
  });
});

describe("El modulo se puede importar sin abrir un puerto", () => {
  it("no llama a listen al importarse", () => {
    const http = require("node:http");
    const abierto = [];
    const original = http.createServer;
    http.createServer = (...args) => {
      abierto.push(true);
      return original(...args);
    };

    jest.resetModules();
    db.limpiar();
    require("../server");

    http.createServer = original;
    expect(abierto).toHaveLength(0);
  });
});
