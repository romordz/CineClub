const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsDir)){
    require('fs').mkdirSync(uploadsDir);
}

const db = mysql.createConnection({
  host: 'localhost',    // Cambia según tu servidor
  user: 'root',         // Tu usuario de MySQL
  password: 'abc123',         // Tu contraseña de MySQL
  database: 'PrograWeb_2',   // Nombre de la base de datos
  decimalNumbers: true
});

db.connect((err) => {
  if (err) throw err;
  console.log('Conectado a la base de datos MySQL');
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ---------------------------------------------------------
// RUTA DE REGISTRO (SIN ENCRIPTACIÓN)
// ---------------------------------------------------------
app.post('/api/register', upload.single('fotoPerfil'), (req, res) => {
  const { nombre, email, password, fechaNacimiento } = req.body;
  
  const fotoPerfil = req.file ? req.file.buffer.toString('base64') : null;
  const fecha_registro = new Date();

  db.query(
    'CALL sp_RegistrarUsuario(?, ?, ?, ?, ?, ?, @resultado, @mensaje)',
    [nombre, email, password, fechaNacimiento, fotoPerfil, fecha_registro],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al registrar el usuario' });
      }
      
      db.query(
        'SELECT @resultado AS resultado, @mensaje AS mensaje',
        (err, output) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener resultado del registro' });
          }
          
          const { resultado, mensaje } = output[0];
          if (resultado === 1) {
            return res.status(200).json({ message: mensaje });
          } else {
            return res.status(400).json({ error: mensaje });
          }
        }
      );
    }
  );
});

// ---------------------------------------------------------
// RUTA DE LOGIN (SIN ENCRIPTACIÓN)
// ---------------------------------------------------------
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Primero llamar al stored procedure
  db.query(
    'CALL sp_LoginUsuario(?, ?, @resultado, @mensaje, @id, @nombre, @email, @fecha_nacimiento, @avatar, @rol_id)',
    [email, password],
    (err, results) => {
      if (err) {
        console.error('Error al ejecutar el stored procedure:', err);
        return res.status(500).json({ error: 'Error en la base de datos' });
      }
      
      // Luego obtener los parámetros de salida
      db.query(
        'SELECT @resultado AS resultado, @mensaje AS mensaje, @id AS id, @nombre AS nombre, @email AS email, @fecha_nacimiento AS fecha_nacimiento, @avatar AS avatar, @rol_id AS rol_id',
        (err, output) => {
          if (err) {
            console.error('Error al obtener resultados:', err);
            return res.status(500).json({ error: 'Error al procesar el login' });
          }
          
          const result = output[0];
          console.log('Resultado del login:', result); // Para depuración
          
          if (result.resultado === 1) {
            return res.json({
              message: result.mensaje,
              user: {
                id: result.id,
                nombre: result.nombre,
                email: result.email,
                fecha_nacimiento: result.fecha_nacimiento,
                rol_id: result.rol_id,
                avatar: result.avatar
              }
            });
          } else {
            const statusCode = result.mensaje === 'Usuario no encontrado' ? 400 : 
                             result.mensaje === 'El usuario fue eliminado' ? 403 : 
                             result.mensaje === 'Credenciales inválidas' ? 401 : 500;
            
            return res.status(statusCode).json({ error: result.mensaje });
          }
        }
      );
    }
  );
});

