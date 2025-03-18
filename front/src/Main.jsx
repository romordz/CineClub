import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import './Main.css';

function Main() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [peliculas, setPeliculas] = useState([]);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const fetchPeliculas = async () => {
      try {
        const url = searchQuery 
          ? `http://localhost:3000/api/peliculas?search=${encodeURIComponent(searchQuery)}`
          : 'http://localhost:3000/api/peliculas';

        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
          setPeliculas(data);
        } else {
          console.error('Error al obtener las películas');
        }
      } catch (error) {
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
                <div 
                  className="movie-card" 
                  key={pelicula.id}
                  onClick={() => handleMovieClick(pelicula.id)}
                >
                  <img
                    src={`data:image/jpeg;base64,${pelicula.imagen}`}
                    alt="Movie Poster"
                  />
                  <h3>{pelicula.titulo}</h3>
                  <div className="rating">
                    {renderStars(pelicula.promedio)}
                    <span className="number">{Number(pelicula.promedio).toFixed(1)}</span>
                  </div>
                </div>
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
                  <div 
                    className="movie-card" 
                    key={pelicula.id}
                    onClick={() => handleMovieClick(pelicula.id)}
                  >
                    <img
                      src={`data:image/jpeg;base64,${pelicula.imagen}`}
                      alt="Movie Poster"
                    />
                    <h3>{pelicula.titulo}</h3>
                    <div className="rating">
                      {renderStars(pelicula.promedio)}
                      <span className="number">{Number(pelicula.promedio).toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {Object.keys(peliculasPorGenero).map((genero) => (
              <section className="section" key={genero}>
                <h2>{genero}</h2>
                <div className="movie-grid">
                  {peliculasPorGenero[genero].map((pelicula) => (
                    <div 
                      className="movie-card" 
                      key={pelicula.id}
                      onClick={() => handleMovieClick(pelicula.id)}
                    >
                      <img
                        src={`data:image/jpeg;base64,${pelicula.imagen}`}
                        alt="Movie Poster"
                      />
                      <h3>{pelicula.titulo}</h3>
                      <div className="rating">
                        {renderStars(pelicula.promedio)}
                        <span className="number">{Number(pelicula.promedio).toFixed(1)}</span>
                      </div>
                    </div>
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