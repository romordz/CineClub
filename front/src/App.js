// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './Register';
import Login from './Login';
import Main from './Main';
import Perfil from './Perfil';
import AgregarPelicula from './AgregarPelicula';
import MovieDetails from './MovieDetails';
import ModificarPelicula from './ModificarPelicula';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/main" element={<Main />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/agregar-pelicula" element={<AgregarPelicula />} />
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/modificar-pelicula/:id" element={<ModificarPelicula />} />
      </Routes>
    </Router>
  );
}

export default App;