// ---------------------------------------------------------
// RUTA PARA ACTUALIZAR USUARIO
// ---------------------------------------------------------
app.post('/api/updateUser', upload.single('avatar'), (req, res) => {
  const { id, nombre, email, fecha_nacimiento, contraseña } = req.body;
  const avatar = req.file ? req.file.buffer.toString('base64') : null;

  db.query('SELECT contraseña FROM usuarios WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al verificar usuario' });
    }
    
    if (results.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const updatedPassword = contraseña || results[0].contraseña;

    db.query(
      'CALL sp_ActualizarUsuario(?, ?, ?, ?, ?, ?, @resultado, @mensaje, @nombre, @email, @fecha_nacimiento, @avatar, @rol_id)',
      [id, nombre, email, fecha_nacimiento, updatedPassword, avatar],
      (err, results) => {
        if (err) {
          console.error('Error al ejecutar stored procedure:', err);
          return res.status(500).json({ error: 'Error al actualizar usuario' });
        }

        db.query(
          'SELECT @resultado AS resultado, @mensaje AS mensaje, @nombre AS nombre, @email AS email, @fecha_nacimiento AS fecha_nacimiento, @avatar AS avatar, @rol_id AS rol_id',
          (err, output) => {
            if (err) {
              console.error('Error al obtener resultados:', err);
              return res.status(500).json({ error: 'Error al procesar actualización' });
            }

            const result = output[0];
            
            if (result.resultado === 1) {
              return res.status(200).json({
                message: result.mensaje,
                user: {
                  id: parseInt(id),
                  nombre: result.nombre,
                  email: result.email,
                  fecha_nacimiento: result.fecha_nacimiento,
                  avatar: result.avatar,
                  rol_id: result.rol_id
                }
              });
            } else {
              const statusCode = result.mensaje === 'El correo electrónico ya está en uso' ? 400 : 
                               result.mensaje === 'Usuario no encontrado' ? 404 : 500;
              
              return res.status(statusCode).json({ error: result.mensaje });
            }
          }
        );
      }
    );
  });
});

// ---------------------------------------------------------
// RUTA PARA DESACTIVAR USUARIO
// ---------------------------------------------------------
app.post('/api/deleteUser', (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Se requiere el ID del usuario' });
  }

  db.query(
    'CALL sp_DesactivarUsuario(?, @resultado, @mensaje)',
    [id],
    (err, results) => {
      if (err) {
        console.error('Error al ejecutar stored procedure:', err);
        return res.status(500).json({ error: 'Error al desactivar usuario' });
      }

      db.query(
        'SELECT @resultado AS resultado, @mensaje AS mensaje',
        (err, output) => {
          if (err) {
            console.error('Error al obtener resultados:', err);
            return res.status(500).json({ error: 'Error al procesar desactivación' });
          }

          const result = output[0];
          
          if (result.resultado === 1) {
            return res.status(200).json({ 
              message: result.mensaje 
            });
          } else {
            const statusCode = result.mensaje === 'Usuario no encontrado' ? 404 : 
                             result.mensaje === 'El usuario ya estaba desactivado' ? 400 : 500;
            
            return res.status(statusCode).json({ 
              error: result.mensaje 
            });
          }
        }
      );
    }
  );
});

// ---------------------------------------------------------
// RUTA PARA AGREGAR PELÍCULA
// ---------------------------------------------------------
app.post('/api/agregarPelicula', upload.single('imagen'), (req, res) => {
  const { titulo, sinopsis, director, genero, anio } = req.body;
  const imagen = req.file ? req.file.buffer.toString('base64') : null;

  if (!titulo || !director || !genero || !anio) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  db.query(
    'CALL sp_AgregarPelicula(?, ?, ?, ?, ?, ?, @resultado, @mensaje, @pelicula_id)',
    [titulo, sinopsis, director, genero, anio, imagen],
    (err, results) => {
      if (err) {
        console.error('Error al ejecutar stored procedure:', err);
        return res.status(500).json({ error: 'Error al agregar película' });
      }

      db.query(
        'SELECT @resultado AS resultado, @mensaje AS mensaje, @pelicula_id AS pelicula_id',
        (err, output) => {
          if (err) {
            console.error('Error al obtener resultados:', err);
            return res.status(500).json({ error: 'Error al procesar la película' });
          }

          const result = output[0];
          
          if (result.resultado === 1) {
            return res.status(200).json({ 
              message: result.mensaje,
              pelicula_id: result.pelicula_id
            });
          } else {
            const statusCode = result.mensaje === 'El género especificado no existe' ? 400 : 
                             result.mensaje === 'Ya existe una película con este título y director' ? 409 : 500;
            
            return res.status(statusCode).json({ 
              error: result.mensaje 
            });
          }
        }
      );
    }
  );
});

// ---------------------------------------------------------
// RUTA PARA OBTENER TODOS LOS GÉNEROS
// ---------------------------------------------------------
app.get('/api/generos', (req, res) => {
  db.query('CALL sp_ObtenerGeneros()', (err, results) => {
    if (err) {
      console.error('Error al obtener géneros:', err);
      return res.status(500).json({ error: 'Error al obtener géneros' });
    }
    return res.status(200).json(results[0]);
  });
});

