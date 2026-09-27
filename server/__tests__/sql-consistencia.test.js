/**
 * Los .sql contra el codigo que los invoca.
 *
 * Los 130 tests de los otros tres archivos usan un doble de MySQL: el doble
 * responde lo que le pidan, asi que pasan aunque los .sql esten rotos. Este
 * archivo lee los `.sql` de verdad y es el unico que puede fallar por esa causa.
 *
 * Ya encontro dos bugs que los mocks no venian:
 *
 *   - `select * from usuarios;` (depuracion) antes de que la tabla existiera:
 *     abortaba la carga del esquema con error 1146 y dejaba el clon sin tablas.
 *   - El esquema creaba `Usuarios`, `Generos` y `Peliculas` y los procedimientos
 *     las pedian en minuscula. En Windows MySQL da igual; en Linux y macOS es
 *     error 1146, y 15 de los 17 procedimientos no funcionaban fuera de Windows.
 *
 * El segundo es el motivo de la regla de este archivo: MySQL compara los
 * identificadores con distincion de mayusculas cuando `lower_case_table_names = 0`,
 * que es el valor por defecto en Linux, macOS y Docker. Escrito en minuscula,
 * funciona en todas partes.
 */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..", "..");
const BRUTO_ESQUEMA = fs.readFileSync(path.join(RAIZ, "Prograweb 2.sql"), "utf8");
const BRUTO_SP = fs.readFileSync(path.join(RAIZ, "Stored Procedures.sql"), "utf8");
const BRUTO_SERVER = fs.readFileSync(path.join(RAIZ, "server", "server.js"), "utf8");
const BRUTO_EJEMPLO = fs.readFileSync(path.join(RAIZ, "server", ".env.example"), "utf8");

/**
 * Quita los comentarios. Sin esto el analizador lee su propia prosa: un
 * comentario que dice "CREATE TABLE de arriba" se conta como una tabla mas, y
 * el INSERT de ejemplo del administrador cuenta como una credencial sembrada.
 */
function sinComentarios(sql) {
  return sql
    .replace(/--[^\n]*/g, " ") // linea
    .replace(/\/\*[\s\S]*?\*\//g, " "); // bloque
}

const ESQUEMA = sinComentarios(BRUTO_ESQUEMA);
const PROCEDIMIENTOS = sinComentarios(BRUTO_SP);

/** Tablas tal como las crea el esquema, con su capitalizacion literal. */
function tablasCreadas() {
  return [...ESQUEMA.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?`?([\p{L}\d_]+)`?/giu)].map(
    (m) => m[1]
  );
}

/**
 * Referencias a tabla en un texto SQL. `\p{L}` incluye la enye, que un
 * `\w` de JavaScript no cubre: sin eso `reseñas` se leia como `rese` y el
 * test pasaba sin comprobar nada.
 */
function referenciasATabla(texto) {
  // `ON UPDATE CURRENT_TIMESTAMP` no es una referencia: se cuela si se busca
  // UPDATE a secas, asi que se exige que no preceda a CURRENT_TIMESTAMP.
  const patron = /\b(?:FROM|JOIN|INTO|UPDATE|REFERENCES)\s+`?([\p{L}][\p{L}\d_]*)`?/giu;
  const vistas = new Set();
  let m;
  while ((m = patron.exec(texto))) {
    const nombre = m[1];
    // Descarta procedimientos (sp_*), variables de MySQL (v_*) y parametros (p_*).
    if (/^(?:sp_|v_|p_)/i.test(nombre)) continue;
    if (/^CURRENT_/i.test(nombre)) continue;
    vistas.add(nombre);
  }
  return [...vistas];
}

/**
 * Divide la lista de parametros de una firma, respetando los parentesis.
 * Sin esto, `VARCHAR(255)` parte el `IN` en dos y el conteo sale mal.
 */
