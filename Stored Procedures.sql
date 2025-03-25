DELIMITER //

CREATE PROCEDURE sp_RegistrarUsuario(
    IN p_nombre VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_contrasena VARCHAR(255),
    IN p_fecha_nacimiento DATE,
    IN p_avatar LONGTEXT,
    IN p_fecha_registro DATE,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error al registrar el usuario';
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    IF EXISTS (SELECT 1 FROM usuarios WHERE email = p_email) THEN
        SET p_resultado = 0;
        SET p_mensaje = 'El correo electrónico ya está registrado';
    ELSE
        INSERT INTO usuarios (nombre, email, contraseña, fecha_nacimiento, avatar, fecha_registro, rol_id, activo)
        VALUES (p_nombre, p_email, p_contrasena, p_fecha_nacimiento, p_avatar, p_fecha_registro, 1, TRUE);
        
        SET p_resultado = 1;
        SET p_mensaje = 'Usuario registrado correctamente';
    END IF;
    
    COMMIT;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_LoginUsuario(
    IN p_email VARCHAR(100),
    IN p_contrasena VARCHAR(255),
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255),
    OUT p_id INT,
    OUT p_nombre VARCHAR(100),
    OUT p_email_out VARCHAR(100),
    OUT p_fecha_nacimiento DATE,
    OUT p_avatar LONGTEXT,
    OUT p_rol_id INT
)
BEGIN
    DECLARE v_activo BOOLEAN;
    DECLARE v_contrasena VARCHAR(255);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error en la base de datos';
        ROLLBACK;
    END;
    
    SET p_id = NULL;
    SET p_nombre = NULL;
    SET p_email_out = NULL;
    SET p_fecha_nacimiento = NULL;
    SET p_avatar = NULL;
    SET p_rol_id = NULL;
    
    SELECT 
        id, nombre, email, fecha_nacimiento, avatar, rol_id, activo, contraseña
    INTO
        p_id, p_nombre, p_email_out, p_fecha_nacimiento, p_avatar, p_rol_id, v_activo, v_contrasena
    FROM usuarios 
    WHERE email = p_email;
    
    IF p_id IS NULL THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Usuario no encontrado';
    ELSE
        IF v_activo = 0 THEN
            SET p_resultado = 0;
            SET p_mensaje = 'El usuario fue eliminado';
        ELSE
            IF v_contrasena != p_contrasena THEN
                SET p_resultado = 0;
                SET p_mensaje = 'Credenciales inválidas';
            ELSE
                SET p_resultado = 1;
                SET p_mensaje = 'Inicio de sesión exitoso';
            END IF;
        END IF;
    END IF;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_ActualizarUsuario(
    IN p_id INT,
    IN p_nombre VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_fecha_nacimiento DATE,
    IN p_contrasena VARCHAR(255),
    IN p_avatar LONGTEXT,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255),
    OUT p_nombre_out VARCHAR(100),
    OUT p_email_out VARCHAR(100),
    OUT p_fecha_nacimiento_out DATE,
    OUT p_avatar_out LONGTEXT,
    OUT p_rol_id_out INT
)
BEGIN
    DECLARE v_email_existe INT;
    DECLARE v_usuario_existe INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error en la base de datos';
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    -- Verificar si el usuario existe
    SELECT COUNT(*) INTO v_usuario_existe FROM usuarios WHERE id = p_id;
    
    IF v_usuario_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Usuario no encontrado';
    ELSE
        -- Verificar si el nuevo email ya está en uso por otro usuario
        SELECT COUNT(*) INTO v_email_existe 
        FROM usuarios 
        WHERE email = p_email AND id != p_id;
        
        IF v_email_existe > 0 THEN
            SET p_resultado = 0;
            SET p_mensaje = 'El correo electrónico ya está en uso';
        ELSE
            -- Actualizar usuario
            IF p_avatar IS NULL THEN
                UPDATE usuarios 
                SET nombre = p_nombre,
                    email = p_email,
                    fecha_nacimiento = p_fecha_nacimiento,
                    contraseña = p_contrasena
                WHERE id = p_id;
            ELSE
                UPDATE usuarios 
                SET nombre = p_nombre,
                    email = p_email,
                    fecha_nacimiento = p_fecha_nacimiento,
                    contraseña = p_contrasena,
                    avatar = p_avatar
                WHERE id = p_id;
            END IF;
            
            -- Obtener datos actualizados
            SELECT 
                nombre, email, fecha_nacimiento, avatar, rol_id
            INTO
                p_nombre_out, p_email_out, p_fecha_nacimiento_out, p_avatar_out, p_rol_id_out
            FROM usuarios 
            WHERE id = p_id;
            
            SET p_resultado = 1;
            SET p_mensaje = 'Usuario actualizado correctamente';
        END IF;
    END IF;
    
    COMMIT;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_DesactivarUsuario(
    IN p_id INT,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255)
)
BEGIN
    DECLARE v_usuario_existe INT;
    DECLARE v_ya_desactivado INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error en la base de datos al desactivar usuario';
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    SELECT COUNT(*) INTO v_usuario_existe FROM usuarios WHERE id = p_id;
    
    IF v_usuario_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Usuario no encontrado';
    ELSE
        SELECT COUNT(*) INTO v_ya_desactivado 
        FROM usuarios 
        WHERE id = p_id AND activo = 0;
        
        IF v_ya_desactivado > 0 THEN
            SET p_resultado = 0;
            SET p_mensaje = 'El usuario ya estaba desactivado';
        ELSE
            UPDATE usuarios 
            SET activo = 0 
            WHERE id = p_id;
            
            SET p_resultado = 1;
            SET p_mensaje = 'Usuario desactivado correctamente';
        END IF;
    END IF;
    
    COMMIT;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_AgregarPelicula(
    IN p_titulo VARCHAR(255),
    IN p_sinopsis TEXT,
    IN p_director VARCHAR(255),
    IN p_genero_id INT,
    IN p_anio DATE,
    IN p_imagen LONGTEXT,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255),
    OUT p_pelicula_id INT
)
BEGIN
    DECLARE v_genero_existe INT;
    DECLARE v_pelicula_existe INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error en la base de datos al agregar película';
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    SELECT COUNT(*) INTO v_genero_existe FROM generos WHERE id = p_genero_id;
    
    IF v_genero_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'El género especificado no existe';
    ELSE
        SELECT COUNT(*) INTO v_pelicula_existe 
        FROM peliculas 
        WHERE titulo = p_titulo AND director = p_director;
        
        IF v_pelicula_existe > 0 THEN
            SET p_resultado = 0;
            SET p_mensaje = 'Ya existe una película con este título y director';
        ELSE
            INSERT INTO peliculas (titulo, descripcion, director, genero_id, fecha_lanzamiento, imagen)
            VALUES (p_titulo, p_sinopsis, p_director, p_genero_id, p_anio, p_imagen);
            
            SET p_pelicula_id = LAST_INSERT_ID();
            SET p_resultado = 1;
            SET p_mensaje = 'Película agregada correctamente';
        END IF;
    END IF;
    
    COMMIT;
