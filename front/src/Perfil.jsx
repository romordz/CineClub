import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./components/Header";
import "./Perfil.css";

const Perfil = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userReviews, setUserReviews] = useState([]);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    fecha_nacimiento: "",
    avatar: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [userFavorites, setUserFavorites] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showDeleteError, setShowDeleteError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.zIndex = "-1";
    canvas.style.pointerEvents = "none";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: Math.random() * 1 - 0.5,
        speedY: Math.random() * 1 - 0.5,
        color: `rgba(74, 159, 255, ${Math.random() * 0.5 + 0.1})`,
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;
      });

      requestAnimationFrame(animate);
    }

    animate();

    return () => {
      document.body.removeChild(canvas);
    };
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      console.log("User data from localStorage:", userData);
      setUser(userData);
      setFormData({
        nombre: userData.nombre,
        email: userData.email,
        fecha_nacimiento: userData.fecha_nacimiento
          ? userData.fecha_nacimiento.split("T")[0]
          : "",
        avatar: userData.avatar,
      });
      const fetchUserReviews = async () => {
        try {
          const response = await fetch(
            `http://localhost:3000/api/resenias/usuario/${userData.id}`
          );
          if (!response.ok)
            throw new Error("Error obteniendo reseñas del usuario");
          const reviewsData = await response.json();

          if (reviewsData.success && Array.isArray(reviewsData.data)) {
            setUserReviews(
              reviewsData.data.map((review) => ({
                ...review,
                pelicula_id: review.pelicula_id,
              }))
            );
          } else {
            setUserReviews([]);
          }
        } catch (error) {
          console.error(error);
          setUserReviews([]);
        }
      };

      fetchUserReviews();
    }
  }, []);

  useEffect(() => {
    const fetchUserFavorites = async () => {
      if (!user) return;

      try {
        const response = await fetch(
          `http://localhost:3000/api/favoritos/usuario/${user.id}`
        );
        if (!response.ok) throw new Error("Error obteniendo favoritos");
        const favoritesData = await response.json();

        if (favoritesData.success && Array.isArray(favoritesData.data)) {
          setUserFavorites(favoritesData.data);
        } else if (Array.isArray(favoritesData)) {
          setUserFavorites(favoritesData);
        } else {
          setUserFavorites([]);
        }
      } catch (error) {
        console.error(error);
        setUserFavorites([]);
      }
    };

    fetchUserFavorites();
  }, [user]);

  const validate = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    } else if (/\d/.test(formData.nombre)) {
      newErrors.nombre = "El nombre no puede contener números";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@(hotmail|gmail|outlook|yahoo)\.\S+/.test(formData.email)) {
      newErrors.email = "El email no es válido";
    }

    if (!formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = "La fecha de nacimiento es requerida";
    } else {
      const today = new Date();
      const birthDate = new Date(formData.fecha_nacimiento);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      if (age < 18) {
        newErrors.fecha_nacimiento = "Debes tener al menos 18 años";
      }
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData({
      ...formData,
      [name]: files ? files[0] : value,
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleMovieClick = (movieId) => {
    navigate(`/movie/${movieId}`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    const formDataToSend = new FormData();
    formDataToSend.append("id", user.id);
    formDataToSend.append("nombre", formData.nombre);
    formDataToSend.append("email", formData.email);
    formDataToSend.append("fecha_nacimiento", formData.fecha_nacimiento);
    if (avatarFile) {
      formDataToSend.append("avatar", avatarFile);
    }

    try {
      const response = await fetch("http://localhost:3000/api/updateUser", {
        method: "POST",
        body: formDataToSend,
      });
      const data = await response.json();
      if (response.ok) {
        console.log("Updated user data:", data.user);
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        setIsEditing(false);
        setSuccessMessage("Perfil actualizado correctamente");
      } else {
        if (data.error === "El correo electrónico ya está en uso") {
          setErrors({ email: data.error });
        } else {
          setErrors({ general: data.error || "Error al actualizar el perfil" });
        }
      }
    } catch (error) {
      console.error(error);
      setErrors({ general: "Error de conexión con el servidor" });
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false); // Cierra el diálogo de confirmación

    try {
      const response = await fetch("http://localhost:3000/api/deleteUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });

      const data = await response.json();

      if (response.ok) {
        setDeleteMessage("Perfil eliminado correctamente");
        setShowDeleteSuccess(true);

        // Redirige después de 2 segundos
        setTimeout(() => {
          localStorage.removeItem("user");
          window.location.href = "/login";
        }, 2000);
      } else {
        throw new Error(data.error || "Error al desactivar el perfil");
      }
    } catch (error) {
      console.error(error);
      setDeleteMessage(error.message);
      setShowDeleteError(true);

      // Oculta el mensaje de error después de 5 segundos
      setTimeout(() => {
        setShowDeleteError(false);
      }, 5000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) {
    return <div>Cargando...</div>;
  }

  console.log("User data for rendering:", user);

  return (
    <div>
      <Header user={user} />
      <div className="perfil-main">
        <section className="profile-section">
          <button className="logout-btn" onClick={handleLogout}>
            Cerrar Sesión
          </button>
          <h2>Perfil de Usuario</h2>
          <img
            src={
              `data:image/jpeg;base64,${user.avatar}` ||
              "https://static.vecteezy.com/system/resources/previews/024/983/914/non_2x/simple-user-default-icon-free-png.png"
            }
            alt="User Profile"
          />
          {isEditing ? (
            <form className="profile-info" onSubmit={handleSave}>
              <div className="form-group">
                <label className="label">Nombre:</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                />
                {errors.nombre && (
                  <span className="error">{errors.nombre}</span>
                )}
              </div>
              <div className="form-group">
                <label className="label">Correo:</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label className="label">Fecha de Nacimiento:</label>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={formData.fecha_nacimiento}
                  onChange={handleChange}
                />
                {errors.fecha_nacimiento && (
                  <span className="error">{errors.fecha_nacimiento}</span>
                )}
              </div>
              <div className="form-group">
                <label className="label">Foto de Perfil:</label>
                <div className="file-input-container-Perfil">
                  <label htmlFor="avatar" className="file-input-label-Perfil">
                    {avatarFile ? avatarFile.name : "Seleccionar nueva imagen"}
                  </label>
                  <input
                    type="file"
                    id="avatar"
                    name="avatar"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="file-input-Perfil"
                  />
                </div>
                <div className="previews-container-Perfil">
                  {/* Imagen actual */}
                  {formData.avatar ? (
                    <div className="current-image-Perfil">
                      <div className="image-wrapper-Perfil">
                        <img
                          src={`data:image/jpeg;base64,${formData.avatar}`}
                          alt="Imagen actual de perfil"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            width: "auto",
                            height: "auto",
                          }}
                        />
                      </div>
                      <p className="image-caption-Perfil">Imagen actual</p>
                    </div>
                  ) : (
                    <div className="image-placeholder-Perfil">
                      <div className="placeholder-content-Perfil">
                        <span>+</span>
                        <p>No hay imagen actual</p>
                      </div>
                    </div>
                  )}

                  {/* Nueva imagen */}
                  {avatarFile ? (
                    <div className="new-image-Perfil">
                      <div className="image-wrapper-Perfil">
                        <img
                          src={URL.createObjectURL(avatarFile)}
                          alt="Nueva imagen seleccionada"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            width: "auto",
                            height: "auto",
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={() => setAvatarFile(null)}
                      >
                        ×
                      </button>
                      <p className="image-caption-Perfil">Nueva imagen</p>
                    </div>
                  ) : (
                    <div className="image-placeholder-Perfil">
                      <div className="placeholder-content-Perfil">
                        <span>+</span>
                        <p>No hay nueva imagen</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {errors.general && (
                <span className="error">{errors.general}</span>
              )}
              {successMessage && (
                <span className="success">{successMessage}</span>
              )}
              <button type="submit" className="profile-btn save-btn">
                Guardar Cambios
              </button>
            </form>
          ) : (
            <div className="profile-info">
              <div>
                <span className="label">Nombre de Usuario:</span>
                <span className="value">{user.nombre}</span>
              </div>
              <div>
                <span className="label">Correo:</span>
                <span className="value">{user.email}</span>
              </div>
              <div>
                <span className="label">Contraseña:</span>
                <span className="value">********</span>
              </div>
              <div>
                <span className="label">Fecha de Nacimiento:</span>
                <span className="value">
                  {new Date(user.fecha_nacimiento).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
          <button
            className="profile-btn modify-btn"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Cancelar" : "Modificar Perfil"}
          </button>
          <button
            className="profile-btn delete-btn"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Eliminar Perfil
          </button>
          {user.rol_id === 2 && (
            <button
              className="add-movie-btn"
              onClick={() => navigate("/agregar-pelicula")}
            >
              Agregar Película (admin)
            </button>
          )}
        </section>
        <section className="section">
          <div className="view-selector">
            <button
              className={`view-btn ${!showFavorites ? "active" : ""}`}
              onClick={() => setShowFavorites(false)}
            >
              Reseñas
            </button>
            <button
              className={`view-btn ${showFavorites ? "active" : ""}`}
              onClick={() => setShowFavorites(true)}
            >
              Favoritos
            </button>
          </div>
          {!showFavorites ? (
            <>
              <h2>Películas reseñadas</h2>
              <div className="review-grid">
                {userReviews.length > 0 ? (
                  userReviews.map((review, index) => (
                    <div
                      key={index}
                      className="review-card"
                      onClick={() => handleMovieClick(review.pelicula_id)}
                    >
                      <div className="movie-card">
                        <img
                          src={`data:image/jpeg;base64,${review.pelicula_imagen}`}
                          alt={review.pelicula_titulo}
                        />
                        <h3>{review.pelicula_titulo}</h3>
                        <div className="rating">
                          <span>{review.puntuacion}</span>
                          <span className="stars">
                            {"★".repeat(review.puntuacion)}
                            {"☆".repeat(5 - review.puntuacion)}
                          </span>
                        </div>
                      </div>
                      <div className="review-text">
                        <p>{review.comentario}</p>
                        <p className="User-review-date">
                          {new Date(review.fecha_creacion).toLocaleDateString(
                            "es-ES",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No has reseñado ninguna película.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <h2>Películas favoritas</h2>
              <div className="favorites-grid">
                {userFavorites.length > 0 ? (
                  userFavorites.map((favorite, index) => (
                    <div
                      key={index}
                      className="favorite-card"
                      onClick={() => handleMovieClick(favorite.pelicula_id)}
                    >
                      <img
                        src={`data:image/jpeg;base64,${favorite.pelicula_imagen}`}
                        alt={favorite.pelicula_titulo}
                      />
                      <h3>{favorite.pelicula_titulo}</h3>
                      <p className="favorite-date">
                        Agregado:{" "}
                        {new Date(favorite.fecha_agregado).toLocaleDateString(
                          "es-ES"
                        )}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>No tienes películas en favoritos.</p>
                )}
              </div>
            </>
          )}
        </section>
      </div>
      {showDeleteSuccess && (
        <div className="delete-message success">{deleteMessage}</div>
      )}

      {showDeleteError && (
        <div className="delete-message error">{deleteMessage}</div>
      )}
      {showDeleteConfirm && (
        <div className="confirm-delete">
          <div className="confirm-delete-content">
            <h3>¿Estás seguro de que deseas eliminar tu perfil?</h3>
            <p>
              Esta acción es irreversible y eliminará todos tus datos, reseñas y
              favoritos.
            </p>
            <div className="confirm-delete-buttons">
              <button onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </button>
              <button onClick={handleDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Perfil;
