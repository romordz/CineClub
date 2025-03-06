import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        alert('Inicio de sesión exitoso');
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/Main');
      } else {
        alert(data.error || 'Error al iniciar sesión');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión con el servidor');
    }
  };

  return (
    <div className="login-container">
      {/* Cabecera */}
      <div className="login-header">
        <h1>Inicio de sesión</h1>
        <p>Bienvenido a CineClub! Por favor inicia sesión para empezar a reseñar películas.</p>
      </div>

      {/* Formulario */}
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input 
            type="email" 
            id="email" 
            placeholder="Ingresa tu correo" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input 
            type="password" 
            id="password" 
            placeholder="Ingresa tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>

        <button type="submit" className="login-btn">Login</button>
      </form>

      {/* Pie de formulario */}
      <div className="login-footer">
        <p>No tienes cuenta? <a href="/register">Registrate</a></p>
      </div>
    </div>
  );
}

export default Login;
