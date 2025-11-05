# 多端多平台 OAuth2 认证架构设计

## 概述

本文档描述了一个支持多客户端平台（Web、App、小程序）和多 OAuth2 提供商（Google、Facebook、Instagram、Apple 等）的统一认证架构。

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端层                                 │
├──────────┬──────────┬──────────┬──────────┬──────────────────────┤
│   Web    │   App    │  微信小程序 │ 抖音小程序 │  其他平台           │
│          │(iOS/安卓) │          │          │                     │
└──────────┴──────────┴──────────┴──────────┴──────────────────────┘
     │          │          │          │
     │          │          │          │
     ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  统一认证 Gateway (后端)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /auth/oauth2/authorize                                         │
│    ├─ provider: google/facebook/instagram/apple                │
│    ├─ platform: web/ios/android/wechat/douyin                  │
│    └─ redirect_uri: 客户端回调地址                              │
│                                                                  │
│  /auth/oauth2/callback/{provider}                               │
│    └─ 处理 OAuth2 回调，生成 JWT                                │
│                                                                  │
│  /auth/oauth2/token                                             │
│    └─ 用 code 换 JWT (App/小程序专用)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              OAuth2 Provider Adapters (适配层)                   │
├──────────┬──────────┬──────────┬──────────┬──────────────────────┤
│  Google  │ Facebook │Instagram │  Apple   │  其他...             │
│  Adapter │  Adapter │ Adapter  │  Adapter │                     │
└──────────┴──────────┴──────────┴──────────┴──────────────────────┘
```

## 核心设计原则

### 前后端职责分离

#### 前端职责（所有平台）

前端**只负责**：
1. 发起认证请求
2. 接收认证结果（JWT Token）
3. 存储和使用 Token

前端**不处理**：
- OAuth2 的 client_secret
- 与第三方平台的直接交互
- Token 的生成和验证

#### 后端职责

后端**负责**：
1. 管理所有 OAuth2 配置（client_id, client_secret）
2. 处理所有 OAuth2 流程
3. 适配不同平台的回调方式
4. 生成统一的 JWT Token
5. 用户信息的获取和存储


## 数据模型设计

### 认证提供商枚举

```java
public enum AuthProvider {
    LOCAL,      // 邮箱密码
    GOOGLE,
    FACEBOOK,
    INSTAGRAM,
    APPLE,
    WECHAT,     // 微信
    DOUYIN      // 抖音
}
```

### 客户端平台枚举

```java
public enum ClientPlatform {
    WEB,
    IOS,
    ANDROID,
    WECHAT_MINIAPP,
    DOUYIN_MINIAPP,
    H5              // 移动端 H5
}
```

### 用户表

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String email;
    private String phone;
    private String imageUrl;
    
    // 主要认证方式
    @Enumerated(EnumType.STRING)
    private AuthProvider primaryProvider;
    
    // 多账号绑定
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<UserAuth> authAccounts = new ArrayList<>();
}
```

### 用户认证账号表（支持多账号绑定）

```java
@Entity
@Table(name = "user_auth", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"provider", "provider_user_id"})
})
public class UserAuth {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
    
    @Enumerated(EnumType.STRING)
    private AuthProvider provider;
    
    @Enumerated(EnumType.STRING)
    private ClientPlatform platform;
    
    // 第三方平台的用户ID
    @Column(name = "provider_user_id")
    private String providerUserId;
    
    // 用于跨平台识别（如微信的 unionId）
    private String unionId;
    
    private String email;
    private String name;
    private String imageUrl;
    
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
}
```


## 后端 API 设计

### 1. 统一认证入口

**端点**: `POST /auth/oauth2/authorize`

**请求参数**:
```json
{
  "provider": "google | facebook | instagram | apple",
  "platform": "web | ios | android | wechat_miniapp | douyin_miniapp",
  "redirectUri": "客户端回调地址",
  "state": "随机字符串（防CSRF）",
  "codeChallenge": "PKCE code_challenge（App必需）",
  "codeChallengeMethod": "S256"
}
```

**响应**:
```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "abc123..."
}
```

**功能**:
1. 验证平台和提供商组合是否支持
2. 获取对应的 OAuth2 服务
3. 构建授权 URL
4. 保存 state 和相关信息到 Redis（5分钟过期）

### 2. OAuth2 回调处理（Web 端使用）

**端点**: `GET /auth/oauth2/callback/{provider}`

**查询参数**:
- `code`: OAuth2 授权码
- `state`: 之前生成的 state