END //

DELIMITER ;


DELIMITER //

CREATE PROCEDURE sp_ObtenerGeneros()
BEGIN
    SELECT id, nombre FROM generos ORDER BY nombre ASC;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_BuscarPeliculas(
    IN p_search_term VARCHAR(255)
)
BEGIN
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
    WHERE 
        (p_search_term IS NULL OR p_search_term = '' OR p.titulo LIKE CONCAT('%', p_search_term, '%'))
    GROUP BY p.id
    ORDER BY p.fecha_lanzamiento DESC;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_ObtenerDetallePelicula(IN p_movie_id INT)
BEGIN
    SELECT 
        p.*,
        g.nombre AS genero,
        COALESCE(AVG(r.puntuacion), 0) AS promedio,
        COUNT(r.id) AS total_resenias
    FROM peliculas p
    JOIN generos g ON p.genero_id = g.id
    LEFT JOIN Reseñas r ON p.id = r.pelicula_id
    WHERE p.id = p_movie_id
    GROUP BY p.id;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_ObtenerReseniasPorPelicula(
    IN p_pelicula_id INT
)
BEGIN
    SELECT 
        r.id, 
        r.usuario_id, 
        r.comentario, 
        r.puntuacion, 
        r.fecha_creacion, 
        u.nombre as autor,
        u.avatar as autor_avatar
    FROM Reseñas r
    JOIN usuarios u ON r.usuario_id = u.id
    WHERE r.pelicula_id = p_pelicula_id
    ORDER BY r.fecha_creacion DESC;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_CrearResena(
    IN p_usuario_id INT,
    IN p_pelicula_id INT,
    IN p_comentario TEXT,
    IN p_puntuacion INT,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255),
    OUT p_resena_id INT
)
BEGIN
    DECLARE v_usuario_existe INT;
    DECLARE v_pelicula_existe INT;
    DECLARE v_resena_existe INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error al crear la reseña';
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    -- Verificar si usuario existe
    SELECT COUNT(*) INTO v_usuario_existe FROM usuarios WHERE id = p_usuario_id;
    
    -- Verificar si película existe
    SELECT COUNT(*) INTO v_pelicula_existe FROM peliculas WHERE id = p_pelicula_id;
    
    -- Verificar si el usuario ya reseñó esta película
    SELECT COUNT(*) INTO v_resena_existe 
    FROM Reseñas 
    WHERE usuario_id = p_usuario_id AND pelicula_id = p_pelicula_id;
    
    IF v_usuario_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Usuario no encontrado';
    ELSEIF v_pelicula_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Película no encontrada';
    ELSEIF v_resena_existe > 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Ya has reseñado esta película';
    ELSEIF p_puntuacion < 1 OR p_puntuacion > 5 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'La puntuación debe ser entre 1 y 5';
    ELSE
        -- Insertar nueva reseña
        INSERT INTO Reseñas (usuario_id, pelicula_id, comentario, puntuacion, fecha_creacion)
        VALUES (p_usuario_id, p_pelicula_id, p_comentario, p_puntuacion, NOW());
        
        SET p_resena_id = LAST_INSERT_ID();
        SET p_resultado = 1;
        SET p_mensaje = 'Reseña creada correctamente';
    END IF;
    
    COMMIT;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_ActualizarResena(
    IN p_resena_id INT,
    IN p_comentario TEXT,
    IN p_puntuacion INT,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255)
)
BEGIN
    DECLARE v_resena_existe INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error al actualizar la reseña';
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    -- Verificar si la reseña existe
    SELECT COUNT(*) INTO v_resena_existe FROM Reseñas WHERE id = p_resena_id;
    
    IF v_resena_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Reseña no encontrada';
    ELSEIF p_puntuacion < 1 OR p_puntuacion > 5 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'La puntuación debe ser entre 1 y 5';
    ELSE
        -- Actualizar reseña
        UPDATE Reseñas 
        SET 
            comentario = COALESCE(p_comentario, comentario),
            puntuacion = COALESCE(p_puntuacion, puntuacion),
            fecha_actualizacion = NOW()
        WHERE id = p_resena_id;
        
        SET p_resultado = 1;
        SET p_mensaje = 'Reseña actualizada correctamente';
    END IF;
    
    COMMIT;
