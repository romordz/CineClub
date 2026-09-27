/**
 * Configuracion comun a todos los tests.
 *
 * 1) Sustituye mysql2 por el doble, de modo que importar server.js no intente
 *    abrir una conexion real.
 * 2) Silencia el logging del servidor: hay console.log en casi todos los
 *    handlers y sin esto la salida del test es ilegible. Con CINE_LOG=1 se
 *    vuelve a ver.
 */

jest.mock("mysql2", () => {
  const { obtener } = require("./mock-db");
  return { createConnection: () => obtener().db };
});

if (!process.env.CINE_LOG) {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
}
