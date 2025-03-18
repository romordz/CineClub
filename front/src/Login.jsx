import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
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
        setMessage('Inicio de sesión exitoso');
        setMessageType('success');
        localStorage.setItem('user', JSON.stringify(data.user));
        setTimeout(() => {
          navigate('/Main');
        }, 2000);
      } else {
        setMessage(data.error || 'Error al iniciar sesión');
        setMessageType('error');
      }
    } catch (error) {
      console.error(error);
      setMessage('Error de conexión con el servidor');
      setMessageType('error');
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <h1>Inicio de sesión</h1>
        <p>Bienvenido a CineClub! Por favor inicia sesión para empezar a reseñar películas.</p>
      </div>
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
          {messageType === 'error' && (message === 'El usuario fue eliminado' || message === 'Usuario no encontrado') && (
            <span className="error">{message}</span>
          )}
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
          {messageType === 'error' && message === 'Credenciales inválidas' && (
            <span className="error">{message}</span>
          )}
        </div>
        <button type="submit" className="login-btn">Login</button>
      </form>
      {message && messageType !== 'error' && (
        <div className={`alert ${messageType}`}>
          {message}
        </div>
      )}
      <div className="login-footer">
        <p>No tienes cuenta? <a href="/register">Registrate</a></p>
      </div>
    </div>
  );
}

export default Login;