**功能**:
1. 验证 state
2. 用 code 换取 access_token
3. 获取用户信息
4. 创建或更新用户
5. 生成 JWT
6. 重定向回客户端（携带 token）

**重定向示例**:
```
http://localhost:3000/oauth2/redirect?token=eyJhbGciOiJIUzUxMiJ9...
```

### 3. Token 交换端点（App/小程序使用）

**端点**: `POST /auth/oauth2/token`

**请求参数**:
```json
{
  "provider": "google | facebook | instagram | apple",
  "platform": "ios | android | wechat_miniapp | douyin_miniapp",
  "code": "OAuth2 授权码",
  "state": "之前的 state",
  "codeVerifier": "PKCE code_verifier（App必需）"
}
```

**响应**:
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "imageUrl": "https://..."
  }
}
```

**功能**:
1. 验证 state
2. 验证 PKCE（App 必需）
3. 用 code 换取 access_token
4. 获取用户信息
5. 创建或更新用户
6. 生成 JWT
7. 返回 token 和用户信息


## 后端实现代码

### UnifiedOAuth2Controller

```java
@RestController
@RequestMapping("/auth/oauth2")
public class UnifiedOAuth2Controller {
    
    @Autowired
    private OAuth2ServiceFactory oauth2ServiceFactory;
    
    @Autowired
    private TokenProvider tokenProvider;
    
    @Autowired
    private RedisTemplate<String, OAuth2State> redisTemplate;
    
    @Autowired
    private UserService userService;
    
    /**
     * 统一认证入口
     */
    @PostMapping("/authorize")
    public ResponseEntity<?> authorize(@RequestBody OAuth2AuthRequest request) {
        // 1. 验证平台和提供商组合是否支持
        validateProviderPlatform(request.getProvider(), request.getPlatform());
        
        // 2. 获取对应的 OAuth2 服务
        OAuth2Service oauth2Service = oauth2ServiceFactory.getService(
            request.getProvider(), 
            request.getPlatform()
        );
        
        // 3. 构建授权 URL
        String authorizationUrl = oauth2Service.buildAuthorizationUrl(
            request.getRedirectUri(),
            request.getState(),
            request.getCodeChallenge(),
            request.getCodeChallengeMethod()
        );
        
        // 4. 保存 state 和相关信息到 Redis（5分钟过期）
        OAuth2State stateData = new OAuth2State(
            request.getProvider(),
            request.getPlatform(),
            request.getRedirectUri(),
            request.getCodeChallenge()
        );
        redisTemplate.opsForValue().set(
            "oauth2:state:" + request.getState(), 
            stateData, 
            5, 
            TimeUnit.MINUTES
        );
        
        return ResponseEntity.ok(Map.of(
            "authorizationUrl", authorizationUrl,
            "state", request.getState()
        ));
    }
    
    /**
     * OAuth2 回调处理（Web 端使用）
     */
    @GetMapping("/callback/{provider}")
    public void callback(
            @PathVariable String provider,
            @RequestParam String code,
            @RequestParam String state,
            HttpServletResponse response) throws IOException {
        
        // 1. 验证 state
        OAuth2State stateData = redisTemplate.opsForValue().get("oauth2:state:" + state);
        if (stateData == null) {
            response.sendRedirect(stateData.getRedirectUri() + "?error=invalid_state");
            return;
        }
        
        // 2. 获取 OAuth2 服务
        OAuth2Service oauth2Service = oauth2ServiceFactory.getService(
            AuthProvider.valueOf(provider.toUpperCase()),
            stateData.getPlatform()
        );
        
        try {
            // 3. 用 code 换取 access_token
            OAuth2TokenResponse tokenResponse = oauth2Service.exchangeToken(code);
            
            // 4. 获取用户信息
            OAuth2UserInfo userInfo = oauth2Service.getUserInfo(tokenResponse.getAccessToken());
            
            // 5. 创建或更新用户
            User user = userService.findOrCreateUser(
                userInfo,
                AuthProvider.valueOf(provider.toUpperCase()),
                stateData.getPlatform()
            );
            
            // 6. 生成 JWT
            String jwt = tokenProvider.createToken(user, stateData.getPlatform());
            
            // 7. 重定向回客户端
            String redirectUrl = stateData.getRedirectUri() + "?token=" + jwt;
            response.sendRedirect(redirectUrl);
            
        } catch (Exception e) {
            response.sendRedirect(stateData.getRedirectUri() + "?error=" + e.getMessage());
        } finally {
            // 8. 清理 state
            redisTemplate.delete("oauth2:state:" + state);
        }
    }
    
