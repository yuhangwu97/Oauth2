# Facebook OAuth2配置指南

## 📋 Facebook开发者控制台配置

基于你提供的Facebook应用配置截图，以下是关键配置信息：

### 应用基本信息
- **应用编号**: `1912281646367499`
- **应用密钥**: `14a765d014592ddddda714808c4898f8`
- **显示名称**: `Monkey_short`
- **应用类别**: `娱乐`

### 重定向URI配置
- **隐私政策网址**: `https://yourapp.com/oauth/callback/facebook`
- **用户数据删除网址**: `https://yourapp.com/oauth/callback/facebook`

## 🔧 后端配置 (application.yml)

```yaml
app:
  oauth2:
    facebook:
      client-id: 1912281646367499
      client-secret: 14a765d014592ddddda714808c4898f8
      authorization-uri: https://www.facebook.com/v18.0/dialog/oauth
      token-uri: https://graph.facebook.com/v18.0/oauth/access_token
      user-info-uri: https://graph.facebook.com/me?fields=id,name,email,picture
      scopes: email,public_profile
    
    authorized-redirect-uris:
      - http://yourapp.com:8080/oauth/callback/facebook
      - http://localhost:8080/oauth/callback/facebook  # 开发环境
```

## 🌐 Facebook开发者控制台设置步骤

### 1. 创建Facebook应用

