# 前端OAuth2多平台集成指南

## 📋 概述

本指南详细介绍如何在前端项目中集成OAuth2登录功能，支持多个第三方登录提供商和多个平台。

### 🔗 支持的OAuth2提供商

- **Google** - 全球最大的身份提供商
- **Facebook** - 社交媒体登录
- **Apple** - iOS生态系统登录
- **GitHub** - 开发者平台登录
- **微信** - 中国市场主流登录方式
- **微博** - 中国社交媒体登录

### 📱 支持的平台

- **Web浏览器** - Chrome, Safari, Firefox等
- **React Native** - iOS和Android混合开发
- **iOS原生** - Swift/Objective-C应用
- **Android原生** - Java/Kotlin应用
- **微信小程序** - 微信生态内应用
- **支付宝小程序** - 支付宝生态内应用

## 🚀 快速开始

### 1. 项目结构

```
frontend/
├── src/
│   ├── services/
│   │   └── OAuth2Service.js          # OAuth2服务封装
│   ├── pages/
│   │   ├── Login.js                  # 登录页面
│   │   ├── Home.js                   # 主页（需要登录）
│   │   └── OAuth2RedirectHandler.js  # OAuth2回调处理页面
│   └── App.js                        # 主应用组件
└── package.json
```

### 2. 安装依赖

```bash
npm install react react-dom react-router-dom
```

### 3. 配置代理

在 `package.json` 中添加后端代理配置：

```json
{
  "proxy": "http://localhost:8080"
}
```

## 📝 核心实现

### OAuth2Service.js

创建OAuth2服务来处理多提供商登录逻辑：

```javascript
/**
 * OAuth2服务类 - 支持多个第三方登录提供商
 * 支持的提供商: Google, Facebook, Apple, GitHub, WeChat, Weibo
 */
class OAuth2Service {
  
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    this.supportedProviders = ['google', 'facebook', 'apple', 'github', 'wechat', 'weibo'];
  }

  /**
   * 发起OAuth2登录
   * @param {string} provider - 登录提供商 (google|facebook|apple|github|wechat|weibo)
   * @param {string} platform - 平台类型 (WEB|IOS|ANDROID|WECHAT_MINIAPP)
   * @param {Object} options - 额外选项
   */
  async login(provider, platform = 'WEB', options = {}) {
    if (!this.supportedProviders.includes(provider.toLowerCase())) {
      throw new Error(`不支持的登录提供商: ${provider}`);
    }

    const state = this.generateRandomState();
    const redirectUri = this.buildRedirectUri(provider, platform);
    
    try {
      console.log(`开始 ${provider} OAuth2 登录流程...`);
      
      const response = await fetch(`${this.baseUrl}/auth/oauth2/authorize`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          provider: provider.toUpperCase(),
          platform: platform.toUpperCase(),
          redirectUri: redirectUri,
          state: state,
          ...options // 支持额外参数，如codeChallenge等
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.authorizationUrl) {
        throw new Error('服务器未返回授权URL');
      }
      
      console.log(`跳转到 ${provider} 授权页面:`, data.authorizationUrl);
      
      // 根据平台选择跳转方式
      this.handleAuthRedirect(data.authorizationUrl, platform);
      
    } catch (error) {
      console.error(`${provider} OAuth2 登录失败:`, error);
      this.handleLoginError(error, provider);
    }
  }

  /**
   * Google登录快捷方法
   */
  async loginWithGoogle(platform = 'WEB') {
    return this.login('google', platform);
  }

  /**
   * Facebook登录快捷方法
   */
  async loginWithFacebook(platform = 'WEB') {
    return this.login('facebook', platform);
  }

  /**
   * Apple登录快捷方法
   */
  async loginWithApple(platform = 'WEB') {
    return this.login('apple', platform);
  }

  /**
   * GitHub登录快捷方法
   */
  async loginWithGitHub(platform = 'WEB') {
    return this.login('github', platform);
  }

  /**
   * 微信登录快捷方法
   */
  async loginWithWeChat(platform = 'WEB') {
    return this.login('wechat', platform);
  }

  /**
   * 微博登录快捷方法
   */
  async loginWithWeibo(platform = 'WEB') {
    return this.login('weibo', platform);
  }

  /**
   * 构建重定向URI
   */
  buildRedirectUri(provider, platform) {
    const baseUri = process.env.REACT_APP_OAUTH_REDIRECT_BASE || 'http://yourapp.com:8080';
    return `${baseUri}/oauth/callback/${provider.toLowerCase()}`;
  }

  /**
   * 处理授权重定向
   */
  handleAuthRedirect(authUrl, platform) {
    switch (platform.toUpperCase()) {
      case 'WEB':
        // Web浏览器直接跳转
        window.location.href = authUrl;
        break;
      case 'IOS':
      case 'ANDROID':
        // App环境，通知原生代码打开授权页面
        this.notifyNativeApp('OPEN_AUTH_URL', { url: authUrl });
        break;
      case 'WECHAT_MINIAPP':
        // 微信小程序环境
        this.handleMiniProgramAuth(authUrl);
        break;
      default:
        window.location.href = authUrl;
    }
  }

  /**
   * 通知原生App
   */
  notifyNativeApp(action, data) {
    if (window.ReactNativeWebView) {
      // React Native
      window.ReactNativeWebView.postMessage(JSON.stringify({ action, data }));
    } else if (window.webkit?.messageHandlers?.oauth) {
      // iOS WKWebView
      window.webkit.messageHandlers.oauth.postMessage({ action, data });
    } else if (window.Android?.onOAuthAction) {
      // Android WebView
      window.Android.onOAuthAction(action, JSON.stringify(data));
    } else {
      console.warn('未检测到原生App环境，使用Web方式');
      window.location.href = data.url;
    }
  }

  /**
   * 处理小程序授权
   */
  handleMiniProgramAuth(authUrl) {
    if (window.wx?.miniProgram) {
      // 微信小程序
      wx.miniProgram.navigateTo({
        url: `/pages/oauth/oauth?url=${encodeURIComponent(authUrl)}`
      });
    } else {
      console.warn('未检测到小程序环境');
      window.location.href = authUrl;
    }
  }

  /**
   * 处理登录错误
   */
  handleLoginError(error, provider) {
    const errorMessages = {
      google: 'Google登录失败，请检查网络连接或稍后重试',
      facebook: 'Facebook登录失败，请检查网络连接或稍后重试',
      apple: 'Apple登录失败，请稍后重试',
      github: 'GitHub登录失败，请检查网络连接或稍后重试',
      wechat: '微信登录失败，请稍后重试',
      weibo: '微博登录失败，请稍后重试'
    };

    const message = errorMessages[provider.toLowerCase()] || '登录失败，请稍后重试';
    
    // 根据环境选择错误提示方式
    if (this.isInApp()) {
      this.notifyNativeApp('OAUTH_ERROR', { error: message });
    } else {
      alert(message);
    }
  }

  /**
   * 生成随机状态字符串
   */
  generateRandomState() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) +
           Date.now().toString(36);
  }

  /**
   * 退出登录
   */
  logout() {
    // 清除所有相关的存储
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    sessionStorage.clear();
    
    // 根据环境选择跳转方式
    if (this.isInApp()) {
      this.notifyNativeApp('LOGOUT_SUCCESS', {});
    } else {
      window.location.href = '/login';
    }
  }

  /**
   * 获取访问令牌
   */
  getToken() {
    return localStorage.getItem('accessToken');
  }

  /**
   * 获取用户信息
   */
  getUserInfo() {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // 检查token是否过期
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch (error) {
      console.error('Token解析失败:', error);
      return false;
    }
  }

  /**
   * 检测是否在App环境中
   */
  isInApp() {
    return !!(
      window.ReactNativeWebView ||
      window.webkit?.messageHandlers ||
      window.Android ||
      navigator.userAgent.includes('YourAppName')
    );
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('没有刷新令牌');
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('刷新令牌失败');
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      return data.accessToken;
    } catch (error) {
      console.error('刷新令牌失败:', error);
      this.logout(); // 刷新失败，强制退出登录
      throw error;
    }
  }
}

// 创建单例实例
const oauth2Service = new OAuth2Service();

export default oauth2Service;
```

