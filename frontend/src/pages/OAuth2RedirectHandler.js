import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './OAuth2RedirectHandler.css';

function OAuth2RedirectHandler() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (token) {
      localStorage.setItem('accessToken', token);
      navigate('/home');
    } else if (error) {
      alert('登录失败: ' + error);
      navigate('/login');
    } else {
      navigate('/login');
    }
  }, [navigate, searchParams]);

  return (
    <div className="redirect-container">
      <div className="spinner"></div>
      <p>正在处理登录...</p>
    </div>
  );
}

export default OAuth2RedirectHandler;
