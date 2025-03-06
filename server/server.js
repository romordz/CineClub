// server.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const app = express();

// CORS configuration - place this before any routes
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!require('fs').existsSync(uploadsDir)){
    require('fs').mkdirSync(uploadsDir);
}

// Configura la conexión a tu base de datos
const db = mysql.createConnection({
  host: 'localhost',    // Cambia según tu servidor
  user: 'root',         // Tu usuario de MySQL
  password: 'abc123',         // Tu contraseña de MySQL
  database: 'PrograWeb_2'   // Nombre de la base de datos
});

db.connect((err) => {
  if (err) throw err;
  console.log('Conectado a la base de datos MySQL');
});

// Configuración de multer para manejar archivos
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ---------------------------------------------------------
// RUTA DE REGISTRO (SIN ENCRIPTACIÓN)
// ---------------------------------------------------------
app.post('/api/register', upload.single('fotoPerfil'), (req, res) => {
  const { nombre, email, password, fechaNacimiento } = req.body;
  
  // Convert file buffer to base64 string if a file was uploaded
  const fotoPerfil = req.file ? req.file.buffer.toString('base64') : null;

  // Campos adicionales
  const fecha_registro = new Date();

  // Insertar el usuario en la BD (contraseña en texto plano - NO RECOMENDADO)
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

  // Verificar si el usuario existe
  db.query('SELECT * FROM usuarios WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error en la base de datos' });
    }
    if (results.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    // Extraemos al usuario
    const user = results[0];

    // Comparación directa (sin bcrypt)
    if (user.contraseña !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Si todo está bien, retornamos la información (o un token, etc.)
    return res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        avatar: user.avatar
      }
    });
  });
});

// ---------------------------------------------------------
// Arrancamos el servidor
// ---------------------------------------------------------
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});