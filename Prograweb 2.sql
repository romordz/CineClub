Create database PrograWeb_2;
Use PrograWeb_2;

CREATE TABLE Rol (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

CREATE TABLE Generos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

select * from usuarios;
CREATE TABLE Usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    fecha_nacimiento DATETIME NOT NULL,
	avatar LONGTEXT,
    fecha_registro DATETIME NOT NULL,
    rol_id INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (rol_id) REFERENCES Rol(id)
);

drop table usuarios;
drop table reseñas;
drop table favoritos;

CREATE TABLE Peliculas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_lanzamiento DATE,
    genero_id INT,
    imagen VARCHAR(255),
    director varchar(255) NOT NULL,
    FOREIGN KEY (genero_id) REFERENCES Generos(id)
);

CREATE TABLE Reseñas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    pelicula_id INT,
    comentario TEXT,
    puntuacion INT CHECK (puntuacion >= 1 AND puntuacion <= 5),
    fecha_creacion DATETIME NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id),
    FOREIGN KEY (pelicula_id) REFERENCES Peliculas(id)
);

CREATE TABLE Favoritos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    pelicula_id INT,
    fecha_agregado DATETIME NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id),
    FOREIGN KEY (pelicula_id) REFERENCES Peliculas(id)
);