    /**
     * Token 交换端点（App/小程序使用）
     */
    @PostMapping("/token")
    public ResponseEntity<?> exchangeToken(@RequestBody OAuth2TokenRequest request) {
        // 1. 验证 state
        OAuth2State stateData = redisTemplate.opsForValue().get("oauth2:state:" + request.getState());
        if (stateData == null) {
            throw new BadRequestException("Invalid or expired state");
        }
        
        // 2. 验证 PKCE（App 必需）
        if (isPlatformRequiresPKCE(request.getPlatform())) {
            if (!verifyPKCE(stateData.getCodeChallenge(), request.getCodeVerifier())) {
                throw new BadRequestException("Invalid code verifier");
            }
        }
        
        // 3. 获取 OAuth2 服务
        OAuth2Service oauth2Service = oauth2ServiceFactory.getService(
            request.getProvider(),
            request.getPlatform()
        );
        
        try {
            // 4. 用 code 换取 access_token
            OAuth2TokenResponse tokenResponse = oauth2Service.exchangeToken(
                request.getCode(),
                stateData.getRedirectUri()
            );
            
            // 5. 获取用户信息
            OAuth2UserInfo userInfo = oauth2Service.getUserInfo(tokenResponse.getAccessToken());
            
            // 6. 创建或更新用户
            User user = userService.findOrCreateUser(
                userInfo,
                request.getProvider(),
                request.getPlatform()
            );
            
            // 7. 生成 JWT
            String jwt = tokenProvider.createToken(user, request.getPlatform());
            
            return ResponseEntity.ok(Map.of(
                "token", jwt,
                "user", toUserDTO(user)
            ));
            
        } finally {
            // 8. 清理 state
            redisTemplate.delete("oauth2:state:" + request.getState());
        }
    }
}
```


### OAuth2 服务抽象层

```java
// OAuth2 服务接口
public interface OAuth2Service {
    
    /**
     * 构建授权 URL
     */
    String buildAuthorizationUrl(
        String redirectUri, 
        String state,
        String codeChallenge,
        String codeChallengeMethod
    );
    
    /**
     * 用授权码换取 access_token
     */
    OAuth2TokenResponse exchangeToken(String code, String redirectUri);
    
    /**
     * 获取用户信息
     */
    OAuth2UserInfo getUserInfo(String accessToken);
}
```

### Google OAuth2 实现

```java
@Service
public class GoogleOAuth2Service implements OAuth2Service {
    
    @Value("${app.oauth2.google.client-id}")
    private String clientId;
    
    @Value("${app.oauth2.google.client-secret}")
    private String clientSecret;
    
    @Override
    public String buildAuthorizationUrl(String redirectUri, String state, 
                                       String codeChallenge, String codeChallengeMethod) {
        UriComponentsBuilder builder = UriComponentsBuilder
            .fromHttpUrl("https://accounts.google.com/o/oauth2/v2/auth")
            .queryParam("client_id", clientId)
            .queryParam("redirect_uri", redirectUri)
            .queryParam("response_type", "code")
            .queryParam("scope", "email profile")
            .queryParam("state", state);
        
        // App 使用 PKCE
        if (codeChallenge != null) {
            builder.queryParam("code_challenge", codeChallenge)
                   .queryParam("code_challenge_method", codeChallengeMethod);
        }
        
        return builder.toUriString();
    }
    
    @Override
    public OAuth2TokenResponse exchangeToken(String code, String redirectUri) {
        RestTemplate restTemplate = new RestTemplate();
        
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", code);
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("redirect_uri", redirectUri);
        params.add("grant_type", "authorization_code");
        
        ResponseEntity<Map> response = restTemplate.postForEntity(
            "https://oauth2.googleapis.com/token",
            params,
            Map.class
        );
        
        Map<String, Object> body = response.getBody();
        return new OAuth2TokenResponse(
            (String) body.get("access_token"),
            (String) body.get("refresh_token"),
            (Integer) body.get("expires_in")
        );
    }
    
    @Override
    public OAuth2UserInfo getUserInfo(String accessToken) {
        RestTemplate restTemplate = new RestTemplate();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        ResponseEntity<Map> response = restTemplate.exchange(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            HttpMethod.GET,
            entity,
            Map.class
        );
        
        Map<String, Object> body = response.getBody();
        return OAuth2UserInfo.builder()
            .id((String) body.get("id"))
            .email((String) body.get("email"))
            .name((String) body.get("name"))
            .imageUrl((String) body.get("picture"))
            .build();
    }
}
```

### OAuth2 服务工厂

```java
@Service
public class OAuth2ServiceFactory {
    