// ---------------------------------------------------------
// RUTA PARA OBTENER TODAS LAS PELÍCULAS
// ---------------------------------------------------------
app.get('/api/peliculas', (req, res) => {
  const searchTerm = req.query.search || null;

  db.query(
    'CALL sp_BuscarPeliculas(?)',
    [searchTerm],
    (err, results) => {
      if (err) {
        console.error('Error al buscar películas:', err);
        return res.status(500).json({ error: 'Error al buscar películas' });
      }
      return res.status(200).json(results[0]);
    }
  );
});

app.get('/api/peliculas/:id', (req, res) => {
  const movieId = req.params.id;

  if (isNaN(movieId)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  db.query('CALL sp_ObtenerDetallePelicula(?)', [movieId], (err, results) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Error al obtener película' });
    }
    
    if (results[0].length === 0) {
      return res.status(404).json({ error: 'Película no encontrada' });
    }
    
    return res.status(200).json(results[0][0]);
  });
});

app.get('/api/resenias/:peliculaId', (req, res) => {
  const peliculaId = req.params.peliculaId;

  if (isNaN(peliculaId)) {
    return res.status(400).json({ error: 'ID de película inválido' });
  }

  db.query(
    'CALL sp_ObtenerReseniasPorPelicula(?)',
    [peliculaId],
    (err, results) => {
      if (err) {
        console.error('Error al obtener reseñas:', err);
        return res.status(500).json({ error: 'Error al obtener reseñas' });
      }
      
      const reseñas = results[0];
      
      const reseñasFormateadas = reseñas.map(reseña => ({
        ...reseña,
        autor_avatar: reseña.autor_avatar ? `data:image/jpeg;base64,${reseña.autor_avatar}` : null
      }));
      
      return res.status(200).json(reseñasFormateadas);
    }
  );
});

app.post('/api/resenias', (req, res) => {
  const { usuario_id, pelicula_id, comentario, puntuacion } = req.body;
  console.log('Datos recibidos:', req.body);

  if (!usuario_id || !pelicula_id || !comentario || !puntuacion) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  db.query(
    'CALL sp_CrearResena(?, ?, ?, ?, @resultado, @mensaje, @resena_id)',
    [usuario_id, pelicula_id, comentario, puntuacion],
    (err, results) => {
      if (err) {
        console.error('Error al crear reseña:', err);
        return res.status(500).json({ error: 'Error al crear reseña' });
      }

      db.query(
        'SELECT @resultado AS resultado, @mensaje AS mensaje, @resena_id AS resena_id',
        (err, output) => {
          if (err) {
            console.error('Error al obtener resultados:', err);
            return res.status(500).json({ error: 'Error al verificar creación de reseña' });
          }

          const { resultado, mensaje, resena_id } = output[0];
          
          if (resultado === 1) {
            return res.status(201).json({ 
              message: mensaje,
              resena_id: resena_id
            });
          } else {
            const statusCode = mensaje.includes('no encontrad') ? 404 : 
                             mensaje.includes('ya has reseñado') ? 409 : 
                             mensaje.includes('puntuación') ? 400 : 500;
            
            return res.status(statusCode).json({ 
              error: mensaje 
            });
          }
        }
      );
    }
  );
});

app.put('/api/resenias/:id', (req, res) => {
  const reviewId = req.params.id;
  const { comentario, puntuacion } = req.body;

  if (!comentario || typeof comentario !== 'string') {
    return res.status(400).json({ error: 'El comentario es requerido y debe ser texto' });
  }

  if (!puntuacion || isNaN(puntuacion) || puntuacion < 1 || puntuacion > 5) {
    return res.status(400).json({ error: 'La puntuación debe ser un número entre 1 y 5' });
  }

  db.query(
    'UPDATE Reseñas SET comentario = ?, puntuacion = ?, fecha_actualizacion = NOW() WHERE id = ?',
    [comentario, puntuacion, reviewId],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error en la base de datos' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Reseña no encontrada' });
      }
      return res.status(200).json({ 
        message: 'Reseña actualizada correctamente',
        resena_id: reviewId
      });
    }
  );
});

