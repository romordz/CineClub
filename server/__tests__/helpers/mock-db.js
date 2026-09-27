/**
 * Doble de la conexion MySQL para los tests.
 *
 * La API usa un patron de dos pasos: primero `CALL sp_X(...)` y despues
 * `SELECT @resultado AS resultado, @mensaje AS mensaje` para leer las variables
 * de salida. Este doble responde a las dos consultas, y deja registrar todas
 * las llamadas para poder afirmar sobre el contrato.
 */

function crearDoble() {
  const llamadas = [];
  const reglas = [];

  const db = {
    query(sql, params, cb) {
      if (typeof params === "function") {
        cb = params;
        params = undefined;
      }
      llamadas.push({ sql, params });

      for (const regla of reglas) {
        if (regla.test.test(sql)) {
          const salida = typeof regla.salida === "function" ? regla.salida(sql, params) : regla.salida;
          if (salida instanceof Error) return setImmediate(() => cb(salida));
          return setImmediate(() => cb(null, salida));
        }
      }

      const limpio = sql.trim();

      // Llamada a procedimiento: el primer result set es lo que devuelve el SP.
      if (/^CALL\b/i.test(limpio)) return setImmediate(() => cb(null, [[]]));

      // Lectura de variables de salida: el driver las devuelve en la primera fila.
      if (/^SELECT\s+@/i.test(limpio)) {
        return setImmediate(() => cb(null, [{ resultado: 1, mensaje: "OK" }]));
      }

      // UPDATE/DELETE directo: solo se mira affectedRows.
      if (/^(UPDATE|DELETE|INSERT)\b/i.test(limpio)) {
        return setImmediate(() => cb(null, { affectedRows: 1 }));
      }

      // Cualquier otra cosa: result set generico.
      return setImmediate(() => cb(null, []));
    },

    connect(cb) {
      if (typeof cb === "function") setImmediate(() => cb(null));
      return db;
    },

    end(cb) {
      if (typeof cb === "function") setImmediate(() => cb(null));
    },
  };

  return {
    db,
    llamadas,
    /** Registra una respuesta para el SQL que cumpla `test`. */
    cuando(test, salida) {
      reglas.push({ test, salida });
      return this;
    },
    /** SQL de todas las consultas ejecutadas, en orden. */
    sql() {
      return llamadas.map((c) => c.sql);
    },
    /** Primer SQL que cumple `re`. */
    sqlDe(re) {
      return llamadas.find((c) => re.test(c.sql)) || null;
    },
    limpiar() {
      llamadas.length = 0;
      reglas.length = 0;
      return this;
    },
  };
}

// Singleton con identidad estable: server.js captura `db` al cargarse, asi que
// los tests limpian el estado en lugar de crear un doble nuevo.
let instancia = null;

function obtener() {
  if (!instancia) instancia = crearDoble();
  return instancia;
}

module.exports = { crearDoble, obtener };