END //

DELIMITER ;

DELIMITER //

DELIMITER //

CREATE PROCEDURE sp_EliminarResena(
    IN p_resena_id INT,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255)
)
BEGIN
    DECLARE v_resena_existe INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error al eliminar la reseña';
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    -- Verificar si la reseña existe
    SELECT COUNT(*) INTO v_resena_existe FROM Reseñas WHERE id = p_resena_id;
    
    IF v_resena_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Reseña no encontrada';
    ELSE
        -- Eliminar la reseña
        DELETE FROM Reseñas WHERE id = p_resena_id;
        
        SET p_resultado = 1;
        SET p_mensaje = 'Reseña eliminada correctamente';
    END IF;
    
    COMMIT;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_ObtenerResenasPorUsuario(
    IN p_usuario_id INT,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255)
)
BEGIN
    DECLARE v_usuario_existe INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error al obtener reseñas del usuario';
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    -- Verificar si el usuario existe
    SELECT COUNT(*) INTO v_usuario_existe FROM usuarios WHERE id = p_usuario_id;
    
    IF v_usuario_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Usuario no encontrado';
    ELSE
        -- Obtener las reseñas del usuario
        SELECT 
            r.id, 
            r.comentario, 
            r.puntuacion, 
            r.fecha_creacion, 
            p.id AS pelicula_id,
            p.titulo AS pelicula_titulo, 
            p.imagen AS pelicula_imagen,
            g.nombre AS genero_nombre,
            DATE_FORMAT(r.fecha_creacion, '%d/%m/%Y %H:%i') AS fecha_formateada
        FROM Reseñas r
        JOIN Peliculas p ON r.pelicula_id = p.id
        JOIN Generos g ON p.genero_id = g.id
        WHERE r.usuario_id = p_usuario_id
        ORDER BY r.fecha_creacion DESC;
        
        SET p_resultado = 1;
        SET p_mensaje = 'Reseñas obtenidas correctamente';
    END IF;
    
    COMMIT;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_AgregarFavorito(
    IN p_usuario_id INT,
    IN p_pelicula_id INT,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255)
)
BEGIN
    DECLARE v_existe_favorito INT;
    DECLARE v_usuario_existe INT;
    DECLARE v_pelicula_existe INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error al agregar a favoritos';
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    SELECT COUNT(*) INTO v_usuario_existe FROM usuarios WHERE id = p_usuario_id;
    
    SELECT COUNT(*) INTO v_pelicula_existe FROM peliculas WHERE id = p_pelicula_id;
    
    IF v_usuario_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Usuario no encontrado';
    ELSEIF v_pelicula_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Película no encontrada';
    ELSE
        SELECT COUNT(*) INTO v_existe_favorito 
        FROM Favoritos 
        WHERE usuario_id = p_usuario_id AND pelicula_id = p_pelicula_id;
        
        IF v_existe_favorito > 0 THEN
            SET p_resultado = 0;
            SET p_mensaje = 'Ya existe en favoritos';
        ELSE
            INSERT INTO Favoritos (usuario_id, pelicula_id, fecha_agregado)
            VALUES (p_usuario_id, p_pelicula_id, NOW());
            
            SET p_resultado = 1;
            SET p_mensaje = 'Agregado a favoritos correctamente';
        END IF;
    END IF;
    
    COMMIT;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_VerificarFavorito(
    IN p_usuario_id INT,
    IN p_pelicula_id INT,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255),
    OUT p_es_favorito BOOLEAN
)
BEGIN
    DECLARE v_existe_favorito INT;
    DECLARE v_usuario_existe INT;
    DECLARE v_pelicula_existe INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error al verificar favorito';
        SET p_es_favorito = FALSE;
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    SELECT COUNT(*) INTO v_usuario_existe FROM usuarios WHERE id = p_usuario_id;
    
    SELECT COUNT(*) INTO v_pelicula_existe FROM peliculas WHERE id = p_pelicula_id;
    
    IF v_usuario_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Usuario no encontrado';
        SET p_es_favorito = FALSE;
    ELSEIF v_pelicula_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Película no encontrada';
        SET p_es_favorito = FALSE;
    ELSE
        SELECT COUNT(*) INTO v_existe_favorito 
        FROM Favoritos 
        WHERE usuario_id = p_usuario_id AND pelicula_id = p_pelicula_id;
        
        SET p_resultado = 1;
        SET p_mensaje = 'Verificación completada';
        SET p_es_favorito = v_existe_favorito > 0;
    END IF;
    
    COMMIT;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_EliminarFavorito(
    IN p_usuario_id INT,
    IN p_pelicula_id INT,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255),
    OUT p_filas_afectadas INT
)
BEGIN
    DECLARE v_existe_favorito INT;
    DECLARE v_usuario_existe INT;
    DECLARE v_pelicula_existe INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error al eliminar de favoritos';
        SET p_filas_afectadas = 0;
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    -- Verificar si el usuario existe
    SELECT COUNT(*) INTO v_usuario_existe FROM usuarios WHERE id = p_usuario_id;
    
    -- Verificar si la película existe
    SELECT COUNT(*) INTO v_pelicula_existe FROM peliculas WHERE id = p_pelicula_id;
    
    IF v_usuario_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Usuario no encontrado';
        SET p_filas_afectadas = 0;
    ELSEIF v_pelicula_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Película no encontrada';
        SET p_filas_afectadas = 0;
    ELSE
        -- Verificar si existe en favoritos
        SELECT COUNT(*) INTO v_existe_favorito 
        FROM Favoritos 
        WHERE usuario_id = p_usuario_id AND pelicula_id = p_pelicula_id;
        
        IF v_existe_favorito = 0 THEN
            SET p_resultado = 0;
            SET p_mensaje = 'No existe en favoritos';
            SET p_filas_afectadas = 0;
        ELSE
            -- Eliminar el favorito
            DELETE FROM Favoritos 
            WHERE usuario_id = p_usuario_id AND pelicula_id = p_pelicula_id;
            
            SET p_filas_afectadas = ROW_COUNT();
            
            IF p_filas_afectadas > 0 THEN
                SET p_resultado = 1;
                SET p_mensaje = 'Eliminado de favoritos correctamente';
            ELSE
                SET p_resultado = 0;
                SET p_mensaje = 'No se pudo eliminar de favoritos';
            END IF;
        END IF;
    END IF;
    
    COMMIT;
