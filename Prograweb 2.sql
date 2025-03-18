Create database PrograWeb_2;
Use PrograWeb_2;

select * from usuarios;

CREATE TABLE Rol (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

CREATE TABLE Usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    fecha_nacimiento DATETIME NOT NULL,
	avatar LONGTEXT,
    fecha_registro DATE NOT NULL,
    rol_id INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (rol_id) REFERENCES Rol(id)
);

INSERT INTO Usuarios (nombre, email, contraseña, fecha_nacimiento, avatar, fecha_registro, rol_id, activo)
VALUES ('Admin User', 'admin@example.com', 'adminpassword', '1980-01-01', NULL, CURDATE(), 2, TRUE);

ALTER TABLE Usuarios MODIFY COLUMN fecha_nacimiento DATE NOT NULL;


select * from Peliculas;

CREATE TABLE Peliculas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_lanzamiento DATE,
    genero_id INT,
    imagen LONGTEXT,
    director varchar(255) NOT NULL,
    FOREIGN KEY (genero_id) REFERENCES Generos(id)
);

ALTER TABLE Peliculas MODIFY COLUMN imagen LONGTEXT;

CREATE TABLE Generos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

INSERT INTO Generos (nombre) VALUES
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

select * from Reseñas;

CREATE TABLE Reseñas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    pelicula_id INT,
    comentario TEXT,
    puntuacion INT CHECK (puntuacion >= 1 AND puntuacion <= 5),
    fecha_creacion DATE NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id),
    FOREIGN KEY (pelicula_id) REFERENCES Peliculas(id)
);

ALTER TABLE Reseñas MODIFY COLUMN fecha_creacion DATE;

select * from Favoritos;
CREATE TABLE Favoritos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    pelicula_id INT,
    fecha_agregado DATETIME NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id),
    FOREIGN KEY (pelicula_id) REFERENCES Peliculas(id)
);