    @Autowired
    private Map<String, OAuth2Service> serviceMap;
    
    public OAuth2Service getService(AuthProvider provider, ClientPlatform platform) {
        String key = provider.name().toLowerCase();
        
        OAuth2Service service = serviceMap.get(key + "OAuth2Service");
        if (service == null) {
            throw new UnsupportedOperationException(
                "OAuth2 provider " + provider + " not supported"
            );
        }
        
        return service;
    }
}
```


## 前端实现

### Web 端（React）

#### OAuth2Service.js

```javascript
class OAuth2Service {
  
  // 发起 OAuth2 登录
  async login(provider) {
    const state = this.generateRandomState();
    const redirectUri = `${window.location.origin}/oauth2/redirect`;
    
    // 1. 调用后端获取授权 URL
    const response = await fetch('/auth/oauth2/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: provider,        // 'google', 'facebook', 'instagram', 'apple'
        platform: 'web',
        redirectUri: redirectUri,
        state: state
      })
    });
    
    const data = await response.json();
    
    // 2. 跳转到授权 URL（浏览器会自动处理后续流程）
    window.location.href = data.authorizationUrl;
  }
  
  generateRandomState() {
    return Math.random().toString(36).substring(2, 15);
  }
}
```

#### OAuth2RedirectHandler.js

```javascript
function OAuth2RedirectHandler() {
  useEffect(() => {
    // 从 URL 获取 token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    
    if (token) {
      // 存储 token
      localStorage.setItem('accessToken', token);
      // 跳转到首页
      window.location.href = '/';
    } else if (error) {
      alert('Login failed: ' + error);
      window.location.href = '/login';
    }
  }, []);
  
  return <div>Processing login...</div>;
}
```

#### Login.js

```javascript
import React from 'react';
import OAuth2Service from './OAuth2Service';

function Login() {
  const oauth2Service = new OAuth2Service();
  
  return (
    <div className="login-container">
      <h1>Login</h1>
      
      <button onClick={() => oauth2Service.login('google')}>
        Login with Google
      </button>
      
      <button onClick={() => oauth2Service.login('facebook')}>
        Login with Facebook
      </button>
      
      <button onClick={() => oauth2Service.login('instagram')}>
        Login with Instagram
      </button>
      
      <button onClick={() => oauth2Service.login('apple')}>
        Login with Apple
      </button>
    </div>
  );
}
```

### App 端（React Native）

#### OAuth2Service.js

```javascript
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

class OAuth2Service {
  
  async login(provider) {
    // 1. 生成 PKCE 参数
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateRandomState();
    
    // 2. 调用后端获取授权 URL
    const response = await fetch('https://api.example.com/auth/oauth2/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: provider,
        platform: Platform.OS,  // 'ios' or 'android'
        redirectUri: 'myapp://oauth2/callback',
        state: state,
        codeChallenge: codeChallenge,
        codeChallengeMethod: 'S256'
      })
    });
    
    const data = await response.json();
    
    // 3. 打开浏览器进行授权
    const result = await WebBrowser.openAuthSessionAsync(
      data.authorizationUrl,
      'myapp://oauth2/callback'
    );
    
    if (result.type === 'success') {
      // 4. 从回调 URL 提取 code
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      
      // 5. 用 code 换取 JWT
      const tokenResponse = await fetch('https://api.example.com/auth/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider,
          platform: Platform.OS,
          code: code,
          state: state,
          codeVerifier: codeVerifier
        })
      });
      
      const tokenData = await tokenResponse.json();
      
      // 6. 存储 token
      await AsyncStorage.setItem('accessToken', tokenData.token);
      
      return tokenData;
    }
  }
  
  generateCodeVerifier() {
    const randomBytes = Crypto.getRandomBytes(32);
    return this.base64URLEncode(randomBytes);
  }
  
  async generateCodeChallenge(verifier) {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier
    );
    return this.base64URLEncode(hash);
  }
  
  generateRandomState() {
    const randomBytes = Crypto.getRandomBytes(16);
    return this.base64URLEncode(randomBytes);
  }
  
  base64URLEncode(buffer) {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

export default OAuth2Service;
```

#### LoginScreen.js

```javascript
import React from 'react';
import { View, Button } from 'react-native';
import OAuth2Service from './OAuth2Service';

function LoginScreen({ navigation }) {
  const oauth2Service = new OAuth2Service();
  
  const handleLogin = async (provider) => {
    try {
      const result = await oauth2Service.login(provider);
      if (result.token) {
        navigation.navigate('Home');
      }
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };
  
  return (
    <View>
      <Button title="Login with Google" onPress={() => handleLogin('google')} />
      <Button title="Login with Facebook" onPress={() => handleLogin('facebook')} />
      <Button title="Login with Instagram" onPress={() => handleLogin('instagram')} />
      <Button title="Login with Apple" onPress={() => handleLogin('apple')} />
    </View>
  );
}
```


### 小程序端（微信/抖音）

#### oauth2Service.js

```javascript
// 微信小程序
class OAuth2Service {
  
  async login(provider) {
    const state = this.generateRandomState();
    
    // 1. 调用后端获取授权 URL
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: 'https://api.example.com/auth/oauth2/authorize',
        method: 'POST',
        data: {
          provider: provider,
          platform: 'wechat_miniapp',
          redirectUri: 'https://api.example.com/auth/oauth2/callback/' + provider,
          state: state
        },
        success: resolve,
        fail: reject
      });
    });
    
    const authUrl = response.data.authorizationUrl;
    
    // 2. 保存 state 到本地
    wx.setStorageSync('oauth2_state', state);
    
    // 3. 打开 WebView 进行授权
    wx.navigateTo({
      url: `/pages/webview/webview?url=${encodeURIComponent(authUrl)}&state=${state}`
    });
  }
  
  generateRandomState() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export default OAuth2Service;
