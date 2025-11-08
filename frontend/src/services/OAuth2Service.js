/**
 * OAuth2 服务类
 * 根据文档规范实现 OAuth2 第三方登录
 */
class OAuth2Service {
  // API 基础路径
  API_BASE_URL = '/api/sys/user';
  
  /**
   * 生成随机 State 参数（用于防 CSRF 攻击）
   * @returns {string} 随机 state 字符串
   */
  generateRandomState() {
    // 使用加密安全的随机数生成器（如果可用）
    if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    // 降级方案：使用 Math.random
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * 获取后端 API 基础 URL（根据环境配置）
   * @returns {string} API 基础 URL
   */
  getApiBaseUrl() {
    // 可以根据环境变量配置
    return process.env.REACT_APP_API_BASE_URL || '';
  }
  
  /**
   * 获取 OAuth2 支持的提供商列表
   * @returns {Promise<{allProviders: string[], whitelistProviders: string[]}>} 提供商列表
   */
  async getProviders() {
    try {
      const apiBaseUrl = this.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}${this.API_BASE_URL}/oauth2/providers`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 检查响应格式
      if (!data.success) {
        throw new Error(data.message || '获取提供商列表失败');
      }
      
      return {
        allProviders: data.result?.allProviders || [],
        whitelistProviders: data.result?.whitelistProviders || []
      };
      
    } catch (error) {
      console.error('获取 OAuth2 提供商列表失败:', error);
      // 返回空列表，前端将不显示第三方登录按钮，但不影响正常登录界面
      return {
        allProviders: [],
        whitelistProviders: []
      };
    }
  }
  
  /**
   * OAuth2 登录
   * @param {string} provider - 登录提供商（小写）
   */
  async login(provider) {
    provider = provider.toLowerCase();
    
    // 生成 state 参数
    const state = this.generateRandomState();
    
    // 存储 state 到 sessionStorage（用于后续验证）
    sessionStorage.setItem('oauth2_state', state);
    
    // 构建请求参数（redirectUri 由后端配置写死，前端不需要传递）
    const requestBody = {
      provider: provider,
      state: state
    };
    
    try {
      const apiBaseUrl = this.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}${this.API_BASE_URL}/oauth2/authorize`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 检查响应格式
      if (!data.success) {
        throw new Error(data.message || '授权请求失败');
      }
      
      const authorizationUrl = data.result?.authorizationUrl || data.authorizationUrl;
      
      if (!authorizationUrl) {
        throw new Error('未获取到授权 URL');
      }
      
      console.log('OAuth2 授权 URL 获取成功');
      console.log('State:', state);
      
      // 跳转到授权页面
      window.location.href = authorizationUrl;
      
    } catch (error) {
      console.error('OAuth2 登录失败:', error);
      
      // 清理存储的数据
      sessionStorage.removeItem('oauth2_state');
      
      alert(`登录失败: ${error.message}\n请重试`);
    }
  }
  
  /**
   * 登出
   */
  logout() {
    localStorage.removeItem('accessToken');
    sessionStorage.removeItem('oauth2_state');
    window.location.href = '/login';
  }
  
  /**
   * 获取 Token
   * @returns {string|null} JWT Token
   */
  getToken() {
    return localStorage.getItem('accessToken');
  }
  
  /**
   * 检查是否已登录
   * @returns {boolean} 是否已登录
   */
  isAuthenticated() {
    return this.getToken() !== null;
  }
}

export default new OAuth2Service();
