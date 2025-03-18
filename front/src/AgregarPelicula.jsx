import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import './AgregarPelicula.css';

const AgregarPelicula = () => {
  const [formData, setFormData] = useState({
    titulo: '',
    sinopsis: '',
    director: '',
    genero: '',
    anio: ''
  });
  const [imagenFile, setImagenFile] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [user, setUser] = useState(null);
  const [generos, setGeneros] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const fetchGeneros = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/generos');
        const data = await response.json();
        if (response.ok) {
          setGeneros(data);
        } else {
          console.error('Error al obtener los géneros');
        }
      } catch (error) {
        console.error('Error de conexión con el servidor', error);
      }
    };

    fetchGeneros();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setImagenFile(files[0]);
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    formDataToSend.append('titulo', formData.titulo);
    formDataToSend.append('sinopsis', formData.sinopsis);
    formDataToSend.append('director', formData.director);
    formDataToSend.append('genero', formData.genero);
    formDataToSend.append('anio', formData.anio);
    if (imagenFile) {
      formDataToSend.append('imagen', imagenFile);
    }

    try {
      const response = await fetch('http://localhost:3000/api/agregarPelicula', {
        method: 'POST',
        body: formDataToSend
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Película agregada correctamente');
        setMessageType('success');
        setFormData({
          titulo: '',
          sinopsis: '',
          director: '',
          genero: '',
          anio: ''
        });
        setImagenFile(null);
      } else {
        setMessage(data.error || 'Error al agregar la película');
        setMessageType('error');
      }
    } catch (error) {
      console.error(error);
      setMessage('Error de conexión con el servidor');
      setMessageType('error');
    }
  };

  return (
    <div>
      <Header user={user} />
      <div className="main-agregar-pelicula">
        <section className="admin-section">
          <h2>Agregar Película</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="titulo">Título:</label>
              <input type="text" id="titulo" name="titulo" value={formData.titulo} onChange={handleChange} placeholder="Ingrese el título de la película" required />
            </div>
            <div>
              <label htmlFor="sinopsis">Sinopsis:</label>
              <textarea id="sinopsis" name="sinopsis" value={formData.sinopsis} onChange={handleChange} placeholder="Ingrese una breve sinopsis de la película" required></textarea>
            </div>
            <div>
              <label htmlFor="imagen">Imagen:</label>
              <input type="file" id="imagen" name="imagen" accept="image/*" onChange={handleChange} required />
            </div>
            <div>
              <label htmlFor="director">Director:</label>
              <input type="text" id="director" name="director" value={formData.director} onChange={handleChange} placeholder="Ingrese el nombre del director" />
            </div>
            <div>
              <label htmlFor="genero">Género:</label>
              <select id="genero" name="genero" value={formData.genero} onChange={handleChange} required>
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
              <input type="date" id="anio" name="anio" value={formData.anio} onChange={handleChange} placeholder="Ingrese la fecha de estreno" />
            </div>
            <div>
              <input type="submit" value="Agregar Película" />
            </div>
          </form>
          {message && (
            <div className={`alert ${messageType}`}>
              {message}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AgregarPelicula;