```

#### webview.wxml

```xml
<web-view src="{{url}}" bindmessage="handleMessage"></web-view>
```

#### webview.js

```javascript
Page({
  data: {
    url: ''
  },
  
  onLoad(options) {
    this.setData({
      url: decodeURIComponent(options.url)
    });
  },
  
  handleMessage(event) {
    const data = event.detail.data[0];
    
    if (data.token) {
      // 存储 token
      wx.setStorageSync('accessToken', data.token);
      
      // 返回上一页或跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      });
    } else if (data.error) {
      wx.showToast({
        title: 'Login failed: ' + data.error,
        icon: 'none'
      });
      wx.navigateBack();
    }
  }
});
```

#### 后端授权成功页面（返回给 WebView）

```html
<!DOCTYPE html>
<html>
<head>
  <title>Authorization Success</title>
  <script type="text/javascript" src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>
</head>
<body>
  <h1>Authorization successful, redirecting...</h1>
  
  <script>
    // 发送消息给小程序
    wx.miniProgram.postMessage({ 
      data: { token: '{{token}}' } 
    });
    
    // 返回小程序
    wx.miniProgram.navigateBack();
  </script>
</body>
</html>
```

#### login.wxml

```xml
<view class="login-container">
  <text class="title">Login</text>
  
  <button bindtap="loginWithGoogle">Login with Google</button>
  <button bindtap="loginWithFacebook">Login with Facebook</button>
  <button bindtap="loginWithInstagram">Login with Instagram</button>
  <button bindtap="loginWithApple">Login with Apple</button>
</view>
```

#### login.js

```javascript
import OAuth2Service from '../../services/oauth2Service';

Page({
  oauth2Service: new OAuth2Service(),
  
  loginWithGoogle() {
    this.oauth2Service.login('google');
  },
  
  loginWithFacebook() {
    this.oauth2Service.login('facebook');
  },
  
  loginWithInstagram() {
    this.oauth2Service.login('instagram');
  },
  
  loginWithApple() {
    this.oauth2Service.login('apple');
  }
});
```


## 配置文件

### application.yml

```yaml
app:
  auth:
    jwt:
      secret: ${JWT_SECRET}
      expiration:
        web: 604800000      # 7天
        mobile: 2592000000  # 30天
        miniapp: 7776000000 # 90天
  
  oauth2:
    # Google
    google:
      client-id: ${GOOGLE_CLIENT_ID}
      client-secret: ${GOOGLE_CLIENT_SECRET}
      authorization-uri: https://accounts.google.com/o/oauth2/v2/auth
      token-uri: https://oauth2.googleapis.com/token
      user-info-uri: https://www.googleapis.com/oauth2/v2/userinfo
      scopes:
        - email
        - profile
    
    # Facebook
    facebook:
      client-id: ${FACEBOOK_CLIENT_ID}
      client-secret: ${FACEBOOK_CLIENT_SECRET}
      authorization-uri: https://www.facebook.com/v18.0/dialog/oauth
      token-uri: https://graph.facebook.com/v18.0/oauth/access_token
      user-info-uri: https://graph.facebook.com/me?fields=id,name,email,picture
      scopes:
        - email
        - public_profile
    
    # Instagram
    instagram:
      client-id: ${INSTAGRAM_CLIENT_ID}
      client-secret: ${INSTAGRAM_CLIENT_SECRET}
      authorization-uri: https://api.instagram.com/oauth/authorize
      token-uri: https://api.instagram.com/oauth/access_token
      user-info-uri: https://graph.instagram.com/me?fields=id,username,account_type
      scopes:
        - user_profile
        - user_media
    
    # Apple
    apple:
      client-id: ${APPLE_CLIENT_ID}
      team-id: ${APPLE_TEAM_ID}
      key-id: ${APPLE_KEY_ID}
      private-key: ${APPLE_PRIVATE_KEY}
      authorization-uri: https://appleid.apple.com/auth/authorize
      token-uri: https://appleid.apple.com/auth/token
      scopes:
        - name
        - email
    
    # 允许的回调地址
    authorized-redirect-uris:
      # Web
      - http://localhost:3000/oauth2/redirect
      - https://web.example.com/oauth2/redirect
      # App
      - myapp://oauth2/callback
      - com.example.myapp://oauth2/callback
      # 小程序（通过后端中转）
      - https://api.example.com/auth/oauth2/callback/*