app.delete('/api/resenias/:id', (req, res) => {
  const reviewId = req.params.id;

  console.log('[DELETE] Iniciando eliminación de reseña ID:', reviewId);

  if (isNaN(reviewId)) {
    console.error('ID de reseña inválido:', reviewId);
    return res.status(400).json({ error: 'ID de reseña inválido' });
  }

  db.query(
    'CALL sp_EliminarResena(?, @resultado, @mensaje)',
    [reviewId],
    (err, results) => {
      if (err) {
        console.error('Error en la consulta:', {
          code: err.code,
          errno: err.errno,
          sqlMessage: err.sqlMessage,
          sqlState: err.sqlState
        });
        return res.status(500).json({ 
          error: 'Error en la base de datos',
          details: err.sqlMessage
        });
      }

      db.query(
        'SELECT @resultado AS resultado, @mensaje AS mensaje',
        (err, output) => {
          if (err) {
            console.error('Error al obtener resultados:', err);
            return res.status(500).json({ error: 'Error al verificar eliminación' });
          }

          const { resultado, mensaje } = output[0];
          console.log('Resultado del SP:', { resultado, mensaje });
          
          if (resultado === 1) {
            return res.status(200).json({ 
              message: mensaje,
              resena_id: parseInt(reviewId)
            });
          } else {
            const statusCode = mensaje.includes('no encontrada') ? 404 : 500;
            return res.status(statusCode).json({ 
              error: mensaje,
              resena_id: reviewId
            });
          }
        }
      );
    }
  );
});

app.get('/api/resenias/usuario/:usuarioId', (req, res) => {
  const usuarioId = req.params.usuarioId;

  if (isNaN(usuarioId)) {
    return res.status(400).json({ 
      error: 'ID de usuario inválido',
      details: `Se recibió: ${usuarioId}`
    });
  }

  console.log(`[GET] Obteniendo reseñas para usuario ID: ${usuarioId}`);

  db.query(
    'CALL sp_ObtenerResenasPorUsuario(?, @resultado, @mensaje)',
    [usuarioId],
    (err, results) => {
      if (err) {
        console.error('Error al obtener reseñas:', {
          code: err.code,
          errno: err.errno,
          sqlMessage: err.sqlMessage
        });
        return res.status(500).json({ 
          error: 'Error en la base de datos',
          details: err.sqlMessage
        });
      }

      db.query(
        'SELECT @resultado AS resultado, @mensaje AS mensaje',
        (err, output) => {
          if (err) {
            console.error('Error al verificar resultados:', err);
            return res.status(500).json({ 
              error: 'Error al procesar resultados',
              details: err.message
            });
          }

          const { resultado, mensaje } = output[0];
          
          if (resultado === 1) {
            const reseñas = results[0];
            console.log(`[GET] Encontradas ${reseñas.length} reseñas para usuario ${usuarioId}`);
            
            return res.status(200).json({
              success: true,
              message: mensaje,
              data: reseñas,
              count: reseñas.length
            });
          } else {
            console.warn(`[GET] ${mensaje} - Usuario ID: ${usuarioId}`);
            return res.status(404).json({ 
              error: mensaje,
              usuario_id: usuarioId
            });
          }
        }
      );
    }
  );
});