### Login.js

多提供商登录页面组件：

```javascript
import React, { useState, useEffect } from 'react';
import OAuth2Service from '../services/OAuth2Service';
import './Login.css'; // 样式文件

function Login() {
  const [loading, setLoading] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(null);

  useEffect(() => {
    // 检查是否已经登录
    if (OAuth2Service.isAuthenticated()) {
      window.location.href = '/home';
    }
  }, []);

  const handleLogin = async (provider) => {
    if (loading) return;
    
    setLoading(true);
    setCurrentProvider(provider);
    
    try {
      await OAuth2Service.login(provider);
    } catch (error) {
      console.error(`${provider} 登录失败:`, error);
      setLoading(false);
      setCurrentProvider(null);
    }
  };

  const loginButtons = [
    {
      provider: 'google',
      name: 'Google',
      icon: '🔍',
      color: '#4285f4',
      handler: () => handleLogin('google')
    },
    {
      provider: 'facebook',
      name: 'Facebook', 
      icon: '📘',
      color: '#1877f2',
      handler: () => handleLogin('facebook')
    },
    {
      provider: 'apple',
      name: 'Apple',
      icon: '🍎',
      color: '#000000',
      handler: () => handleLogin('apple')
    },
    {
      provider: 'github',
      name: 'GitHub',
      icon: '🐙',
      color: '#333333',
      handler: () => handleLogin('github')
    },
    {
      provider: 'wechat',
      name: '微信',
      icon: '💬',
      color: '#07c160',
      handler: () => handleLogin('wechat')
    },
    {
      provider: 'weibo',
      name: '微博',
      icon: '🔥',
      color: '#e6162d',
      handler: () => handleLogin('weibo')
    }
  ];

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>欢迎登录</h1>
          <p>选择您喜欢的登录方式</p>
        </div>
        
        <div className="login-buttons">
          {loginButtons.map((button) => (
            <button
              key={button.provider}
              onClick={button.handler}
              disabled={loading}
              className={`login-btn ${button.provider}-btn ${
                loading && currentProvider === button.provider ? 'loading' : ''
              }`}
              style={{ '--btn-color': button.color }}
            >
              <span className="btn-icon">{button.icon}</span>
              <span className="btn-text">
                {loading && currentProvider === button.provider 
                  ? '登录中...' 
                  : `使用 ${button.name} 登录`
                }
              </span>
              {loading && currentProvider === button.provider && (
                <span className="loading-spinner"></span>
              )}
            </button>
          ))}
        </div>

        <div className="login-footer">
          <p>登录即表示您同意我们的 <a href="/terms">服务条款</a> 和 <a href="/privacy">隐私政策</a></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
```