# Redis 配置（用于存储 state）
spring:
  redis:
    host: localhost
    port: 6379
    password: ${REDIS_PASSWORD}
    database: 0
```

### pom.xml 依赖

```xml
<dependencies>
    <!-- Spring Boot Starter -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    
    <!-- Redis -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>
    
    <!-- JWT -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.11.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    
    <!-- MySQL -->
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
        <scope>runtime</scope>
    </dependency>
    
    <!-- Lombok -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```


## 认证流程详解

### Web 端流程

```
1. 用户点击"Login with Google"
   ↓
2. 前端调用 POST /auth/oauth2/authorize
   - provider: "google"
   - platform: "web"
   - redirectUri: "http://localhost:3000/oauth2/redirect"
   - state: "random_string"
   ↓
3. 后端返回授权 URL
   ↓
4. 前端跳转到授权 URL（Google 登录页面）
   ↓
5. 用户在 Google 页面授权
   ↓
6. Google 重定向到后端回调: 
   GET /auth/oauth2/callback/google?code=xxx&state=xxx
   ↓
7. 后端处理：
   - 验证 state
   - 用 code 换取 access_token
   - 获取用户信息
   - 创建/更新用户
   - 生成 JWT
   ↓
8. 后端重定向到前端:
   http://localhost:3000/oauth2/redirect?token=jwt_token
   ↓
9. 前端提取 token，存储到 localStorage
   ↓
10. 跳转到首页，登录完成
```

### App 端流程（使用 PKCE）

```
1. 用户点击"Login with Google"
   ↓
2. App 生成 PKCE 参数：
   - code_verifier (随机字符串)
   - code_challenge (SHA256(code_verifier) 的 base64url)
   ↓
3. App 调用 POST /auth/oauth2/authorize
   - provider: "google"
   - platform: "ios" / "android"
   - redirectUri: "myapp://oauth2/callback"
   - state: "random_string"
   - codeChallenge: "base64url_string"
   - codeChallengeMethod: "S256"
   ↓
4. 后端返回授权 URL（包含 code_challenge）
   ↓
5. App 打开系统浏览器访问授权 URL
   ↓
6. 用户在浏览器中授权
   ↓
7. 浏览器通过 Deep Link 回到 App:
   myapp://oauth2/callback?code=xxx&state=xxx
   ↓
8. App 调用 POST /auth/oauth2/token
   - provider: "google"
   - platform: "ios" / "android"
   - code: "xxx"
   - state: "xxx"
   - codeVerifier: "原始的 code_verifier"
   ↓
9. 后端处理：
   - 验证 state
   - 验证 PKCE (code_challenge == SHA256(code_verifier))
   - 用 code 换取 access_token
   - 获取用户信息
   - 创建/更新用户
   - 生成 JWT
   ↓
10. 后端返回 JWT 和用户信息
   ↓
11. App 存储 token 到安全存储
   ↓
12. 跳转到首页，登录完成
```

### 小程序端流程

```
1. 用户点击"Login with Google"
   ↓
2. 小程序调用 POST /auth/oauth2/authorize
   - provider: "google"
   - platform: "wechat_miniapp"
   - redirectUri: "https://api.example.com/auth/oauth2/callback/google"
   - state: "random_string"
   ↓
3. 后端返回授权 URL
   ↓
4. 小程序打开 WebView 访问授权 URL
   ↓
5. 用户在 WebView 中授权
   ↓
