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
    'INSERT INTO usuarios (nombre, email, contraseña, fecha_nacimiento, avatar, fecha_registro) VALUES (?, ?, ?, ?, ?, ?)',
    [nombre, email, password, fechaNacimiento, fotoPerfil, fecha_registro],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al registrar el usuario' });
      }
      return res.status(200).json({ message: 'Usuario registrado correctamente' });
    }
  );
});

// ---------------------------------------------------------
// RUTA DE LOGIN (SIN ENCRIPTACIÓN)
// ---------------------------------------------------------
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM usuarios WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error en la base de datos' });
    }
    if (results.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const user = results[0];

    if (user.activo === 0) {
      return res.status(403).json({ error: 'El usuario fue eliminado' });
    }

    if (user.contraseña !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    console.log('User data from database:', user);

    return res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        fecha_nacimiento: user.fecha_nacimiento,
        contraseña: user.contraseña,
        rol_id: user.rol_id,
        avatar: user.avatar
      }
    });
  });
});

// ---------------------------------------------------------
// RUTA PARA ACTUALIZAR USUARIO
// ---------------------------------------------------------
app.post('/api/updateUser', upload.single('avatar'), (req, res) => {
  const { id, nombre, email, fecha_nacimiento, contraseña } = req.body;
  const avatar = req.file ? req.file.buffer.toString('base64') : null;

  db.query('SELECT * FROM usuarios WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener los datos del usuario' });
    }
    if (results.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const currentUser = results[0];
    const updatedPassword = contraseña || currentUser.contraseña;

    const query = avatar
      ? 'UPDATE usuarios SET nombre = ?, email = ?, fecha_nacimiento = ?, contraseña = ?, avatar = ? WHERE id = ?'
      : 'UPDATE usuarios SET nombre = ?, email = ?, fecha_nacimiento = ?, contraseña = ? WHERE id = ?';

    const params = avatar
      ? [nombre, email, fecha_nacimiento, updatedPassword, avatar, id]
      : [nombre, email, fecha_nacimiento, updatedPassword, id];

    db.query(query, params, (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'El correo electrónico ya está en uso' });
        }
        console.error(err);
        return res.status(500).json({ error: 'Error al actualizar el usuario' });
      }
      db.query('SELECT * FROM usuarios WHERE id = ?', [id], (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Error al obtener los datos actualizados del usuario' });
        }
        const updatedUser = results[0];
        return res.status(200).json({ message: 'Usuario actualizado correctamente', user: updatedUser });
      });
    });
  });
});

// ---------------------------------------------------------
// RUTA PARA DESACTIVAR USUARIO
// ---------------------------------------------------------
app.post('/api/deleteUser', (req, res) => {
  const { id } = req.body;

  db.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al desactivar el usuario' });
    }
    return res.status(200).json({ message: 'Usuario desactivado correctamente' });
  });
});

// ---------------------------------------------------------
// RUTA PARA AGREGAR PELÍCULA
// ---------------------------------------------------------
app.post('/api/agregarPelicula', upload.single('imagen'), (req, res) => {
  const { titulo, sinopsis, director, genero, anio } = req.body;
  const imagen = req.file ? req.file.buffer.toString('base64') : null;

  db.query(
    'INSERT INTO peliculas (titulo, descripcion, fecha_lanzamiento, genero_id, imagen, director) VALUES (?, ?, ?, ?, ?, ?)',
    [titulo, sinopsis, anio, genero, imagen, director],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al agregar la película' });
      }
      return res.status(200).json({ message: 'Película agregada correctamente' });
    }
  );
});

// ---------------------------------------------------------
// RUTA PARA OBTENER TODOS LOS GÉNEROS
// ---------------------------------------------------------
app.get('/api/generos', (req, res) => {
  db.query('SELECT * FROM generos', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener los géneros' });
    }
    return res.status(200).json(results);
  });
});

// ---------------------------------------------------------
// RUTA PARA OBTENER TODAS LAS PELÍCULAS
// ---------------------------------------------------------
app.get('/api/peliculas', (req, res) => {
  const searchTerm = req.query.search;
  let query = `
    SELECT 
      p.id, 
      p.titulo, 
      p.descripcion, 
      p.fecha_lanzamiento, 
      p.imagen, 
      p.director, 
      g.nombre AS genero,
      COALESCE(AVG(r.puntuacion), 0) AS promedio
    FROM peliculas p
    JOIN generos g ON p.genero_id = g.id
    LEFT JOIN Reseñas r ON p.id = r.pelicula_id
  `;

  const params = [];

  if (searchTerm) {
    query += ' WHERE p.titulo LIKE ?';
    params.push(`%${searchTerm}%`);
  }

  query += ' GROUP BY p.id ORDER BY p.fecha_lanzamiento DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener las películas' });
    }
    return res.status(200).json(results);
  });
});

app.get('/api/peliculas/:id', (req, res) => {
  const movieId = req.params.id;
  const query = `
    SELECT 
      p.*, 
      g.nombre AS genero,
      COALESCE(AVG(r.puntuacion), 0) AS promedio,
      COUNT(r.id) AS total_resenias
    FROM peliculas p
    JOIN generos g ON p.genero_id = g.id
    LEFT JOIN Reseñas r ON p.id = r.pelicula_id
    WHERE p.id = ?
    GROUP BY p.id
  `;
  
  db.query(query, [movieId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener la película' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Película no encontrada' });
    }
    return res.status(200).json(results[0]);
  });
});