### Login.css

登录页面样式文件：

```css
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.login-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.login-header p {
  margin: 0 0 32px 0;
  color: #666;
  font-size: 16px;
}

.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  background-color: var(--btn-color);
  color: white;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.login-btn:active {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.login-btn.loading {
  pointer-events: none;
}

.btn-icon {
  font-size: 20px;
}

.btn-text {
  flex: 1;
  text-align: center;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 特定提供商的样式调整 */
.apple-btn {
  color: white;
}

.github-btn {
  color: white;
}

.login-footer {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #eee;
}

.login-footer p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.login-footer a {
  color: #667eea;
  text-decoration: none;
}

.login-footer a:hover {
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-container {
    padding: 16px;
  }
  
  .login-card {
    padding: 24px;
  }
  
  .login-header h1 {
    font-size: 24px;
  }
  
  .login-btn {
    padding: 12px 16px;
    font-size: 15px;
  }
}
```

### OAuth2SuccessHandler.js

统一的OAuth2成功处理页面，支持所有平台：

```javascript
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function OAuth2SuccessHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const platform = searchParams.get('platform');
    const error = searchParams.get('error');

    if (token) {
      handleSuccess(token, platform);
    } else if (error) {
      handleError(error);
    }
  }, [searchParams, navigate]);

  const handleSuccess = (token, platform) => {
    // 检测运行环境
    const isInApp = detectAppEnvironment();
    const isInMiniProgram = detectMiniProgram();

    if (isInApp) {
      // App WebView环境
      handleAppSuccess(token);
    } else if (isInMiniProgram) {
      // 小程序WebView环境
      handleMiniProgramSuccess(token);
    } else {
      // 普通Web浏览器环境
      handleWebSuccess(token);
    }
  };

  const handleWebSuccess = (token) => {
    localStorage.setItem('accessToken', token);
    navigate('/home');
  };

  const handleAppSuccess = (token) => {
    // 通过postMessage将token传递给原生App
    if (window.ReactNativeWebView) {
      // React Native WebView
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'OAUTH_SUCCESS',
        token: token
      }));
    } else if (window.webkit?.messageHandlers?.oauth) {
      // iOS WKWebView
      window.webkit.messageHandlers.oauth.postMessage({
        type: 'OAUTH_SUCCESS',
        token: token
      });
    } else if (window.Android?.onOAuthSuccess) {
      // Android WebView
      window.Android.onOAuthSuccess(token);
    } else {
      // 降级到localStorage (用于调试)
      localStorage.setItem('accessToken', token);
      alert('登录成功！Token已保存到localStorage');
    }
  };

  const handleMiniProgramSuccess = (token) => {
    // 微信小程序WebView
    if (window.wx?.miniProgram) {
      wx.miniProgram.postMessage({
        data: {
          type: 'OAUTH_SUCCESS',
          token: token
        }
      });
      wx.miniProgram.navigateBack();
    }
  };

  const handleError = (error) => {
    console.error('OAuth2 error:', error);
    
    const isInApp = detectAppEnvironment();
    if (isInApp) {
      // 通知App登录失败
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'OAUTH_ERROR',
          error: error
        }));
      }
    } else {
      navigate('/login?error=' + error);
    }
  };

  const detectAppEnvironment = () => {
    return !!(
      window.ReactNativeWebView ||
      window.webkit?.messageHandlers ||
      window.Android ||
      navigator.userAgent.includes('YourAppName')
    );
  };

  const detectMiniProgram = () => {
    return !!(window.wx?.miniProgram);
  };

  return (
    <div className="oauth-success">
      <div className="loading-spinner"></div>
      <p>登录成功，正在跳转...</p>
      <style jsx>{`
        .oauth-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default OAuth2SuccessHandler;
```

### Home.js

需要登录的主页组件：

```javascript
import React, { useState, useEffect } from 'react';
import OAuth2Service from '../services/OAuth2Service';

