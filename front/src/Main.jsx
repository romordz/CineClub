import React, { useEffect, useState } from 'react';
import './Main.css';

function Main() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <div>
      <header>
        <div className="logo-container">
          <img
            src="https://cdn-icons-png.flaticon.com/512/3938/3938627.png"
            alt="CineClub Logo"
          />
          <h1>CineClub</h1>
        </div>
        <div className="search-bar">
          <input type="text" placeholder="Buscar peliculas..." />
          <button>Buscar</button>
        </div>
        <div className="user-info">
          {user && user.avatar ? (
            <img
              src={`data:image/jpeg;base64,${user.avatar}`}
              alt="User Profile"
            />
          ) : (
            <img
              src="https://static.vecteezy.com/system/resources/previews/024/983/914/non_2x/simple-user-default-icon-free-png.png"
              alt="Default Profile"
            />
          )}
          <span>{user ? user.nombre : 'Usuario'}</span>
        </div>
      </header>
      <main>
        <section className="section">
          <h2>Destacados</h2>
          <div className="movie-grid">
            <div className="movie-card">
              <img
                src="https://hips.hearstapps.com/es.h-cdn.co/fotoes/images/media/imagenes/reportajes/los-20-posters-de-peliculas-mas-creativos/caballero-oscuro-joker/7055604-1-esl-ES/CABALLERO-OSCURO-JOKER.jpg"
                alt="Movie Poster"
              />
              <h3>Batman: The dark knight</h3>
              <div className="rating">
                <span className="stars">★★★★☆</span>
                <span className="number">4.0</span>
              </div>
            </div>
            <div className="movie-card">
              <img
                src="https://moviepostermexico.com/cdn/shop/products/w3XORYUDxH53iiuWRw6nqrZdwybBM0kI88F9ccHiDmw_2066x.jpg?v=1619731898"
                alt="Movie Poster"
              />
              <h3>Avengers: Endgame</h3>
              <div className="rating">
                <span className="stars">★★★★☆</span>
                <span className="number">4.0</span>
              </div>
            </div>
            <div className="movie-card">
              <img
                src="https://moviepostermexico.com/cdn/shop/products/us_ver3_xxlg_1895x.jpg?v=1599144725"
                alt="Movie Poster"
              />
              <h3>Us</h3>
              <div className="rating">
                <span className="stars">★★★★☆</span>
                <span className="number">4.0</span>
              </div>
            </div>
          </div>
        </section>
        <section className="section">
          <h2>Accion</h2>
          <div className="movie-grid">
            <div className="movie-card">
              <img
                src="https://moviepostermexico.com/cdn/shop/products/w3XORYUDxH53iiuWRw6nqrZdwybBM0kI88F9ccHiDmw_2066x.jpg?v=1619731898"
                alt="Movie Poster"
              />
              <h3>Avengers: Endgame</h3>
              <div className="rating">
                <span className="stars">★★★★☆</span>
                <span className="number">4.0</span>
              </div>
            </div>
            <div className="movie-card">
              <img
                src="https://i.pinimg.com/originals/27/f0/43/27f0435a856f72d444f8dec35e1f310b.jpg"
                alt="Movie Poster"
              />
              <h3>Guardianes de la galaxia</h3>
              <div className="rating">
                <span className="stars">★★★★☆</span>
                <span className="number">4.0</span>
              </div>
            </div>
            <div className="movie-card">
              <img
                src="https://moviepostermexico.com/cdn/shop/products/GLADIATOR1_2048x.jpg?v=1595230143"
                alt="Movie Poster"
              />
              <h3>Gladiador</h3>
              <div className="rating">
                <span className="stars">★★★★☆</span>
                <span className="number">4.0</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Main;