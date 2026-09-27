/**
 * Validacion de entrada.
 *
 * Estos tests fijan el contrato de la API: que datos invalidos se rechacen con
 * 400 y un mensaje util. La afirmacion que los hace valiosos no es el 400, es
 * `db` sin llamadas: la comprobacion ocurre ANTES de tocar MySQL, que es lo
 * que se quiere en una capa de entrada.
 */

const request = require("supertest");
const { obtener } = require("./helpers/mock-db");
const { app } = require("../server");

const db = obtener();

beforeEach(() => db.limpiar());

/** Ninguna de estas peticiones debe llegar a la base de datos. */
async function esperaSinTocarLaBase(peticion, estado, mensaje) {
  const res = await peticion;

  expect(res.status).toBe(estado);
  if (mensaje !== undefined) expect(res.body.error).toBe(mensaje);
  expect(db.llamadas).toHaveLength(0);
  return res;
}

describe("POST /api/deleteUser", () => {
  it("rechaza un cuerpo vacio con 400", () =>
    esperaSinTocarLaBase(request(app).post("/api/deleteUser").send({}), 400, "Se requiere el ID del usuario"));

  it("rechaza un id ausente aunque el resto del cuerpo venga lleno", () =>
    esperaSinTocarLaBase(
      request(app).post("/api/deleteUser").send({ nombre: "Ada" }),
      400,
      "Se requiere el ID del usuario"
    ));
});

describe("POST /api/agregarPelicula", () => {
  const completa = { titulo: "Arrival", sinopsis: "x", director: "Villeneuve", genero: "Sci-Fi", anio: 2016 };

  it.each(["titulo", "director", "genero", "anio"])(
    "rechaza cuando falta %s",
    (campo) => {
      const cuerpo = { ...completa };
      delete cuerpo[campo];
      return esperaSinTocarLaBase(
        request(app).post("/api/agregarPelicula").send(cuerpo),
        400,
        "Faltan campos obligatorios"
      );
    }
  );

  it("acepta el cuerpo completo y si consulta a la base", async () => {
    const res = await request(app).post("/api/agregarPelicula").send(completa);

    expect(res.status).toBe(200);
    expect(db.llamadas.length).toBeGreaterThan(0);
  });
});

describe("POST /api/modificarPelicula", () => {
  const completa = {
    id: 1,
    titulo: "Arrival",
    sinopsis: "x",
    director: "Villeneuve",
    genero: "Sci-Fi",
    anio: 2016,
  };

  it.each(["id", "titulo", "sinopsis", "director", "genero", "anio"])(
    "rechaza cuando falta %s",
    (campo) => {
      const cuerpo = { ...completa };
      delete cuerpo[campo];
      return esperaSinTocarLaBase(
        request(app).post("/api/modificarPelicula").send(cuerpo),
        400,
        "Faltan campos obligatorios"
      );
    }
  );
});

describe("POST /api/resenias", () => {
  const completa = { usuario_id: 1, pelicula_id: 2, comentario: "Buena", puntuacion: 4 };

  it.each(["usuario_id", "pelicula_id", "comentario", "puntuacion"])(
    "rechaza cuando falta %s",
    (campo) => {
      const cuerpo = { ...completa };
      delete cuerpo[campo];
      return esperaSinTocarLaBase(
        request(app).post("/api/resenias").send(cuerpo),
        400,
        "Faltan campos obligatorios"
      );
    }
  );

  it("responde 201 al crear una reseña valida", async () => {
    const res = await request(app).post("/api/resenias").send(completa);

    expect(res.status).toBe(201);
  });
});

describe("PUT /api/resenias/:id", () => {
  const ruta = "/api/resenias/7";

  it("rechaza un comentario ausente", () =>
    esperaSinTocarLaBase(
      request(app).put(ruta).send({ puntuacion: 3 }),
      400,
      "El comentario es requerido y debe ser texto"
    ));

  it("rechaza un comentario que no es texto", () =>
    esperaSinTocarLaBase(
      request(app).put(ruta).send({ comentario: 42, puntuacion: 3 }),
      400,
      "El comentario es requerido y debe ser texto"
    ));

  it.each([
    ["cero", 0],
    ["seis", 6],
    ["unNaN", NaN],
    ["texto", "alta"],
  ])("rechaza una puntuacion %s", (_etiqueta, puntuacion) =>
    esperaSinTocarLaBase(
      request(app).put(ruta).send({ comentario: "Buena", puntuacion }),
      400,
      "La puntuación debe ser un número entre 1 y 5"
    ));

  it.each([1, 3, 5])("admite la puntuacion %i", async (puntuacion) => {
    const res = await request(app).put(ruta).send({ comentario: "Buena", puntuacion });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Reseña actualizada correctamente");
  });
});

describe("Validacion de ids numericos en la ruta", () => {
  const casos = [
    ["GET", "/api/peliculas/abc"],
    ["GET", "/api/resenias/abc"],
    ["GET", "/api/resenias/usuario/abc"],
    ["DELETE", "/api/resenias/abc"],
  ];

  it.each(casos)("%s %s rechaza un id no numerico con 400", (metodo, ruta) =>
    esperaSinTocarLaBase(request(app)[metodo.toLowerCase()](ruta), 400));
});

describe("DELETE /api/resenias/:id", () => {
  it("rechaza un id no numerico antes de tocar la base", () =>
    esperaSinTocarLaBase(
      request(app).delete("/api/resenias/abc"),
      400,
      "ID de reseña inválido"
    ));
});

describe("POST /api/favoritos", () => {
  it.each(["usuario_id", "pelicula_id"])("rechaza cuando falta %s", (campo) => {
    const cuerpo = { usuario_id: 1, pelicula_id: 2 };
    delete cuerpo[campo];
    return esperaSinTocarLaBase(
      request(app).post("/api/favoritos").send(cuerpo),
      400,
      "Faltan campos obligatorios"
    );
  });
});

describe("POST /api/favoritos/check", () => {
  it("rechaza un cuerpo vacio con 400", () =>
    esperaSinTocarLaBase(
      request(app).post("/api/favoritos/check").send({}),
      400,
      "Faltan campos obligatorios"
    ));
});

describe("DELETE /api/favoritos", () => {
  it("rechaza un cuerpo vacio con 400", () =>
    esperaSinTocarLaBase(
      request(app).delete("/api/favoritos").send({}),
      400,
      "Faltan campos obligatorios"
    ));
});