function Home() {
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const token = OAuth2Service.getToken();
    if (token) {
      try {
        // 解析JWT token获取用户信息
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserInfo({
          name: payload.name || '用户',
          email: payload.email || ''
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
      <h1>欢迎，{userInfo?.name}!</h1>
      <p>邮箱: {userInfo?.email}</p>
      <button onClick={handleLogout}>退出登录</button>
    </div>
  );
}

export default Home;
```

### App.js

主应用路由配置：

```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import OAuth2SuccessHandler from './pages/OAuth2SuccessHandler';

function App() {
  const isAuthenticated = () => {
    return localStorage.getItem('accessToken') !== null;
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/oauth2/success" element={<OAuth2SuccessHandler />} />
          <Route 
            path="/home" 
            element={isAuthenticated() ? <Home /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated() ? "/home" : "/login"} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```

## 🔄 OAuth2流程说明

### Web平台流程 (重定向方式)

```
1. 用户点击"使用Google登录"
   ↓
2. 前端调用 POST /auth/oauth2/authorize
   ↓
3. 后端返回Google授权URL
   ↓
4. 前端跳转到Google授权页面
   ↓
5. 用户在Google页面授权
   ↓
6. Google回调到后端: /oauth/callback/google
   ↓
7. 后端处理回调，获取用户信息，生成JWT
   ↓
8. 后端重定向到前端: http://localhost:3000/oauth2/redirect?token=xxx
   ↓
9. 前端保存token，跳转到主页
```

### 统一WebView流程 (推荐方案)

```
1. 用户点击"使用Google登录"
   ↓
2. 前端调用 POST /auth/oauth2/authorize
   ↓
3. 后端返回Google授权URL
   ↓
4. 跳转到Google授权页面 (在WebView中)
   ↓
5. 用户在Google页面授权
   ↓
6. Google回调到后端: /oauth/callback/google
   ↓
7. 后端获取用户信息，生成JWT
   ↓
8. 后端重定向到统一的成功页面
   ↓
9. 成功页面通过postMessage将token传递给原生App
   ↓
10. App接收token，关闭WebView，跳转到主页
```

### 平台实现方式

- **Web浏览器**: 直接运行，无需额外处理
- **App WebView**: 监听postMessage，接收token后关闭WebView
- **小程序web-view**: 通过wx.miniProgram.postMessage传递数据

### 关键API接口

#### 1. 获取授权URL

**请求格式**:
```javascript
POST /auth/oauth2/authorize
Content-Type: application/json

{
  "provider": "GOOGLE|FACEBOOK|APPLE|GITHUB|WECHAT|WEIBO",
  "platform": "WEB|IOS|ANDROID|WECHAT_MINIAPP", 
  "redirectUri": "http://yourapp.com:8080/oauth/callback/{provider}",
  "state": "random_state_string",
  "codeChallenge": "optional_pkce_challenge",      // PKCE (可选)
  "codeChallengeMethod": "S256"                    // PKCE方法 (可选)
}
```

**各提供商示例**:

**Google登录**:
```javascript
{
  "provider": "GOOGLE",
  "platform": "WEB",
  "redirectUri": "http://yourapp.com:8080/oauth/callback/google",
  "state": "abc123def456"
}
```

**Facebook登录**:
```javascript
{
  "provider": "FACEBOOK", 
  "platform": "WEB",
  "redirectUri": "http://yourapp.com:8080/oauth/callback/facebook",
  "state": "xyz789uvw012"
}
```

**Apple登录** (支持PKCE):
```javascript
{
  "provider": "APPLE",
  "platform": "IOS", 
  "redirectUri": "http://yourapp.com:8080/oauth/callback/apple",
  "state": "apple_state_123",
  "codeChallenge": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "codeChallengeMethod": "S256"
}
```

**GitHub登录**:
```javascript
{
  "provider": "GITHUB",
  "platform": "WEB",
  "redirectUri": "http://yourapp.com:8080/oauth/callback/github", 
  "state": "github_state_456"
}
```

**微信登录**:
```javascript
{
  "provider": "WECHAT",
  "platform": "WECHAT_MINIAPP",
  "redirectUri": "http://yourapp.com:8080/oauth/callback/wechat",
  "state": "wechat_state_789"
}
```

**统一响应格式**:
```javascript
{
  "authorizationUrl": "https://provider.com/oauth/authorize?client_id=...",
  "state": "random_state_string",
  "provider": "GOOGLE",
  "platform": "WEB"
}
```

#### 2. OAuth2回调处理

**各提供商回调URL**:
```
Google:   GET /oauth/callback/google?code=xxx&state=xxx&scope=xxx
Facebook: GET /oauth/callback/facebook?code=xxx&state=xxx
Apple:    GET /oauth/callback/apple?code=xxx&state=xxx
GitHub:   GET /oauth/callback/github?code=xxx&state=xxx
WeChat:   GET /oauth/callback/wechat?code=xxx&state=xxx
Weibo:    GET /oauth/callback/weibo?code=xxx&state=xxx
```

**后端统一重定向**:
```
GET http://localhost:3000/oauth2/success?token=JWT_TOKEN&platform=WEB
```

#### 3. 令牌刷新接口

**请求**:
```javascript
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_string"
}
```

**响应**:
```javascript
{
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token", // 可选
  "expiresIn": 3600
}
```

## 🔐 JWT Token结构

成功登录后，后端会返回包含用户信息的JWT token：

### 标准Token结构

```javascript
{
  "sub": "1",                           // 用户ID
  "platform": "WEB",                   // 平台类型
  "provider": "GOOGLE",                 // 登录提供商
  "email": "user@gmail.com",           // 用户邮箱
  "name": "用户名",                     // 用户姓名
  "picture": "https://avatar.url",     // 用户头像
  "locale": "zh-CN",                   // 用户语言
  "iat": 1762326096,                   // 签发时间
  "exp": 1762930896,                   // 过期时间
  "scope": ["email", "profile"]        // 授权范围
}
```

### 不同提供商的Token差异

**Google Token**:
```javascript
{
  "sub": "1",
  "platform": "WEB", 
  "provider": "GOOGLE",
  "email": "user@gmail.com",
  "name": "张三",
  "picture": "https://lh3.googleusercontent.com/...",
  "email_verified": true,
  "locale": "zh-CN",
  "iat": 1762326096,
  "exp": 1762930896
}
```

**Facebook Token**:
```javascript
{
  "sub": "1",
  "platform": "WEB",
  "provider": "FACEBOOK", 
  "email": "user@facebook.com",
  "name": "李四",
  "picture": "https://graph.facebook.com/.../picture",
  "first_name": "四",
  "last_name": "李",
  "iat": 1762326096,
  "exp": 1762930896
}
```

**Apple Token**:
```javascript
{
  "sub": "1", 
  "platform": "IOS",
  "provider": "APPLE",
  "email": "user@privaterelay.appleid.com",
  "name": "王五",
  "email_verified": true,
  "is_private_email": true,
  "iat": 1762326096,
  "exp": 1762930896
}
```

**GitHub Token**:
```javascript
{
  "sub": "1",
  "platform": "WEB",
  "provider": "GITHUB",
  "email": "user@github.com", 
  "name": "赵六",
  "picture": "https://avatars.githubusercontent.com/...",
  "login": "username",
  "company": "GitHub Inc.",
  "iat": 1762326096,
  "exp": 1762930896
}
```

**微信Token**:
```javascript
{
  "sub": "1",
  "platform": "WECHAT_MINIAPP",
  "provider": "WECHAT",
  "openid": "wechat_openid_123",
  "unionid": "wechat_unionid_456", 
  "nickname": "微信用户",
  "headimgurl": "https://thirdwx.qlogo.cn/...",
  "sex": 1,
  "city": "北京",
  "province": "北京",
  "country": "中国",
  "iat": 1762326096,
  "exp": 1762930896
}
```

### Token解析工具函数

```javascript
/**
 * 解析JWT Token
 * @param {string} token - JWT token字符串
 * @returns {Object} 解析后的payload
 */
function parseJWTToken(token) {
  try {
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = JSON.parse(atob(parts[1]));
    
    // 检查token是否过期
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }
    
    return payload;
  } catch (error) {
    console.error('JWT解析失败:', error);
    return null;
  }
}

/**
 * 检查token是否即将过期
 * @param {string} token - JWT token
 * @param {number} bufferMinutes - 提前多少分钟算作即将过期
 * @returns {boolean}
 */
function isTokenExpiringSoon(token, bufferMinutes = 5) {
  const payload = parseJWTToken(token);
  if (!payload || !payload.exp) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const bufferSeconds = bufferMinutes * 60;
  
  return payload.exp - now < bufferSeconds;
}

/**
 * 获取用户显示名称
 * @param {Object} tokenPayload - 解析后的token payload
 * @returns {string} 用户显示名称
 */
function getUserDisplayName(tokenPayload) {
  if (!tokenPayload) return '未知用户';
  
  // 根据不同提供商返回合适的显示名称
  switch (tokenPayload.provider) {
    case 'GOOGLE':
    case 'FACEBOOK':
    case 'APPLE':
    case 'GITHUB':
      return tokenPayload.name || tokenPayload.email || '用户';
    case 'WECHAT':
      return tokenPayload.nickname || '微信用户';
    case 'WEIBO':
      return tokenPayload.screen_name || '微博用户';
    default:
      return tokenPayload.name || tokenPayload.email || '用户';
  }
}
```

## 🛠️ 环境配置

### 1. 环境变量配置

创建 `.env` 文件来管理不同环境的配置：

```bash
# .env.development (开发环境)
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_OAUTH_REDIRECT_BASE=http://yourapp.com:8080
REACT_APP_ENVIRONMENT=development

# Google OAuth2
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id

# Facebook OAuth2  
REACT_APP_FACEBOOK_APP_ID=your-facebook-app-id

# Apple OAuth2
REACT_APP_APPLE_CLIENT_ID=your-apple-client-id

# GitHub OAuth2
REACT_APP_GITHUB_CLIENT_ID=your-github-client-id

# 微信OAuth2
REACT_APP_WECHAT_APP_ID=your-wechat-app-id

# 微博OAuth2
REACT_APP_WEIBO_APP_KEY=your-weibo-app-key
```

```bash
# .env.production (生产环境)
REACT_APP_API_BASE_URL=https://api.yourapp.com
REACT_APP_OAUTH_REDIRECT_BASE=https://yourapp.com
REACT_APP_ENVIRONMENT=production

# 生产环境的OAuth2配置
REACT_APP_GOOGLE_CLIENT_ID=your-prod-google-client-id
REACT_APP_FACEBOOK_APP_ID=your-prod-facebook-app-id
# ... 其他生产环境配置
```

### 2. 本地开发环境设置

#### 域名映射配置

在 `/etc/hosts` 文件中添加：
```bash
127.0.0.1 yourapp.com
127.0.0.1 api.yourapp.com
```

#### 开发服务器配置

```json
// package.json
{
  "scripts": {
    "start": "react-scripts start",
    "start:https": "HTTPS=true react-scripts start",
    "build": "react-scripts build",
    "build:staging": "REACT_APP_ENV=staging react-scripts build"
  },
  "proxy": "http://localhost:8080"
}
```

#### HTTPS开发环境 (可选)

```bash
# 生成自签名证书
mkdir -p ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes

# 启动HTTPS开发服务器
HTTPS=true SSL_CRT_FILE=ssl/cert.pem SSL_KEY_FILE=ssl/key.pem npm start
```

### 3. OAuth2提供商配置

#### Google Console配置

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google+ API 和 People API
4. 创建OAuth2客户端ID
5. 配置授权重定向URI：

```
开发环境:
http://yourapp.com:8080/oauth/callback/google
http://localhost:8080/oauth/callback/google

生产环境:
https://yourapp.com/oauth/callback/google
```

6. 配置OAuth同意屏幕
7. 添加测试用户 (开发阶段)

#### Facebook开发者配置

1. 访问 [Facebook开发者控制台](https://developers.facebook.com/)
2. 创建新应用
3. 添加Facebook登录产品
4. 配置有效的OAuth重定向URI：

```
开发环境:
http://yourapp.com:8080/oauth/callback/facebook

生产环境:  
https://yourapp.com/oauth/callback/facebook
```

5. 配置应用域名
6. 设置应用为开发模式或提交审核

#### Apple开发者配置

1. 访问 [Apple Developer](https://developer.apple.com/)
2. 创建App ID和Services ID
3. 配置Sign in with Apple
4. 设置Return URLs：

```
开发环境:
http://yourapp.com:8080/oauth/callback/apple

生产环境:
https://yourapp.com/oauth/callback/apple
```

5. 生成私钥文件
6. 配置Team ID和Key ID

#### GitHub OAuth Apps配置

1. 访问 [GitHub Settings](https://github.com/settings/developers)
2. 创建新的OAuth App
3. 配置Authorization callback URL：

```
开发环境:
http://yourapp.com:8080/oauth/callback/github

生产环境:
https://yourapp.com/oauth/callback/github
```

#### 微信开放平台配置

1. 访问 [微信开放平台](https://open.weixin.qq.com/)
2. 创建网站应用或移动应用
3. 配置授权回调域名：

```
开发环境: yourapp.com
生产环境: yourapp.com
```

4. 获取AppID和AppSecret

#### 微博开放平台配置

1. 访问 [微博开放平台](https://open.weibo.com/)
2. 创建新应用
3. 配置回调地址：

```
开发环境:
http://yourapp.com:8080/oauth/callback/weibo

生产环境:
https://yourapp.com/oauth/callback/weibo
```

### 4. 后端配置文件

确保后端 `application.yml` 配置正确：

```yaml
# application-dev.yml (开发环境)
server:
  port: 8080

app:
  oauth2:
    google:
      client-id: ${GOOGLE_CLIENT_ID}
      client-secret: ${GOOGLE_CLIENT_SECRET}
      scopes: openid email profile
    
    facebook:
      client-id: ${FACEBOOK_CLIENT_ID}
      client-secret: ${FACEBOOK_CLIENT_SECRET}
      scopes: email public_profile
    
    apple:
      client-id: ${APPLE_CLIENT_ID}
      client-secret: ${APPLE_CLIENT_SECRET}
      scopes: name email
    
    github:
      client-id: ${GITHUB_CLIENT_ID}
      client-secret: ${GITHUB_CLIENT_SECRET}
      scopes: user:email
    
    wechat:
      client-id: ${WECHAT_APP_ID}
      client-secret: ${WECHAT_APP_SECRET}
      scopes: snsapi_userinfo
    
    weibo:
      client-id: ${WEIBO_APP_KEY}
      client-secret: ${WEIBO_APP_SECRET}
      scopes: email
```

### 5. 跨域配置

#### 开发环境CORS配置

```java
// SecurityConfig.java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.asList(
        "http://localhost:3000",
        "http://yourapp.com",
        "https://yourapp.com"
    ));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true);
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

