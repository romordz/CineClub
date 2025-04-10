import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";

function Register() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    fechaNacimiento: "",
    fotoPerfil: null,
  });

  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (formData.fotoPerfil) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(formData.fotoPerfil);
    } else {
      setPreview(null);
    }
  }, [formData.fotoPerfil]);

  const validate = () => {
    const newErrors = {};

    // Validación del nombre
    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es requerido";
    } else if (/\d/.test(formData.nombre)) {
      newErrors.nombre = "El nombre no puede contener números";
    }

    // Validación del email
    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@(hotmail|gmail|outlook|yahoo)\.\S+/.test(formData.email)) {
      newErrors.email = "El email no es válido";
    }

    // Validación de la contraseña
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else {
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+{};:,<.>]).{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        newErrors.password =
          "La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 caracter especial";
      }
    }

    // Validación de la fecha de nacimiento
    if (!formData.fechaNacimiento) {
      newErrors.fechaNacimiento = "La fecha de nacimiento es requerida";
    } else {
      const today = new Date();
      const birthDate = new Date(formData.fechaNacimiento);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      if (age < 18) {
        newErrors.fechaNacimiento = "Debes tener al menos 18 años";
      }
    }

    return newErrors;
  };

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

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData({
      ...formData,
      [name]: files ? files[0] : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    try {
      const { nombre, email, password, fechaNacimiento, fotoPerfil } = formData;
      const formDataToSend = new FormData();
      formDataToSend.append("nombre", nombre);
      formDataToSend.append("email", email);
      formDataToSend.append("password", password);
      formDataToSend.append("fechaNacimiento", fechaNacimiento);
      formDataToSend.append("fotoPerfil", fotoPerfil);

      const response = await fetch("http://localhost:3000/api/Register", {
        method: "POST",
        body: formDataToSend,
      });

      const data = await response.json();
      if (response.ok) {
        setStatusMessage("¡Registro exitoso! Redirigiendo...");
        setShowSuccess(true);
        setShowError(false);

        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setStatusMessage(data.error || "Error al registrar");
        setShowError(true);
        setShowSuccess(false);

        setTimeout(() => {
          setShowError(false);
        }, 5000);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage("Error de conexión con el servidor");
      setShowError(true);
      setShowSuccess(false);

      setTimeout(() => {
        setShowError(false);
      }, 5000);
    }
  };

  return (
    <div className="register-container">
      <div className="register-header">
        <h1>Registro</h1>
        <p>
          Bienvenido a CineClub! Por favor regístrate para empezar a reseñar
          películas.
        </p>
      </div>

      <form className="register-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            placeholder="Ingresa tu nombre completo"
            value={formData.nombre}
            onChange={handleChange}
            required
          />
          {errors.nombre && <span className="error">{errors.nombre}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Ingresa tu correo"
            value={formData.email}
            onChange={handleChange}
            required
          />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Crea una contraseña segura"
            value={formData.password}
            onChange={handleChange}
            required
          />
          {errors.password && <span className="error">{errors.password}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="fechaNacimiento">Fecha de Nacimiento</label>
          <input
            type="date"
            id="fechaNacimiento"
            name="fechaNacimiento"
            value={formData.fechaNacimiento}
            onChange={handleChange}
            required
          />
          {errors.fechaNacimiento && (
            <span className="error">{errors.fechaNacimiento}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="fotoPerfil">Foto de Perfil</label>
          <input
            type="file"
            id="fotoPerfil"
            name="fotoPerfil"
            accept="image/*"
            onChange={handleChange}
          />
          {preview && (
            <div className="image-preview">
              <img src={preview} alt="Preview" />
            </div>
          )}
        </div>

        {showSuccess && (
          <div className="form-status-message success">
            <i className="fas fa-check-circle"></i> {statusMessage}
          </div>
        )}

        {showError && (
          <div className="form-status-message error">
            <i className="fas fa-exclamation-circle"></i> {statusMessage}
          </div>
        )}

        <button type="submit" className="register-btn">
          Registrarse
        </button>
      </form>

      <div className="register-footer">
        <p>
          ¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
}

export default Register;