1. 访问 [Facebook开发者控制台](https://developers.facebook.com/)
2. 点击"我的应用" > "创建应用"
3. 选择应用类型："消费者"或"商业"
4. 填写应用详情：
   - **应用名称**: `Monkey_short`
   - **应用联系邮箱**: `yuhangwu1021@gmail.com`

### 2. 添加Facebook登录产品

1. 在应用控制台中，点击"添加产品"
2. 找到"Facebook登录"，点击"设置"
3. 选择平台：
   - **网站**: 用于Web应用
   - **iOS**: 用于iOS应用
   - **Android**: 用于Android应用

### 3. 配置OAuth重定向URI

在"Facebook登录" > "设置"中配置：

**有效的OAuth重定向URI**:
```
http://yourapp.com:8080/oauth/callback/facebook
http://localhost:8080/oauth/callback/facebook
https://yourapp.com/oauth/callback/facebook
```

### 4. 配置应用域名 ⚠️ **重要**

在"应用设置" > "基本"中配置：

**应用域名**:
```
yourapp.com
localhost
```

**注意事项**:
- 只填写域名，不要包含协议 (http/https)
- 不要包含端口号 (:8080)
- 不要包含路径 (/oauth/callback)
- 每行一个域名

**错误示例** ❌:
```
http://yourapp.com
https://yourapp.com:8080
yourapp.com/oauth/callback
```

**正确示例** ✅:
```
yourapp.com
localhost
```

### 5. 权限和功能

确保应用具有以下权限：
- **email**: 获取用户邮箱地址
- **public_profile**: 获取用户公开资料信息

## 📱 前端集成代码

### JavaScript调用示例

```javascript
// 使用OAuth2Service进行Facebook登录
import OAuth2Service from '../services/OAuth2Service';

const handleFacebookLogin = async () => {
  try {
    await OAuth2Service.login('facebook');
  } catch (error) {
    console.error('Facebook登录失败:', error);
  }
};

// 在React组件中使用
<button onClick={handleFacebookLogin}>
  使用 Facebook 登录
</button>
```

### 完整的登录流程

```javascript
// 1. 发起Facebook OAuth2授权请求
const response = await fetch('/auth/oauth2/authorize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'FACEBOOK',
    platform: 'WEB',
    redirectUri: 'http://yourapp.com:8080/oauth/callback/facebook',
    state: 'random_state_string'
  })
});

const data = await response.json();
// 返回: { authorizationUrl: "https://www.facebook.com/v18.0/dialog/oauth?...", state: "..." }

// 2. 跳转到Facebook授权页面
window.location.href = data.authorizationUrl;

// 3. 用户授权后，Facebook回调到后端
// GET http://yourapp.com:8080/oauth/callback/facebook?code=xxx&state=xxx

// 4. 后端处理回调，获取用户信息，生成JWT
// 5. 重定向到前端成功页面，携带token
// GET http://localhost:3000/oauth2/success?token=JWT_TOKEN&platform=WEB
```

## 🔍 Facebook API响应格式

### 用户信息API响应

```json
{
  "id": "1234567890123456",
  "name": "张三",
  "email": "zhangsan@example.com",
  "picture": {
    "data": {
      "height": 50,
      "is_silhouette": false,
      "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=123&height=50&width=50",
      "width": 50
    }
  }
}
```

### JWT Token结构

```json
{
  "sub": "1",
  "platform": "WEB",
  "provider": "FACEBOOK",
  "email": "zhangsan@example.com",
  "name": "张三",
  "picture": "https://platform-lookaside.fbsbx.com/platform/profilepic/...",
  "facebook_id": "1234567890123456",
  "iat": 1762326096,
  "exp": 1762930896
}
```

## 🚨 常见问题和解决方案

### 1. 域名配置错误 ⚠️ **最常见**

**错误**: `无法加载网址这个 URL 的网域未包含应用的网域`

**解决方案**:
1. 在Facebook控制台 > "设置" > "基本" > "应用域名"中添加：
   ```
   yourapp.com
   localhost
   ```
2. 确保域名格式正确（不包含协议、端口、路径）
3. 保存设置后等待几分钟生效

### 2. 重定向URI不匹配

**错误**: `Error: Invalid redirect_uri`

**解决方案**:
- 确保Facebook控制台中的"有效的OAuth重定向URI"包含正确的回调地址
- 检查URI的协议 (http/https)、域名、端口是否完全匹配
- 注意不要在URI末尾添加斜杠

### 2. 应用未发布

**错误**: `This app is in development mode`

**解决方案**:
- 在开发阶段，将测试用户添加到"角色" > "测试用户"
- 或者将应用切换到"实时模式"（需要通过Facebook审核）

### 3. 权限不足

**错误**: `Insufficient permissions`

**解决方案**:
- 确保应用已申请 `email` 和 `public_profile` 权限
- 检查权限是否已通过Facebook审核
- 对于敏感权限，可能需要提交应用审核

### 4. 域名验证失败

**错误**: `App Domain Error`

**解决方案**:
- 在"应用设置" > "基本"中添加应用域名
- 确保域名不包含协议前缀 (http/https)
- 添加所有可能使用的域名（包括localhost用于开发）

## 🔧 调试技巧

### 1. 检查授权URL

```javascript
// 在浏览器控制台中检查生成的授权URL
console.log('Facebook授权URL:', authorizationUrl);

// 应该包含以下参数:
// - client_id: 1912281646367499
// - redirect_uri: http://yourapp.com:8080/oauth/callback/facebook
// - response_type: code
// - scope: email,public_profile
// - state: random_string
```

### 2. 测试API调用

```bash
# 测试后端授权端点
curl -X POST "http://localhost:8080/auth/oauth2/authorize" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "FACEBOOK",
    "platform": "WEB",
    "redirectUri": "http://yourapp.com:8080/oauth/callback/facebook",
    "state": "test_state_123"
  }'
```

### 3. 验证Facebook Graph API

```bash
# 使用access_token直接调用Facebook API
curl "https://graph.facebook.com/me?fields=id,name,email,picture&access_token=YOUR_ACCESS_TOKEN"
```

## 📊 性能优化建议

### 1. 缓存用户头像

```javascript
// 缓存Facebook用户头像到本地存储
const cacheUserAvatar = async (pictureUrl, userId) => {
  try {
    const response = await fetch(pictureUrl);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    // 存储到IndexedDB或其他本地存储
    localStorage.setItem(`avatar_${userId}`, objectUrl);
    
    return objectUrl;
  } catch (error) {
    console.error('头像缓存失败:', error);
    return pictureUrl; // 降级到原始URL
  }
};
```

### 2. 预加载授权URL

```javascript
// 在页面加载时预加载Facebook授权URL
const preloadFacebookAuth = async () => {
  try {
    const response = await fetch('/auth/oauth2/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'FACEBOOK',
        platform: 'WEB',
        redirectUri: 'http://yourapp.com:8080/oauth/callback/facebook',
        state: 'preload_' + Date.now()
      })
    });
    
    const data = await response.json();
    // 预加载授权页面资源
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = data.authorizationUrl;
    document.head.appendChild(link);
  } catch (error) {
    console.warn('Facebook授权URL预加载失败:', error);
  }
};
```

## 🔒 安全注意事项

### 1. 应用密钥保护

- **永远不要**在前端代码中暴露 `client-secret`
- 使用环境变量存储敏感配置
- 在生产环境中使用不同的应用密钥

### 2. State参数验证

```javascript
// 生成加密的state参数
const generateSecureState = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36);
  const hash = btoa(`${timestamp}_${random}`);
  return hash;
};

// 验证state参数
const validateState = (receivedState, expectedState) => {
  return receivedState === expectedState;
};
```

### 3. HTTPS强制

```javascript
// 生产环境强制使用HTTPS
const getRedirectUri = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const protocol = isProduction ? 'https' : 'http';
  const domain = isProduction ? 'yourapp.com' : 'yourapp.com:8080';
  
  return `${protocol}://${domain}/oauth/callback/facebook`;
};
```

---

*配置更新时间: 2025-11-05*
*Facebook API版本: v18.0*