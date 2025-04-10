import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "./components/Header";
import "./ModificarPelicula.css";

const ModificarPelicula = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    titulo: "",
    sinopsis: "",
    director: "",
    genero: "",
    anio: "",
    imagenActual: "",
  });
  const [imagenFile, setImagenFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [user, setUser] = useState(null);
  const [generos, setGeneros] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

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
      setUser(JSON.parse(storedUser));
    }

    const fetchData = async () => {
      try {
        const generosResponse = await fetch(
          "http://localhost:3000/api/generos"
        );
        const generosData = await generosResponse.json();
        if (generosResponse.ok) {
          setGeneros(generosData);
        }
        const peliculaResponse = await fetch(
          `http://localhost:3000/api/peliculas/${id}`
        );
        const peliculaData = await peliculaResponse.json();

        if (peliculaResponse.ok) {
          setFormData({
            titulo: peliculaData.titulo,
            sinopsis: peliculaData.descripcion,
            director: peliculaData.director,
            genero: peliculaData.genero_id,
            anio: peliculaData.fecha_lanzamiento.split("T")[0],
            imagenActual: peliculaData.imagen,
          });
        } else {
          setMessage("Error al cargar la película");
          setMessageType("error");
        }
      } catch (error) {
        console.error("Error de conexión con el servidor", error);
        setMessage("Error de conexión con el servidor");
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      setImagenFile(files[0]);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(files[0]);
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleRemoveImage = () => {
    setImagenFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    formDataToSend.append("id", id);
    formDataToSend.append("titulo", formData.titulo);
    formDataToSend.append("sinopsis", formData.sinopsis);
    formDataToSend.append("director", formData.director);
    formDataToSend.append("genero", formData.genero);
    formDataToSend.append("anio", formData.anio);
    if (imagenFile) {
      formDataToSend.append("imagen", imagenFile);
    }

    try {
      const response = await fetch(
        "http://localhost:3000/api/modificarPelicula",
        {
          method: "POST",
          body: formDataToSend,
        }
      );
      const data = await response.json();
      if (response.ok) {
        setMessage("Película modificada correctamente");
        setMessageType("success");
        setTimeout(() => {
          navigate(`/movie/${id}`);
        }, 2000);
      } else {
        setMessage(data.error || "Error al modificar la película");
        setMessageType("error");
      }
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión con el servidor");
      setMessageType("error");
    }
  };

  if (loading) {
    return (
      <div>
        <Header user={user} />
        <div className="main-agregar-pelicula">
          <section className="admin-section">
            <h2>Cargando...</h2>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header user={user} />
      <div className="main-agregar-pelicula">
        <section className="admin-section">
          <h2>Modificar Película</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="titulo">Título:</label>
              <input
                type="text"
                id="titulo"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                placeholder="Ingrese el título de la película"
                required
              />
            </div>
            <div>
              <label htmlFor="sinopsis">Sinopsis:</label>
              <textarea
                id="sinopsis"
                name="sinopsis"
                value={formData.sinopsis}
                onChange={handleChange}
                placeholder="Ingrese una breve sinopsis de la película"
                required
              ></textarea>
            </div>
            <div>
              <label htmlFor="imagen">Imagen:</label>
              <div className="file-input-container">
                <label htmlFor="imagen" className="file-input-label">
                  {imagenFile ? imagenFile.name : "Seleccionar nueva imagen"}
                </label>
                <input
                  type="file"
                  id="imagen"
                  name="imagen"
                  accept="image/*"
                  onChange={handleChange}
                  ref={fileInputRef}
                  className="file-input"
                />
              </div>

              <div className="previews-container">
                {/* Imagen actual */}
                {formData.imagenActual ? (
                  <div className="current-image">
                    <div className="image-wrapper">
                      <img
                        src={`data:image/jpeg;base64,${formData.imagenActual}`}
                        alt="Imagen actual de la película"
                      />
                    </div>
                    <p className="image-caption">Imagen actual</p>
                  </div>
                ) : (
                  <div className="image-placeholder">
                    <div className="placeholder-content">
                      <span>+</span>
                      <p>No hay imagen actual</p>
                    </div>
                  </div>
                )}

                {/* Nueva imagen */}
                {imagePreview ? (
                  <div className="new-image">
                    <div className="image-wrapper">
                      <img src={imagePreview} alt="Nueva imagen seleccionada" />
                    </div>
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={handleRemoveImage}
                    >
                      ×
                    </button>
                    <p className="image-caption">Nueva imagen</p>
                  </div>
                ) : (
                  <div className="image-placeholder">
                    <div className="placeholder-content">
                      <span>+</span>
                      <p>No hay nueva imagen</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="director">Director:</label>
              <input
                type="text"
                id="director"
                name="director"
                value={formData.director}
                onChange={handleChange}
                placeholder="Ingrese el nombre del director"
                required
              />
            </div>
            <div>
              <label htmlFor="genero">Género:</label>
              <select
                id="genero"
                name="genero"
                value={formData.genero}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione un género</option>
                {generos.map((genero) => (
                  <option key={genero.id} value={genero.id}>
                    {genero.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="anio">Fecha de Estreno:</label>
              <input
                type="date"
                id="anio"
                name="anio"
                value={formData.anio}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <input type="submit" value="Guardar Cambios" />
            </div>
          </form>
          {message && <div className={`alert ${messageType}`}>{message}</div>}
        </section>
      </div>
    </div>
  );
};

export default ModificarPelicula;
