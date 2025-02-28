// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './Register';
import Login from './Login';
import Main from './Main';

function App() {
  return (
    <Router>
      <Routes>
        {/* Si el usuario visita "/", renderizamos Login */}
        <Route path="/" element={<Login />} />

        {/* Rutas específicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/Main" element={<Main />} />
      </Routes>
    </Router>
  );
}

export default App;
