import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import OAuth2RedirectHandler from './pages/OAuth2RedirectHandler';

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('accessToken') !== null;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/oauth2/success" element={<OAuth2RedirectHandler />} />
        <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
        <Route 
          path="/home" 
          element={isAuthenticated() ? <Home /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated() ? "/home" : "/login"} />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