#### 生产环境反向代理

```nginx
# nginx.conf
server {
    listen 80;
    server_name yourapp.com;
    
    # 前端静态文件
    location / {
        root /var/www/yourapp;
        try_files $uri $uri/ /index.html;
    }
    
    # API代理到后端
    location /auth/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🚨 注意事项

### 1. 安全考虑

- **Token存储**: 生产环境建议使用httpOnly cookie而不是localStorage
- **HTTPS**: 生产环境必须使用HTTPS
- **Token过期**: 实现token刷新机制

### 2. 错误处理

```javascript
// 在OAuth2Service中添加错误处理
async login(provider) {
  try {
    // ... 登录逻辑
  } catch (error) {
    if (error.response?.status === 401) {
      alert('认证失败，请重试');
    } else if (error.response?.status === 500) {
      alert('服务器错误，请稍后重试');
    } else {
      alert('登录失败: ' + error.message);
    }
  }
}
```

### 3. 路由保护

```javascript
// 创建受保护的路由组件
function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem('accessToken');
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

// 使用方式
<Route path="/home" element={
  <ProtectedRoute>
    <Home />
  </ProtectedRoute>
} />
```

## 📱 多平台支持

### 平台类型

- **Web**: `"WEB"` - 使用重定向方式
- **iOS**: `"IOS"` - 使用API轮询方式  
- **Android**: `"ANDROID"` - 使用API轮询方式
- **微信小程序**: `"WECHAT_MINIAPP"` - 使用API调用方式

### Web平台实现 (当前)

```javascript
class OAuth2Service {
  async login(provider) {
    const state = this.generateRandomState();
    const redirectUri = `http://yourapp.com/oauth/callback/${provider}`;
    
    const response = await fetch('/auth/oauth2/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: provider.toUpperCase(),
        platform: 'WEB',
        redirectUri: redirectUri,
        state: state
      })
    });
    
    const data = await response.json();
    window.location.href = data.authorizationUrl;
  }
}
```

### App WebView集成

#### React Native集成

```javascript
// App.js - React Native
import React from 'react';
import { WebView } from 'react-native-webview';
import { Alert } from 'react-native';

