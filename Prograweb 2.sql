-- CineClub -- esquema e instalacion de datos.
--
-- SET NAMES fija la codificacion de la sesion: los acentos de este archivo
--  (contraseña, Reseñas, Acción) son UTF-8 de dos bytes y sin esto el cliente
--  los manda como latin1 y MySQL no reconoce los identificadores.
SET NAMES utf8mb4;

-- FOREIGN_KEY_CHECKS se apaga durante la carga porque peliculas declara
--  FOREIGN KEY (genero_id) REFERENCES generos(id) y generos se crea despues.
--  Con las comprobaciones activas, MySQL rechaza el CREATE TABLE (error 1824).
SET FOREIGN_KEY_CHECKS = 0;
Create database PrograWeb_2;
Use PrograWeb_2;


CREATE TABLE rol (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    fecha_nacimiento DATETIME NOT NULL,
	avatar LONGTEXT,
    fecha_registro DATE NOT NULL,
    rol_id INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (rol_id) REFERENCES rol(id)
);

-- No se siembra ninguna cuenta.
--
-- La version anterior insertaba aqui un usuario administrador con una
-- contrasena en claro, committed al repositorio. Eso es una credencial
-- publicada: cualquiera que clone el repositorio obtiene acceso a la base
-- que cree, y si esa base llega a un host compartido, tambien al host.
--
-- Para crear el primer usuario (necesitas rol_id = 2, el de administrador):
--
--   INSERT INTO usuarios
--     (nombre, email, contraseña, fecha_nacimiento, avatar, fecha_registro, rol_id, activo)
--   VALUES
--     ('Tu nombre', 'tu@correo.com', 'tu contrasena', '1990-01-01', NULL, CURDATE(), 2, TRUE);
--
-- La contrasena se guarda en claro porque sp_LoginUsuario la compara
-- directamente. Es una decision pendiente, no una recomendacion: ver la
-- seccion "Huecos conocidos" del README.

ALTER TABLE usuarios MODIFY COLUMN fecha_nacimiento DATE NOT NULL;



CREATE TABLE peliculas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_lanzamiento DATE,
    genero_id INT,
    imagen LONGTEXT,
    director varchar(255) NOT NULL,
    FOREIGN KEY (genero_id) REFERENCES generos(id)
);

ALTER TABLE peliculas MODIFY COLUMN imagen LONGTEXT;

CREATE TABLE generos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

-- Roles base. Sin estas filas el registro falla: usuarios.rol_id tiene
-- FOREIGN KEY REFERENCES rol(id), asi que con la tabla rol vacia cualquier
-- INSERT en usuarios se rechaza por error 1452. sp_RegistrarUsuario escribe
-- rol_id = 1 y el front chequea user.rol_id === 2 para las pantallas de admin.
INSERT INTO rol (id, nombre) VALUES
(1, 'Usuario'),
(2, 'Administrador');

INSERT INTO generos (nombre) VALUES
('Acción'),
('Aventura'),
('Comedia'),
('Drama'),
('Fantasía'),
('Terror'),
('Ciencia Ficción'),
('Romance'),
('Thriller'),
('Animación'),
('Documental'),
('Musical'),
('Misterio'),
('Crimen'),
('Bélica');


CREATE TABLE reseñas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    pelicula_id INT,
    comentario TEXT,
    puntuacion INT CHECK (puntuacion >= 1 AND puntuacion <= 5),
    fecha_creacion DATE NOT NULL,
    fecha_actualizacion TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (pelicula_id) REFERENCES peliculas(id)
);

ALTER TABLE reseñas MODIFY COLUMN fecha_creacion DATE;
-- (El ALTER que anade fecha_actualizacion se elimino: la columna ya se
--  declara en el CREATE TABLE de arriba y MySQL lo rechazaba con error 1060.)

CREATE TABLE favoritos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    pelicula_id INT,
    fecha_agregado DATETIME NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (pelicula_id) REFERENCES peliculas(id)
);

-- Stored Procedures
DELIMITER //

CREATE TABLE IF NOT EXISTS error_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    procedimiento VARCHAR(100),
    mensaje TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS debug_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mensaje TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS = 1;
