# Apple Sign In 配置指南

## 📋 概述

Apple Sign In是Apple提供的身份认证服务，具有以下特点：
- **隐私保护**: 支持"隐藏我的邮箱"功能
- **安全性高**: 使用JWT和私钥签名
- **跨平台**: 支持iOS、macOS、Web
- **必需条件**: 需要付费的Apple Developer账号（$99/年）

## ⚠️ **前置要求**

### 1. Apple Developer账号
- **个人账号**: $99/年
- **企业账号**: $299/年
- **免费账号**: 不支持Sign in with Apple

### 2. 开发环境
- Xcode（用于生成私钥）
- OpenSSL（用于处理证书）

## 🛠️ **配置步骤**

### 步骤1：创建App ID

1. 登录 [Apple Developer](https://developer.apple.com/)
2. 进入 "Certificates, Identifiers & Profiles"
3. 选择 "Identifiers" > "App IDs"
4. 点击 "+" 创建新的App ID
5. 配置：
   - **Description**: Your App Name
   - **Bundle ID**: `com.yourapp.service`
   - **Capabilities**: 勾选 "Sign in with Apple"

### 步骤2：创建Services ID

1. 在 "Identifiers" 中选择 "Services IDs"
2. 点击 "+" 创建新的Services ID
3. 配置：
   - **Description**: Your App Web Service
   - **Identifier**: `com.yourapp.service` (用作Client ID)
4. 勾选 "Sign in with Apple"
5. 点击 "Configure"
6. 配置Web域名和重定向URI：
   - **Domains**: `yourapp.com`, `localhost`
   - **Return URLs**: 
     ```
     http://localhost:8080/oauth/callback/apple
     https://yourapp.com/oauth/callback/apple
     ```

### 步骤3：创建私钥

1. 在 "Keys" 部分点击 "+"
2. 配置：
   - **Key Name**: Apple Sign In Key
   - **Enable**: Sign in with Apple
3. 点击 "Configure"，选择之前创建的App ID
4. 点击 "Continue" > "Register"
5. **下载私钥文件** (.p8文件)
   - ⚠️ **重要**: 私钥只能下载一次，请妥善保管
   - 记录 **Key ID**（10位字符）

### 步骤4：获取Team ID

1. 在Apple Developer主页右上角
2. 点击你的账号名称
3. 查看 "Membership" 信息
4. 记录 **Team ID**（10位字符）

## 🔐 **后端配置**

### 1. 配置application.yml

```yaml
app:
  oauth2:
    apple:
      client-id: com.yourapp.service          # Services ID
      team-id: ABC1234567                     # Team ID
      key-id: XYZ9876543                      # Key ID
      authorization-uri: https://appleid.apple.com/auth/authorize
      token-uri: https://appleid.apple.com/auth/token
      scopes: name email
```

### 2. 放置私钥文件

将下载的 `.p8` 私钥文件放置在：
```
backend/src/main/resources/apple/
└── AuthKey_XYZ9876543.p8
```

### 3. 生成Client Secret

Apple Sign In需要使用JWT作为client_secret，需要：

```java
// 使用私钥生成JWT
// Header:
{
  "alg": "ES256",
  "kid": "XYZ9876543"  // Key ID
}

// Payload:
{
  "iss": "ABC1234567",  // Team ID
  "iat": 1234567890,    // 当前时间戳
  "exp": 1234571490,    // 过期时间（最多6个月）
  "aud": "https://appleid.apple.com",
  "sub": "com.yourapp.service"  // Client ID
}
```

## 🧪 **测试方案（无付费账号）**

### 方案1：使用Mock数据

```java
@Service("appleOAuth2ServiceMock")
@Profile("dev")
public class AppleOAuth2ServiceMock implements OAuth2Service {
    
    @Override
    public String buildAuthorizationUrl(String redirectUri, String state, 
                                       String codeChallenge, String codeChallengeMethod) {
        // 返回模拟的授权URL
        return "https://appleid.apple.com/auth/authorize?client_id=mock&state=" + state;
    }
    
    @Override
    public OAuth2TokenResponse exchangeToken(String code, String redirectUri) {
        // 返回模拟的token
        return new OAuth2TokenResponse("mock_access_token", null, 3600);
    }
    
    @Override
    public OAuth2UserInfo getUserInfo(String accessToken) {
        // 返回模拟的用户信息
        return OAuth2UserInfo.builder()
            .id("mock_apple_user_001")
            .email("user@privaterelay.appleid.com")
            .name("Apple Test User")
            .build();
    }
}
```

### 方案2：使用Apple的测试环境

Apple没有公开的测试环境，但可以：
1. 使用Postman模拟请求
2. 创建单元测试验证逻辑
3. 准备好所有代码，等有账号后直接测试

### 方案3：借用他人的Apple Developer账号

- 找朋友或同事借用账号进行测试
- 使用公司的Apple Developer账号

## 📱 **前端集成**

### Web端

```javascript
// 使用OAuth2Service
OAuth2Service.login('apple');

// 生成的授权URL
https://appleid.apple.com/auth/authorize?
  client_id=com.yourapp.service&
  redirect_uri=http://localhost:8080/oauth/callback/apple&
  response_type=code&
  response_mode=form_post&
  scope=name email&
  state=random_string
```

### iOS原生

```swift
import AuthenticationServices

func handleAppleSignIn() {
    let provider = ASAuthorizationAppleIDProvider()
    let request = provider.createRequest()
    request.requestedScopes = [.fullName, .email]
    
    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self
    controller.performRequests()
}
```

## 🔍 **Apple Sign In特点**

### 1. 隐藏邮箱功能

用户可以选择隐藏真实邮箱，Apple会生成一个中继邮箱：
```
user@privaterelay.appleid.com
```

发送到这个邮箱的邮件会转发到用户的真实邮箱。

### 2. 用户信息只返回一次

⚠️ **重要**: Apple只在首次授权时返回用户姓名，后续授权不再返回。

解决方案：
- 首次授权时保存用户信息
- 或者在前端获取用户信息后传递给后端

### 3. ID Token

Apple返回的是JWT格式的id_token，包含：
```json
{
  "iss": "https://appleid.apple.com",
  "aud": "com.yourapp.service",
  "exp": 1234567890,
  "iat": 1234567890,
  "sub": "001234.abc123def456.7890",  // 用户唯一ID
  "email": "user@example.com",
  "email_verified": true,
  "is_private_email": false
}
```

## 🚨 **常见问题**

### 1. invalid_client错误

**原因**: Client Secret生成错误或过期

**解决方案**:
- 检查Team ID、Key ID、Client ID是否正确
- 重新生成Client Secret
- 确保使用正确的私钥文件

### 2. invalid_grant错误

**原因**: Authorization code已使用或过期

**解决方案**:
- Authorization code只能使用一次
- Code有效期为5分钟
- 重新发起授权流程

### 3. 重定向URI不匹配

**原因**: 回调URL与Services ID配置不一致

**解决方案**:
- 确保URL完全匹配（包括协议、域名、端口、路径）
- 在Apple Developer中添加所有可能的回调URL

## 📚 **参考资源**

- [Apple Sign In 官方文档](https://developer.apple.com/sign-in-with-apple/)
- [Apple REST API](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api)
- [JWT生成指南](https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens)

## 💡 **开发建议**

1. **先实现Google和Facebook** - 它们更容易测试
2. **准备好Apple代码** - 等有账号后快速集成
3. **使用Mock服务** - 在开发阶段模拟Apple登录
4. **文档完善** - 记录所有配置步骤，方便后续使用

---

*最后更新: 2025-11-05*
*需要Apple Developer账号: $99/年*