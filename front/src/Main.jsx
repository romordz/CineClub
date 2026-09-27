import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import MovieCard from './components/MovieCard';
import './Main.css';

const API_URL = process.env.REACT_APP_API_URL;

function Main() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [peliculas, setPeliculas] = useState([]);
  const [searchParams] = useSearchParams();
  const [fetchError, setFetchError] = useState(null);
  const searchQuery = searchParams.get('search');

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
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const fetchPeliculas = async () => {
      try {
        const url = searchQuery 
          ? `${API_URL}/api/peliculas?search=${encodeURIComponent(searchQuery)}`
          : `${API_URL}/api/peliculas`;

        const response = await fetch(url);
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (jsonError) {
          setFetchError(`Respuesta no JSON. Status: ${response.status}. Texto: ${text.substring(0, 300)}`);
          console.error('Respuesta no JSON:', { status: response.status, headers: response.headers, text });
          return;
        }
        if (response.ok) {
          setPeliculas(data);
          setFetchError(null);
        } else {
          setFetchError(`Error del servidor: ${data?.error || response.status}`);
          console.error('Error al obtener las películas', data);
        }
      } catch (error) {
        setFetchError(`Error de conexión: ${error.message}`);
        console.error('Error de conexión con el servidor', error);
      }
    };

    fetchPeliculas();
  }, [searchQuery]);

  const peliculasPorGenero = peliculas.reduce((acc, pelicula) => {
    if (!acc[pelicula.genero]) {
      acc[pelicula.genero] = [];
    }
    acc[pelicula.genero].push(pelicula);
    return acc;
  }, {});

  const handleMovieClick = (id) => {
    navigate(`/movie/${id}`);
  };

  const clearSearch = () => {
    navigate('/Main');
  };

  const renderStars = (rating) => {
    const numericRating = Number(rating);
    const fullStars = Math.floor(numericRating);
    const decimalPart = numericRating - fullStars;
    
    return (
      <span className="stars">
        {'★'.repeat(fullStars)}
        {decimalPart >= 0.5 && <span className="half-star">½</span>}
        {'☆'.repeat(5 - Math.ceil(numericRating))}
      </span>
    );
  };

  return (
    <div>
      <Header user={user} />
      <section className="product-list">
        {fetchError && (
          <div className="error-message" style={{color: 'red', margin: '1em 0'}}>
            <strong>Error al cargar películas:</strong> {fetchError}
          </div>
        )}
        {searchQuery && (
          <div className="search-results-header">
            <h2>Resultados para: "{searchQuery}"</h2>
            <button onClick={clearSearch} className="clear-search">
              Limpiar búsqueda
            </button>
          </div>
        )}

        {searchQuery ? (
          <section className="section">
            <div className="movie-grid">
              {peliculas.map((pelicula) => (
                <MovieCard
                  key={pelicula.id}
                  image={`data:image/jpeg;base64,${pelicula.imagen}`}
                  title={pelicula.titulo}
                  rating={pelicula.promedio}
                  onClick={() => handleMovieClick(pelicula.id)}
                />
              ))}
              {peliculas.length === 0 && (
                <p className="no-results">No se encontraron películas</p>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="section">
              <h2>Películas Recientes</h2>
              <div className="movie-grid">
                {peliculas.slice(0, 5).map((pelicula) => (
                  <MovieCard
                    key={pelicula.id}
                    image={`data:image/jpeg;base64,${pelicula.imagen}`}
                    title={pelicula.titulo}
                    rating={pelicula.promedio}
                    onClick={() => handleMovieClick(pelicula.id)}
                  />
                ))}
              </div>
            </section>

            {Object.keys(peliculasPorGenero).map((genero) => (
              <section className="section" key={genero}>
                <h2>{genero}</h2>
                <div className="movie-grid">
                  {peliculasPorGenero[genero].map((pelicula) => (
                    <MovieCard
                      key={pelicula.id}
                      image={`data:image/jpeg;base64,${pelicula.imagen}`}
                      title={pelicula.titulo}
                      rating={pelicula.promedio}
                      onClick={() => handleMovieClick(pelicula.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </section>
    </div>
  );
}

export default Main;