function OAuth2WebView({ navigation }) {
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'OAUTH_SUCCESS') {
        // 保存token
        AsyncStorage.setItem('accessToken', data.token);
        // 关闭WebView，跳转到主页
        navigation.navigate('Home');
      } else if (data.type === 'OAUTH_ERROR') {
        Alert.alert('登录失败', data.error);
        navigation.goBack();
      }
    } catch (error) {
      console.error('处理WebView消息失败:', error);
    }
  };

  return (
    <WebView
      source={{ uri: 'http://localhost:3000/login' }}
      onMessage={handleMessage}
      javaScriptEnabled={true}
      domStorageEnabled={true}
    />
  );
}
```

#### iOS原生集成

```swift
// iOS - WKWebView
import WebKit

class OAuth2ViewController: UIViewController, WKScriptMessageHandler {
    var webView: WKWebView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "oauth")
        
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.load(URLRequest(url: URL(string: "http://localhost:3000/login")!))
        view.addSubview(webView)
    }
    
    func userContentController(_ userContentController: WKUserContentController, 
                              didReceive message: WKScriptMessage) {
        if message.name == "oauth" {
            if let data = message.body as? [String: Any],
               let type = data["type"] as? String {
                
                if type == "OAUTH_SUCCESS",
                   let token = data["token"] as? String {
                    // 保存token
                    UserDefaults.standard.set(token, forKey: "accessToken")
                    // 关闭WebView
                    dismiss(animated: true)
                }
            }
        }
    }
}
```

#### Android原生集成

```java
// Android - WebView
public class OAuth2Activity extends AppCompatActivity {
    private WebView webView;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.addJavascriptInterface(new WebAppInterface(), "Android");
        webView.loadUrl("http://localhost:3000/login");
        