6. 授权成功后，后端返回一个特殊页面
   ↓
7. 该页面通过 wx.miniProgram.postMessage 发送 token 给小程序
   ↓
8. 小程序接收消息，提取 token
   ↓
9. 存储 token 到本地存储
   ↓
10. 关闭 WebView，返回小程序
   ↓
11. 跳转到首页，登录完成
```


## 安全考虑

### 1. PKCE (Proof Key for Code Exchange)

**为什么需要 PKCE？**
- 移动 App 无法安全存储 `client_secret`
- App 可以被反编译，暴露敏感信息
- Deep Link 可能被其他 App 劫持

**PKCE 工作原理：**
```
1. App 生成随机字符串 code_verifier
2. 计算 code_challenge = BASE64URL(SHA256(code_verifier))
3. 授权请求时发送 code_challenge
4. 换取 token 时发送 code_verifier
5. 服务器验证 SHA256(code_verifier) == code_challenge
```

**优势：**
- 即使授权码被劫持，攻击者也无法换取 token（因为没有 code_verifier）
- 不需要 client_secret

### 2. State 参数

**作用：**
- 防止 CSRF 攻击
- 关联授权请求和回调

**实现：**
```java
// 生成随机 state
String state = UUID.randomUUID().toString();

// 存储到 Redis（5分钟过期）
OAuth2State stateData = new OAuth2State(provider, platform, redirectUri);
redisTemplate.opsForValue().set("oauth2:state:" + state, stateData, 5, TimeUnit.MINUTES);

// 回调时验证
OAuth2State stored = redisTemplate.opsForValue().get("oauth2:state:" + state);
if (stored == null) {
    throw new BadRequestException("Invalid or expired state");
}
```

### 3. Redirect URI 白名单

**防止重定向攻击：**
```java
private boolean isAuthorizedRedirectUri(String uri) {
    return authorizedRedirectUris.stream()
        .anyMatch(authorizedUri -> {
            URI clientUri = URI.create(uri);
            URI authorizedURI = URI.create(authorizedUri);
            return authorizedURI.getHost().equalsIgnoreCase(clientUri.getHost())
                && authorizedURI.getPort() == clientUri.getPort();
        });
}
```

### 4. JWT Token 安全

**最佳实践：**
- 使用强密钥（至少 256 位）
- 设置合理的过期时间
- 不在 JWT 中存储敏感信息
- 使用 HTTPS 传输

```java
public String createToken(User user, ClientPlatform platform) {
    Date now = new Date();
    Date expiryDate = new Date(now.getTime() + getExpirationTime(platform));
    
    return Jwts.builder()
        .setSubject(Long.toString(user.getId()))
        .claim("platform", platform.name())
        .setIssuedAt(now)
        .setExpiration(expiryDate)
        .signWith(SignatureAlgorithm.HS512, tokenSecret)
        .compact();
}
```

### 5. HTTPS 强制

**生产环境必须使用 HTTPS：**
```yaml
server:
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: ${SSL_KEY_STORE_PASSWORD}
    key-store-type: PKCS12
