import React from 'react';
import './MovieCard.css';

const MovieCard = ({ image, title, rating, onClick }) => {
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
    <div className="movie-card" onClick={onClick}>
      <img src={image} alt={title} />
      <h3>{title}</h3>
      <div className="rating">
        {renderStars(rating)}
        <span className="number">{Number(rating).toFixed(1)}</span>
      </div>
    </div>
  );
};

export default MovieCard;