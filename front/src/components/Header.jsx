import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ user }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/Main?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleProfileClick = () => {
    navigate('/Perfil');
  };

  const handleLogoClick = () => {
    navigate('/Main');
  };

  return (
    <header>
      <div className="logo-container" onClick={handleLogoClick}>
        <img
          src="https://cdn-icons-png.flaticon.com/512/3938/3938627.png"
          alt="CineClub Logo"
        />
        <h1>CineClub</h1>
      </div>
      <div className="search-bar">
        <input 
          type="text" 
          placeholder="Buscar películas..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button onClick={handleSearch}>Buscar</button>
      </div>
      <div className="user-info" onClick={handleProfileClick}>
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
  );
};

export default Header;
