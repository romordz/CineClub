import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from './components/Header';
import './MovieDetails.css';

const MovieDetails = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [editingReview, setEditingReview] = useState(null);
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (JSON.stringify(parsedUser) !== JSON.stringify(user)) {
        setUser(parsedUser);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));

        const movieResponse = await fetch(`http://localhost:3000/api/peliculas/${id}`);
        if (!movieResponse.ok) throw new Error('Película no encontrada');
        const movieData = await movieResponse.json();
        setMovie(movieData);
        setAverageRating(Number(movieData.promedio).toFixed(1));
        setTotalReviews(movieData.total_resenias);

        const reviewsResponse = await fetch(`http://localhost:3000/api/resenias/${id}`);
        if (!reviewsResponse.ok) throw new Error('Error obteniendo reseñas');
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData.map(r => ({
          id: r.id,
          usuarioId: r.usuario_id,
          author: r.autor,
          text: r.comentario,
          rating: r.puntuacion,
          fecha: r.fecha_creacion
        })));

      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`http://localhost:3000/api/favoritos/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            usuario_id: user.id,
            pelicula_id: id
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsFavorite(data.esFavorito);
        }
      } catch (error) {
        console.error('Error verificando favorito:', error);
      }
    };
    
    checkFavorite();
  }, [user, id]);

  const handleStarClick = (rating) => {
    setSelectedRating(rating);
    setSubmitError('');
  };


  const handleFavorite = async () => {
    if (!user) {
      alert('Debes iniciar sesión para agregar a favoritos');
      return;
    }
  
    setIsLoadingFavorite(true);
    
    try {
      const response = await fetch(`http://localhost:3000/api/favoritos`, {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario_id: user.id,
          pelicula_id: id
        }),
      });
  
      if (response.ok) {
        setIsFavorite(!isFavorite);
      }
    } catch (error) {
      console.error('Error actualizando favorito:', error);
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    if (!selectedRating) return setSubmitError('Debes seleccionar una puntuación');
    if (!newReview.trim()) return setSubmitError('Debes escribir una reseña');

    try {
      const response = await fetch('http://localhost:3000/api/resenias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: user.id,
          pelicula_id: id,
          comentario: newReview,
          puntuacion: selectedRating
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar reseña');
      }

      setReviews(prev => [{
        id: data.resena_id,
        author: user.nombre,
        text: newReview,
        rating: selectedRating,
        fecha: data.fecha_creacion,
        usuarioId: user.id
      }, ...prev]);

      setAverageRating(prev => {
        const newTotal = totalReviews + 1;
        return (((parseFloat(prev) * totalReviews) + selectedRating) / newTotal).toFixed(1);
      });
      setTotalReviews(prev => prev + 1);
      
      setNewReview('');
      setSelectedRating(0);
      
    } catch (error) {
      console.error('Error submitting review:', error);
      setSubmitError(error.message);
    }
};

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const decimalPart = rating - fullStars;
    
    return (
      <span className="rating-stars">
        {'★'.repeat(fullStars)}
        {decimalPart >= 0.5 && (
          <span className="half-star">½</span>
        )}
        {'☆'.repeat(5 - Math.ceil(rating))}
      </span>
    );
  };

  const handleEditReview = (review) => {
    setEditingReview(review.id);
    setEditText(review.text);
    setEditRating(review.rating);
  };
  
  const handleCancelEdit = () => {
    setEditingReview(null);
    setEditText('');
    setEditRating(0);
  };
  
  const handleSaveEdit = async (reviewId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/resenias/${reviewId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comentario: editText,
          puntuacion: editRating
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al modificar la reseña');
      }
  
      const data = await response.json();
      
      const updatedReviews = reviews.map(r => 
        r.id === reviewId ? { 
          ...r, 
          text: editText, 
          rating: editRating,
        } : r
      );
      
      setReviews(updatedReviews);
      setEditingReview(null);
      setSubmitError('');
    } catch (error) {
      console.error('Error detallado:', error);
      setSubmitError(error.message);
    }
  };
  
  const handleDeleteReview = async (reviewId) => {
    try {
      console.log('[Frontend] Iniciando eliminación de reseña ID:', reviewId);
      
      const response = await fetch(`http://localhost:3000/api/resenias/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Si usas autenticación:
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
  
      console.log('[Frontend] Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Frontend] Error en la respuesta:', errorData);
        throw new Error(errorData.error || 'Error al eliminar la reseña');
      }
  
      const data = await response.json();
      console.log('[Frontend] Reseña eliminada con éxito:', data);
  
      // Actualizar estado
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setTotalReviews(prev => prev - 1);
      setSubmitError('');
      
      console.log('[Frontend] Estado actualizado correctamente');
    } catch (error) {
      console.error('[Frontend] Error completo:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setSubmitError(`Error: ${error.message}`);
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <Header user={user}/>
      <section className="movie">
        <section className="movie-details">
          <img 
            src={`data:image/jpeg;base64,${movie.imagen}`}
            alt="Movie Poster" 
          />
          <div className="movie-info">
            <h1>{movie.titulo}</h1>
            <button 
        className={`favorite-btn ${isFavorite ? 'active' : ''}`} 
        onClick={handleFavorite}
        disabled={isLoadingFavorite}
      >
        ♥
      </button>
            <p>{movie.descripcion}</p>
            <div className="director">Director: {movie.director}</div>
            <div className="release-date">Fecha de lanzamiento: {movie.fecha_lanzamiento}</div>
            <div className="rating">
  {renderStars(averageRating)}
  <span>{averageRating} ({totalReviews} reseñas)</span>
</div>
          </div>
        </section>

        <section className="review-section">
          <h3>Agregar tu reseña</h3>
          <form className="review-form" onSubmit={handleSubmitReview}>
          {submitError && <div className="error-message">{submitError}</div>}
            <textarea 
              placeholder="Escribe tu reseña..."
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
            />
            <div className="stars-container">
              {[1, 2, 3, 4, 5].map((rating) => (
                <span 
                  key={rating}
                  className={`star ${selectedRating >= rating ? 'selected' : ''}`}
                  onClick={() => handleStarClick(rating)}
                >
                  ★
                </span>
              ))}
            </div>
            <button type="submit">Enviar reseña</button>
          </form>
          <div className="reviews">
  {reviews.map((review, index) => (
    <div key={index} className="review">
      <div className="review-header">
        <p className="author">{review.author}</p>
        <p className="review-date">
          {new Date(review.fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>

      {editingReview === review.id ? (
        <div className="edit-review-form">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
          <div className="stars-container">
            {[1, 2, 3, 4, 5].map((rating) => (
              <span
                key={rating}
                className={`star ${editRating >= rating ? 'selected' : ''}`}
                onClick={() => setEditRating(rating)}
              >
                ★
              </span>
            ))}
          </div>
          <div className="edit-actions">
            <button onClick={() => handleSaveEdit(review.id)}>Guardar</button>
            <button onClick={handleCancelEdit}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="stars">
            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
          </div>
          <p>{review.text}</p>
        </>
      )}

      <div className="review-actions">
      {user && review.usuarioId === user.id && (
    <button 
      className="edit-review-btn"
      onClick={() => handleEditReview(review)}
    >
      Modificar Reseña
    </button>
  )}
  
  {user && (user.rol_id === 2 || review.usuarioId === user.id) && (
    <button 
      className="delete-review-btn"
      onClick={() => handleDeleteReview(review.id)}
    >
      Eliminar Reseña
    </button>
  )}
      </div>
    </div>
  ))}
</div>
        </section>
      </section>
    </div>
  );
};

export default MovieDetails;