```

### 6. 速率限制

**防止暴力攻击：**
```java
@RateLimiter(name = "oauth2", fallbackMethod = "rateLimitFallback")
@PostMapping("/authorize")
public ResponseEntity<?> authorize(@RequestBody OAuth2AuthRequest request) {
    // ...
}
```


## 架构优势

### 1. 安全性 ✅

- **client_secret 永远不暴露给客户端**
  - 所有 OAuth2 配置都在后端管理
  - 前端只接收授权 URL 和 JWT Token

- **App 使用 PKCE**
  - 无需 client_secret
  - 防止授权码劫持攻击

- **小程序通过 WebView + 后端中转**
  - 安全可控
  - 避免小程序环境限制

- **State 参数防 CSRF 攻击**
  - 每次授权生成唯一 state
  - Redis 存储，5分钟自动过期

### 2. 统一性 ✅

- **所有平台使用同一套后端 API**
  - 减少维护成本
  - 统一的错误处理

- **统一的 JWT Token 格式**
  - 所有平台使用相同的认证机制
  - 简化后续 API 调用

- **统一的用户体系**
  - 一个用户可以在多个平台登录
  - 支持多账号绑定

### 3. 可扩展性 ✅

- **新增 OAuth2 提供商**
  - 只需实现 `OAuth2Service` 接口
  - 添加配置即可

- **新增客户端平台**
  - 只需添加对应的前端代码
  - 后端无需修改

- **支持账号绑定和解绑**
  - 一个用户可以绑定多个第三方账号
  - 灵活的账号管理

### 4. 灵活性 ✅

- **Web 端：浏览器直接重定向**
  - 标准 OAuth2 流程
  - 用户体验最佳

- **App 端：Deep Link + PKCE**
  - 安全性高
  - 支持原生体验

- **小程序：WebView + 消息通信**
  - 适配小程序环境
  - 无缝集成

### 5. 可维护性 ✅

- **清晰的职责分离**
  - 前端：UI 和用户交互
  - 后端：业务逻辑和安全

- **统一的错误处理**
  - 所有错误都通过后端返回
  - 便于日志记录和监控

- **配置集中管理**
  - 所有 OAuth2 配置在一个地方
  - 便于更新和维护

## 支持的平台和提供商矩阵

| 平台 / 提供商 | Google | Facebook | Instagram | Apple | 微信 | 抖音 |
|--------------|--------|----------|-----------|-------|------|------|
| Web          | ✅     | ✅       | ✅        | ✅    | ✅   | ✅   |
| iOS          | ✅     | ✅       | ✅        | ✅    | ✅   | ✅   |
| Android      | ✅     | ✅       | ✅        | ✅    | ✅   | ✅   |
| 微信小程序    | ✅     | ✅       | ✅        | ✅    | ✅   | ❌   |
| 抖音小程序    | ✅     | ✅       | ✅        | ✅    | ❌   | ✅   |

## 实施步骤

### 第一阶段：基础架构

1. ✅ 设计数据模型（User、UserAuth）
2. ✅ 实现统一认证 API
3. ✅ 实现 OAuth2Service 接口
4. ✅ 实现 Google OAuth2Service
5. ✅ 配置 Redis 存储 state

### 第二阶段：Web 端

1. ✅ 实现 Web 端前端代码
2. ✅ 测试 Google 登录
3. ✅ 实现 Facebook、Instagram、Apple

### 第三阶段：App 端

1. ✅ 实现 PKCE 支持
2. ✅ 实现 App 端前端代码（React Native）
3. ✅ 配置 Deep Link
4. ✅ 测试各平台登录

### 第四阶段：小程序端

1. ✅ 实现 WebView 授权流程
2. ✅ 实现微信小程序前端代码
3. ✅ 实现抖音小程序前端代码
4. ✅ 测试各平台登录

### 第五阶段：优化和扩展

1. ⬜ 实现账号绑定功能
2. ⬜ 实现 Token 刷新机制
3. ⬜ 添加日志和监控
4. ⬜ 性能优化
5. ⬜ 安全加固

## 常见问题

### Q1: 为什么不直接在前端处理 OAuth2？

**A:** 安全原因。OAuth2 的 `client_secret` 不能暴露在前端代码中，否则任何人都可以冒充你的应用。

### Q2: App 端为什么要使用 PKCE？

**A:** 因为移动 App 无法安全存储 `client_secret`，PKCE 提供了一种无需 `client_secret` 的安全认证方式。

### Q3: 小程序为什么要用 WebView？

**A:** 小程序环境有限制，无法直接跳转到外部浏览器。通过 WebView 可以在小程序内完成 OAuth2 授权。

### Q4: 如何处理用户在多个平台登录？

**A:** 通过 `UserAuth` 表记录用户在不同平台的认证信息，一个 `User` 可以有多个 `UserAuth` 记录。

### Q5: 如何实现账号绑定？

**A:** 用户登录后，可以通过相同的 OAuth2 流程绑定其他账号。后端检查用户已登录，将新的认证信息添加到 `UserAuth` 表。

### Q6: Token 过期了怎么办？

**A:** 
- Web 端：重新登录
- App 端：使用 refresh_token 刷新（需要额外实现）
- 小程序：重新登录（小程序 token 有效期通常较长）

### Q7: 如何支持新的 OAuth2 提供商？

**A:** 
1. 实现 `OAuth2Service` 接口
2. 在 `application.yml` 中添加配置
3. 在 `AuthProvider` 枚举中添加新的提供商
4. 前端添加对应的登录按钮

## 总结

这个架构提供了一个**安全、统一、可扩展**的多端多平台 OAuth2 认证解决方案：

- **前端**：只负责发起认证和接收 token
- **后端**：处理所有 OAuth2 逻辑和安全控制
- **统一**：所有平台使用相同的 API 和 JWT
- **安全**：PKCE、State、白名单等多重保护
- **灵活**：支持 Web、App、小程序等多种平台

通过这个架构，你可以轻松支持多个客户端平台和多个 OAuth2 提供商，同时保持代码的可维护性和安全性。