function separarParametros(lista) {
  const partes = [];
  let profundidad = 0;
  let actual = "";
  for (const caracter of lista) {
    if (caracter === "(") profundidad++;
    if (caracter === ")") profundidad--;
    if (caracter === "," && profundidad === 0) {
      partes.push(actual);
      actual = "";
      continue;
    }
    actual += caracter;
  }
  if (actual.trim()) partes.push(actual);
  return partes.filter((p) => p.trim());
}

/** Nombres de los procedimientos que el .sql define, con su conteo de parametros. */
function procedimientosDefinidos() {
  const definidos = new Map();
  const patron = /CREATE\s+PROCEDURE\s+`?(\p{L}\w*)`?\s*\(([\s\S]*?)\)\s*(?:BEGIN|OUT|INOUT)/giu;
  let m;
  while ((m = patron.exec(PROCEDIMIENTOS))) {
    definidos.set(m[1].toLowerCase(), separarParametros(m[2]).length);
  }
  return definidos;
}

/**
 * Cada `CALL sp_...` de server.js, con cuantos parametros pasa. Los `?` son
 * argumentos de entrada y los `@algo` los OUT que se leen despues con
 * `SELECT @resultado, @mensaje`, asi que los dos cuentan.
 */
function llamadasAProcedimiento() {
  const llamadas = new Map();
  const patron = /CALL\s+`?(\p{L}\w*)`?\s*\(([^)]*)\)/giu;
  let m;
  while ((m = patron.exec(BRUTO_SERVER))) {
    const argumentos = separarParametros(m[2]);
    const total = argumentos.filter((a) => a.trim() === "?" || a.trim().startsWith("@")).length;
    llamadas.set(m[1].toLowerCase(), total);
  }
  return [...llamadas].map(([nombre, parametros]) => ({ nombre, parametros }));
}