app.get('/api/resenias/:peliculaId', (req, res) => {
  const peliculaId = req.params.peliculaId;
  
  const query = `
    SELECT r.id, r.usuario_id, r.comentario, r.puntuacion, r.fecha_creacion, u.nombre as autor 
    FROM Reseñas r
    JOIN usuarios u ON r.usuario_id = u.id
    WHERE pelicula_id = ?
    ORDER BY fecha_creacion DESC
  `;

  db.query(query, [peliculaId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener las reseñas' });
    }
    return res.status(200).json(results);
  });
});

app.post('/api/resenias', (req, res) => {
  const { usuario_id, pelicula_id, comentario, puntuacion } = req.body;
  const fecha_creacion = new Date();

  db.query(
    'INSERT INTO Reseñas (usuario_id, pelicula_id, comentario, puntuacion, fecha_creacion) VALUES (?, ?, ?, ?, ?)',
    [usuario_id, pelicula_id, comentario, puntuacion, fecha_creacion],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al guardar la reseña' });
      }
      return res.status(200).json({ message: 'Reseña guardada correctamente' });
    }
  );
});

app.put('/api/resenias/:id', (req, res) => {
  const reviewId = req.params.id;
  const { comentario, puntuacion } = req.body;

  db.query(
    'UPDATE Reseñas SET comentario = ?, puntuacion = ? WHERE id = ?',
    [comentario, puntuacion, reviewId],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al modificar la reseña' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Reseña no encontrada' });
      }
      return res.status(200).json({ message: 'Reseña modificada correctamente' });
    }
  );
});

app.delete('/api/resenias/:id', (req, res) => {
  const reviewId = req.params.id;

  db.query(
    'DELETE FROM Reseñas WHERE id = ?',
    [reviewId],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al eliminar la reseña' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Reseña no encontrada' });
      }
      return res.status(200).json({ message: 'Reseña eliminada correctamente' });
    }
  );
});

app.get('/api/resenias/usuario/:usuarioId', (req, res) => {
  const usuarioId = req.params.usuarioId;
  
  const query = `
    SELECT 
      r.id, 
      r.comentario, 
      r.puntuacion, 
      r.fecha_creacion, 
      p.id AS pelicula_id,
      p.titulo AS pelicula_titulo, 
      p.imagen AS pelicula_imagen
    FROM Reseñas r
    JOIN Peliculas p ON r.pelicula_id = p.id
    WHERE r.usuario_id = ?
    ORDER BY r.fecha_creacion DESC
  `;

  db.query(query, [usuarioId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener las reseñas del usuario' });
    }
    return res.status(200).json(results);
  });
});

// ---------------------------------------------------------
// RUTA PARA OBTENER FAVORITOS
// ---------------------------------------------------------
// Ruta para manejar favoritos
app.post('/api/favoritos', (req, res) => {
  const { usuario_id, pelicula_id } = req.body;
  const fecha_agregado = new Date();

  db.query(
    'SELECT * FROM Favoritos WHERE usuario_id = ? AND pelicula_id = ?',
    [usuario_id, pelicula_id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al verificar favoritos' });
      }
      
      if (results.length > 0) {
        return res.status(400).json({ error: 'Ya existe en favoritos' });
      }

      db.query(
        'INSERT INTO Favoritos (usuario_id, pelicula_id, fecha_agregado) VALUES (?, ?, ?)',
        [usuario_id, pelicula_id, fecha_agregado],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al agregar a favoritos' });
          }
          return res.status(200).json({ message: 'Agregado a favoritos' });
        }
      );
    }
  );
});

app.post('/api/favoritos/check', (req, res) => {
  const { usuario_id, pelicula_id } = req.body;

  db.query(
    'SELECT * FROM Favoritos WHERE usuario_id = ? AND pelicula_id = ?',
    [usuario_id, pelicula_id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al verificar favorito' });
      }
      return res.status(200).json({ esFavorito: results.length > 0 });
    }
  );
});

app.delete('/api/favoritos', (req, res) => {
  const { usuario_id, pelicula_id } = req.body;

  db.query(
    'DELETE FROM Favoritos WHERE usuario_id = ? AND pelicula_id = ?',
    [usuario_id, pelicula_id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al eliminar de favoritos' });
      }
      return res.status(200).json({ message: 'Eliminado de favoritos' });
    }
  );
});

app.get('/api/favoritos/usuario/:usuarioId', (req, res) => {
  const usuarioId = req.params.usuarioId;
  
  const query = `
    SELECT 
      f.id,
      f.fecha_agregado,
      p.titulo AS pelicula_titulo,
      p.imagen AS pelicula_imagen,
      p.id AS pelicula_id
    FROM Favoritos f
    JOIN Peliculas p ON f.pelicula_id = p.id
    WHERE f.usuario_id = ?
    ORDER BY f.fecha_agregado DESC
  `;

  db.query(query, [usuarioId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al obtener los favoritos' });
    }
    return res.status(200).json(results);
  });
});
// ---------------------------------------------------------
// Arrancamos el servidor
// ---------------------------------------------------------
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});