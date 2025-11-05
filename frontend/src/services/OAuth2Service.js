class OAuth2Service {
  
  async login(provider) {
    const state = this.generateRandomState();
    // Google 回调地址使用 yourapp.com
    const redirectUri = `http://localhost:8080/oauth/callback/${provider}`;
    
    try {
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
      console.log('OAuth2 login response:', data);
      window.location.href = data.authorizationUrl;
    } catch (error) {
      console.error('OAuth2 login error:', error);
      alert('登录失败，请重试');
    }
  }
  
  generateRandomState() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  logout() {
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  }
  
  getToken() {
    return localStorage.getItem('accessToken');
  }
}

export default new OAuth2Service();