describe("Los .sql contra el codigo que los invoca", () => {
  const creadas = tablasCreadas();

  it("el esquema crea 8 tablas", () => {
    expect(creadas).toHaveLength(8);
  });

  it("todas las tablas van en minuscula, para que funcionen en Linux y macOS", () => {
    // lower_case_table_names = 0 fuera de Windows: el case es parte del nombre.
    const conMayus = creadas.filter((t) => t !== t.toLowerCase());
    expect(conMayus).toEqual([]);
  });

  it("el esquema siembra la tabla rol, sin la cual el registro falla por FK", () => {
    // usuarios.rol_id REFERENCES rol(id): con rol vacia, error 1452 en cada
    // INSERT a usuarios, y sp_RegistrarUsuario escribe rol_id = 1.
    const siembra = /INSERT INTO rol\s*\([^)]*\)\s*VALUES/i.test(ESQUEMA);
    expect(siembra).toBe(true);
  });

  it("el esquema no siembra ninguna contrasena", () => {
    // El INSERT del admin era una credencial en claro en un repo publico.
    const inserts = [...ESQUEMA.matchAll(/INSERT INTO\s+(\p{L}+)/giu)].map((m) => m[1].toLowerCase());
    expect(inserts).not.toContain("usuarios");
  });

  it("ninguna sentencia de depuracion queda antes de su tabla", () => {
    // `select * from usuarios;` al principio abortaba el script con error 1146.
    // El cliente mysql se detiene en el primer error.
    const depuracion = [...ESQUEMA.matchAll(/^\s*select\s+\*\s+from\s+`?([\p{L}]+)`?/gim)];
    expect(depuracion).toEqual([]);
  });

  it("toda referencia a tabla del esquema coincide con una tabla creada", () => {
    const refSchema = referenciasATabla(ESQUEMA);
    const huerfanas = refSchema.filter((r) => !creadas.includes(r));
    expect(huerfanas).toEqual([]);
  });

  it("toda referencia a tabla de los procedimientos coincide con una tabla creada", () => {
    // El bug de mayusculas vivia aqui: 30 referencias en minuscula contra un
    // esquema en mayuscula, y 11 en mayuscula que el renombrado posterior
    // rompia. Este test es el que impidio que volviera a pasar.
    const refSp = referenciasATabla(PROCEDIMIENTOS);
    const huerfanas = refSp.filter((r) => !creadas.includes(r));
    expect(huerfanas).toEqual([]);
  });

  it("el archivo de procedimientos selecciona la base", () => {
    // Sin `USE`, el comando `mysql < "Stored Procedures.sql"` del README
    // responde error 1046 "No database selected".
    expect(/^\s*USE\s+\S+/im.test(BRUTO_SP)).toBe(true);
  });

  it("el archivo de procedimientos fija la codificacion", () => {
    // Sin `SET NAMES utf8mb4`, los acentos de los identificadores
    // (contraseña, reseñas) se mandan como latin1 y MySQL no los reconoce.
    expect(/^\s*SET NAMES\s+utf8mb4/im.test(BRUTO_SP)).toBe(true);
    expect(/^\s*SET NAMES\s+utf8mb4/im.test(BRUTO_ESQUEMA)).toBe(true);
  });

  it("el esquema no anade dos veces la misma columna", () => {
    // `reseñas` declaraba fecha_actualizacion en el CREATE TABLE y un ALTER
    // TABLE la anadia otra vez: error 1060 y la carga se detenia ahi.
    const declaradas = [...ESQUEMA.matchAll(/^\s{4}(\p{L}\w*)\s+/gmu)].map((m) => m[1].toLowerCase());
    const anadidas = [...ESQUEMA.matchAll(/ADD COLUMN\s+(\p{L}\w*)/gi)].map((m) => m[1].toLowerCase());
    const repetidas = anadidas.filter((c) => declaradas.includes(c));
    expect(repetidas).toEqual([]);
  });

  it("todo procedimiento que server.js invoca existe en el .sql", () => {
    // El tercer bug que este archivo encuentra: server.js llamaba a
    // sp_ModificarPelicula y sp_EliminarPelicula, que no estaban definidos.
    // Los mocks no lo venian porque responden a cualquier CALL. En MySQL de
    // verdad eran error 1305 (ER_SP_DOES_NOT_EXIST) y dos endpoints en 500.
    const huerfanos = llamadasAProcedimiento().filter((c) => !procedimientosDefinidos().has(c.nombre));
    expect(huerfanos).toEqual([]);
  });

  it("cada llamada pasa los parametros que el procedimiento declara", () => {
    // La firma no es libre: `CALL sp_ModificarPelicula(?, ?, ?, ?, ?, ?, ?, @resultado, @mensaje)`
    // son 9, y el procedimiento tiene que declarar 9. Si uno de los dos lados
    // cambia y el otro no, el CALL falla en tiempo de ejecucion, no al cargar.
    const firmas = procedimientosDefinidos();
    const descuadres = llamadasAProcedimiento()
      .filter((c) => firmas.has(c.nombre))
      .filter((c) => c.parametros !== firmas.get(c.nombre))
      .map((c) => `${c.nombre}: el CALL pasa ${c.parametros}, el procedimiento declara ${firmas.get(c.nombre)}`);
    expect(descuadres).toEqual([]);
  });

  it(".env.example documenta cada variable DB_ que server.js lee", () => {
    // DB_PORT faltaba en los dos lados: mover MySQL a otro puerto exigia tocar
    // codigo en vez de configuracion. Este cruce impide que una variable nueva
    // quede sin documentar, o que el ejemplo documente una que ya nadie lee.
    const leidas = [...new Set([...BRUTO_SERVER.matchAll(/process\.env\.(DB_\w+)/g)].map((m) => m[1]))].sort();
    const documentadas = [...new Set([...BRUTO_EJEMPLO.matchAll(/^(DB_\w+)=/gm)].map((m) => m[1]))].sort();
    expect(documentadas).toEqual(leidas);
  });
});