END //

DELIMITER ;

DELIMITER //

CREATE PROCEDURE sp_ObtenerFavoritosPorUsuario(
    IN p_usuario_id INT,
    OUT p_resultado INT,
    OUT p_mensaje VARCHAR(255)
)
BEGIN
    DECLARE v_usuario_existe INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_resultado = 0;
        SET p_mensaje = 'Error al obtener favoritos';
        ROLLBACK;
    END;
    
    START TRANSACTION;
    
    -- Verificar si el usuario existe
    SELECT COUNT(*) INTO v_usuario_existe FROM usuarios WHERE id = p_usuario_id;
    
    IF v_usuario_existe = 0 THEN
        SET p_resultado = 0;
        SET p_mensaje = 'Usuario no encontrado';
    ELSE
        -- Obtener los favoritos del usuario
        SELECT 
            f.id,
            f.fecha_agregado,
            p.titulo AS pelicula_titulo,
            p.imagen AS pelicula_imagen,
            p.id AS pelicula_id,
            g.nombre AS genero_nombre,
            DATE_FORMAT(f.fecha_agregado, '%d/%m/%Y %H:%i') AS fecha_formateada
        FROM Favoritos f
        JOIN Peliculas p ON f.pelicula_id = p.id
        JOIN Generos g ON p.genero_id = g.id
        WHERE f.usuario_id = p_usuario_id
        ORDER BY f.fecha_agregado DESC;
        
        SET p_resultado = 1;
        SET p_mensaje = 'Favoritos obtenidos correctamente';
    END IF;
    
    COMMIT;
END //

DELIMITER ;