// ---------------------------------------------------------
// RUTA PARA OBTENER FAVORITOS
// ---------------------------------------------------------
// Ruta para manejar favoritos
app.post('/api/favoritos', (req, res) => {
  const { usuario_id, pelicula_id } = req.body;

  if (!usuario_id || !pelicula_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  console.log(`[POST] Agregando favorito - Usuario: ${usuario_id}, Película: ${pelicula_id}`);

  db.query(
    'CALL sp_AgregarFavorito(?, ?, @resultado, @mensaje)',
    [usuario_id, pelicula_id],
    (err, results) => {
      if (err) {
        console.error('Error al agregar favorito:', {
          code: err.code,
          errno: err.errno,
          sqlMessage: err.sqlMessage
        });
        return res.status(500).json({ 
          error: 'Error en la base de datos',
          details: err.sqlMessage
        });
      }

      db.query(
        'SELECT @resultado AS resultado, @mensaje AS mensaje',
        (err, output) => {
          if (err) {
            console.error('Error al verificar resultados:', err);
            return res.status(500).json({ 
              error: 'Error al procesar resultados',
              details: err.message
            });
          }

          const { resultado, mensaje } = output[0];
          
          if (resultado === 1) {
            return res.status(200).json({
              success: true,
              message: mensaje
            });
          } else {
            return res.status(400).json({ 
              error: mensaje
            });
          }
        }
      );
    }
  );
});

app.post('/api/favoritos/check', (req, res) => {
  const { usuario_id, pelicula_id } = req.body;

  if (!usuario_id || !pelicula_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  console.log(`[POST] Verificando favorito - Usuario: ${usuario_id}, Película: ${pelicula_id}`);

  db.query(
    'CALL sp_VerificarFavorito(?, ?, @resultado, @mensaje, @es_favorito)',
    [usuario_id, pelicula_id],
    (err, results) => {
      if (err) {
        console.error('Error al verificar favorito:', {
          code: err.code,
          errno: err.errno,
          sqlMessage: err.sqlMessage
        });
        return res.status(500).json({ 
          error: 'Error en la base de datos',
          details: err.sqlMessage
        });
      }

      db.query(
        'SELECT @resultado AS resultado, @mensaje AS mensaje, @es_favorito AS es_favorito',
        (err, output) => {
          if (err) {
            console.error('Error al verificar resultados:', err);
            return res.status(500).json({ 
              error: 'Error al procesar resultados',
              details: err.message
            });
          }

          const { resultado, mensaje, es_favorito } = output[0];
          
          if (resultado === 1) {
            return res.status(200).json({
              success: true,
              message: mensaje,
              esFavorito: es_favorito
            });
          } else {
            return res.status(400).json({ 
              error: mensaje,
              esFavorito: false
            });
          }
        }
      );
    }
  );
});

app.delete('/api/favoritos', (req, res) => {
  const { usuario_id, pelicula_id } = req.body;

  if (!usuario_id || !pelicula_id) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  console.log(`[DELETE] Eliminando favorito - Usuario: ${usuario_id}, Película: ${pelicula_id}`);

  db.query(
    'CALL sp_EliminarFavorito(?, ?, @resultado, @mensaje, @filas_afectadas)',
    [usuario_id, pelicula_id],
    (err, results) => {
      if (err) {
        console.error('Error al eliminar favorito:', {
          code: err.code,
          errno: err.errno,
          sqlMessage: err.sqlMessage
        });
        return res.status(500).json({ 
          error: 'Error en la base de datos',
          details: err.sqlMessage
        });
      }

      db.query(
        'SELECT @resultado AS resultado, @mensaje AS mensaje, @filas_afectadas AS filas_afectadas',
        (err, output) => {
          if (err) {
            console.error('Error al verificar resultados:', err);
            return res.status(500).json({ 
              error: 'Error al procesar resultados',
              details: err.message
            });
          }

          const { resultado, mensaje, filas_afectadas } = output[0];
          
          if (resultado === 1) {
            return res.status(200).json({
              success: true,
              message: mensaje,
              filasAfectadas: filas_afectadas
            });
          } else {
            return res.status(400).json({ 
              error: mensaje,
              filasAfectadas: filas_afectadas
            });
          }
        }
      );
    }
  );
});

app.get('/api/favoritos/usuario/:usuarioId', (req, res) => {
  const usuarioId = req.params.usuarioId;

  // Llamar al stored procedure
  db.query(
    'CALL sp_ObtenerFavoritosPorUsuario(?, @resultado, @mensaje)',
    [usuarioId],
    (err, results) => {
      if (err) {
        console.error('Error al obtener favoritos:', err);
        return res.status(500).json({ 
          error: 'Error en la base de datos',
          details: err.sqlMessage
        });
      }

      // Obtener resultados del stored procedure
      db.query(
        'SELECT @resultado AS resultado, @mensaje AS mensaje',
        (err, output) => {
          if (err) {
            console.error('Error al verificar resultados:', err);
            return res.status(500).json({ 
              error: 'Error al procesar resultados',
              details: err.message
            });
          }

          const { resultado, mensaje } = output[0];
          
          if (resultado === 1) {
            const favoritos = results[0] || [];
            return res.status(200).json({
              success: true,
              message: mensaje,
              data: favoritos,
              count: favoritos.length
            });
          } else {
            return res.status(404).json({ 
              error: mensaje,
              data: [],
              count: 0
            });
          }
        }
      );
    }
  );
});
// ---------------------------------------------------------
// Arrancamos el servidor
// ---------------------------------------------------------
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});