        setContentView(webView);
    }
    
    public class WebAppInterface {
        @JavascriptInterface
        public void onOAuthSuccess(String token) {
            // 保存token
            SharedPreferences prefs = getSharedPreferences("app", MODE_PRIVATE);
            prefs.edit().putString("accessToken", token).apply();
            
            // 关闭Activity
            runOnUiThread(() -> finish());
        }
    }
}
```

### 小程序实现

```javascript
// 微信小程序
class OAuth2Service {
  async login(provider) {
    const state = this.generateRandomState();
    
    // 1. 获取授权URL
    const response = await wx.request({
      url: 'https://api.yourapp.com/auth/oauth2/authorize',
      method: 'POST',
      data: {
        provider: provider.toUpperCase(),
        platform: 'WECHAT_MINIAPP',
        redirectUri: `https://api.yourapp.com/oauth/callback/${provider}`,
        state: state
      }
    });
    
    // 2. 打开授权页面
    wx.navigateToMiniProgram({
      appId: 'google-oauth-appid', // Google小程序ID
      path: `pages/auth?url=${encodeURIComponent(response.data.authorizationUrl)}`,
      success: () => {
        // 3. 轮询获取token
        this.pollForToken(state);
      }
    });
  }
  
  async pollForToken(state) {
    // 类似App的轮询逻辑
    // ...
  }
}
```

## 🔧 故障排除

### 常见问题及解决方案

#### 1. 网络和代理问题

**问题**: 前端请求无法到达后端
```
Error: Failed to fetch
```

**解决方案**:
- 确保后端服务运行在正确端口 (默认8080)
- 检查 `package.json` 中的proxy配置
- 重启前端开发服务器使proxy生效

```json
// package.json
{
  "proxy": "http://localhost:8080"
}
```

#### 2. OAuth2提供商配置问题

**Google配置问题**:
```
Error 400: invalid_scope
```

**解决方案**:
- 在Google Console中添加测试用户
- 确保OAuth同意屏幕配置完整
- 检查重定向URI配置: `http://yourapp.com:8080/oauth/callback/google`

**Facebook配置问题**:
```
Error: Invalid redirect_uri
```

**解决方案**:
- 在Facebook开发者控制台添加有效的OAuth重定向URI
- 确保应用处于开发模式或已发布

**Apple配置问题**:
```
Error: invalid_client
```

