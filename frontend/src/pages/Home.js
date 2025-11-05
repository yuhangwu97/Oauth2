import React, { useEffect, useState } from 'react';
import OAuth2Service from '../services/OAuth2Service';
import './Home.css';

function Home() {
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const token = OAuth2Service.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserInfo({
          name: payload.name || '用户',
          email: payload.email || '',
          platform: payload.platform || 'WEB'
        });
      } catch (error) {
        console.error('解析 token 失败:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    OAuth2Service.logout();
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="home-header">
          <h1>欢迎回来!</h1>
          {userInfo && (
            <div className="user-info">
              <div className="user-avatar">
                {userInfo.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <h2>{userInfo.name}</h2>
                <p>{userInfo.email}</p>
                <span className="platform-badge">{userInfo.platform}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="home-content">
          <div className="info-card">
            <h3>🎉 登录成功</h3>
            <p>你已经成功通过 OAuth2 认证登录</p>
          </div>
          
          <div className="info-card">
            <h3>🔐 安全认证</h3>
            <p>你的登录信息已经通过 JWT Token 安全保护</p>
          </div>
          
          <div className="info-card">
            <h3>🌐 多平台支持</h3>
            <p>支持 Web、App、小程序等多个平台</p>
          </div>
        </div>
        
        <button className="logout-btn" onClick={handleLogout}>
          退出登录
        </button>
      </div>
    </div>
  );
}

export default Home;
