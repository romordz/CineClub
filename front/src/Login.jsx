import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage("Inicio de sesión exitoso");
        setMessageType("success");
        localStorage.setItem("user", JSON.stringify(data.user));
        setTimeout(() => {
          navigate("/Main");
        }, 2000);
      } else {
        setMessage(data.error || "Error al iniciar sesión");
        setMessageType("error");
      }
    } catch (error) {
      console.error(error);
      setMessage("Error de conexión con el servidor");
      setMessageType("error");
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <h1>Inicio de sesión</h1>
        <p>
          Bienvenido a CineClub! Por favor inicia sesión para empezar a reseñar
          películas.
        </p>
      </div>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Correo</label>
          <input
            type="email"
            id="email"
            placeholder="Ingresa tu correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {messageType === "error" &&
            (message === "El usuario fue eliminado" ||
              message === "Usuario no encontrado") && (
              <span className="error">{message}</span>
            )}
        </div>
        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input
            type="password"
            id="password"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {messageType === "error" && message === "Credenciales inválidas" && (
            <span className="error">{message}</span>
          )}
        </div>
        <button type="submit" className="login-btn">
          Login
        </button>
      </form>
      {message && messageType !== "error" && (
        <div className={`alert ${messageType}`}>{message}</div>
      )}
      <div className="login-footer">
        <p>
          No tienes cuenta? <a href="/register">Registrate</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