**解决方案**:
- 检查Apple Developer账号中的Services ID配置
- 确保Return URLs配置正确
- 验证Client ID和Team ID

#### 3. Token相关问题

**Token解析失败**:
```javascript
// 调试代码
const token = localStorage.getItem('accessToken');
if (token) {
  try {
    const parts = token.split('.');
    console.log('Token parts:', parts.length);
    const payload = JSON.parse(atob(parts[1]));
    console.log('Token payload:', payload);
  } catch (error) {
    console.error('Token解析失败:', error);
    // 清除无效token
    localStorage.removeItem('accessToken');
  }
}
```

**Token过期处理**:
```javascript
// 自动刷新token的拦截器
async function apiRequest(url, options = {}) {
  let token = OAuth2Service.getToken();
  
  // 检查token是否即将过期
  if (isTokenExpiringSoon(token)) {
    try {
      token = await OAuth2Service.refreshToken();
    } catch (error) {
      // 刷新失败，重新登录
      OAuth2Service.logout();
      return;
    }
  }
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}
```

#### 4. 平台特定问题

**React Native WebView问题**:
```javascript
// 确保WebView配置正确
<WebView
  source={{ uri: 'http://localhost:3000/login' }}
  onMessage={handleMessage}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  startInLoadingState={true}
  scalesPageToFit={false}
  mixedContentMode="compatibility"
/>
```

**iOS WKWebView问题**:
```swift
// 确保messageHandler注册正确
let config = WKWebViewConfiguration()
config.userContentController.add(self, name: "oauth")

// 允许跨域请求
config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
```

**Android WebView问题**:
```java
// 启用必要的WebView设置
webView.getSettings().setJavaScriptEnabled(true);
webView.getSettings().setDomStorageEnabled(true);
webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
```

### 调试工具和技巧

#### 1. 浏览器调试

```javascript
// 在浏览器控制台中运行的调试代码

// 检查OAuth2Service状态
console.log('OAuth2Service状态:', {
  isAuthenticated: OAuth2Service.isAuthenticated(),
  token: OAuth2Service.getToken(),
  userInfo: OAuth2Service.getUserInfo()
});

// 测试不同提供商登录
OAuth2Service.loginWithGoogle().catch(console.error);
OAuth2Service.loginWithFacebook().catch(console.error);

// 清除所有登录状态
localStorage.clear();
sessionStorage.clear();
```

#### 2. 网络请求调试

```javascript
// 拦截所有OAuth2相关请求
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [url, options] = args;
  
  if (url.includes('/auth/oauth2/')) {
    console.log('OAuth2请求:', {
      url,
      method: options?.method || 'GET',
      body: options?.body,
      headers: options?.headers
    });
  }
  
  return originalFetch.apply(this, args).then(response => {
    if (url.includes('/auth/oauth2/')) {
      console.log('OAuth2响应:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });
    }
    return response;
  });
};
```

#### 3. 错误监控

```javascript
// 全局错误处理
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('OAuth') || 
      event.error?.message?.includes('login')) {
    console.error('OAuth2相关错误:', {
      message: event.error.message,
      stack: event.error.stack,
      filename: event.filename,
      lineno: event.lineno
    });
    
    // 发送错误报告到监控服务
    // sendErrorReport(event.error);
  }
});

// Promise rejection处理
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('OAuth') ||
      event.reason?.message?.includes('login')) {
    console.error('OAuth2 Promise rejection:', event.reason);
    event.preventDefault(); // 防止错误显示在控制台
  }
});
```

### 性能优化建议

#### 1. 懒加载OAuth2Service

```javascript
// 动态导入OAuth2Service
const loadOAuth2Service = async () => {
  const { default: OAuth2Service } = await import('../services/OAuth2Service');
  return OAuth2Service;
};

// 在需要时才加载
const handleLogin = async (provider) => {
  const OAuth2Service = await loadOAuth2Service();
  await OAuth2Service.login(provider);
};
```

#### 2. Token缓存策略

```javascript
// 内存缓存避免重复解析
let cachedTokenPayload = null;
let cachedTokenString = null;

function getCachedTokenPayload() {
  const currentToken = localStorage.getItem('accessToken');
  
  if (currentToken !== cachedTokenString) {
    cachedTokenString = currentToken;
    cachedTokenPayload = parseJWTToken(currentToken);
  }
  
  return cachedTokenPayload;
}
```

#### 3. 预加载授权URL

```javascript
// 预加载常用提供商的授权URL
const preloadAuthUrls = async () => {
  const providers = ['google', 'facebook'];
  const promises = providers.map(provider => 
    OAuth2Service.login(provider, 'WEB', { preload: true })
  );
  
  try {
    await Promise.all(promises);
    console.log('授权URL预加载完成');
  } catch (error) {
    console.warn('授权URL预加载失败:', error);
  }
};

// 在应用启动时预加载
useEffect(() => {
  preloadAuthUrls();
}, []);
```

## 📞 技术支持

如有问题，请检查：
1. 后端服务是否正常运行 (http://localhost:8080)
2. Google Console配置是否正确
3. 网络连接是否正常
4. 浏览器控制台是否有错误信息

---

*最后更新: 2025-11-05*